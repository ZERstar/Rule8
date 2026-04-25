import { httpRouter } from "convex/server";

import { authComponent, createAuth } from "./auth";
import { intercomWebhook } from "./webhooks/intercom";

const http = httpRouter();

authComponent.registerRoutes(http, createAuth);
http.route({
  path: "/api/webhooks/intercom",
  method: "POST",
  handler: intercomWebhook,
});

export default http;
