/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as agent_runner_billing from "../agent_runner/billing.js";
import type * as agent_runner_community from "../agent_runner/community.js";
import type * as agent_runner_overseer from "../agent_runner/overseer.js";
import type * as agent_runner_support from "../agent_runner/support.js";
import type * as agents from "../agents.js";
import type * as auth from "../auth.js";
import type * as http from "../http.js";
import type * as integrations from "../integrations.js";
import type * as productContext from "../productContext.js";
import type * as tasks from "../tasks.js";
import type * as traces from "../traces.js";
import type * as waitlist from "../waitlist.js";
import type * as webhooks_discord from "../webhooks/discord.js";
import type * as webhooks_intercom from "../webhooks/intercom.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "agent_runner/billing": typeof agent_runner_billing;
  "agent_runner/community": typeof agent_runner_community;
  "agent_runner/overseer": typeof agent_runner_overseer;
  "agent_runner/support": typeof agent_runner_support;
  agents: typeof agents;
  auth: typeof auth;
  http: typeof http;
  integrations: typeof integrations;
  productContext: typeof productContext;
  tasks: typeof tasks;
  traces: typeof traces;
  waitlist: typeof waitlist;
  "webhooks/discord": typeof webhooks_discord;
  "webhooks/intercom": typeof webhooks_intercom;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("@convex-dev/better-auth/_generated/component.js").ComponentApi<"betterAuth">;
};
