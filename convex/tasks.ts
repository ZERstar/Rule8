import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";

const ONE_DAY_MS = 1000 * 60 * 60 * 24;

const crewTagValidator = v.union(
  v.literal("executive"),
  v.literal("finance"),
  v.literal("support"),
  v.literal("community"),
);

export const getById = internalQuery({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.taskId);
  },
});

export const createInboundIntercomTask = internalMutation({
  args: {
    workspaceId: v.string(),
    externalId: v.optional(v.string()),
    summary: v.string(),
    rawPayload: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    return await ctx.db.insert("tasks", {
      source: "intercom",
      externalId: args.externalId,
      summary: args.summary,
      rawPayload: args.rawPayload,
      crewTag: "executive",
      assignedAgentId: undefined,
      routedByOverseer: false,
      status: "pending",
      resolution: undefined,
      escalationReason: undefined,
      totalTokens: 0,
      totalCostCents: 0,
      latencyMs: undefined,
      autoResolved: false,
      workspaceId: args.workspaceId,
      createdAt: now,
      completedAt: undefined,
    });
  },
});

export const assignTask = internalMutation({
  args: {
    taskId: v.id("tasks"),
    crewTag: crewTagValidator,
    assignedAgentId: v.id("agents"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.taskId, {
      crewTag: args.crewTag,
      assignedAgentId: args.assignedAgentId,
      routedByOverseer: true,
      status: "running",
    });
  },
});

export const resolveTaskInternal = internalMutation({
  args: {
    taskId: v.id("tasks"),
    resolution: v.string(),
    totalTokens: v.number(),
    totalCostCents: v.number(),
    latencyMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.taskId, {
      status: "resolved",
      resolution: args.resolution,
      totalTokens: args.totalTokens,
      totalCostCents: args.totalCostCents,
      latencyMs: args.latencyMs,
      autoResolved: true,
      completedAt: Date.now(),
    });
  },
});

export const escalateTaskInternal = internalMutation({
  args: {
    taskId: v.id("tasks"),
    reason: v.string(),
    totalTokens: v.number(),
    totalCostCents: v.number(),
    latencyMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.taskId, {
      status: "escalated",
      escalationReason: args.reason,
      totalTokens: args.totalTokens,
      totalCostCents: args.totalCostCents,
      latencyMs: args.latencyMs,
      autoResolved: false,
      completedAt: Date.now(),
    });
  },
});

export const failTaskInternal = internalMutation({
  args: {
    taskId: v.id("tasks"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.taskId, {
      status: "failed",
      escalationReason: args.reason,
      autoResolved: false,
      completedAt: Date.now(),
    });
  },
});

export const getCrewStats = query({
  args: { workspaceId: v.string(), crewTag: crewTagValidator },
  handler: async (ctx, args) => {
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_workspace_and_crew_tag", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("crewTag", args.crewTag),
      )
      .collect();

    const cutoff = Date.now() - ONE_DAY_MS;
    const recent = tasks.filter((t) => t.createdAt >= cutoff);

    return {
      tasksToday: recent.length,
      costTodayCents: recent.reduce((sum, t) => sum + t.totalCostCents, 0),
      activeWorkflows: recent.filter((t) => t.status === "running").length,
    };
  },
});

export const list = query({
  args: { workspaceId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tasks")
      .withIndex("by_workspace_and_created_at", (q) => q.eq("workspaceId", args.workspaceId))
      .order("desc")
      .collect();
  },
});

export const listEscalated = query({
  args: { workspaceId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tasks")
      .withIndex("by_workspace_and_status", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("status", "escalated"),
      )
      .order("desc")
      .collect();
  },
});

export const resolveEscalation = mutation({
  args: { taskId: v.id("tasks"), resolution: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.taskId, {
      status: "resolved",
      resolution: args.resolution,
      completedAt: Date.now(),
    });
  },
});

export const getStats = query({
  args: { workspaceId: v.string() },
  handler: async (ctx, args) => {
    const [tasks, agents] = await Promise.all([
      ctx.db
        .query("tasks")
        .withIndex("by_workspace_and_created_at", (q) => q.eq("workspaceId", args.workspaceId))
        .collect(),
      ctx.db
        .query("agents")
        .withIndex("by_workspace_and_chamber_id", (q) => q.eq("workspaceId", args.workspaceId))
        .collect(),
    ]);

    const cutoff = Date.now() - ONE_DAY_MS;
    const recentTasks = tasks.filter((task) => task.createdAt >= cutoff);

    return {
      agentsManaged: agents.length,
      tasksToday: recentTasks.length,
      autoResolved: recentTasks.filter((task) => task.autoResolved).length,
      totalTokens: recentTasks.reduce((total, task) => total + task.totalTokens, 0),
      escalated: recentTasks.filter((task) => task.status === "escalated").length,
      costTodayCents: recentTasks.reduce((total, task) => total + task.totalCostCents, 0),
    };
  },
});
