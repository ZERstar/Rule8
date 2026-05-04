import { v } from "convex/values";

import { internal } from "./_generated/api";
import { internalQuery, mutation, query } from "./_generated/server";

async function requireIdentity(ctx: { auth: { getUserIdentity: () => Promise<{ tokenIdentifier: string } | null> } }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  return identity;
}

export const getByKey = query({
  args: {
    workspaceId: v.string(),
    key: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.runQuery(internal.workspaces.assertOwned, { workspaceId: args.workspaceId });

    return await ctx.db
      .query("productContext")
      .withIndex("by_workspace_and_key", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("key", args.key),
      )
      .unique();
  },
});

export const listAll = query({
  args: {
    workspaceId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.runQuery(internal.workspaces.assertOwned, { workspaceId: args.workspaceId });

    return await ctx.db
      .query("productContext")
      .withIndex("by_workspace_and_key", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
  },
});

export const listAllInternal = internalQuery({
  args: {
    workspaceId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("productContext")
      .withIndex("by_workspace_and_key", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
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
    updatedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await ctx.runQuery(internal.workspaces.assertOwned, { workspaceId: args.workspaceId });

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
        updatedBy: identity.tokenIdentifier,
      });
      return existing._id;
    }

    return await ctx.db.insert("productContext", {
      workspaceId: args.workspaceId,
      key: args.key,
      value: args.value,
      category: args.category,
      updatedAt: now,
      updatedBy: identity.tokenIdentifier,
    });
  },
});
