import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth/minimal";

import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";
import authConfig from "./auth.config";

const siteUrl =
  process.env.SITE_URL ??
  process.env.NEXT_PUBLIC_SITE_URL ??
  "http://localhost:3000";

const isDefined = <T>(value: T | null | undefined): value is T =>
  value !== null && value !== undefined;

const configuredHost = (() => {
  try {
    return new URL(siteUrl).host;
  } catch {
    return null;
  }
})();

const siteOrigin = (() => {
  try {
    return new URL(siteUrl).origin;
  } catch {
    return siteUrl;
  }
})();

const isLocalHost =
  configuredHost?.startsWith("localhost:") ||
  configuredHost?.startsWith("127.0.0.1:");

const localDevHosts = isLocalHost
  ? [
      "localhost:3000",
      "localhost:3001",
      "localhost:3002",
      "127.0.0.1:3000",
      "127.0.0.1:3001",
      "127.0.0.1:3002",
    ]
  : [];

const allowedHosts = Array.from(
  new Set([configuredHost, ...localDevHosts].filter(isDefined)),
);

const trustedOrigins = Array.from(
  new Set(
    [siteOrigin, ...allowedHosts.map((host) =>
      host.startsWith("localhost:") || host.startsWith("127.0.0.1:")
        ? `http://${host}`
        : `https://${host}`,
    )].filter(isDefined),
  ),
);

export const authComponent = createClient<DataModel>(components.betterAuth);

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth({
    baseURL: {
      allowedHosts,
      fallback: siteUrl,
      protocol: process.env.NODE_ENV === "production" ? "https" : "auto",
    },
    trustedOrigins,
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    plugins: [convex({ authConfig })],
  });
};

export const { getAuthUser } = authComponent.clientApi();

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return await authComponent.getAuthUser(ctx);
  },
});
