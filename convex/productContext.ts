import { v } from "convex/values";

import { internalQuery, mutation, query } from "./_generated/server";

export const getByKey = query({
  args: {
    workspaceId: v.string(),
    key: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("productContext")
      .withIndex("by_workspace_and_key", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("key", args.key),
      )
      .unique();
  },
});

export const getRefundLimitCents = internalQuery({
  args: {
    workspaceId: v.string(),
  },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query("productContext")
      .withIndex("by_workspace_and_key", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("key", "refund_limit_cents"),
      )
      .unique();

    const parsed = record ? Number.parseInt(record.value, 10) : Number.NaN;
    return Number.isFinite(parsed) ? parsed : 5_000;
  },
});

export const upsert = mutation({
  args: {
    workspaceId: v.string(),
    key: v.string(),
    value: v.string(),
    category: v.union(
      v.literal("product"),
      v.literal("billing"),
      v.literal("support"),
      v.literal("community"),
      v.literal("legal"),
    ),
    updatedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("productContext")
      .withIndex("by_workspace_and_key", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("key", args.key),
      )
      .unique();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        value: args.value,
        category: args.category,
        updatedAt: now,
        updatedBy: args.updatedBy,
      });
      return existing._id;
    }

    return await ctx.db.insert("productContext", {
      workspaceId: args.workspaceId,
      key: args.key,
      value: args.value,
      category: args.category,
      updatedAt: now,
      updatedBy: args.updatedBy,
    });
  },
});
