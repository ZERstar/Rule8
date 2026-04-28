"use client";

import { useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { WORKSPACE_ID, CREW_META } from "@/lib/constants";

import type { CrewTag } from "@/lib/dashboard";
import { AgentListItem } from "@/components/right-panel/AgentListItem";
import { SectionLabel } from "@/components/ui/section-label";

export function AgentListColumn({
  crewTag,
  onOpenExecutive,
}: {
  crewTag: CrewTag;
  onOpenExecutive: () => void;
}) {
  const meta = CREW_META[crewTag];
  const crewAgents = useQuery(api.agents.listByCrew, { workspaceId: WORKSPACE_ID, crewTag });
  const executive = useQuery(api.agents.listByCrew, { workspaceId: WORKSPACE_ID, crewTag: "executive" });

  const executiveAgents: Doc<"agents">[] = executive ?? [];
  const crewAgentList: Doc<"agents">[] = crewAgents ?? [];
  const execAgent = executiveAgents.find((a) => a.tag === "overseer");
  const specialists = crewAgentList.filter((a) => a.tag !== "overseer");

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-[var(--color-b1)] px-5 py-5">
        <SectionLabel dot={false}>{meta.label}</SectionLabel>
        <h3
          className="mt-2 text-[18px] leading-[1.1] tracking-[-0.02em] text-foreground"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Active agents
        </h3>
      </div>

      <div className="app-scroll flex-1 overflow-y-auto px-4 py-4">
        <div className="flex flex-col gap-2.5">
          {execAgent && (
            <button type="button" className="w-full text-left" onClick={onOpenExecutive}>
              <AgentListItem
                description="Cross-crew orchestration"
                integrationNames={execAgent.integrationNames}
                isExecutive
                lastAction={execAgent.lastAction}
                name="Executive"
                status="orchestrating"
                workflowId="wf-2044"
              />
            </button>
          )}

          {specialists.map((agent) => (
            <AgentListItem
              key={agent._id}
              description={agent.description}
              integrationNames={agent.integrationNames}
              lastAction={agent.lastAction}
              name={agent.name}
              status={agent.status}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
