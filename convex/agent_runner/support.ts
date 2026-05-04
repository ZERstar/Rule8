import { v } from "convex/values";

import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { buildWorkerSystemPrompt } from "../../lib/agents/prompts";
import { runAgenticToolLoop, type AgenticLoopResult } from "../../lib/agents/tool-loop";
import {
  executeToolCall,
  isToolResultError,
  type IntegrationConfigMap,
} from "../../lib/agents/tool-executor";
import { SUPPORT_TOOLS } from "../../lib/agents/tools";

function getReplyFallback(summary: string, crewName: string) {
  return `${crewName} reviewed this request and prepared a response: ${summary}. We have taken the next appropriate step and will follow up if anything else is needed.`;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function isTransientError(message: string) {
  return /(timeout|timed out|etimedout|rate limit|429|500|502|503|504|temporary|econnreset|econnrefused|fetch failed|network)/i.test(message);
}

export const handleTask = internalAction({
  args: {
    taskId: v.id("tasks"),
    runId: v.string(),
    workspaceId: v.string(),
  },
  handler: async (ctx, args) => {
    const task = await ctx.runQuery(internal.tasks.getByIdInternal, { taskId: args.taskId });
    if (!task || !task.assignedAgentId) {
      throw new Error("Assigned task was not found or has no assigned agent.");
    }

    const assignedAgent = await ctx.runQuery(internal.agents.getCrewLead, {
      workspaceId: args.workspaceId,
      crewTag: task.crewTag,
    });

    if (!assignedAgent) {
      throw new Error("Assigned agent not found for task.");
    }

    await ctx.runMutation(internal.agents.setStatus, {
      agentId: assignedAgent._id,
      status: "running",
    });

    try {
    const contextRows = await ctx.runQuery(internal.productContext.listAllInternal, {
      workspaceId: args.workspaceId,
    });
    const integrationConfigs: IntegrationConfigMap = await ctx.runQuery(
      internal.integrations.listConfigs,
      { workspaceId: args.workspaceId },
    );
    const contextMap = Object.fromEntries(contextRows.map((row) => [row.key, row.value]));

    // US-17: Load episodic context from prior interactions with this user
    let episodicContext = "";
    if (task.userEmail) {
      const priorTasks = await ctx.runQuery(internal.tasks.getRecentByUserEmail, {
        workspaceId: args.workspaceId,
        userEmail: task.userEmail,
        excludeTaskId: task._id,
        limit: 5,
      });

      if (priorTasks.length > 0) {
        episodicContext =
          `\n\nEpisodic context: ${priorTasks.length} prior interaction${priorTasks.length === 1 ? "" : "s"} with this user:\n` +
          priorTasks
            .map(
              (t: { summary: string; resolution?: string; escalationReason?: string; createdAt: number }, i: number) =>
                `${i + 1}. [${new Date(t.createdAt).toISOString()}] ${t.summary.slice(0, 100)} → ${(t.resolution ?? t.escalationReason ?? "unresolved").slice(0, 80)}`,
            )
            .join("\n");

        await ctx.runMutation(internal.traces.recordInternal, {
          runId: args.runId,
          taskId: task._id,
          agentId: assignedAgent._id,
          agentTag: "support",
          crewTag: task.crewTag,
          crewName: assignedAgent.crewName,
          action: `Loaded ${priorTasks.length} prior interaction${priorTasks.length === 1 ? "" : "s"} for episodic context.`,
          stepType: "tool_call",
          model: assignedAgent.modelId,
          status: "ok",
          toolName: "memory_lookup",
          toolOutputPreview: `Episodic context: ${priorTasks.length} prior interactions`,
          tokensIn: 0,
          tokensOut: 0,
          costCents: 0,
          latencyMs: 40,
          cacheHit: false,
          cacheTokens: 0,
          confidence: 0.99,
          workspaceId: args.workspaceId,
        });
      }
    }

    let modelResult: AgenticLoopResult;
    try {
      modelResult = await runAgenticToolLoop({
        ctx,
        runId: args.runId,
        taskId: task._id,
        agentId: assignedAgent._id,
        agentTag: task.crewTag === "finance" ? "finance" : "support",
        crewTag: task.crewTag,
        crewName: assignedAgent.crewName,
        modelId: assignedAgent.modelId,
        agentName: assignedAgent.name,
        workspaceId: args.workspaceId,
        systemPrompt: buildWorkerSystemPrompt({
          agentName: assignedAgent.name,
          crewName: assignedAgent.crewName,
          description: assignedAgent.description,
          productDescription: contextMap.product_description,
          refundPolicy: contextMap.refund_policy,
          escalationRules: contextMap.escalation_rules,
          agentTone: contextMap.agent_tone,
          connectedProviders: assignedAgent.integrationNames,
        }),
        userPrompt: `Task summary:\n${task.summary}\n\nIntercom conversation ID: ${task.externalId ?? "unknown"}\n\nRaw payload:\n${task.rawPayload}${episodicContext}`,
        maxTokens: 320,
        tools: SUPPORT_TOOLS,
        mockText: getReplyFallback(task.summary, assignedAgent.crewName),
        toolDefaults: {
          intercom_reply: { conversationId: task.externalId },
        },
      });
    } catch (error: unknown) {
      const reason = `AI model failed while drafting support response: ${errorMessage(error)}`;

      await ctx.runMutation(internal.traces.recordInternal, {
        runId: args.runId,
        taskId: task._id,
        agentId: assignedAgent._id,
        agentTag: task.crewTag === "finance" ? "finance" : "support",
        crewTag: task.crewTag,
        crewName: assignedAgent.crewName,
        action: reason,
        stepType: "error",
        model: assignedAgent.modelId,
        status: "error",
        toolName: undefined,
        toolOutputPreview: undefined,
        tokensIn: 0,
        tokensOut: 0,
        costCents: 0,
        latencyMs: 0,
        cacheHit: false,
        cacheTokens: 0,
        confidence: 0,
        workspaceId: args.workspaceId,
      });

      throw new Error(reason);
    }

    let outboundResult = modelResult.toolExecutions.find(
      (tool) => tool.name === "intercom_reply" && tool.status === "ok",
    )?.result;

    if (task.source === "intercom" && !outboundResult) {
      outboundResult = await executeToolCall(
        "intercom_reply",
        { conversationId: task.externalId, message: modelResult.text },
        integrationConfigs,
      );

      const outboundStatus = isToolResultError(outboundResult) ? "error" : "ok";
      await ctx.runMutation(internal.traces.recordInternal, {
        runId: args.runId,
        taskId: task._id,
        agentId: assignedAgent._id,
        agentTag: task.crewTag === "finance" ? "finance" : "support",
        crewTag: task.crewTag,
        crewName: assignedAgent.crewName,
        action: `Delivered Intercom response for task ${task.externalId ?? task._id}.`,
        stepType: "tool_call",
        model: modelResult.model,
        status: outboundStatus,
        toolName: "intercom_reply",
        toolOutputPreview: outboundResult.slice(0, 200),
        tokensIn: 0,
        tokensOut: 0,
        costCents: 0,
        latencyMs: Math.max(1, Math.round(modelResult.latencyMs / 4)),
        cacheHit: false,
        cacheTokens: 0,
        confidence: outboundStatus === "ok" ? 0.92 : 0.2,
        workspaceId: args.workspaceId,
      });

      if (outboundStatus === "error") {
        throw new Error(outboundResult);
      }
    }

    const resolutionPreview = (outboundResult ?? modelResult.text).slice(0, 160);

    await ctx.runMutation(internal.traces.recordInternal, {
      runId: args.runId,
      taskId: task._id,
      agentId: assignedAgent._id,
      agentTag: task.crewTag === "finance" ? "finance" : "support",
      crewTag: task.crewTag,
      crewName: assignedAgent.crewName,
      action: outboundResult
        ? `Confirmed Intercom delivery for task ${task.externalId ?? task._id}.`
        : `${assignedAgent.name} prepared a support resolution for task ${task._id}.`,
      stepType: "resolution",
      model: modelResult.model,
      status: "ok",
      toolName: outboundResult ? "intercom_reply" : undefined,
      toolOutputPreview: resolutionPreview,
      tokensIn: 0,
      tokensOut: 0,
      costCents: 0,
      latencyMs: Math.max(1, Math.round(modelResult.latencyMs / 4)),
      cacheHit: false,
      cacheTokens: 0,
      confidence: 0.9,
      workspaceId: args.workspaceId,
    });

    await ctx.runMutation(internal.tasks.resolveTaskInternal, {
      taskId: task._id,
      resolution: modelResult.text,
      totalTokens: modelResult.tokensIn + modelResult.tokensOut,
      totalCostCents: modelResult.costCents,
      latencyMs: modelResult.latencyMs,
    });

    return {
      status: "resolved" as const,
      resolution: modelResult.text,
    };
    } catch (error: unknown) {
      const message = errorMessage(error);
      const transient = isTransientError(message);

      await ctx.runMutation(internal.tasks.scheduleRetry, {
        taskId: args.taskId,
        error: message,
        failureMode: transient ? "transient" : "permanent",
      });

      if (transient) {
        const updatedTask = await ctx.runQuery(internal.tasks.getByIdInternal, {
          taskId: args.taskId,
        });
        if (updatedTask?.status === "pending" && updatedTask.nextRetryAt) {
          await ctx.scheduler.runAfter(
            Math.max(0, updatedTask.nextRetryAt - Date.now()),
            internal.agent_runner.support.handleTask,
            {
              taskId: args.taskId,
              runId: `${args.runId}-retry-${updatedTask.retryCount ?? 0}`,
              workspaceId: args.workspaceId,
            },
          );
        }
      }

      return {
        status: transient ? "retry_scheduled" as const : "failed" as const,
        reason: message,
      };
    } finally {
      await ctx.runMutation(internal.agents.setStatus, {
        agentId: assignedAgent._id,
        status: "idle",
      });
    }
  },
});
