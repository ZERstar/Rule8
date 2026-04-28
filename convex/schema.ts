import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const agentStatus = v.union(
  v.literal("active"),
  v.literal("idle"),
  v.literal("critical"),
  v.literal("paused"),
  v.literal("done"),
  v.literal("orchestrating"),
);

const agentTag = v.union(
  v.literal("support"),
  v.literal("billing"),
  v.literal("community"),
  v.literal("outreach"),
  v.literal("overseer"),
  v.literal("system"),
);

const crewTag = v.union(
  v.literal("executive"),
  v.literal("finance"),
  v.literal("support"),
  v.literal("community"),
);

const taskStatus = v.union(
  v.literal("pending"),
  v.literal("running"),
  v.literal("resolved"),
  v.literal("escalated"),
  v.literal("failed"),
);

const traceAgentTag = v.union(
  v.literal("executive"),
  v.literal("finance"),
  v.literal("support"),
  v.literal("community"),
  v.literal("system"),
);

const traceStatus = v.union(
  v.literal("ok"),
  v.literal("warn"),
  v.literal("error"),
);

const traceStepType = v.union(
  v.literal("llm_call"),
  v.literal("tool_call"),
  v.literal("tool_result"),
  v.literal("escalation"),
  v.literal("resolution"),
  v.literal("overseer_route"),
  v.literal("error"),
);

export default defineSchema({
  waitlist: defineTable({
    email: v.string(),
    source: v.optional(v.string()),
    joinedAt: v.number(),
    referrer: v.optional(v.string()),
  }).index("by_email", ["email"]),

  agents: defineTable({
    chamberId: v.string(),
    name: v.string(),
    tag: agentTag,
    crewTag,
    crewName: v.string(),
    crewIcon: v.string(),
    crewColor: v.string(),
    status: agentStatus,
    description: v.string(),
    isCrewLead: v.boolean(),
    integrationNames: v.array(v.string()),
    workflowCount: v.number(),
    lastAction: v.string(),
    systemPrompt: v.optional(v.string()),
    promptVersion: v.number(),
    modelId: v.string(),
    integrationIds: v.array(v.id("integrations")),
    actionsLast24h: v.number(),
    costLast24hCents: v.number(),
    workspaceId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace_and_chamber_id", ["workspaceId", "chamberId"])
    .index("by_workspace_and_crew_tag", ["workspaceId", "crewTag"])
    .index("by_workspace_and_tag", ["workspaceId", "tag"]),

  tasks: defineTable({
    source: v.union(
      v.literal("intercom"),
      v.literal("crisp"),
      v.literal("stripe"),
      v.literal("discord"),
      v.literal("slack"),
      v.literal("manual"),
    ),
    externalId: v.optional(v.string()),
    summary: v.string(),
    rawPayload: v.string(),
    crewTag,
    assignedAgentId: v.optional(v.id("agents")),
    routedByOverseer: v.boolean(),
    status: taskStatus,
    resolution: v.optional(v.string()),
    escalationReason: v.optional(v.string()),
    totalTokens: v.number(),
    totalCostCents: v.number(),
    latencyMs: v.optional(v.number()),
    autoResolved: v.boolean(),
    userEmail: v.optional(v.string()),
    workspaceId: v.string(),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_workspace_and_created_at", ["workspaceId", "createdAt"])
    .index("by_workspace_and_status", ["workspaceId", "status"])
    .index("by_workspace_and_crew_tag", ["workspaceId", "crewTag"])
    .index("by_workspace_and_user_email", ["workspaceId", "userEmail"]),

  traces: defineTable({
    runId: v.string(),
    taskId: v.optional(v.id("tasks")),
    agentId: v.optional(v.id("agents")),
    agentTag: traceAgentTag,
    crewTag,
    crewName: v.string(),
    action: v.string(),
    stepType: traceStepType,
    model: v.string(),
    status: traceStatus,
    toolName: v.optional(v.string()),
    toolOutputPreview: v.optional(v.string()),
    tokensIn: v.number(),
    tokensOut: v.number(),
    costCents: v.number(),
    latencyMs: v.number(),
    cacheHit: v.boolean(),
    cacheTokens: v.number(),
    confidence: v.optional(v.number()),
    workspaceId: v.string(),
    createdAt: v.number(),
  })
    .index("by_workspace_and_created_at", ["workspaceId", "createdAt"])
    .index("by_workspace_and_agent_tag", ["workspaceId", "agentTag"])
    .index("by_task", ["taskId"]),

  evalCases: defineTable({
    agentId: v.id("agents"),
    name: v.string(),
    inputPayload: v.string(),
    expectedOutcome: v.string(),
    grader: v.union(
      v.literal("llm_judge"),
      v.literal("exact_match"),
      v.literal("contains"),
      v.literal("regex"),
    ),
    graderConfig: v.optional(v.string()),
    passingThreshold: v.number(),
    workspaceId: v.string(),
    createdAt: v.number(),
  }).index("by_workspace_and_agent_id", ["workspaceId", "agentId"]),

  evalRuns: defineTable({
    evalCaseId: v.id("evalCases"),
    agentId: v.id("agents"),
    promptVersion: v.number(),
    status: v.union(
      v.literal("running"),
      v.literal("pass"),
      v.literal("fail"),
      v.literal("error"),
    ),
    score: v.optional(v.number()),
    actualOutput: v.optional(v.string()),
    graderReasoning: v.optional(v.string()),
    tokensIn: v.number(),
    tokensOut: v.number(),
    costCents: v.number(),
    triggeredBy: v.union(
      v.literal("manual"),
      v.literal("ci"),
      v.literal("prompt_save"),
    ),
    workspaceId: v.string(),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  }).index("by_workspace_and_agent_id", ["workspaceId", "agentId"]),

  productContext: defineTable({
    workspaceId: v.string(),
    key: v.string(),
    value: v.string(),
    category: v.union(
      v.literal("product"),
      v.literal("billing"),
      v.literal("support"),
      v.literal("community"),
      v.literal("legal"),
    ),
    updatedAt: v.number(),
    updatedBy: v.string(),
  }).index("by_workspace_and_key", ["workspaceId", "key"]),

  integrations: defineTable({
    workspaceId: v.string(),
    provider: v.union(
      v.literal("intercom"),
      v.literal("crisp"),
      v.literal("stripe"),
      v.literal("discord"),
      v.literal("slack"),
      v.literal("github"),
      v.literal("notion"),
      v.literal("resend"),
      v.literal("convex"),
    ),
    status: v.union(
      v.literal("connected"),
      v.literal("disconnected"),
      v.literal("error"),
      v.literal("pending"),
    ),
    accessTokenRef: v.optional(v.string()),
    config: v.optional(v.string()),
    connectedAt: v.optional(v.number()),
    lastWebhookAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_workspace_and_provider", ["workspaceId", "provider"]),

  promptVersions: defineTable({
    agentId: v.id("agents"),
    version: v.number(),
    systemPrompt: v.string(),
    changedBy: v.string(),
    changeNote: v.optional(v.string()),
    evalPassRate: v.optional(v.number()),
    workspaceId: v.string(),
    createdAt: v.number(),
  }).index("by_workspace_and_agent_id", ["workspaceId", "agentId"]),

  chatMessages: defineTable({
    workspaceId: v.string(),
    role: v.union(v.literal("founder"), v.literal("executive")),
    text: v.string(),
    createdAt: v.number(),
  }).index("by_workspace_and_created_at", ["workspaceId", "createdAt"]),
});
