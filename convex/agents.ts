import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";

const DEFAULT_MODEL = process.env.AGENT_MODEL_ID ?? "claude-sonnet-4-6";

const DEMO_AGENTS = [
  {
    chamberId: "01",
    name: "Support Scout",
    tag: "support",
    crewTag: "support",
    crewName: "Support Crew",
    crewIcon: "🎧",
    crewColor: "#60A5FA",
    status: "active",
    description: "FAQ & Technical Triage",
    isCrewLead: true,
    integrationNames: ["Intercom", "Convex"],
    workflowCount: 2,
    lastAction: "Closed onboarding ticket #1482",
    actionsLast24h: 28,
    costLast24hCents: 214,
  },
  {
    chamberId: "02",
    name: "Billing Guard",
    tag: "billing",
    crewTag: "finance",
    crewName: "Finance Crew",
    crewIcon: "💰",
    crewColor: "#34D399",
    status: "active",
    description: "Revenue Protection & Stripe Logic",
    isCrewLead: true,
    integrationNames: ["Stripe", "Convex"],
    workflowCount: 3,
    lastAction: "Resolved duplicate charge workflow wf-2041",
    actionsLast24h: 19,
    costLast24hCents: 186,
  },
  {
    chamberId: "03",
    name: "Comm Sentry",
    tag: "community",
    crewTag: "community",
    crewName: "Community Crew",
    crewIcon: "🌐",
    crewColor: "#A78BFA",
    status: "active",
    description: "Discord & Slack Moderation",
    isCrewLead: true,
    integrationNames: ["Discord", "Slack"],
    workflowCount: 1,
    lastAction: "Answered cancellation question in #support",
    actionsLast24h: 24,
    costLast24hCents: 152,
  },
  {
    chamberId: "04",
    name: "Growth Striker",
    tag: "outreach",
    crewTag: "finance",
    crewName: "Finance Crew",
    crewIcon: "💰",
    crewColor: "#34D399",
    status: "idle",
    description: "Outreach & Lead Gen Pipeline",
    isCrewLead: false,
    integrationNames: ["Resend", "GitHub"],
    workflowCount: 0,
    lastAction: "Queued renewal outreach campaign",
    actionsLast24h: 8,
    costLast24hCents: 61,
  },
  {
    chamberId: "05",
    name: "Doc Weaver",
    tag: "support",
    crewTag: "support",
    crewName: "Support Crew",
    crewIcon: "🎧",
    crewColor: "#60A5FA",
    status: "active",
    description: "Auto-Documentation Updates",
    isCrewLead: false,
    integrationNames: ["Notion", "GitHub"],
    workflowCount: 1,
    lastAction: "Updated billing FAQ snippets",
    actionsLast24h: 13,
    costLast24hCents: 94,
  },
  {
    chamberId: "06",
    name: "Sentiment Sniper",
    tag: "community",
    crewTag: "community",
    crewName: "Community Crew",
    crewIcon: "🌐",
    crewColor: "#A78BFA",
    status: "idle",
    description: "Social Monitoring & PR Alert",
    isCrewLead: false,
    integrationNames: ["Discord", "Slack"],
    workflowCount: 0,
    lastAction: "Monitoring launch sentiment pulse",
    actionsLast24h: 11,
    costLast24hCents: 73,
  },
  {
    chamberId: "07",
    name: "Overseer Prime",
    tag: "overseer",
    crewTag: "executive",
    crewName: "Executive",
    crewIcon: "E",
    crewColor: "#C8972A",
    status: "orchestrating",
    description: "Central Orchestration Node",
    isCrewLead: true,
    integrationNames: ["Convex", "Stripe", "Intercom", "Discord"],
    workflowCount: 4,
    lastAction: "Routing refund and escalation tasks",
    actionsLast24h: 44,
    costLast24hCents: 338,
  },
  {
    chamberId: "08",
    name: "Kill Switch",
    tag: "system",
    crewTag: "executive",
    crewName: "Executive",
    crewIcon: "E",
    crewColor: "#C8972A",
    status: "critical",
    description: "Emergency System Purge",
    isCrewLead: false,
    integrationNames: ["Convex"],
    workflowCount: 0,
    lastAction: "Flagged retry storm on webhook worker",
    actionsLast24h: 3,
    costLast24hCents: 29,
  },
] as const;

const DEMO_TASKS = [
  {
    externalId: "wf-2041",
    source: "intercom",
    summary: "Duplicate charge investigation for test@example.com",
    rawPayload: JSON.stringify({ channel: "intercom", email: "test@example.com" }),
    crewTag: "finance",
    assignedChamberId: "02",
    status: "resolved",
    resolution: "Refund initiated and reply sent",
    escalationReason: undefined,
    totalTokens: 2184,
    totalCostCents: 194,
    latencyMs: 4820,
    autoResolved: true,
    createdAtOffsetMs: 1000 * 60 * 8,
    completedAtOffsetMs: 1000 * 60 * 6,
  },
  {
    externalId: "wf-2042",
    source: "discord",
    summary: "Cancellation question routed from Community Crew",
    rawPayload: JSON.stringify({ channel: "discord", username: "founder_fan" }),
    crewTag: "community",
    assignedChamberId: "03",
    status: "resolved",
    resolution: "Community reply posted in thread",
    escalationReason: undefined,
    totalTokens: 1218,
    totalCostCents: 102,
    latencyMs: 3110,
    autoResolved: true,
    createdAtOffsetMs: 1000 * 60 * 20,
    completedAtOffsetMs: 1000 * 60 * 18,
  },
  {
    externalId: "wf-2043",
    source: "manual",
    summary: "Executive review of policy edge case",
    rawPayload: JSON.stringify({ channel: "dashboard", note: "Refund request above limit" }),
    crewTag: "executive",
    assignedChamberId: "07",
    status: "escalated",
    resolution: undefined,
    escalationReason: "Refund exceeds founder-defined limit",
    totalTokens: 1648,
    totalCostCents: 149,
    latencyMs: 4200,
    autoResolved: false,
    createdAtOffsetMs: 1000 * 60 * 32,
    completedAtOffsetMs: undefined,
  },
  {
    externalId: "wf-2044",
    source: "intercom",
    summary: "Support onboarding question for newly signed founder",
    rawPayload: JSON.stringify({ channel: "intercom", email: "hello@rule8.dev" }),
    crewTag: "support",
    assignedChamberId: "01",
    status: "running",
    resolution: undefined,
    escalationReason: undefined,
    totalTokens: 982,
    totalCostCents: 88,
    latencyMs: undefined,
    autoResolved: false,
    createdAtOffsetMs: 1000 * 60 * 3,
    completedAtOffsetMs: undefined,
  },
  {
    externalId: "wf-2045",
    source: "manual",
    summary: "Documentation refresh for billing FAQ drift",
    rawPayload: JSON.stringify({ channel: "dashboard", section: "billing-faq" }),
    crewTag: "support",
    assignedChamberId: "05",
    status: "resolved",
    resolution: "Published updated article blocks",
    escalationReason: undefined,
    totalTokens: 1436,
    totalCostCents: 117,
    latencyMs: 2740,
    autoResolved: true,
    createdAtOffsetMs: 1000 * 60 * 55,
    completedAtOffsetMs: 1000 * 60 * 53,
  },
  {
    externalId: "wf-2046",
    source: "manual",
    summary: "Outbound recovery experiment queued for failed payments",
    rawPayload: JSON.stringify({ channel: "dashboard", segment: "dunning" }),
    crewTag: "finance",
    assignedChamberId: "04",
    status: "resolved",
    resolution: "Campaign queued for 42 accounts",
    escalationReason: undefined,
    totalTokens: 1124,
    totalCostCents: 96,
    latencyMs: 2190,
    autoResolved: true,
    createdAtOffsetMs: 1000 * 60 * 75,
    completedAtOffsetMs: 1000 * 60 * 73,
  },
  {
    externalId: "wf-2047",
    source: "discord",
    summary: "Community sentiment scan after launch incident",
    rawPayload: JSON.stringify({ channel: "discord", incident: "deploy-delay" }),
    crewTag: "community",
    assignedChamberId: "06",
    status: "resolved",
    resolution: "Alert summary posted to Executive",
    escalationReason: undefined,
    totalTokens: 874,
    totalCostCents: 72,
    latencyMs: 1910,
    autoResolved: true,
    createdAtOffsetMs: 1000 * 60 * 88,
    completedAtOffsetMs: 1000 * 60 * 86,
  },
  {
    externalId: "wf-2048",
    source: "manual",
    summary: "Critical webhook retry storm containment",
    rawPayload: JSON.stringify({ channel: "ops", severity: "critical" }),
    crewTag: "executive",
    assignedChamberId: "08",
    status: "failed",
    resolution: undefined,
    escalationReason: "Manual operator intervention required",
    totalTokens: 654,
    totalCostCents: 54,
    latencyMs: 1260,
    autoResolved: false,
    createdAtOffsetMs: 1000 * 60 * 120,
    completedAtOffsetMs: undefined,
  },
] as const;

const DEMO_TRACES = [
  ["wf-2041", "07", "executive", "Finance Crew", "Classified duplicate charge request and routed to Finance Crew", "overseer_route", "ok", undefined, undefined, 248, 112, 23, 820, true, 312, 0.96],
  ["wf-2041", "02", "finance", "Finance Crew", "Opened Stripe charge lookup for test@example.com", "tool_call", "ok", "stripe_lookup", "Found 2 matching charges in current cycle", 314, 188, 32, 1240, false, 0, 0.93],
  ["wf-2041", "02", "finance", "Finance Crew", "Issued refund and drafted confirmation reply", "resolution", "ok", "stripe_refund", "Refund queued for $24.00", 402, 276, 41, 1730, true, 288, 0.97],
  ["wf-2042", "03", "community", "Community Crew", "Answered cancellation question in Discord thread", "resolution", "ok", "discord_reply", "Shared self-serve cancellation steps", 218, 164, 19, 960, true, 184, 0.94],
  ["wf-2042", "07", "executive", "Community Crew", "Logged community resolution into shared activity stream", "tool_result", "ok", undefined, undefined, 138, 96, 11, 540, true, 96, 0.91],
  ["wf-2043", "07", "executive", "Executive", "Flagged refund request above policy threshold for founder review", "escalation", "warn", undefined, "Escalated because refund exceeded configured limit", 286, 144, 27, 1380, false, 0, 0.68],
  ["wf-2043", "08", "system", "Executive", "Raised manual review incident for policy override", "error", "error", undefined, "Operator acknowledgement pending", 94, 42, 8, 410, false, 0, 0.52],
  ["wf-2044", "07", "executive", "Support Crew", "Routed onboarding question to Support Crew", "overseer_route", "ok", undefined, undefined, 166, 80, 15, 620, true, 128, 0.95],
  ["wf-2044", "01", "support", "Support Crew", "Generated personalized setup steps for founder onboarding", "llm_call", "ok", undefined, undefined, 412, 244, 36, 1520, true, 300, 0.92],
  ["wf-2044", "01", "support", "Support Crew", "Prepared response draft and queued send", "resolution", "ok", "intercom_reply", "Draft ready to send in Intercom", 188, 142, 16, 710, false, 0, 0.9],
  ["wf-2045", "05", "support", "Support Crew", "Compared billing FAQ against current refund policy", "llm_call", "ok", undefined, undefined, 272, 181, 25, 980, true, 220, 0.9],
  ["wf-2045", "05", "support", "Support Crew", "Published documentation updates to shared knowledge base", "tool_result", "ok", "notion_update", "Updated 3 FAQ blocks", 144, 82, 13, 560, false, 0, 0.88],
  ["wf-2046", "04", "finance", "Finance Crew", "Queued failed-payment recovery outreach", "resolution", "ok", "resend_campaign", "42 recovery emails scheduled", 198, 120, 18, 840, false, 0, 0.87],
  ["wf-2046", "07", "executive", "Finance Crew", "Recorded recovery workflow outcome for dashboard rollup", "tool_result", "ok", undefined, undefined, 102, 58, 9, 380, true, 72, 0.89],
  ["wf-2047", "06", "community", "Community Crew", "Scanned launch discussion sentiment for urgent churn risk", "llm_call", "ok", undefined, undefined, 224, 136, 17, 760, true, 168, 0.86],
  ["wf-2047", "06", "community", "Community Crew", "Escalated negative cluster summary to Executive", "tool_result", "warn", "slack_alert", "Sent summary to #founder-alerts", 132, 74, 12, 490, false, 0, 0.81],
  ["wf-2048", "08", "system", "Executive", "Detected retry storm after repeated webhook failures", "error", "error", undefined, "Retry backoff exceeded safety threshold", 76, 31, 7, 260, false, 0, 0.4],
  ["wf-2048", "07", "executive", "Executive", "Issued system-wide critical notice to founder", "escalation", "warn", "slack_alert", "Critical incident pushed to founder DM", 148, 90, 14, 520, false, 0, 0.63],
  ["wf-2041", "02", "finance", "Finance Crew", "Verified refund policy matched workspace configuration", "tool_result", "ok", "policy_lookup", "Refund limit set to $50.00", 118, 68, 10, 410, true, 80, 0.95],
  ["wf-2042", "03", "community", "Community Crew", "Tagged cancellation thread for future support FAQ updates", "tool_result", "ok", "backlog_tag", "Added to support backlog export", 110, 70, 9, 360, false, 0, 0.85],
] as const;

const crewTagValidator = v.union(
  v.literal("executive"),
  v.literal("finance"),
  v.literal("support"),
  v.literal("community"),
);

type AgentBlueprint = {
  crewTag: "finance" | "support" | "community";
  tag: "billing" | "support" | "community";
  crewName: string;
  crewIcon: string;
  crewColor: string;
  integrationNames: string[];
  baseName: string;
  defaultDescription: string;
};

function getCrewBlueprint(brief: string): AgentBlueprint {
  const normalized = brief.toLowerCase();

  if (/(billing|refund|stripe|invoice|payment|revenue|finance)/.test(normalized)) {
    return {
      crewTag: "finance",
      tag: "billing",
      crewName: "Finance Crew",
      crewIcon: "💰",
      crewColor: "#34D399",
      integrationNames: ["Stripe", "Convex"],
      baseName: "Finance",
      defaultDescription: "Billing automation and refund operations",
    };
  }

  if (/(discord|community|moderation|slack|social|spam)/.test(normalized)) {
    return {
      crewTag: "community",
      tag: "community",
      crewName: "Community Crew",
      crewIcon: "🌐",
      crewColor: "#A78BFA",
      integrationNames: ["Discord", "Slack"],
      baseName: "Community",
      defaultDescription: "Community moderation and social operations",
    };
  }

  return {
    crewTag: "support",
    tag: "support",
    crewName: "Support Crew",
    crewIcon: "🎧",
    crewColor: "#60A5FA",
    integrationNames: ["Intercom", "Convex"],
    baseName: "Support",
    defaultDescription: "Customer support and product guidance",
  };
}

function titleCaseName(text: string) {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export const getCrewLead = internalQuery({
  args: { workspaceId: v.string(), crewTag: crewTagValidator },
  handler: async (ctx, args) => {
    const agents = await ctx.db
      .query("agents")
      .withIndex("by_workspace_and_crew_tag", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("crewTag", args.crewTag),
      )
      .take(10);

    return agents.find((agent) => agent.isCrewLead) ?? agents[0] ?? null;
  },
});

export const getOverseer = internalQuery({
  args: { workspaceId: v.string() },
  handler: async (ctx, args) => {
    const agents = await ctx.db
      .query("agents")
      .withIndex("by_workspace_and_crew_tag", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("crewTag", "executive"),
      )
      .take(10);

    return agents.find((agent) => agent.tag === "overseer") ?? agents[0] ?? null;
  },
});

export const listByCrew = query({
  args: { workspaceId: v.string(), crewTag: crewTagValidator },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agents")
      .withIndex("by_workspace_and_crew_tag", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("crewTag", args.crewTag),
      )
      .collect();
  },
});

export const list = query({
  args: { workspaceId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agents")
      .withIndex("by_workspace_and_chamber_id", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
  },
});

export const get = query({
  args: {
    workspaceId: v.string(),
    chamberId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agents")
      .withIndex("by_workspace_and_chamber_id", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("chamberId", args.chamberId),
      )
      .unique();
  },
});

export const createFromBrief = mutation({
  args: {
    workspaceId: v.string(),
    brief: v.string(),
  },
  handler: async (ctx, args) => {
    const blueprint = getCrewBlueprint(args.brief);
    const existingAgents = await ctx.db
      .query("agents")
      .withIndex("by_workspace_and_chamber_id", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    const nextChamberNumber = existingAgents.length + 1;
    const chamberId = String(nextChamberNumber).padStart(2, "0");
    const suffix = existingAgents.filter((agent) => agent.crewTag === blueprint.crewTag).length + 1;

    const compactBrief = args.brief.replace(/\s+/g, " ").trim();
    const inferredName =
      titleCaseName(compactBrief.split(/[:,-]/)[0] ?? "") || `${blueprint.baseName} Forge`;
    const name = `${inferredName} ${suffix}`.trim();
    const now = Date.now();

    const agentId = await ctx.db.insert("agents", {
      chamberId,
      name,
      tag: blueprint.tag,
      crewTag: blueprint.crewTag,
      crewName: blueprint.crewName,
      crewIcon: blueprint.crewIcon,
      crewColor: blueprint.crewColor,
      status: "idle",
      description: compactBrief || blueprint.defaultDescription,
      isCrewLead: false,
      integrationNames: blueprint.integrationNames,
      workflowCount: 0,
      lastAction: "Created from Executive brief",
      systemPrompt: `You are ${name}. ${compactBrief || blueprint.defaultDescription}.`,
      promptVersion: 1,
      modelId: DEFAULT_MODEL,
      integrationIds: [],
      actionsLast24h: 0,
      costLast24hCents: 0,
      workspaceId: args.workspaceId,
      createdAt: now,
      updatedAt: now,
    });

    return {
      agentId,
      chamberId,
      crewTag: blueprint.crewTag,
      name,
    };
  },
});

export const seedDemoData = mutation({
  args: { workspaceId: v.string() },
  handler: async (ctx, args) => {
    await clearWorkspace(ctx, args.workspaceId);

    const now = Date.now();
    const agentIdsByChamber = new Map<string, Id<"agents">>();
    const taskIdsByExternalId = new Map<string, Id<"tasks">>();

    for (const agent of DEMO_AGENTS) {
      const agentId = await ctx.db.insert("agents", {
        ...agent,
        integrationNames: [...agent.integrationNames],
        systemPrompt: `${agent.name} demo system prompt`,
        promptVersion: 1,
        modelId: DEFAULT_MODEL,
        integrationIds: [],
        workspaceId: args.workspaceId,
        createdAt: now,
        updatedAt: now,
      });

      agentIdsByChamber.set(agent.chamberId, agentId);
    }

    await ctx.db.insert("productContext", {
      workspaceId: args.workspaceId,
      key: "refund_limit_cents",
      value: "5000",
      category: "billing",
      updatedAt: now,
      updatedBy: "seed",
    });

    for (const provider of ["stripe", "intercom", "discord", "slack", "resend"] as const) {
      await ctx.db.insert("integrations", {
        workspaceId: args.workspaceId,
        provider,
        status: "disconnected",
        accessTokenRef: undefined,
        config: undefined,
        connectedAt: undefined,
        lastWebhookAt: undefined,
        createdAt: now,
        updatedAt: now,
      });
    }

    for (const task of DEMO_TASKS) {
      const taskId = await ctx.db.insert("tasks", {
        source: task.source,
        externalId: task.externalId,
        summary: task.summary,
        rawPayload: task.rawPayload,
        crewTag: task.crewTag,
        assignedAgentId: agentIdsByChamber.get(task.assignedChamberId),
        routedByOverseer: true,
        status: task.status,
        resolution: task.resolution,
        escalationReason: task.escalationReason,
        totalTokens: task.totalTokens,
        totalCostCents: task.totalCostCents,
        latencyMs: task.latencyMs,
        autoResolved: task.autoResolved,
        workspaceId: args.workspaceId,
        createdAt: now - task.createdAtOffsetMs,
        completedAt:
          task.completedAtOffsetMs === undefined
            ? undefined
            : now - task.completedAtOffsetMs,
      });

      taskIdsByExternalId.set(task.externalId, taskId);
    }

    for (let i = 0; i < DEMO_TRACES.length; i += 1) {
      const [
        taskExternalId,
        chamberId,
        resolvedAgentTag,
        crewName,
        action,
        stepType,
        status,
        toolName,
        toolOutputPreview,
        tokensIn,
        tokensOut,
        costCents,
        latencyMs,
        cacheHit,
        cacheTokens,
        confidence,
      ] = DEMO_TRACES[i];

      const task = DEMO_TASKS.find((entry) => entry.externalId === taskExternalId);
      const createdAt = now - (i + 1) * 1000 * 60 * 2;

      await ctx.db.insert("traces", {
        runId: `run-${taskExternalId}-${i + 1}`,
        taskId: taskIdsByExternalId.get(taskExternalId),
        agentId: agentIdsByChamber.get(chamberId),
        agentTag: resolvedAgentTag,
        crewTag: task?.crewTag ?? "executive",
        crewName,
        action,
        stepType,
        model: DEFAULT_MODEL,
        status,
        toolName,
        toolOutputPreview,
        tokensIn,
        tokensOut,
        costCents,
        latencyMs,
        cacheHit,
        cacheTokens,
        confidence,
        workspaceId: args.workspaceId,
        createdAt,
      });
    }

    return {
      workspaceId: args.workspaceId,
      agentCount: DEMO_AGENTS.length,
      taskCount: DEMO_TASKS.length,
      traceCount: DEMO_TRACES.length,
    };
  },
});

export const updatePrompt = mutation({
  args: {
    agentId: v.id("agents"),
    systemPrompt: v.string(),
    changeNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    if (!agent) throw new Error("Agent not found");

    const newVersion = agent.promptVersion + 1;
    await ctx.db.patch(args.agentId, {
      systemPrompt: args.systemPrompt,
      promptVersion: newVersion,
      updatedAt: Date.now(),
    });

    await ctx.db.insert("promptVersions", {
      agentId: args.agentId,
      version: newVersion,
      systemPrompt: args.systemPrompt,
      changedBy: "founder",
      changeNote: args.changeNote,
      workspaceId: agent.workspaceId,
      createdAt: Date.now(),
    });

    return newVersion;
  },
});

export const purgeTasksAndTraces = mutation({
  args: { workspaceId: v.string() },
  handler: async (ctx, args) => {
    const traces = await ctx.db
      .query("traces")
      .withIndex("by_workspace_and_created_at", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
    for (const trace of traces) {
      await ctx.db.delete(trace._id);
    }

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_workspace_and_created_at", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
    for (const task of tasks) {
      await ctx.db.delete(task._id);
    }
  },
});

async function clearWorkspace(ctx: MutationCtx, workspaceId: string) {
  const traces = await ctx.db
    .query("traces")
    .withIndex("by_workspace_and_created_at", (q) => q.eq("workspaceId", workspaceId))
    .collect();
  for (const trace of traces) {
    await ctx.db.delete(trace._id);
  }

  const tasks = await ctx.db
    .query("tasks")
    .withIndex("by_workspace_and_created_at", (q) => q.eq("workspaceId", workspaceId))
    .collect();
  for (const task of tasks) {
    await ctx.db.delete(task._id);
  }

  const agents = await ctx.db
    .query("agents")
    .withIndex("by_workspace_and_chamber_id", (q) => q.eq("workspaceId", workspaceId))
    .collect();
  for (const agent of agents) {
    await ctx.db.delete(agent._id);
  }

  const integrations = await ctx.db
    .query("integrations")
    .withIndex("by_workspace_and_provider", (q) => q.eq("workspaceId", workspaceId))
    .collect();
  for (const integration of integrations) {
    await ctx.db.delete(integration._id);
  }

  const productContext = await ctx.db
    .query("productContext")
    .withIndex("by_workspace_and_key", (q) => q.eq("workspaceId", workspaceId))
    .collect();
  for (const entry of productContext) {
    await ctx.db.delete(entry._id);
  }
}
