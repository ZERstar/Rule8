import { httpRouter } from "convex/server";

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

export default http;
