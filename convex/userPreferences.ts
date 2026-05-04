import { v } from "convex/values";

import { internal } from "./_generated/api";
import { mutation, query } from "./_generated/server";

const defaults = {
  escalationNotifications: true,
  compactMode: false,
  commandSuggestions: true,
};

export const get = query({
  args: { workspaceId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    await ctx.runQuery(internal.workspaces.assertOwned, { workspaceId: args.workspaceId });

    const prefs = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", identity.tokenIdentifier))
      .unique();

    return prefs ?? {
      ...defaults,
      userId: identity.tokenIdentifier,
      workspaceId: args.workspaceId,
      updatedAt: 0,
    };
  },
});

export const update = mutation({
  args: {
    workspaceId: v.string(),
    escalationNotifications: v.optional(v.boolean()),
    compactMode: v.optional(v.boolean()),
    commandSuggestions: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    await ctx.runQuery(internal.workspaces.assertOwned, { workspaceId: args.workspaceId });

    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", identity.tokenIdentifier))
      .unique();

    const patch: Partial<typeof defaults> = {};
    if (args.escalationNotifications !== undefined) {
      patch.escalationNotifications = args.escalationNotifications;
    }
    if (args.compactMode !== undefined) {
      patch.compactMode = args.compactMode;
    }
    if (args.commandSuggestions !== undefined) {
      patch.commandSuggestions = args.commandSuggestions;
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...patch,
        workspaceId: args.workspaceId,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("userPreferences", {
      userId: identity.tokenIdentifier,
      workspaceId: args.workspaceId,
      ...defaults,
      ...patch,
      updatedAt: Date.now(),
    });
  },
});
