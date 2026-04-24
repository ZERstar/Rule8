export const WORKSPACE_ID = "rule8-demo";

export const CREW_META: Record<
  "finance" | "support" | "community",
  { label: string; icon: string; color: string }
> = {
  finance:   { label: "Finance Crew",   icon: "💰", color: "#34D399" },
  support:   { label: "Support Crew",   icon: "🎧", color: "#60A5FA" },
  community: { label: "Community Crew", icon: "🌐", color: "#A78BFA" },
};

export const EXEC_RESPONSES = [
  "Finance Crew is monitoring the Stripe queue. Two refund workflows are active — both within policy. No escalation needed.",
  "Support Crew resolved 28 tickets in the last 24 hours. Average resolution time is 4.2 minutes. Three tickets queued for Doc Weaver.",
  "Community Crew flagged a repeat spam pattern in Discord. Automated warnings issued. Sentiment scan shows stable community health.",
  "All crews are operating within normal parameters. No escalations pending. Daily cost is on track at $8.34 across 8 agents.",
  "I've reviewed the active workflows. wf-2044 is the only running task — the Support agent is finalising a response for an onboarding question.",
];
