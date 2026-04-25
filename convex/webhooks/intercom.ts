import { httpAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { WORKSPACE_ID } from "../../lib/constants";

type IntercomPayload = {
  data?: {
    item?: {
      id?: string;
      source?: { body?: string };
      user?: { email?: string; name?: string };
    };
  };
};

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function verifyIntercomSignature(signature: string | null, body: string) {
  const secret = process.env.INTERCOM_WEBHOOK_SECRET;
  if (!secret) {
    return true;
  }

  if (!signature) {
    return false;
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  const expected = `sha1=${toHex(digest)}`;

  if (expected.length !== signature.length) {
    return false;
  }

  let mismatch = 0;
  for (let index = 0; index < expected.length; index += 1) {
    mismatch |= expected.charCodeAt(index) ^ signature.charCodeAt(index);
  }

  return mismatch === 0;
}

export const intercomWebhook = httpAction(async (ctx, request) => {
  const rawBody = await request.text();
  const isValidSignature = await verifyIntercomSignature(
    request.headers.get("x-hub-signature"),
    rawBody,
  );

  if (!isValidSignature) {
    return new Response("invalid signature", { status: 401 });
  }

  let payload: IntercomPayload;
  try {
    payload = JSON.parse(rawBody) as IntercomPayload;
  } catch {
    return new Response("invalid json", { status: 400 });
  }
  const item = payload.data?.item;
  const body = item?.source?.body?.trim() ?? "";
  const email = item?.user?.email?.trim();
  const senderName = item?.user?.name?.trim();

  if (!item?.id || !body) {
    return new Response("invalid payload", { status: 400 });
  }

  const summary = email
    ? `${body} (${email})`
    : senderName
      ? `${body} (${senderName})`
      : body;

  const taskId = await ctx.runMutation(internal.tasks.createInboundIntercomTask, {
    workspaceId: WORKSPACE_ID,
    externalId: item.id,
    summary,
    rawPayload: rawBody,
  });

  const result = await ctx.runAction(internal.agent_runner.overseer.routeTask, {
    taskId,
    workspaceId: WORKSPACE_ID,
  });

  return Response.json(
    {
      ok: true,
      taskId,
      result,
    },
    { status: 202 },
  );
});
