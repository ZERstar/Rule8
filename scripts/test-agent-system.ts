import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { ConvexHttpClient } from "convex/browser";

import { api } from "../convex/_generated/api";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL ?? readEnvValue("NEXT_PUBLIC_CONVEX_URL");
const convexSiteUrl =
  process.env.NEXT_PUBLIC_CONVEX_SITE_URL ?? readEnvValue("NEXT_PUBLIC_CONVEX_SITE_URL");
const workspaceId = process.env.RULE8_WORKSPACE_ID ?? "rule8-demo";

if (!convexUrl || !convexSiteUrl) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL and NEXT_PUBLIC_CONVEX_SITE_URL are required.");
}

const client = new ConvexHttpClient(convexUrl);

type Scenario = {
  label: string;
  externalId: string;
  body: string;
  expectedStatus: "resolved" | "escalated";
  expectedCrewTag: "finance" | "support" | "executive";
  requiredTools: string[];
};

const scenarios: Scenario[] = [
  {
    label: "finance-resolve",
    externalId: `conv_test_fin_${Date.now()}`,
    body: "I was charged twice for $24 this month. Can you fix this?",
    expectedStatus: "resolved",
    expectedCrewTag: "finance",
    requiredTools: ["stripe_lookup", "stripe_refund"],
  },
  {
    label: "support-resolve",
    externalId: `conv_test_sup_${Date.now()}`,
    body: "How do I rotate my API key and update the docs link in the dashboard?",
    expectedStatus: "resolved",
    expectedCrewTag: "support",
    requiredTools: ["intercom_reply"],
  },
  {
    label: "finance-escalate",
    externalId: `conv_test_high_${Date.now()}`,
    body: "I was charged twice for $75 this month. Please refund it.",
    expectedStatus: "escalated",
    expectedCrewTag: "finance",
    requiredTools: ["stripe_lookup", "policy_lookup"],
  },
];

async function main() {
  const failures: string[] = [];

  const createdAgent = await client.mutation(api.agents.createFromBrief, {
    workspaceId,
    brief: "Finance refund auditor for duplicate Stripe charge review",
  });
  if (createdAgent.crewTag !== "finance") {
    failures.push(`create-agent: expected finance crew, got ${createdAgent.crewTag}`);
  }

  const agents = await client.query(api.agents.list, { workspaceId });
  if (!agents.some((agent) => agent._id === createdAgent.agentId)) {
    failures.push("create-agent: created agent not returned by agents.list");
  }

  for (const scenario of scenarios) {
    console.log(`Running ${scenario.label}...`);
    await postIntercomWebhook(scenario.externalId, scenario.body);

    const task = await waitForTask(scenario.externalId);
    if (!task) {
      failures.push(`${scenario.label}: task not found`);
      continue;
    }

    if (task.status !== scenario.expectedStatus) {
      failures.push(`${scenario.label}: expected status ${scenario.expectedStatus}, got ${task.status}`);
    }

    if (task.crewTag !== scenario.expectedCrewTag) {
      failures.push(`${scenario.label}: expected crew ${scenario.expectedCrewTag}, got ${task.crewTag}`);
    }

    const traces = await client.query(api.traces.listByTaskId, { taskId: task._id });
    for (const tool of scenario.requiredTools) {
      if (!traces.some((trace) => trace.toolName === tool)) {
        failures.push(`${scenario.label}: missing trace for tool ${tool}`);
      }
    }

    if (scenario.expectedStatus === "resolved" && traces.length < 3) {
      failures.push(`${scenario.label}: expected at least 3 traces, got ${traces.length}`);
    }
  }

  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(`FAIL ${failure}`);
    }
    process.exit(1);
  }

  console.log("Agent system tests passed.");
}

async function postIntercomWebhook(externalId: string, body: string) {
  const response = await fetch(`${convexSiteUrl}/api/webhooks/intercom`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      type: "notification_event",
      data: {
        item: {
          id: externalId,
          source: { body },
          user: { email: `${externalId}@example.com`, name: "Agent Test" },
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Webhook post failed with status ${response.status}`);
  }
}

async function waitForTask(externalId: string) {
  const maxAttempts = 25;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const task = await client.query(api.tasks.getByExternalId, {
      workspaceId,
      externalId,
    });

    if (task && (task.status === "resolved" || task.status === "escalated" || task.status === "failed")) {
      return task;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return null;
}

function readEnvValue(key: string) {
  const envLocalPath = join(process.cwd(), ".env.local");
  if (!existsSync(envLocalPath)) {
    return undefined;
  }

  const contents = readFileSync(envLocalPath, "utf8");
  const match = contents.match(new RegExp(`^${key}=(.+)$`, "m"));
  return match?.[1]?.trim();
}

void main();
