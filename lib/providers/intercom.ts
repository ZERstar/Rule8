import type { IntegrationConfig } from "./types";

const INTERCOM_BASE = "https://api.intercom.io";

export async function executeIntercomReply(
  conversationId: string,
  message: string,
  config: IntegrationConfig,
): Promise<string> {
  if (!config.accessToken) {
    throw new Error("No Intercom access token configured. Set up Intercom in Integrations.");
  }
  if (!conversationId) {
    throw new Error("Missing Intercom conversationId.");
  }
  if (!message) {
    throw new Error("Missing Intercom reply message.");
  }

  const res = await fetch(`${INTERCOM_BASE}/conversations/${conversationId}/reply`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "Intercom-Version": "2.10",
    },
    body: JSON.stringify({
      message_type: "comment",
      type: "admin",
      body: message,
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
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      Accept: "application/json",
      "Intercom-Version": "2.10",
    },
  });

  if (!res.ok) return `Token invalid (${res.status})`;
  return null;
}
