import { v } from "convex/values";

import { internalQuery, mutation, query } from "./_generated/server";

const providerValidator = v.union(
  v.literal("intercom"),
  v.literal("crisp"),
  v.literal("stripe"),
  v.literal("discord"),
  v.literal("slack"),
  v.literal("github"),
  v.literal("notion"),
  v.literal("resend"),
  v.literal("convex"),
);

const statusValidator = v.union(
  v.literal("connected"),
  v.literal("disconnected"),
  v.literal("error"),
  v.literal("pending"),
);

export const list = query({
  args: {
    workspaceId: v.string(),
  },
  handler: async (ctx, args) => {
    const providers = [
      "stripe",
      "intercom",
      "discord",
      "slack",
      "resend",
    ] as const;

    return await Promise.all(
      providers.map(async (provider) => {
        const integration = await ctx.db
          .query("integrations")
          .withIndex("by_workspace_and_provider", (q) =>
            q.eq("workspaceId", args.workspaceId).eq("provider", provider),
          )
          .unique();

        if (!integration) {
          return null;
        }

        return {
          _id: integration._id,
          provider: integration.provider,
          status: integration.status,
          connectedAt: integration.connectedAt,
          lastWebhookAt: integration.lastWebhookAt,
          hasToken: Boolean(integration.accessTokenRef),
        };
      }),
    );
  },
});

export const getByProvider = query({
  args: {
    workspaceId: v.string(),
    provider: providerValidator,
  },
  handler: async (ctx, args) => {
    const integration = await ctx.db
      .query("integrations")
      .withIndex("by_workspace_and_provider", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("provider", args.provider),
      )
      .unique();

    if (!integration) {
      return null;
    }

    return {
      _id: integration._id,
      provider: integration.provider,
      status: integration.status,
      connectedAt: integration.connectedAt,
      lastWebhookAt: integration.lastWebhookAt,
      hasToken: Boolean(integration.accessTokenRef),
    };
  },
});

export const getByProviderInternal = internalQuery({
  args: {
    workspaceId: v.string(),
    provider: providerValidator,
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("integrations")
      .withIndex("by_workspace_and_provider", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("provider", args.provider),
      )
      .unique();
  },
});

export const upsertConnection = mutation({
  args: {
    workspaceId: v.string(),
    provider: providerValidator,
    status: statusValidator,
    accessTokenRef: v.optional(v.string()),
    config: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("integrations")
      .withIndex("by_workspace_and_provider", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("provider", args.provider),
      )
      .unique();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        status: args.status,
        accessTokenRef: args.accessTokenRef,
        config: args.config,
        connectedAt: args.status === "connected" ? existing.connectedAt ?? now : existing.connectedAt,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("integrations", {
      workspaceId: args.workspaceId,
      provider: args.provider,
      status: args.status,
      accessTokenRef: args.accessTokenRef,
      config: args.config,
      connectedAt: args.status === "connected" ? now : undefined,
      lastWebhookAt: undefined,
      createdAt: now,
      updatedAt: now,
    });
  },
});
