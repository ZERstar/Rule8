import { v } from "convex/values";

import { internal } from "./_generated/api";
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { testDiscordConnection } from "../lib/providers/discord";
import { testIntercomConnection } from "../lib/providers/intercom";
import { testStripeConnection } from "../lib/providers/stripe";
import type { IntegrationConfig } from "../lib/providers/types";

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

function parseConfig(config?: string): Record<string, string> | undefined {
  if (!config) return undefined;
  try {
    const parsed = JSON.parse(config) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return undefined;

    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ),
    );
  } catch {
    return undefined;
  }
}

export const list = query({
  args: {
    workspaceId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    await ctx.runQuery(internal.workspaces.assertOwned, { workspaceId: args.workspaceId });

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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    await ctx.runQuery(internal.workspaces.assertOwned, { workspaceId: args.workspaceId });

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

export const listConfigs = internalQuery({
  args: { workspaceId: v.string() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("integrations")
      .withIndex("by_workspace_and_provider", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    return Object.fromEntries(
      rows
        .filter((row) => row.status === "connected")
        .map((row) => [
          row.provider,
          {
            ...(row.accessTokenRef ? { accessToken: row.accessTokenRef } : {}),
            ...(parseConfig(row.config) ? { additionalConfig: parseConfig(row.config) } : {}),
          },
        ]),
    );
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    await ctx.runQuery(internal.workspaces.assertOwned, { workspaceId: args.workspaceId });

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

export const updateStatus = internalMutation({
  args: {
    id: v.id("integrations"),
    status: statusValidator,
  },
  handler: async (ctx, args) => {
    const patch =
      args.status === "connected" ? {
      status: args.status,
      connectedAt: Date.now(),
      updatedAt: Date.now(),
    } : {
      status: args.status,
      updatedAt: Date.now(),
    };
    await ctx.db.patch(args.id, patch);
  },
});

export const listForHealthCheck = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("integrations")
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "connected"),
          q.eq(q.field("status"), "error"),
        ),
      )
      .collect();
  },
});

export const healthCheck = internalAction({
  args: {},
  handler: async (ctx) => {
    const integrations = await ctx.runQuery(internal.integrations.listForHealthCheck, {});

    for (const integration of integrations) {
      const config: IntegrationConfig = {
        ...(integration.accessTokenRef ? { accessToken: integration.accessTokenRef } : {}),
        ...(parseConfig(integration.config) ? { additionalConfig: parseConfig(integration.config) } : {}),
      };

      let error: string | null = null;
      try {
        if (integration.provider === "stripe") error = await testStripeConnection(config);
        else if (integration.provider === "intercom") error = await testIntercomConnection(config);
        else if (integration.provider === "discord") error = await testDiscordConnection(config);
        else continue;
      } catch (err) {
        error = err instanceof Error ? err.message : String(err);
      }

      if (error) {
        await ctx.runMutation(internal.integrations.updateStatus, {
          id: integration._id,
          status: "error",
        });
        if (integration.status !== "error") {
          await ctx.runMutation(internal.notifications.create, {
            workspaceId: integration.workspaceId,
            type: "integration_error",
            title: `${integration.provider} integration error`,
            body: error.slice(0, 140),
            linkTo: "/dashboard/integrations",
          });
        }
      } else if (integration.status === "error") {
        await ctx.runMutation(internal.integrations.updateStatus, {
          id: integration._id,
          status: "connected",
        });
      }
    }
  },
});

export const testConnection = action({
  args: {
    workspaceId: v.string(),
    provider: providerValidator,
  },
  handler: async (ctx, args): Promise<{ ok: boolean; error?: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    await ctx.runQuery(internal.workspaces.assertOwned, { workspaceId: args.workspaceId });

    const row = await ctx.runQuery(internal.integrations.getByProviderInternal, {
      workspaceId: args.workspaceId,
      provider: args.provider,
    });
    if (!row?.accessTokenRef) return { ok: false, error: "No credentials saved" };

    const config: IntegrationConfig = {
      accessToken: row.accessTokenRef,
      additionalConfig: parseConfig(row.config),
    };

    let error: string | null = null;
    if (args.provider === "stripe") error = await testStripeConnection(config);
    else if (args.provider === "intercom") error = await testIntercomConnection(config);
    else if (args.provider === "discord") error = await testDiscordConnection(config);
    else error = "Connection test is not implemented for this provider.";

    await ctx.runMutation(internal.integrations.updateStatus, {
      id: row._id,
      status: error ? "error" : "connected",
    });

    return error ? { ok: false, error } : { ok: true };
  },
});
