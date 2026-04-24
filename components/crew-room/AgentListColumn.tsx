"use client";

import { useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import { WORKSPACE_ID, CREW_META } from "@/lib/constants";
import type { CrewTag } from "@/lib/dashboard";
import { AgentListItem } from "@/components/right-panel/AgentListItem";

export function AgentListColumn({
  crewTag,
  onOpenExecutive,
}: {
  crewTag: CrewTag;
  onOpenExecutive: () => void;
}) {
  const meta = CREW_META[crewTag];
  const crewAgents = useQuery(api.agents.listByCrew, { workspaceId: WORKSPACE_ID, crewTag });
  const executive = useQuery(api.agents.listByCrew, {
    workspaceId: WORKSPACE_ID,
    crewTag: "executive",
  });

  const execAgent = executive?.find((agent) => agent.tag === "overseer");
  const specialists = (crewAgents ?? []).filter((agent) => agent.tag !== "overseer");

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b px-4 py-3" style={{ borderColor: "var(--color-b1)" }}>
        <p className="font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: "var(--color-t3)" }}>
          {meta.label}
        </p>
        <h2 className="mt-1 text-[18px] font-semibold" style={{ color: "var(--color-t1)" }}>
          Active agents
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        <div className="flex flex-col gap-2">
          {execAgent ? (
            <button className="w-full text-left" onClick={onOpenExecutive} type="button">
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
          ) : null}

          {specialists.map((agent) => (
            <AgentListItem
              key={agent._id}
              description={agent.description}
              integrationNames={agent.integrationNames}
              lastAction={agent.lastAction}
              name={agent.name}
              status={agent.status as "active" | "critical" | "done" | "idle" | "orchestrating" | "paused"}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
