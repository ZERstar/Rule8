import { v } from "convex/values";

import { internal } from "./_generated/api";
import { internalMutation, mutation, query } from "./_generated/server";

const notificationTypeValidator = v.union(
  v.literal("escalation"),
  v.literal("agent_failed"),
  v.literal("integration_error"),
  v.literal("task_resolved"),
  v.literal("weekly_digest"),
  v.literal("signal_cluster"),
  v.literal("anomaly"),
);

export const listUnread = query({
  args: { workspaceId: v.string() },
  handler: async (ctx, args) => {
    await ctx.runQuery(internal.workspaces.assertOwned, { workspaceId: args.workspaceId });

    return await ctx.db
      .query("notifications")
      .withIndex("by_workspace_and_read_and_created_at", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("read", false),
      )
      .order("desc")
      .take(20);
  },
});

export const unreadCount = query({
  args: { workspaceId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return 0;
    await ctx.runQuery(internal.workspaces.assertOwned, { workspaceId: args.workspaceId });

    const rows = await ctx.db
      .query("notifications")
      .withIndex("by_workspace_and_read", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("read", false),
      )
      .take(100);

    return rows.length;
  },
});

export const markAllRead = mutation({
  args: { workspaceId: v.string() },
  handler: async (ctx, args) => {
    await ctx.runQuery(internal.workspaces.assertOwned, { workspaceId: args.workspaceId });

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_workspace_and_read", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("read", false),
      )
      .take(100);

    await Promise.all(unread.map((notification) => ctx.db.patch(notification._id, { read: true })));
  },
});

export const create = internalMutation({
  args: {
    workspaceId: v.string(),
    type: notificationTypeValidator,
    title: v.string(),
    body: v.string(),
    taskId: v.optional(v.id("tasks")),
    linkTo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("notifications", {
      ...args,
      read: false,
      createdAt: Date.now(),
    });
  },
});
