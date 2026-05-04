import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

import { authComponent, createAuth } from "./auth";
import { intercomWebhook } from "./webhooks/intercom";
import { discordWebhook } from "./webhooks/discord";

const http = httpRouter();

authComponent.registerRoutes(http, createAuth);

http.route({
  path: "/api/webhooks/intercom",
  method: "POST",
  handler: intercomWebhook,
});

http.route({
  path: "/api/webhooks/discord",
  method: "POST",
  handler: discordWebhook,
});

http.route({
  path: "/api/tasks/submit",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = (await request.json()) as { workspaceId: string; summary: string };

      // Initialize overseer and crew leads
      await ctx.runMutation(internal.agents.initializeOverseer, {
        workspaceId: body.workspaceId,
      });

      await ctx.runMutation(internal.agents.initializeCrewLeads, {
        workspaceId: body.workspaceId,
      });

      // Create task
      const taskId = await ctx.runMutation(internal.tasks.createManualTask, {
        workspaceId: body.workspaceId,
        summary: body.summary,
      });

      // Queue routing so HTTP callers don't have to hold a connection open for LLM work.
      await ctx.scheduler.runAfter(0, internal.agent_runner.overseer.routeTask, {
        taskId,
        workspaceId: body.workspaceId,
      });

      return Response.json({ success: true, taskId, status: "queued" }, { status: 202 });
    } catch (error) {
      console.error("submitTaskHttp error:", error);
      return Response.json(
        { success: false, error: String(error) },
        { status: 500 }
      );
    }
  }),
});

export default http;
