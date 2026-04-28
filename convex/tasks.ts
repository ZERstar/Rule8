import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

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

export const getByExternalId = query({
  args: {
    workspaceId: v.string(),
    externalId: v.string(),
  },
  handler: async (ctx, args) => {
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_workspace_and_created_at", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    return tasks.find((task) => task.externalId === args.externalId) ?? null;
  },
});

import { internal } from "./_generated/api";

export const createManualTask = internalMutation({
  args: {
    workspaceId: v.string(),
    summary: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("tasks", {
      source: "manual",
      externalId: undefined,
      summary: args.summary,
      rawPayload: JSON.stringify({ summary: args.summary }),
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
      userEmail: undefined,
      workspaceId: args.workspaceId,
      createdAt: Date.now(),
      completedAt: undefined,
    });
  },
});

export const submitManualTask = action({
  args: {
    workspaceId: v.string(),
    summary: v.string(),
  },
  handler: async (ctx, args): Promise<Id<"tasks">> => {
    // In a real app we might check ctx.auth.getUserIdentity() here
    // But since it's gated at the Next.js layout layer, we'll just run it.

    // Ensure overseer and crew leads exist
    await ctx.runMutation(internal.agents.initializeOverseer, {
      workspaceId: args.workspaceId,
    });

    await ctx.runMutation(internal.agents.initializeCrewLeads, {
      workspaceId: args.workspaceId,
    });

    const taskId: Id<"tasks"> = await ctx.runMutation(internal.tasks.createManualTask, {
      workspaceId: args.workspaceId,
      summary: args.summary,
    });

    await ctx.scheduler.runAfter(0, internal.agent_runner.overseer.routeTask, {
      taskId,
      workspaceId: args.workspaceId,
    });

    return taskId;
  },
});

export const createInboundIntercomTask = internalMutation({
  args: {
    workspaceId: v.string(),
    externalId: v.optional(v.string()),
    summary: v.string(),
    rawPayload: v.string(),
    userEmail: v.optional(v.string()),
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
      userEmail: args.userEmail,
      workspaceId: args.workspaceId,
      createdAt: now,
      completedAt: undefined,
    });
  },
});

export const createInboundDiscordTask = internalMutation({
  args: {
    workspaceId: v.string(),
    externalId: v.optional(v.string()),
    summary: v.string(),
    rawPayload: v.string(),
    userEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    return await ctx.db.insert("tasks", {
      source: "discord",
      externalId: args.externalId,
      summary: args.summary,
      rawPayload: args.rawPayload,
      crewTag: "community",
      assignedAgentId: undefined,
      routedByOverseer: false,
      status: "pending",
      resolution: undefined,
      escalationReason: undefined,
      totalTokens: 0,
      totalCostCents: 0,
      latencyMs: undefined,
      autoResolved: false,
      userEmail: args.userEmail,
      workspaceId: args.workspaceId,
      createdAt: now,
      completedAt: undefined,
    });
  },
});

export const getRecentByUserEmail = internalQuery({
  args: {
    workspaceId: v.string(),
    userEmail: v.string(),
    excludeTaskId: v.id("tasks"),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_workspace_and_user_email", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userEmail", args.userEmail),
      )
      .order("desc")
      .take(args.limit + 1);

    return tasks
      .filter((t) => t._id !== args.excludeTaskId)
      .slice(0, args.limit);
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
      routedByOverseer: true,
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
      routedByOverseer: true,
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

export const listRecent = query({
  args: { workspaceId: v.string(), limit: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tasks")
      .withIndex("by_workspace_and_created_at", (q) => q.eq("workspaceId", args.workspaceId))
      .order("desc")
      .take(args.limit);
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
