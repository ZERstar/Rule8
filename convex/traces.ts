import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";

const crewTagValidator = v.union(
  v.literal("executive"),
  v.literal("finance"),
  v.literal("support"),
  v.literal("community"),
);

const traceAgentTagValidator = v.union(
  v.literal("executive"),
  v.literal("finance"),
  v.literal("support"),
  v.literal("community"),
  v.literal("system"),
);

const traceStatusValidator = v.union(
  v.literal("ok"),
  v.literal("warn"),
  v.literal("error"),
);

const traceStepTypeValidator = v.union(
  v.literal("llm_call"),
  v.literal("tool_call"),
  v.literal("tool_result"),
  v.literal("escalation"),
  v.literal("resolution"),
  v.literal("overseer_route"),
  v.literal("error"),
);

const LIVE_TRACE_TEMPLATES = [
  {
    agentTag: "executive",
    crewTag: "executive",
    crewName: "Executive",
    action: "Re-prioritized founder escalations after cost spike alert",
    stepType: "overseer_route",
    status: "ok",
    toolName: undefined,
    toolOutputPreview: undefined,
    model: "claude-sonnet-4-6",
    tokensIn: 178,
    tokensOut: 102,
    costCents: 15,
    latencyMs: 540,
    cacheHit: true,
    cacheTokens: 144,
    confidence: 0.93,
  },
  {
    agentTag: "finance",
    crewTag: "finance",
    crewName: "Finance Crew",
    action: "Checked retry payment state before sending renewal recovery",
    stepType: "tool_call",
    status: "ok",
    toolName: "stripe_lookup",
    toolOutputPreview: "Subscription recovered for customer after second attempt",
    model: "claude-sonnet-4-6",
    tokensIn: 204,
    tokensOut: 118,
    costCents: 18,
    latencyMs: 690,
    cacheHit: false,
    cacheTokens: 0,
    confidence: 0.9,
  },
  {
    agentTag: "support",
    crewTag: "support",
    crewName: "Support Crew",
    action: "Drafted release-note answer for API key rotation question",
    stepType: "llm_call",
    status: "ok",
    toolName: undefined,
    toolOutputPreview: undefined,
    model: "claude-sonnet-4-6",
    tokensIn: 266,
    tokensOut: 172,
    costCents: 22,
    latencyMs: 780,
    cacheHit: true,
    cacheTokens: 196,
    confidence: 0.91,
  },
  {
    agentTag: "community",
    crewTag: "community",
    crewName: "Community Crew",
    action: "Posted moderation warning after repeat spam pattern match",
    stepType: "resolution",
    status: "warn",
    toolName: "discord_dm",
    toolOutputPreview: "Warning DM sent and thread hidden from public feed",
    model: "claude-sonnet-4-6",
    tokensIn: 146,
    tokensOut: 84,
    costCents: 12,
    latencyMs: 460,
    cacheHit: false,
    cacheTokens: 0,
    confidence: 0.79,
  },
] as const;

export const listRecent = query({
  args: {
    workspaceId: v.string(),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("traces")
      .withIndex("by_workspace_and_created_at", (q) => q.eq("workspaceId", args.workspaceId))
      .order("desc")
      .take(args.limit);
  },
});

export const listByTaskId = query({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("traces")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();
  },
});

export const listByUser = query({
  args: {
    workspaceId: v.string(),
    userEmail: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_workspace_and_user_email", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userEmail", args.userEmail),
      )
      .order("desc")
      .take(10);

    const traceArrays = await Promise.all(
      tasks.map((task) =>
        ctx.db
          .query("traces")
          .withIndex("by_task", (q) => q.eq("taskId", task._id))
          .collect(),
      ),
    );

    return traceArrays
      .flat()
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, args.limit ?? 50);
  },
});

export const recordInternal = internalMutation({
  args: {
    runId: v.string(),
    taskId: v.optional(v.id("tasks")),
    agentId: v.optional(v.id("agents")),
    agentTag: traceAgentTagValidator,
    crewTag: crewTagValidator,
    crewName: v.string(),
    action: v.string(),
    stepType: traceStepTypeValidator,
    model: v.string(),
    status: traceStatusValidator,
    toolName: v.optional(v.string()),
    toolOutputPreview: v.optional(v.string()),
    tokensIn: v.number(),
    tokensOut: v.number(),
    costCents: v.number(),
    latencyMs: v.number(),
    cacheHit: v.boolean(),
    cacheTokens: v.number(),
    confidence: v.optional(v.number()),
    workspaceId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("traces", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const insertDemo = mutation({
  args: { workspaceId: v.string() },
  handler: async (ctx, args) => {
    const template =
      LIVE_TRACE_TEMPLATES[Math.floor(Math.random() * LIVE_TRACE_TEMPLATES.length)];

    const matchingAgent = await ctx.db
      .query("agents")
      .withIndex("by_workspace_and_crew_tag", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("crewTag", template.crewTag),
      )
      .first();

    const traceId = await ctx.db.insert("traces", {
      runId: `run-live-${Date.now()}`,
      taskId: undefined,
      agentId: matchingAgent?._id,
      ...template,
      workspaceId: args.workspaceId,
      createdAt: Date.now(),
    });

    const demoTraces = (await ctx.db
      .query("traces")
      .withIndex("by_workspace_and_created_at", (q) => q.eq("workspaceId", args.workspaceId))
      .order("desc")
      .collect())
      .filter((trace) => trace.runId.startsWith("run-live-") && trace.taskId === undefined);

    for (const trace of demoTraces.slice(20)) {
      await ctx.db.delete(trace._id);
    }

    return { traceId };
  },
});
