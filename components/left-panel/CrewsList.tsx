"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { WORKSPACE_ID, CREW_META } from "@/lib/constants";

import { CrewRow } from "./CrewRow";
import { SectionLabel } from "@/components/ui/section-label";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

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
  const agentsQuery = useQuery(api.agents.list, { workspaceId: WORKSPACE_ID });
  const createAgent = useMutation(api.agents.createFromBrief);
  const [isCreating, setIsCreating] = useState(false);

  const agents: Doc<"agents">[] = agentsQuery ?? [];

  const crews = (["finance", "support", "community"] as CrewTag[]).map((tag) => {
    const crewAgents = agents.filter((a) => a.crewTag === tag);
    return {
      tag,
      ...CREW_META[tag],
      agentCount: crewAgents.length,
      workflowCount: crewAgents.reduce((sum, a) => sum + a.workflowCount, 0),
      active: crewAgents.some((a) => a.status === "active" || a.status === "orchestrating"),
    };
  });

  const handleNewAgent = async () => {
    if (isCreating) return;
    const brief = window.prompt(
      "Describe the new agent (e.g. 'Refund auditor for Stripe duplicate charges')",
    );
    if (!brief?.trim()) return;
    setIsCreating(true);
    try {
      const result = await createAgent({ workspaceId: WORKSPACE_ID, brief: brief.trim() });
      onSelectCrew(result.crewTag as CrewTag);
    } catch (err) {
      console.error(err);
      window.alert("Could not create agent. Check console.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden p-6">
      {/* Header */}
      <div className="border-b border-[var(--color-b1)] pb-5">
        <div className="flex items-center justify-between gap-3">
          <SectionLabel>Operational Crews</SectionLabel>
          <Button
            size="xs"
            variant="ghost"
            onClick={handleNewAgent}
            disabled={isCreating}
            className="font-mono text-[10px] uppercase tracking-[0.12em]"
          >
            <Plus className="size-3" />
            {isCreating ? "Creating…" : "New"}
          </Button>
        </div>

        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <h3
              className="text-[22px] leading-[1.1] tracking-[-0.02em] text-foreground"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Crew roster
            </h3>
            <p className="mt-2 max-w-[230px] text-[12.5px] leading-[1.55] text-[var(--color-t3)]">
              Each crew owns a surface area. Open a room to inspect execution closely.
            </p>
          </div>
          <div className="rounded-lg border border-[var(--color-b1)] bg-white px-3 py-2 text-right">
            <p className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-[var(--color-t3)]">
              Total
            </p>
            <p className="mt-1 text-[20px] font-semibold leading-none tracking-[-0.02em] text-foreground">
              {crews.length}
            </p>
          </div>
        </div>
      </div>

      {/* Crew list */}
      <div className="app-scroll mt-4 flex flex-1 flex-col gap-2 overflow-y-auto pb-1 pr-1">
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
