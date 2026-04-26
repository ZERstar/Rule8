export const WORKSPACE_ID = "rule8-demo";

export const CREW_META: Record<
  "finance" | "support" | "community",
  { label: string; icon: string; color: string }
> = {
  finance:   { label: "Finance Crew",   icon: "💰", color: "#14B8A6" },
  support:   { label: "Support Crew",   icon: "🎧", color: "#4D7CFF" },
  community: { label: "Community Crew", icon: "🌐", color: "#8B5CF6" },
};
