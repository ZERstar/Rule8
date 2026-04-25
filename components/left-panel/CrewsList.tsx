"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { WORKSPACE_ID, CREW_META } from "@/lib/constants";
import { CrewRow } from "./CrewRow";

type CrewTag = "finance" | "support" | "community";

export function CrewsList({
  onOpenCrewRoom,
  selectedCrew,
  onSelectCrew,
}: {
  onOpenCrewRoom: (crew: CrewTag) => void;
  selectedCrew: CrewTag;
  onSelectCrew: (crew: CrewTag) => void;
}) {
  const agents = useQuery(api.agents.list, { workspaceId: WORKSPACE_ID });
  type AgentDoc = NonNullable<typeof agents>[number];

  const crews = (["finance", "support", "community"] as CrewTag[]).map((tag) => {
    const crewAgents = (agents ?? []).filter((a: AgentDoc) => a.crewTag === tag);
    return {
      tag,
      ...CREW_META[tag],
      agentCount: crewAgents.length,
      workflowCount: crewAgents.reduce((sum: number, a: AgentDoc) => sum + a.workflowCount, 0),
      active: crewAgents.some((a: AgentDoc) => a.status === "active" || a.status === "orchestrating"),
    };
  });

  return (
    <div className="flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-2.5 py-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: "var(--color-t3)" }}>
          Crews
        </span>
        <button className="font-mono text-[10px] transition" style={{ color: "var(--color-gold)" }}>
          + New
        </button>
      </div>

      {/* Crew rows */}
      <div className="flex flex-col gap-0.5 px-1.5 pb-2">
        {crews.map((crew) => (
          <CrewRow
            key={crew.tag}
            icon={crew.icon}
            label={crew.label}
            color={crew.color}
            agentCount={crew.agentCount}
            workflowCount={crew.workflowCount}
            active={crew.active}
            isSelected={selectedCrew === crew.tag}
            onClick={() => {
              onSelectCrew(crew.tag);
              onOpenCrewRoom(crew.tag);
            }}
          />
        ))}
      </div>
    </div>
  );
}
