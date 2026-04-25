"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { WORKSPACE_ID, CREW_META } from "@/lib/constants";

import { AgentListItem } from "./AgentListItem";
import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/section-label";

type CrewTag = "finance" | "support" | "community";

export function CrewDetail({
  crewTag,
  onOpenCrewRoom,
}: {
  crewTag: CrewTag;
  onOpenCrewRoom: () => void;
}) {
  const meta = CREW_META[crewTag];
  const crewAgents = useQuery(api.agents.listByCrew, { workspaceId: WORKSPACE_ID, crewTag });
  const executive = useQuery(api.agents.listByCrew, { workspaceId: WORKSPACE_ID, crewTag: "executive" });
  const crewStats = useQuery(api.tasks.getCrewStats, { workspaceId: WORKSPACE_ID, crewTag });

  const executiveAgents: Doc<"agents">[] = executive ?? [];
  const crewAgentList: Doc<"agents">[] = crewAgents ?? [];
  const execAgent = executiveAgents.find((a) => a.tag === "overseer");
  const specialists = crewAgentList.filter((a) => a.tag !== "overseer");
  const crewStatsData = crewStats;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-[var(--color-b1)] px-5 py-5">
        <SectionLabel>Crew Detail</SectionLabel>

        <div className="mt-3 flex items-start gap-3">
          <div
            className="flex size-12 shrink-0 items-center justify-center rounded-xl text-[20px]"
            style={{
              background: `${meta.color}14`,
              border: `1px solid ${meta.color}28`,
            }}
          >
            {meta.icon}
          </div>
          <div className="min-w-0 flex-1">
            <h3
              className="truncate text-[22px] leading-[1.1] tracking-[-0.02em] text-foreground"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {meta.label}
            </h3>
            <div className="mt-1.5 flex items-center gap-1.5">
              <span
                className="size-1.5 rounded-full bg-[var(--color-green)]"
                style={{ animation: "pulseDot 2.5s ease-in-out infinite" }}
              />
              <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[var(--color-t3)]">
                Active coverage
              </span>
            </div>
          </div>
        </div>

        <p className="mt-3 text-[12.5px] leading-[1.55] text-[var(--color-t3)]">
          Inspect current specialists, recent work volume, and crew health before opening the room.
        </p>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-3 divide-x divide-[var(--color-b1)] rounded-xl border border-[var(--color-b1)] bg-[var(--color-surface-2)]/40">
          {[
            { label: "Tasks today", value: crewStatsData?.tasksToday ?? "—" },
            { label: "Cost today", value: crewStatsData ? `$${(crewStatsData.costTodayCents / 100).toFixed(2)}` : "—" },
            { label: "Workflows", value: crewStatsData?.activeWorkflows ?? "—" },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col items-center justify-center px-2 py-3">
              <span className="text-[16px] font-semibold tabular-nums tracking-[-0.02em] text-foreground">
                {value}
              </span>
              <span className="mt-1.5 text-center font-mono text-[8.5px] uppercase tracking-[0.12em] text-[var(--color-t3)]">
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Agent list */}
      <div className="app-scroll flex-1 overflow-y-auto px-5 py-4">
        <p className="mb-3 font-mono text-[9.5px] uppercase tracking-[0.14em] text-[var(--color-t3)]">
          Agents
        </p>
        <div className="flex flex-col gap-2.5">
          {execAgent && (
            <AgentListItem
              name="Executive"
              description="Orchestrator"
              status="orchestrating"
              lastAction={execAgent.lastAction}
              integrationNames={execAgent.integrationNames}
              isExecutive
              workflowId="wf-2044"
            />
          )}
          {specialists.map((agent) => (
            <AgentListItem
              key={"id" in agent ? agent.id : agent._id}
              name={agent.name}
              description={agent.description}
              status={agent.status}
              lastAction={agent.lastAction}
              integrationNames={agent.integrationNames}
            />
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="border-t border-[var(--color-b1)] p-4">
        <Button
          variant="outline"
          className="w-full font-mono text-[10px] uppercase tracking-[0.14em]"
          size="lg"
          onClick={onOpenCrewRoom}
        >
          Open Crew Room
          <span>→</span>
        </Button>
      </div>
    </div>
  );
}
