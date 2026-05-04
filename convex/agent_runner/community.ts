import { v } from "convex/values";

import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { buildCommunitySystemPrompt } from "../../lib/agents/prompts";
import { runAgenticToolLoop, type AgenticLoopResult } from "../../lib/agents/tool-loop";
import {
  executeToolCall,
  isToolResultError,
  type IntegrationConfigMap,
} from "../../lib/agents/tool-executor";
import { COMMUNITY_TOOLS } from "../../lib/agents/tools";

type ContentClass = "reply" | "dm" | "feature_request";

function classifyContent(content: string): ContentClass {
  const n = content.toLowerCase();
  if (
    /(spam|hate|abuse|harassment|inappropriate|violation|scam|nsfw|ban|slur|threat)/.test(n)
  ) {
    return "dm";
  }
  if (
    /(feature request|would be cool|please add|can you add|i wish|suggestion|should have|would love|add support for)/.test(n)
  ) {
    return "feature_request";
  }
  return "reply";
}

function getReplyFallback(cls: ContentClass, summary: string): string {
  if (cls === "dm") {
    return "Your message violated community guidelines. This is an automated warning. Repeated violations may result in a ban.";
  }
  if (cls === "feature_request") {
    return "Thanks for the suggestion! We've logged this feature request and the product team will review it. We appreciate the feedback.";
  }
  return `Great question! ${summary.slice(0, 80)} — check our docs at docs.rule8.ai or reach out to support for a detailed walkthrough.`;
}

function getDiscordTargets(rawPayload: string, externalId?: string) {
  let channelId = "";
  let userId = "";

  try {
    const parsed = JSON.parse(rawPayload) as {
      channel_id?: string;
      author?: { id?: string };
    };
    channelId = parsed.channel_id ?? "";
    userId = parsed.author?.id ?? "";
  } catch {
    const match = externalId?.match(/^discord-(.+)-\d+$/);
    channelId = match?.[1] ?? "";
  }

  return { channelId, userId };
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
    if (!task) throw new Error("Community task not found.");

    const assignedAgent = await ctx.runQuery(internal.agents.getCrewLead, {
      workspaceId: args.workspaceId,
      crewTag: "community",
    });
    if (!assignedAgent) throw new Error("Community crew lead not found.");

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
      }) as Doc<"tasks">[];

      if (priorTasks.length > 0) {
        episodicContext =
          `\n\nEpisodic context: ${priorTasks.length} prior interaction${priorTasks.length === 1 ? "" : "s"} with this user:\n` +
          priorTasks
            .map(
              (t, i) =>
                `${i + 1}. [${new Date(t.createdAt).toISOString()}] ${t.summary.slice(0, 100)} → ${(t.resolution ?? t.escalationReason ?? "unresolved").slice(0, 80)}`,
            )
            .join("\n");

        await ctx.runMutation(internal.traces.recordInternal, {
          runId: args.runId,
          taskId: task._id,
          agentId: assignedAgent._id,
          agentTag: "community",
          crewTag: "community",
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

    const contentClass = classifyContent(task.summary);
    const fallbackText = getReplyFallback(contentClass, task.summary);
    const discordTargets = getDiscordTargets(task.rawPayload, task.externalId);
    const systemPrompt = buildCommunitySystemPrompt({
      agentName: assignedAgent.name,
      crewName: assignedAgent.crewName,
      description: assignedAgent.description,
      productDescription: contextMap.product_description,
      escalationRules: contextMap.escalation_rules,
      agentTone: contextMap.agent_tone,
      connectedProviders: assignedAgent.integrationNames,
    });

    if (contentClass === "dm") {
      let modelResult: AgenticLoopResult;
      try {
        modelResult = await runAgenticToolLoop({
          ctx,
          runId: args.runId,
          taskId: task._id,
          agentId: assignedAgent._id,
          agentTag: "community",
          crewTag: "community",
          crewName: assignedAgent.crewName,
          modelId: assignedAgent.modelId,
          agentName: assignedAgent.name,
          workspaceId: args.workspaceId,
          systemPrompt,
          userPrompt: `Discord message (violation detected):\n${task.summary}\n\nAction required: issue a DM warning.${episodicContext}`,
          maxTokens: 240,
          tools: COMMUNITY_TOOLS,
          mockText: fallbackText,
          toolDefaults: {
            discord_dm: { userId: discordTargets.userId },
            discord_reply: { channelId: discordTargets.channelId },
          },
        });
      } catch (error: unknown) {
        const reason = `AI model failed while drafting moderation DM: ${errorMessage(error)}`;

        await ctx.runMutation(internal.traces.recordInternal, {
          runId: args.runId,
          taskId: task._id,
          agentId: assignedAgent._id,
          agentTag: "community",
          crewTag: "community",
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
        (tool) => tool.name === "discord_dm" && tool.status === "ok",
      )?.result;

      if (task.source === "discord" && !outboundResult) {
        outboundResult = await executeToolCall(
          "discord_dm",
          { userId: discordTargets.userId, message: modelResult.text },
          integrationConfigs,
        );
      }

      const outboundStatus = outboundResult && !isToolResultError(outboundResult) ? "ok" : "error";
      await ctx.runMutation(internal.traces.recordInternal, {
        runId: args.runId,
        taskId: task._id,
        agentId: assignedAgent._id,
        agentTag: "community",
        crewTag: "community",
        crewName: assignedAgent.crewName,
        action: outboundStatus === "ok"
          ? "Delivered moderation warning DM after spam/violation detected."
          : "Failed to deliver moderation warning DM after spam/violation detected.",
        stepType: "tool_call",
        model: modelResult.model,
        status: outboundStatus === "ok" ? "warn" : "error",
        toolName: "discord_dm",
        toolOutputPreview: (outboundResult ?? "Discord DM was not delivered.").slice(0, 200),
        tokensIn: modelResult.tokensIn,
        tokensOut: modelResult.tokensOut,
        costCents: modelResult.costCents,
        latencyMs: modelResult.latencyMs,
        cacheHit: false,
        cacheTokens: 0,
        confidence: 0.88,
        workspaceId: args.workspaceId,
      });

      if (outboundStatus === "error") {
        throw new Error(outboundResult ?? "Discord DM was not delivered.");
      }

      const reason =
        "Discord content violated community guidelines - warning DM sent, escalated for founder review.";

      await ctx.runMutation(internal.tasks.escalateTaskInternal, {
        taskId: task._id,
        reason,
        totalTokens: modelResult.tokensIn + modelResult.tokensOut,
        totalCostCents: modelResult.costCents,
        latencyMs: modelResult.latencyMs,
      });

      return { status: "escalated" as const, reason };
    }

    const userPrompt =
      contentClass === "feature_request"
        ? `Discord message (feature request):\n${task.summary}\n\nAction: acknowledge and confirm it has been logged.${episodicContext}`
        : `Discord message (product question):\n${task.summary}\n\nAction: reply helpfully in thread.${episodicContext}`;

    let modelResult: AgenticLoopResult;
    try {
      modelResult = await runAgenticToolLoop({
        ctx,
        runId: args.runId,
        taskId: task._id,
        agentId: assignedAgent._id,
        agentTag: "community",
        crewTag: "community",
        crewName: assignedAgent.crewName,
        modelId: assignedAgent.modelId,
        agentName: assignedAgent.name,
        workspaceId: args.workspaceId,
        systemPrompt,
        userPrompt,
        maxTokens: 320,
        tools: COMMUNITY_TOOLS,
        mockText: fallbackText,
        toolDefaults: {
          discord_dm: { userId: discordTargets.userId },
          discord_reply: { channelId: discordTargets.channelId },
        },
      });
    } catch (error: unknown) {
      const reason = `AI model failed while drafting community response: ${errorMessage(error)}`;

      await ctx.runMutation(internal.traces.recordInternal, {
        runId: args.runId,
        taskId: task._id,
        agentId: assignedAgent._id,
        agentTag: "community",
        crewTag: "community",
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
      (tool) => tool.name === "discord_reply" && tool.status === "ok",
    )?.result;

    if (task.source === "discord" && !outboundResult) {
      outboundResult = await executeToolCall(
        "discord_reply",
        { channelId: discordTargets.channelId, message: modelResult.text },
        integrationConfigs,
      );

      const outboundStatus = isToolResultError(outboundResult) ? "error" : "ok";
      await ctx.runMutation(internal.traces.recordInternal, {
        runId: args.runId,
        taskId: task._id,
        agentId: assignedAgent._id,
        agentTag: "community",
        crewTag: "community",
        crewName: assignedAgent.crewName,
        action: `Delivered Discord ${contentClass === "feature_request" ? "feature acknowledgment" : "reply"} for task ${task.externalId ?? task._id}.`,
        stepType: "tool_call",
        model: modelResult.model,
        status: outboundStatus,
        toolName: "discord_reply",
        toolOutputPreview: outboundResult.slice(0, 200),
        tokensIn: 0,
        tokensOut: 0,
        costCents: 0,
        latencyMs: Math.max(1, Math.round(modelResult.latencyMs / 4)),
        cacheHit: false,
        cacheTokens: 0,
        confidence: outboundStatus === "ok" ? 0.9 : 0.2,
        workspaceId: args.workspaceId,
      });

      if (outboundStatus === "error") {
        throw new Error(outboundResult);
      }
    }

    await ctx.runMutation(internal.traces.recordInternal, {
      runId: args.runId,
      taskId: task._id,
      agentId: assignedAgent._id,
      agentTag: "community",
      crewTag: "community",
      crewName: assignedAgent.crewName,
      action:
        contentClass === "feature_request"
          ? `${assignedAgent.name} acknowledged feature request and queued it for product review.`
          : `${assignedAgent.name} drafted Discord reply for product question.`,
      stepType: "llm_call",
      model: modelResult.model,
      status: "ok",
      toolName: undefined,
      toolOutputPreview: undefined,
      tokensIn: modelResult.tokensIn,
      tokensOut: modelResult.tokensOut,
      costCents: modelResult.costCents,
      latencyMs: modelResult.latencyMs,
      cacheHit: false,
      cacheTokens: 0,
      confidence: 0.87,
      workspaceId: args.workspaceId,
    });

    await ctx.runMutation(internal.traces.recordInternal, {
      runId: args.runId,
      taskId: task._id,
      agentId: assignedAgent._id,
      agentTag: "community",
      crewTag: "community",
      crewName: assignedAgent.crewName,
      action: outboundResult
        ? `Confirmed Discord ${contentClass === "feature_request" ? "feature acknowledgment" : "reply"} delivery for task ${task.externalId ?? task._id}.`
        : `${assignedAgent.name} prepared a community response for task ${task._id}.`,
      stepType: "resolution",
      model: modelResult.model,
      status: "ok",
      toolName: outboundResult ? "discord_reply" : undefined,
      toolOutputPreview: (outboundResult ?? modelResult.text).slice(0, 160),
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

    return { status: "resolved" as const, resolution: modelResult.text };
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
            internal.agent_runner.community.handleTask,
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
