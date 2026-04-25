import { v } from "convex/values";

import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { runAgentModel } from "../../lib/anthropic";
import { buildWorkerSystemPrompt } from "../../lib/agents/prompts";
import { SUPPORT_TOOLS } from "../../lib/agents/tools";

function getReplyFallback(summary: string, crewName: string) {
  return `${crewName} reviewed this request and prepared a response: ${summary}. We have taken the next appropriate step and will follow up if anything else is needed.`;
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

    const modelResult = await runAgentModel({
      systemPrompt: buildWorkerSystemPrompt({
        agentName: assignedAgent.name,
        crewName: assignedAgent.crewName,
        description: assignedAgent.description,
      }),
      userPrompt: `Task summary:\n${task.summary}\n\nRaw payload:\n${task.rawPayload}`,
      maxTokens: 320,
      tools: SUPPORT_TOOLS,
      mockText: getReplyFallback(task.summary, assignedAgent.crewName),
    });

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
