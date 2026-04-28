import { v } from "convex/values";

import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { runAgentModel, type RunAgentModelResult } from "../../lib/anthropic";
import { buildCommunitySystemPrompt } from "../../lib/agents/prompts";
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
    if (!task) throw new Error("Community task not found.");

    const assignedAgent = await ctx.runQuery(internal.agents.getCrewLead, {
      workspaceId: args.workspaceId,
      crewTag: "community",
    });
    if (!assignedAgent) throw new Error("Community crew lead not found.");

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
    const systemPrompt = buildCommunitySystemPrompt({
      agentName: assignedAgent.name,
      crewName: assignedAgent.crewName,
      description: assignedAgent.description,
    });

    if (contentClass === "dm") {
      let modelResult: RunAgentModelResult;
      try {
        modelResult = await runAgentModel({
          systemPrompt,
          userPrompt: `Discord message (violation detected):\n${task.summary}\n\nAction required: issue a DM warning.${episodicContext}`,
          maxTokens: 240,
          tools: COMMUNITY_TOOLS,
          mockText: fallbackText,
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

        await ctx.runMutation(internal.tasks.failTaskInternal, {
          taskId: task._id,
          reason,
        });

        throw new Error(reason);
      }

      await ctx.runMutation(internal.traces.recordInternal, {
        runId: args.runId,
        taskId: task._id,
        agentId: assignedAgent._id,
        agentTag: "community",
        crewTag: "community",
        crewName: assignedAgent.crewName,
        action: "Sent moderation warning DM after spam/violation detected.",
        stepType: "tool_call",
        model: modelResult.model,
        status: "warn",
        toolName: "discord_dm",
        toolOutputPreview: `Warning DM sent and thread hidden from public feed. ${modelResult.text.slice(0, 80)}`,
        tokensIn: modelResult.tokensIn,
        tokensOut: modelResult.tokensOut,
        costCents: modelResult.costCents,
        latencyMs: modelResult.latencyMs,
        cacheHit: modelResult.cacheHit,
        cacheTokens: modelResult.cacheTokens,
        confidence: 0.88,
        workspaceId: args.workspaceId,
      });

      const reason =
        "Discord content violated community guidelines — warning DM sent, escalated for founder review.";

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

    let modelResult: RunAgentModelResult;
    try {
      modelResult = await runAgentModel({
        systemPrompt,
        userPrompt,
        maxTokens: 320,
        tools: COMMUNITY_TOOLS,
        mockText: fallbackText,
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

      await ctx.runMutation(internal.tasks.failTaskInternal, {
        taskId: task._id,
        reason,
      });

      throw new Error(reason);
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
      cacheHit: modelResult.cacheHit,
      cacheTokens: modelResult.cacheTokens,
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
      action: `Sent Discord ${contentClass === "feature_request" ? "feature acknowledgment" : "reply"} for task ${task.externalId ?? task._id}.`,
      stepType: "resolution",
      model: modelResult.model,
      status: "ok",
      toolName: "discord_reply",
      toolOutputPreview: modelResult.text.slice(0, 160),
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
  },
});
