export type CrewTag = "finance" | "support" | "community";

export type RightPanelTab = "crew" | "executive";

export type ExecutiveChatMessage = {
  id: number;
  role: "executive" | "founder";
  text: string;
};

export const INITIAL_EXECUTIVE_MESSAGE =
  "Good morning. All crews are active and running within cost parameters. Finance has 3 workflows in progress. How can I help?";
