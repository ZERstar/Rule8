import { httpAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { WORKSPACE_ID } from "../../lib/constants";

type DiscordPayload = {
  type?: number;
  channel_id?: string;
  content?: string;
  author?: {
    id?: string;
    username?: string;
  };
};

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  const buf = new ArrayBuffer(hex.length / 2);
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

async function verifyDiscordSignature(
  publicKeyHex: string,
  signature: string,
  timestamp: string,
  rawBody: string,
): Promise<boolean> {
  try {
    const publicKey = await crypto.subtle.importKey(
      "raw",
      hexToBytes(publicKeyHex),
      { name: "Ed25519" },
      false,
      ["verify"],
    );
    const message = new TextEncoder().encode(timestamp + rawBody);
    return await crypto.subtle.verify("Ed25519", publicKey, hexToBytes(signature), message);
  } catch {
    return false;
  }
}

export const discordWebhook = httpAction(async (ctx, request) => {
  const rawBody = await request.text();
  const signature = request.headers.get("x-signature-ed25519");
  const timestamp = request.headers.get("x-signature-timestamp");
  const discordPublicKey = process.env.DISCORD_PUBLIC_KEY;

  if (discordPublicKey) {
    if (!signature || !timestamp) {
      return new Response("missing signature headers", { status: 401 });
    }
    const isValid = await verifyDiscordSignature(discordPublicKey, signature, timestamp, rawBody);
    if (!isValid) {
      return new Response("invalid signature", { status: 401 });
    }
  }

  let payload: DiscordPayload;
  try {
    payload = JSON.parse(rawBody) as DiscordPayload;
  } catch {
    return new Response("invalid json", { status: 400 });
  }

  // Respond to Discord's ping challenge (required for webhook registration)
  if (payload.type === 1) {
    return Response.json({ type: 1 });
  }

  const content = payload.content?.trim() ?? "";
  const channelId = payload.channel_id ?? "";
  const authorId = payload.author?.id;
  const authorUsername = payload.author?.username;

  if (!content) {
    return new Response("empty content", { status: 400 });
  }

  const summary = authorUsername
    ? `${content} (Discord: @${authorUsername})`
    : content;

  // Use Discord user ID as identifier for episodic memory
  const userEmail = authorId ? `discord:${authorId}` : undefined;
  const externalId = channelId ? `discord-${channelId}-${Date.now()}` : undefined;

  // Ensure overseer and crew leads exist
  await ctx.runMutation(internal.agents.initializeOverseer, {
    workspaceId: WORKSPACE_ID,
  });

  await ctx.runMutation(internal.agents.initializeCrewLeads, {
    workspaceId: WORKSPACE_ID,
  });

  const taskId = await ctx.runMutation(internal.tasks.createInboundDiscordTask, {
    workspaceId: WORKSPACE_ID,
    externalId,
    summary,
    rawPayload: rawBody,
    userEmail,
  });

  const assignedAgent = await ctx.runQuery(internal.agents.getCrewLead, {
    workspaceId: WORKSPACE_ID,
    crewTag: "community",
  });

  if (assignedAgent) {
    await ctx.runMutation(internal.tasks.assignTask, {
      taskId,
      crewTag: "community",
      assignedAgentId: assignedAgent._id,
    });
  }

  const runId = `run-discord-${Date.now()}`;
  await ctx.scheduler.runAfter(0, internal.agent_runner.community.handleTask, {
    taskId,
    runId,
    workspaceId: WORKSPACE_ID,
  });

  return Response.json({ ok: true, taskId, status: "queued" }, { status: 202 });
});
