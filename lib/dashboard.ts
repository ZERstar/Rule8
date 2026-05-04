export type CrewTag = "finance" | "support" | "community";

export type CrewKey = CrewTag;

export type RightPanelTab = "crew" | "executive";

export type ExecutiveChatMessage = {
  id: number;
  role: "executive" | "founder";
  text: string;
};
