import type { CrewTag } from "@/lib/dashboard";

type AgentStatus =
  | "active"
  | "idle"
  | "done"
  | "orchestrating"
  | "critical"
  | "paused";

type DashboardCrewTag = CrewTag | "executive";

export type DemoDashboardStats = {
  agentsManaged: number;
  tasksToday: number;
  autoResolved: number;
  totalTokens: number;
  escalated: number;
  costTodayCents: number;
};

export type DemoCrewStats = {
  agentCount: number;
  workflowCount: number;
  active: boolean;
  tasksToday: number;
  costTodayCents: number;
  activeWorkflows: number;
};

export type DemoAgent = {
  id: string;
  crewTag: DashboardCrewTag;
  name: string;
  description: string;
  status: AgentStatus;
  lastAction: string;
  integrationNames: string[];
  workflowCount: number;
};

export type DemoTrace = {
  runId: string;
  agentTag: "executive" | "finance" | "support" | "community";
  crewName: string;
  action: string;
  stepType: string;
  model: string;
  status: "ok" | "warn" | "error";
  tokensIn: number;
  tokensOut: number;
  costCents: number;
  latencyMs: number;
  cacheHit: boolean;
  cacheTokens: number;
  confidence?: number;
  toolName?: string;
  toolOutputPreview?: string;
  createdAt: number;
};

export const DEMO_DASHBOARD_STATS: DemoDashboardStats = {
  agentsManaged: 8,
  tasksToday: 42,
  autoResolved: 34,
  totalTokens: 48620,
  escalated: 2,
  costTodayCents: 934,
};

export const DEMO_CREW_STATS: Record<CrewTag, DemoCrewStats> = {
  finance: {
    agentCount: 2,
    workflowCount: 3,
    active: true,
    tasksToday: 11,
    costTodayCents: 282,
    activeWorkflows: 3,
  },
  support: {
    agentCount: 2,
    workflowCount: 2,
    active: true,
    tasksToday: 18,
    costTodayCents: 341,
    activeWorkflows: 2,
  },
  community: {
    agentCount: 2,
    workflowCount: 1,
    active: true,
    tasksToday: 13,
    costTodayCents: 197,
    activeWorkflows: 1,
  },
};

const DEMO_AGENTS: DemoAgent[] = [
  {
    id: "exec-overseer",
    crewTag: "executive",
    name: "Overseer Prime",
    description: "Cross-crew orchestration",
    status: "orchestrating",
    lastAction: "Re-prioritized renewal recovery after Stripe latency alert",
    integrationNames: ["Convex", "Stripe", "Intercom", "Discord"],
    workflowCount: 4,
  },
  {
    id: "finance-billing-guard",
    crewTag: "finance",
    name: "Billing Guard",
    description: "Revenue Protection & Stripe Logic",
    status: "active",
    lastAction: "Resolved duplicate charge workflow wf-2041",
    integrationNames: ["Stripe", "Convex"],
    workflowCount: 3,
  },
  {
    id: "finance-growth-striker",
    crewTag: "finance",
    name: "Growth Striker",
    description: "Dunning & Recovery Campaigns",
    status: "idle",
    lastAction: "Queued renewal outreach for 42 delinquent accounts",
    integrationNames: ["Resend", "Stripe"],
    workflowCount: 0,
  },
  {
    id: "support-scout",
    crewTag: "support",
    name: "Support Scout",
    description: "FAQ & Technical Triage",
    status: "active",
    lastAction: "Closed onboarding issue with updated API key guidance",
    integrationNames: ["Intercom", "Convex"],
    workflowCount: 2,
  },
  {
    id: "support-doc-weaver",
    crewTag: "support",
    name: "Doc Weaver",
    description: "Knowledge Base Maintenance",
    status: "active",
    lastAction: "Published refreshed billing FAQ snippets",
    integrationNames: ["Notion", "GitHub"],
    workflowCount: 1,
  },
  {
    id: "community-comm-sentry",
    crewTag: "community",
    name: "Comm Sentry",
    description: "Discord & Slack Moderation",
    status: "active",
    lastAction: "Answered cancellation question in #support",
    integrationNames: ["Discord", "Slack"],
    workflowCount: 1,
  },
  {
    id: "community-sentiment-sniper",
    crewTag: "community",
    name: "Sentiment Sniper",
    description: "Social Monitoring & PR Alerts",
    status: "idle",
    lastAction: "Tracking launch sentiment pulse after deploy delay",
    integrationNames: ["Discord", "Slack"],
    workflowCount: 0,
  },
];

export const DEMO_EXECUTIVE_AGENT = DEMO_AGENTS[0];

export function getDemoAgentsByCrew(crewTag: CrewTag) {
  return DEMO_AGENTS.filter((agent) => agent.crewTag === crewTag);
}

export function getDemoTraces(now = Date.now()): DemoTrace[] {
  const base = [
    {
      runId: "run-demo-2048",
      agentTag: "executive" as const,
      crewName: "Executive",
      action: "Re-prioritized founder escalations after cost spike alert",
      stepType: "overseer_route",
      model: "claude-sonnet-4-6",
      status: "ok" as const,
      tokensIn: 178,
      tokensOut: 102,
      costCents: 15,
      latencyMs: 540,
      cacheHit: true,
      cacheTokens: 144,
      confidence: 0.93,
    },
    {
      runId: "run-demo-2047",
      agentTag: "finance" as const,
      crewName: "Finance Crew",
      action: "Checked retry payment state before sending renewal recovery",
      stepType: "tool_call",
      model: "claude-sonnet-4-6",
      status: "ok" as const,
      tokensIn: 204,
      tokensOut: 118,
      costCents: 18,
      latencyMs: 690,
      cacheHit: false,
      cacheTokens: 0,
      confidence: 0.9,
      toolName: "stripe_lookup",
      toolOutputPreview: "Subscription recovered after second attempt",
    },
    {
      runId: "run-demo-2046",
      agentTag: "support" as const,
      crewName: "Support Crew",
      action: "Drafted release-note answer for API key rotation question",
      stepType: "llm_call",
      model: "claude-sonnet-4-6",
      status: "ok" as const,
      tokensIn: 266,
      tokensOut: 172,
      costCents: 22,
      latencyMs: 780,
      cacheHit: true,
      cacheTokens: 196,
      confidence: 0.91,
    },
    {
      runId: "run-demo-2045",
      agentTag: "community" as const,
      crewName: "Community Crew",
      action: "Posted moderation warning after repeat spam pattern match",
      stepType: "resolution",
      model: "claude-sonnet-4-6",
      status: "warn" as const,
      tokensIn: 146,
      tokensOut: 84,
      costCents: 12,
      latencyMs: 460,
      cacheHit: false,
      cacheTokens: 0,
      confidence: 0.79,
      toolName: "discord_dm",
      toolOutputPreview: "Warning DM sent and thread hidden from public feed",
    },
    {
      runId: "run-demo-2044",
      agentTag: "support" as const,
      crewName: "Support Crew",
      action: "Escalated refund request above founder policy threshold",
      stepType: "escalation",
      model: "claude-sonnet-4-6",
      status: "warn" as const,
      tokensIn: 192,
      tokensOut: 96,
      costCents: 17,
      latencyMs: 620,
      cacheHit: false,
      cacheTokens: 0,
      confidence: 0.82,
    },
    {
      runId: "run-demo-2043",
      agentTag: "finance" as const,
      crewName: "Finance Crew",
      action: "Issued refund confirmation draft after founder approval",
      stepType: "tool_result",
      model: "claude-sonnet-4-6",
      status: "ok" as const,
      tokensIn: 154,
      tokensOut: 103,
      costCents: 13,
      latencyMs: 510,
      cacheHit: true,
      cacheTokens: 118,
      confidence: 0.88,
      toolName: "stripe_refund",
      toolOutputPreview: "Refund queued with id re_mock_2043",
    },
    {
      runId: "run-demo-2042",
      agentTag: "community" as const,
      crewName: "Community Crew",
      action: "Generated founder digest for launch-day Discord chatter",
      stepType: "llm_call",
      model: "claude-sonnet-4-6",
      status: "ok" as const,
      tokensIn: 231,
      tokensOut: 162,
      costCents: 19,
      latencyMs: 740,
      cacheHit: true,
      cacheTokens: 180,
      confidence: 0.9,
    },
    {
      runId: "run-demo-2041",
      agentTag: "executive" as const,
      crewName: "Executive",
      action: "Flagged retry storm risk on webhook worker and rerouted queue",
      stepType: "error",
      model: "claude-sonnet-4-6",
      status: "error" as const,
      tokensIn: 182,
      tokensOut: 91,
      costCents: 16,
      latencyMs: 830,
      cacheHit: false,
      cacheTokens: 0,
      confidence: 0.76,
      toolName: "workflow_router",
      toolOutputPreview: "Shifted workload away from unstable webhook consumer",
    },
  ];

  return base.map((trace, index) => ({
    ...trace,
    createdAt: now - index * 1000 * 60 * 4,
  }));
}

export function hasMeaningfulStats(
  stats:
    | {
        agentsManaged?: number;
        tasksToday?: number;
        totalTokens?: number;
      }
    | null
    | undefined,
) {
  if (!stats) return false;
  return Boolean(
    (stats.agentsManaged ?? 0) > 0 ||
      (stats.tasksToday ?? 0) > 0 ||
      (stats.totalTokens ?? 0) > 0,
  );
}
