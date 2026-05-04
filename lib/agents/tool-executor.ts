import { executeDiscordDm, executeDiscordReply } from "../providers/discord";
import { executeIntercomReply } from "../providers/intercom";
import {
  executeStripeLookup,
  executeStripeRefund,
} from "../providers/stripe";
import type { IntegrationConfig } from "../providers/types";

export type IntegrationConfigMap = Record<string, IntegrationConfig>;

type ToolExecutor = (input: Record<string, unknown>, configs: IntegrationConfigMap) => Promise<string>;

export type ToolExecutionRecord = {
  name: string;
  status: "ok" | "error";
  result: string;
};

export function isToolResultError(result: string) {
  const normalized = result.toLowerCase();
  return (
    normalized.includes(" failed:") ||
    normalized.includes("not configured") ||
    normalized.includes("not connected") ||
    normalized.includes("missing ") ||
    normalized.includes("requires ")
  );
}

function stringInput(input: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = input[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function numberInput(input: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = input[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return 0;
}

const EXECUTORS: Record<string, ToolExecutor> = {
  stripe_lookup: async (input, configs) => {
    const email = stringInput(input, "email", "userEmail", "customerEmail");
    if (!email) throw new Error("stripe_lookup requires an email.");

    return executeStripeLookup(
      {
        userEmail: email,
        summary: stringInput(input, "summary", "reason", "query"),
      },
      configs.stripe ?? {},
    );
  },
  stripe_refund: async (input, configs) => {
    const chargeId = stringInput(input, "chargeId", "charge_id");
    const amountCents = numberInput(input, "amountCents", "amount", "amount_cents");
    if (!chargeId) throw new Error("stripe_refund requires a chargeId.");
    if (!amountCents) throw new Error("stripe_refund requires amountCents.");

    return executeStripeRefund(
      { chargeId, amountCents, reason: stringInput(input, "reason") || undefined },
      configs.stripe ?? {},
    );
  },
  intercom_reply: async (input, configs) =>
    executeIntercomReply(
      stringInput(input, "conversationId", "conversation_id"),
      stringInput(input, "reply", "content", "message"),
      configs.intercom ?? {},
    ),
  discord_reply: async (input, configs) =>
    executeDiscordReply(
      stringInput(input, "channelId", "channel_id"),
      stringInput(input, "content", "reply", "message"),
      configs.discord ?? {},
    ),
  discord_dm: async (input, configs) =>
    executeDiscordDm(
      stringInput(input, "userId", "user_id"),
      stringInput(input, "content", "message"),
      configs.discord ?? {},
    ),
};

export async function executeToolCall(
  name: string,
  input: Record<string, unknown>,
  configs: IntegrationConfigMap,
): Promise<string> {
  const executor = EXECUTORS[name];
  if (!executor) {
    return `Tool "${name}" is not registered. Check tool-executor.ts.`;
  }

  try {
    return await executor(input, configs);
  } catch (error) {
    return `Tool "${name}" failed: ${error instanceof Error ? error.message : String(error)}`;
  }
}
