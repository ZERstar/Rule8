import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { ConvexHttpClient } from "convex/browser";

import { api } from "../convex/_generated/api";
import designSystem from "../rule8-design-system.json";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL ?? readConvexUrlFromEnvFile();
const workspaceId = process.env.RULE8_WORKSPACE_ID ?? "rule8-demo";

if (!convexUrl) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is required to seed demo data.");
}

const client = new ConvexHttpClient(convexUrl);

async function main() {
  const result = await client.mutation((api as any).agents.seedDemoData, { workspaceId });

  if (result.agentCount !== designSystem.agents.count) {
    throw new Error(
      `Seeded ${result.agentCount} agents, but design system expects ${designSystem.agents.count}.`,
    );
  }

  console.log(`seeded ${result.agentCount} agents, ${result.traceCount} traces`);
}

void main();

function readConvexUrlFromEnvFile() {
  const envLocalPath = join(process.cwd(), ".env.local");
  if (!existsSync(envLocalPath)) {
    return undefined;
  }

  const envFile = readFileSync(envLocalPath, "utf8");
  const match = envFile.match(/^NEXT_PUBLIC_CONVEX_URL=(.+)$/m);
  return match?.[1]?.trim();
}
