import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

const ONE_DAY_MS = 1000 * 60 * 60 * 24;
const MAX_RETRIES = 3;

const crewTagValidator = v.union(
  v.literal("executive"),
  v.literal("finance"),
  v.literal("support"),
  v.literal("community"),
);

const failureModeValidator = v.union(
  v.literal("transient"),
  v.literal("permanent"),
);

export const getByIdInternal = internalQuery({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.taskId);
  },
});

export const getById = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const task = await ctx.db.get(args.taskId);
    if (!task) return null;

    const workspace = await ctx.db
      .query("workspaces")
      .withIndex("by_owner", (q) => q.eq("ownerUserId", identity.tokenIdentifier))
      .unique();
    if (!workspace || workspace._id !== task.workspaceId) {
      throw new Error("Unauthorized");
    }

    return task;
  },
});

export const getByExternalId = query({
  args: {
    workspaceId: v.string(),
    externalId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.runQuery(internal.workspaces.assertOwned, { workspaceId: args.workspaceId });

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_workspace_external_id", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("externalId", args.externalId),
      )
      .unique();

    return tasks ?? null;
  },
});

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
    await ctx.runQuery(internal.workspaces.assertOwned, { workspaceId: args.workspaceId });

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
    if (args.externalId) {
      const existing = await ctx.db
        .query("tasks")
        .withIndex("by_workspace_external_id", (q) =>
          q.eq("workspaceId", args.workspaceId).eq("externalId", args.externalId),
        )
        .unique();
      if (existing) return { taskId: existing._id, created: false };
    }

    const now = Date.now();

    const taskId = await ctx.db.insert("tasks", {
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

    return { taskId, created: true };
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
    if (args.externalId) {
      const existing = await ctx.db
        .query("tasks")
        .withIndex("by_workspace_external_id", (q) =>
          q.eq("workspaceId", args.workspaceId).eq("externalId", args.externalId),
        )
        .unique();
      if (existing) return { taskId: existing._id, created: false };
    }

    const now = Date.now();

    const taskId = await ctx.db.insert("tasks", {
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

    return { taskId, created: true };
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

export const listSince = internalQuery({
  args: {
    workspaceId: v.string(),
    since: v.number(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tasks")
      .withIndex("by_workspace_and_created_at", (q) =>
        q.eq("workspaceId", args.workspaceId).gte("createdAt", args.since),
      )
      .order("desc")
      .take(args.limit ?? 500);
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
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

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

    await ctx.runMutation(internal.notifications.create, {
      workspaceId: task.workspaceId,
      type: "escalation",
      title: "New escalation",
      body: args.reason,
      taskId: args.taskId,
      linkTo: "/dashboard/escalations",
    });
  },
});

export const failTaskInternal = internalMutation({
  args: {
    taskId: v.id("tasks"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

    await ctx.db.patch(args.taskId, {
      routedByOverseer: true,
      status: "failed",
      escalationReason: args.reason,
      autoResolved: false,
      completedAt: Date.now(),
    });

    await ctx.runMutation(internal.notifications.create, {
      workspaceId: task.workspaceId,
      type: "agent_failed",
      title: "Agent failed",
      body: args.reason,
      taskId: args.taskId,
      linkTo: "/dashboard/activity",
    });
  },
});

export const scheduleRetry = internalMutation({
  args: {
    taskId: v.id("tasks"),
    error: v.string(),
    failureMode: failureModeValidator,
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) return;

    const retryCount = (task.retryCount ?? 0) + 1;
    const shouldFail = args.failureMode === "permanent" || retryCount > MAX_RETRIES;

    if (shouldFail) {
      await ctx.db.patch(args.taskId, {
        status: "failed",
        failureMode: args.failureMode,
        lastError: args.error,
        retryCount,
        autoResolved: false,
        completedAt: Date.now(),
      });

      await ctx.runMutation(internal.notifications.create, {
        workspaceId: task.workspaceId,
        type: "agent_failed",
        title: "Agent task failed permanently",
        body: args.error.slice(0, 140),
        taskId: args.taskId,
        linkTo: `/dashboard/tasks/${args.taskId}`,
      });
      return;
    }

    const backoffMs = Math.pow(4, retryCount - 1) * 30_000;
    const nextRetryAt = Date.now() + backoffMs;

    await ctx.db.patch(args.taskId, {
      status: "pending",
      retryCount,
      nextRetryAt,
      lastError: args.error,
      failureMode: "transient",
      autoResolved: false,
      completedAt: undefined,
    });
  },
});

export const getCrewStats = query({
  args: { workspaceId: v.string(), crewTag: crewTagValidator },
  handler: async (ctx, args) => {
    await ctx.runQuery(internal.workspaces.assertOwned, { workspaceId: args.workspaceId });

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
    await ctx.runQuery(internal.workspaces.assertOwned, { workspaceId: args.workspaceId });

    return await ctx.db
      .query("tasks")
      .withIndex("by_workspace_and_created_at", (q) => q.eq("workspaceId", args.workspaceId))
      .order("desc")
      .collect();
  },
});

export const listByCrewTag = query({
  args: {
    workspaceId: v.string(),
    crewTag: crewTagValidator,
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.runQuery(internal.workspaces.assertOwned, { workspaceId: args.workspaceId });

    return await ctx.db
      .query("tasks")
      .withIndex("by_workspace_and_crew_tag", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("crewTag", args.crewTag),
      )
      .order("desc")
      .take(args.limit ?? 100);
  },
});

export const listEscalated = query({
  args: { workspaceId: v.string() },
  handler: async (ctx, args) => {
    await ctx.runQuery(internal.workspaces.assertOwned, { workspaceId: args.workspaceId });

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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

    const workspace = await ctx.db
      .query("workspaces")
      .withIndex("by_owner", (q) => q.eq("ownerUserId", identity.tokenIdentifier))
      .unique();
    if (!workspace || workspace._id !== task.workspaceId) {
      throw new Error("Unauthorized");
    }

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
    await ctx.runQuery(internal.workspaces.assertOwned, { workspaceId: args.workspaceId });

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
    await ctx.runQuery(internal.workspaces.assertOwned, { workspaceId: args.workspaceId });

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
