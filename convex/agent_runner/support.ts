import { v } from "convex/values";

import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { runAgentModel, type RunAgentModelResult } from "../../lib/anthropic";
import { buildWorkerSystemPrompt } from "../../lib/agents/prompts";
import { SUPPORT_TOOLS } from "../../lib/agents/tools";

function getReplyFallback(summary: string, crewName: string) {
  return `${crewName} reviewed this request and prepared a response: ${summary}. We have taken the next appropriate step and will follow up if anything else is needed.`;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export const handleTask = internalAction({
  args: {
    taskId: v.id("tasks"),
    runId: v.string(),
    workspaceId: v.string(),
  },
  handler: async (ctx, args) => {
    const task = await ctx.runQuery(internal.tasks.getById, { taskId: args.taskId });
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

    let modelResult: RunAgentModelResult;
    try {
      modelResult = await runAgentModel({
        systemPrompt: buildWorkerSystemPrompt({
          agentName: assignedAgent.name,
          crewName: assignedAgent.crewName,
          description: assignedAgent.description,
        }),
        userPrompt: `Task summary:\n${task.summary}\n\nRaw payload:\n${task.rawPayload}${episodicContext}`,
        maxTokens: 320,
        tools: SUPPORT_TOOLS,
        mockText: getReplyFallback(task.summary, assignedAgent.crewName),
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

      await ctx.runMutation(internal.tasks.failTaskInternal, {
        taskId: task._id,
        reason,
      });

      throw new Error(reason);
    }

    const resolutionPreview = modelResult.text.slice(0, 160);

    await ctx.runMutation(internal.traces.recordInternal, {
      runId: args.runId,
      taskId: task._id,
      agentId: assignedAgent._id,
      agentTag: task.crewTag === "finance" ? "finance" : "support",
      crewTag: task.crewTag,
      crewName: assignedAgent.crewName,
      action: `${assignedAgent.name} generated a customer-facing resolution draft.`,
      stepType: "llm_call",
      model: modelResult.model,
      status: "ok",
      toolName: undefined,
      toolOutputPreview: undefined,
      tokensIn: modelResult.tokensIn,
      tokensOut: modelResult.tokensOut,
      costCents: modelResult.costCents,
      latencyMs: modelResult.latencyMs,
      cacheHit: modelResult.cacheHit,
      cacheTokens: modelResult.cacheTokens,
      confidence: 0.88,
      workspaceId: args.workspaceId,
    });

    await ctx.runMutation(internal.traces.recordInternal, {
      runId: args.runId,
      taskId: task._id,
      agentId: assignedAgent._id,
      agentTag: task.crewTag === "finance" ? "finance" : "support",
      crewTag: task.crewTag,
      crewName: assignedAgent.crewName,
      action: `Sent automated Intercom resolution for task ${task.externalId ?? task._id}.`,
      stepType: "resolution",
      model: modelResult.model,
      status: "ok",
      toolName: "intercom_reply",
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
  },
});
