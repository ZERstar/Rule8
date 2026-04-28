import type { Id } from "./_generated/dataModel";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";

const DEFAULT_MODEL = process.env.AGENT_MODEL_ID ?? "claude-sonnet-4-6";


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

export const listPromptVersions = query({
  args: {
    workspaceId: v.string(),
    agentId: v.id("agents"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("promptVersions")
      .withIndex("by_workspace_and_agent_id", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("agentId", args.agentId),
      )
      .order("desc")
      .take(args.limit ?? 5);
  },
});

export const initializeOverseer = internalMutation({
  args: { workspaceId: v.string() },
  handler: async (ctx, args) => {
    // Check if overseer already exists
    const existing = await ctx.db
      .query("agents")
      .withIndex("by_workspace_and_crew_tag", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("crewTag", "executive"),
      )
      .take(10);

    if (existing.some((a) => a.tag === "overseer")) {
      return existing.find((a) => a.tag === "overseer")!._id;
    }

    const now = Date.now();
    const overseerPrompt = `You are Rule8's Overseer Agent. Your job is to route inbound tasks to the right crew (Finance, Support, Community, or escalate to Executive review).

Classification guidelines:
- Finance: Billing issues, refunds, charges, payment disputes, invoices, revenue questions
- Support: Product help, onboarding, feature questions, account access, troubleshooting
- Community: Community moderation, Discord/social management, spam, feature requests, sentiment issues
- Executive: Compliance, legal, policy, unusual cases, partnership decisions, escalations

Return a JSON object with: {
  "crewTag": "finance" | "support" | "community" | "escalate",
  "confidence": 0-1,
  "reason": "explanation"
}`;

    const overseerAgentId = await ctx.db.insert("agents", {
      chamberId: "EX",
      name: "Overseer Executive",
      tag: "overseer",
      crewTag: "executive",
      crewName: "Executive",
      crewIcon: "🎯",
      crewColor: "#F59E0B",
      status: "idle",
      description: "Routes and classifies inbound tasks to appropriate crews",
      isCrewLead: true,
      integrationNames: [],
      workflowCount: 0,
      lastAction: "Initialized overseer",
      systemPrompt: overseerPrompt,
      promptVersion: 1,
      modelId: DEFAULT_MODEL,
      integrationIds: [],
      actionsLast24h: 0,
      costLast24hCents: 0,
      workspaceId: args.workspaceId,
      createdAt: now,
      updatedAt: now,
    });

    return overseerAgentId;
  },
});

export const initializeCrewLeads = internalMutation({
  args: { workspaceId: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();
    const crewConfigs = [
      {
        crewTag: "finance" as const,
        tag: "billing" as const,
        name: "Finance Lead",
        icon: "💰",
        color: "#34D399",
        description: "Leads the Finance crew. Handles refunds, disputes, and payment operations.",
      },
      {
        crewTag: "support" as const,
        tag: "support" as const,
        name: "Support Lead",
        icon: "🎧",
        color: "#60A5FA",
        description: "Leads the Support crew. Handles customer onboarding and troubleshooting.",
      },
      {
        crewTag: "community" as const,
        tag: "community" as const,
        name: "Community Lead",
        icon: "🌐",
        color: "#A78BFA",
        description: "Leads the Community crew. Manages moderation and engagement.",
      },
    ];

    const createdLeads: Record<string, string> = {};

    for (const config of crewConfigs) {
      // Check if crew lead already exists
      const existing = await ctx.db
        .query("agents")
        .withIndex("by_workspace_and_crew_tag", (q) =>
          q.eq("workspaceId", args.workspaceId).eq("crewTag", config.crewTag),
        )
        .take(10);

      const hasLead = existing.some((a) => a.isCrewLead);
      if (hasLead) {
        createdLeads[config.crewTag] = existing.find((a) => a.isCrewLead)!._id;
        continue;
      }

      const leadId = await ctx.db.insert("agents", {
        chamberId: config.tag.substring(0, 2).toUpperCase(),
        name: config.name,
        tag: config.tag,
        crewTag: config.crewTag,
        crewName: `${config.name} Crew`,
        crewIcon: config.icon,
        crewColor: config.color,
        status: "idle",
        description: config.description,
        isCrewLead: true,
        integrationNames: [],
        workflowCount: 0,
        lastAction: "Initialized as crew lead",
        systemPrompt: `You are the ${config.name}, leading the ${config.crewTag} crew. ${config.description}`,
        promptVersion: 1,
        modelId: DEFAULT_MODEL,
        integrationIds: [],
        actionsLast24h: 0,
        costLast24hCents: 0,
        workspaceId: args.workspaceId,
        createdAt: now,
        updatedAt: now,
      });

      createdLeads[config.crewTag] = leadId;
    }

    return createdLeads;
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
