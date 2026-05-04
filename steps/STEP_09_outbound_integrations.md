# STEP 09 — Outbound Integrations

**Phase:** 4 — Integrations
**Depends on:** STEP_05
**Estimated time:** 6–8 hours

---

## Why

Webhooks come in and tasks get created — but agents never reply back. The customer waits forever for a response that never comes. This step wires real outbound actions for Intercom, Discord, and Stripe so agents close the loop on the source platform.

---

## Part A — Provider interface

**New file: `lib/providers/types.ts`**

```ts
export interface OutboundProvider {
  /** Test that the credentials work. Returns error message or null if OK. */
  testConnection(config: IntegrationConfig): Promise<string | null>;

  /** Execute an outbound action. Returns a plain-text result string. */
  executeAction(
    actionKey: string,
    input: Record<string, unknown>,
    config: IntegrationConfig,
  ): Promise<string>;
}

export type IntegrationConfig = {
  accessToken?: string;
  webhookSecret?: string;
  additionalConfig?: Record<string, string>;
};
```

---

## Part B — Intercom provider

**New file: `lib/providers/intercom.ts`**

```ts
import type { IntegrationConfig } from "./types";

const INTERCOM_BASE = "https://api.intercom.io";

export async function executeIntercomReply(
  conversationId: string,
  message: string,
  config: IntegrationConfig,
): Promise<string> {
  if (!config.accessToken) {
    return "[intercom_reply] No access token configured. Set up Intercom in Integrations.";
  }

  const res = await fetch(`${INTERCOM_BASE}/conversations/${conversationId}/reply`, {
    method:  "POST",
    headers: {
      "Authorization":  `Bearer ${config.accessToken}`,
      "Content-Type":   "application/json",
      "Accept":         "application/json",
      "Intercom-Version": "2.10",
    },
    body: JSON.stringify({
      message_type: "comment",
      type:         "admin",
      body:         message,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Intercom reply failed (${res.status}): ${text.slice(0, 200)}`);
  }

  return `Replied to Intercom conversation ${conversationId}`;
}

export async function testIntercomConnection(config: IntegrationConfig): Promise<string | null> {
  if (!config.accessToken) return "No access token provided.";
  const res = await fetch(`${INTERCOM_BASE}/me`, {
    headers: { "Authorization": `Bearer ${config.accessToken}`, "Accept": "application/json" },
  });
  if (!res.ok) return `Token invalid (${res.status})`;
  return null;
}
```

---

## Part C — Discord provider

**New file: `lib/providers/discord.ts`**

```ts
import type { IntegrationConfig } from "./types";

const DISCORD_BASE = "https://discord.com/api/v10";

export async function executeDiscordReply(
  channelId: string,
  message: string,
  config: IntegrationConfig,
): Promise<string> {
  if (!config.accessToken) {
    return "[discord_reply] No bot token configured. Set up Discord in Integrations.";
  }

  const res = await fetch(`${DISCORD_BASE}/channels/${channelId}/messages`, {
    method:  "POST",
    headers: {
      "Authorization": `Bot ${config.accessToken}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify({ content: message }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Discord reply failed (${res.status}): ${text.slice(0, 200)}`);
  }

  return `Replied in Discord channel ${channelId}`;
}

export async function executeDiscordDm(
  userId: string,
  message: string,
  config: IntegrationConfig,
): Promise<string> {
  if (!config.accessToken) {
    return "[discord_dm] No bot token configured.";
  }

  // Step 1: Create DM channel
  const dmRes = await fetch(`${DISCORD_BASE}/users/@me/channels`, {
    method:  "POST",
    headers: {
      "Authorization": `Bot ${config.accessToken}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify({ recipient_id: userId }),
  });

  if (!dmRes.ok) throw new Error(`Discord DM channel creation failed (${dmRes.status})`);
  const dmChannel = await dmRes.json() as { id: string };

  // Step 2: Send message to DM channel
  return executeDiscordReply(dmChannel.id, message, config);
}

export async function testDiscordConnection(config: IntegrationConfig): Promise<string | null> {
  if (!config.accessToken) return "No bot token provided.";
  const res = await fetch(`${DISCORD_BASE}/users/@me`, {
    headers: { "Authorization": `Bot ${config.accessToken}` },
  });
  if (!res.ok) return `Token invalid (${res.status})`;
  return null;
}
```

---

## Part D — Stripe provider (replace mock)

**Modify: `lib/providers/stripe.ts`**

Replace the mock fallback with a real implementation that falls back gracefully:

```ts
import Stripe from "stripe";
import type { IntegrationConfig } from "./types";

function getClient(config: IntegrationConfig): Stripe | null {
  const key = config.accessToken ?? process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, { apiVersion: "2024-12-18.acacia" });
}

export async function executeStripeLookup(
  input: { userEmail: string },
  config: IntegrationConfig,
): Promise<string> {
  const stripe = getClient(config);
  if (!stripe) return "Stripe not connected. Add your Stripe secret key in Integrations.";

  const customers = await stripe.customers.list({ email: input.userEmail, limit: 1 });
  if (!customers.data.length) return `No Stripe customer found for ${input.userEmail}`;

  const customer = customers.data[0];
  const subs = await stripe.subscriptions.list({ customer: customer.id, limit: 3 });

  const subLines = subs.data.map((s) =>
    `${s.status} · ${s.items.data[0]?.price?.nickname ?? "plan"} · $${(s.items.data[0]?.price?.unit_amount ?? 0) / 100}/mo`
  );

  return [
    `Customer: ${customer.name ?? customer.email} (${customer.id})`,
    `Subscriptions: ${subLines.length ? subLines.join("; ") : "none"}`,
  ].join("\n");
}

export async function executeStripeRefund(
  input: { chargeId: string; amountCents: number; reason?: string },
  config: IntegrationConfig,
): Promise<string> {
  const stripe = getClient(config);
  if (!stripe) return "Stripe not connected.";

  const refund = await stripe.refunds.create({
    charge:            input.chargeId,
    amount:            input.amountCents,
    reason:            (input.reason as Stripe.RefundCreateParams.Reason) ?? "requested_by_customer",
  });

  return `Refund created: ${refund.id} · $${(refund.amount / 100).toFixed(2)} · status: ${refund.status}`;
}

export async function testStripeConnection(config: IntegrationConfig): Promise<string | null> {
  const stripe = getClient(config);
  if (!stripe) return "No secret key provided.";
  try {
    await stripe.balance.retrieve();
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : "Connection failed";
  }
}
```

---

## Part E — Wire providers into tool executor

**Modify: `lib/agents/tool-executor.ts`** (created in STEP_05)

Replace the stub implementations with real calls. The tool executor needs access to the workspace's integration credentials.

The executor needs the `IntegrationConfig` per provider. Fetch it from Convex before executing:

```ts
// In convex/agent_runner/*.ts — before calling executeToolCall, fetch config:
const integrationConfigs = await ctx.runQuery(internal.integrations.listConfigs, {
  workspaceId: args.workspaceId,
});
// Pass configs map to executeToolCall
```

**Add to `convex/integrations.ts`:**

```ts
export const listConfigs = internalQuery({
  args: { workspaceId: v.string() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("integrations")
      .withIndex("by_workspace_and_provider", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    // Return a map: provider → { accessToken, config }
    return Object.fromEntries(
      rows.filter((r) => r.status === "connected").map((r) => [
        r.provider,
        {
          accessToken:       r.accessTokenRef ?? undefined,
          additionalConfig:  r.config ? JSON.parse(r.config) : undefined,
        },
      ])
    );
  },
});
```

**Update `lib/agents/tool-executor.ts`:**

```ts
import { executeIntercomReply }         from "@/lib/providers/intercom";
import { executeDiscordReply, executeDiscordDm } from "@/lib/providers/discord";
import { executeStripeLookup, executeStripeRefund } from "@/lib/providers/stripe";
import type { IntegrationConfig } from "@/lib/providers/types";

type ConfigMap = Record<string, IntegrationConfig>;

export async function executeToolCall(
  name:    string,
  input:   Record<string, unknown>,
  configs: ConfigMap,
): Promise<string> {
  try {
    switch (name) {
      case "stripe_lookup":
        return executeStripeLookup(input as { userEmail: string }, configs.stripe ?? {});

      case "stripe_refund":
        return executeStripeRefund(
          input as { chargeId: string; amountCents: number; reason?: string },
          configs.stripe ?? {},
        );

      case "intercom_reply":
        return executeIntercomReply(
          (input as { conversationId: string }).conversationId,
          (input as { message: string }).message,
          configs.intercom ?? {},
        );

      case "discord_reply":
        return executeDiscordReply(
          (input as { channelId: string }).channelId,
          (input as { message: string }).message,
          configs.discord ?? {},
        );

      case "discord_dm":
        return executeDiscordDm(
          (input as { userId: string }).userId,
          (input as { message: string }).message,
          configs.discord ?? {},
        );

      default:
        return `Tool "${name}" is not registered.`;
    }
  } catch (err) {
    return `Tool "${name}" error: ${err instanceof Error ? err.message : String(err)}`;
  }
}
```

---

## Part F — Connection test on integration save

**Modify: `app/(dashboard)/dashboard/integrations/page.tsx`**

After saving an API key, run a connection test and show the result.

```ts
// Add to the save handler:
const testResult = await testConnection(providerKey, apiKey);
if (testResult) {
  // Show error: testResult is the error message
  upsertConnection({ ..., status: "error" });
} else {
  upsertConnection({ ..., status: "connected" });
}
```

**Add to `convex/integrations.ts`:**

```ts
export const testConnection = action({
  args: { workspaceId: v.string(), provider: v.string() },
  handler: async (ctx, args): Promise<{ ok: boolean; error?: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const row = await ctx.runQuery(api.integrations.getByProvider, {
      workspaceId: args.workspaceId,
      provider: args.provider,
    });
    if (!row?.accessTokenRef) return { ok: false, error: "No credentials saved" };

    // Import and call the right test function
    const config: IntegrationConfig = { accessToken: row.accessTokenRef };
    let error: string | null = null;

    if (args.provider === "stripe")   error = await testStripeConnection(config);
    if (args.provider === "intercom") error = await testIntercomConnection(config);
    if (args.provider === "discord")  error = await testDiscordConnection(config);

    if (error) {
      await ctx.runMutation(internal.integrations.updateStatus, {
        id: row._id, status: "error",
      });
      return { ok: false, error };
    }

    await ctx.runMutation(internal.integrations.updateStatus, {
      id: row._id, status: "connected",
    });
    return { ok: true };
  },
});
```

---

## Acceptance Criteria

- [ ] `lib/providers/intercom.ts` exists and exports `executeIntercomReply`, `testIntercomConnection`
- [ ] `lib/providers/discord.ts` exists and exports `executeDiscordReply`, `executeDiscordDm`, `testDiscordConnection`
- [ ] `lib/providers/stripe.ts` uses real Stripe SDK when key present; returns clear error when not
- [ ] `lib/providers/types.ts` defines `OutboundProvider` and `IntegrationConfig`
- [ ] `lib/agents/tool-executor.ts` uses real provider calls instead of stubs
- [ ] When Intercom is connected and a support task resolves, a reply appears in Intercom (test with a real token)
- [ ] When Stripe is connected, `stripe_lookup` returns real customer data
- [ ] Saving an integration credential triggers a connection test and sets status to `connected` or `error`
- [ ] Integration status badge updates in real-time in the Integrations page
- [ ] `npx tsc --noEmit` passes

---

## Completion Notes

- Date completed: 2026-05-02
- Deviations from spec: Stripe is implemented with direct Stripe REST API calls instead of the `stripe` npm SDK because this repo does not currently include a `stripe` dependency. The behaviour is still live when a key is present and returns clear messages when credentials are missing or invalid. Integration list/save/get now validate workspace ownership as part of the Step 9 wiring. Post-review fix on 2026-05-02: support, billing, and community runners now verify outbound tool execution before recording delivery; if the model returns final text without calling the outbound tool, the runner performs a fallback provider send and records the actual result. Provider missing credential/input failures now surface as tool errors instead of successful strings.
- New files created not listed above: None.
- Anything the next agent should know: `npx convex codegen` and `npx tsc --noEmit` pass. Live Intercom, Discord, and Stripe end-to-end checks still need real provider credentials; no live token was available in this workspace during implementation. Tool execution now loads connected integration configs through `internal.integrations.listConfigs`, and support/community runners pass task-derived default conversation/channel/user IDs into provider tools. Credentials are still stored in the existing `integrations.accessTokenRef` field; replacing that with an external secret vault remains a separate hardening task because the current product UI accepts user-entered provider tokens directly.
