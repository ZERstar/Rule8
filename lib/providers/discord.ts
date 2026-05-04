import type { IntegrationConfig } from "./types";

const DISCORD_BASE = "https://discord.com/api/v10";

export async function executeDiscordReply(
  channelId: string,
  message: string,
  config: IntegrationConfig,
): Promise<string> {
  if (!config.accessToken) {
    throw new Error("No Discord bot token configured. Set up Discord in Integrations.");
  }
  if (!channelId) {
    throw new Error("Missing Discord channelId.");
  }
  if (!message) {
    throw new Error("Missing Discord reply message.");
  }

  const res = await fetch(`${DISCORD_BASE}/channels/${channelId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${config.accessToken}`,
      "Content-Type": "application/json",
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
    throw new Error("No Discord bot token configured.");
  }
  if (!userId) {
    throw new Error("Missing Discord userId.");
  }

  const dmRes = await fetch(`${DISCORD_BASE}/users/@me/channels`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${config.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ recipient_id: userId }),
  });

  if (!dmRes.ok) {
    const text = await dmRes.text();
    throw new Error(`Discord DM channel creation failed (${dmRes.status}): ${text.slice(0, 200)}`);
  }

  const dmChannel = (await dmRes.json()) as { id: string };
  return executeDiscordReply(dmChannel.id, message, config);
}

export async function testDiscordConnection(config: IntegrationConfig): Promise<string | null> {
  if (!config.accessToken) return "No bot token provided.";

  const res = await fetch(`${DISCORD_BASE}/users/@me`, {
    headers: { Authorization: `Bot ${config.accessToken}` },
  });

  if (!res.ok) return `Token invalid (${res.status})`;
  return null;
}
