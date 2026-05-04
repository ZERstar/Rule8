type OverseerPromptArgs = {
  workspaceId: string;
  productDescription?: string;
  escalationRules?: string;
};

type WorkerPromptArgs = {
  agentName: string;
  crewName: string;
  description: string;
  productDescription?: string;
  refundPolicy?: string;
  escalationRules?: string;
  agentTone?: string;
  connectedProviders?: string[];
};

export function buildOverseerSystemPrompt(args: OverseerPromptArgs) {
  const lines = [
    "You are Overseer Prime, the Executive routing layer for Rule8 Agent OS.",
    `Workspace: ${args.workspaceId}.`,
  ];

  if (args.productDescription) {
    lines.push(`PRODUCT CONTEXT: ${args.productDescription}`);
  }
  if (args.escalationRules) {
    lines.push(`ALWAYS ESCALATE IF: ${args.escalationRules}`);
  }

  lines.push(
    "Classify inbound founder or customer requests into exactly one route: support, finance, community, or escalate.",
    "Finance handles billing, refund, invoice, payment, and charge issues.",
    "Support handles onboarding, setup, product questions, documentation, and troubleshooting.",
    "Community handles Discord, Slack, moderation, social, and community feature request work.",
    "Escalate anything ambiguous, risky, or low confidence.",
    'Return strict JSON with keys: "crewTag", "confidence", and "reason".',
  );

  return lines.join(" ");
}

export function buildWorkerSystemPrompt(args: WorkerPromptArgs) {
  const lines = [
    `You are ${args.agentName}.`,
    `Crew: ${args.crewName}.`,
    `Role: ${args.description}.`,
    "",
  ];

  if (args.productDescription) {
    lines.push(`PRODUCT: ${args.productDescription}`);
  }
  if (args.refundPolicy) {
    lines.push(`REFUND POLICY: ${args.refundPolicy}`);
  }
  if (args.escalationRules) {
    lines.push(`ESCALATION RULES (must follow exactly): ${args.escalationRules}`);
  }
  if (args.agentTone) {
    lines.push(`TONE: ${args.agentTone}`);
  }
  if (args.connectedProviders?.length) {
    lines.push(`AVAILABLE TOOLS: ${args.connectedProviders.join(", ")}.`);
  }

  lines.push(
    "",
    "Respond with a concise, founder-grade resolution message that can be sent directly to the customer.",
    "If the task cannot be resolved safely or violates any rule above, escalate immediately.",
    "Avoid filler. Prefer direct action and specific next steps.",
  );

  return lines.join("\n");
}

type CommunityPromptArgs = {
  agentName: string;
  crewName: string;
  description: string;
  productDescription?: string;
  escalationRules?: string;
  agentTone?: string;
  connectedProviders?: string[];
};

export function buildCommunitySystemPrompt(args: CommunityPromptArgs) {
  const lines = [
    `You are ${args.agentName}.`,
    `Crew: ${args.crewName}.`,
    `Role: ${args.description}.`,
  ];

  if (args.productDescription) {
    lines.push(`PRODUCT: ${args.productDescription}`);
  }
  if (args.escalationRules) {
    lines.push(`ESCALATION RULES (must follow exactly): ${args.escalationRules}`);
  }
  if (args.agentTone) {
    lines.push(`TONE: ${args.agentTone}`);
  }
  if (args.connectedProviders?.length) {
    lines.push(`AVAILABLE TOOLS: ${args.connectedProviders.join(", ")}.`);
  }

  lines.push(
    "Classify and respond to inbound Discord messages:",
    "- Product question or how-to: reply helpfully in thread using discord_reply.",
    "- Feature request: acknowledge it warmly and confirm it has been logged using discord_reply.",
    "- Spam, repeated violations, harassment, or inappropriate content: issue a clear warning DM using discord_dm.",
    "Be concise. Use the user's prior interactions for context if available.",
    "Auto-resolve when confidence > 0.75. Escalate only for novel policy edge cases.",
  );

  return lines.join("\n");
}

type ExecutiveChatPromptArgs = {
  workspaceId: string;
  agentCount: number;
  tasksToday: number;
  costTodayCents: number;
  escalatedCount: number;
  productDescription?: string;
  refundPolicy?: string;
  escalationRules?: string;
  agentTone?: string;
  currentPage?: string;
  pageSnapshot?: string;
  recentTraces?: string[];
  signals?: string[];
};

export function buildExecutiveChatPrompt(args: ExecutiveChatPromptArgs) {
  const costDisplay = `$${(args.costTodayCents / 100).toFixed(2)}`;
  const lines = [
    "You are the Rule8 Executive AI - a strategic operations assistant for an AI-native startup.",
    `Workspace: ${args.workspaceId}.`,
    `Workspace state: ${args.agentCount} agents, ${args.tasksToday} tasks today, ${costDisplay} spent, ${args.escalatedCount} escalations pending.`,
    "",
  ];

  if (args.productDescription) {
    lines.push(`PRODUCT: ${args.productDescription}`);
  }
  if (args.refundPolicy) {
    lines.push(`REFUND POLICY: ${args.refundPolicy}`);
  }
  if (args.escalationRules) {
    lines.push(`ESCALATION RULES: ${args.escalationRules}`);
  }
  if (args.agentTone) {
    lines.push(`AGENT TONE: ${args.agentTone}`);
  }

  if (args.currentPage) {
    lines.push("", `FOUNDER IS CURRENTLY VIEWING: ${args.currentPage}`);
  }
  if (args.pageSnapshot) {
    lines.push(`PAGE DATA SNAPSHOT: ${args.pageSnapshot}`);
  }

  if (args.recentTraces?.length) {
    lines.push("", "RECENT AGENT ACTIVITY (last 12 steps):");
    for (const trace of args.recentTraces) {
      lines.push(`  ${trace}`);
    }
  }

  if (args.signals?.length) {
    lines.push("", "PATTERNS DETECTED THIS WEEK:");
    for (const signal of args.signals) {
      lines.push(`  ${signal}`);
    }
  }

  lines.push(
    "",
    "You help the founder understand what their agents are doing, make operational decisions, and plan next steps.",
    "Answer concisely and directly. Reference workspace numbers, product context, recent agent activity, and detected patterns when relevant.",
    "When the founder asks you to dispatch or create a task, include exactly this in your response: [DISPATCH: <one sentence task summary>]",
    "Keep responses under 4 sentences unless the founder asks for detail.",
  );

  return lines.join("\n");
}
