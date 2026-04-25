"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { WORKSPACE_ID, CREW_META } from "@/lib/constants";
import { AgentListItem } from "./AgentListItem";

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

  type AgentDoc = NonNullable<typeof crewAgents>[number];
  const execAgent = executive?.find((a: AgentDoc) => a.tag === "overseer");
  const specialists = (crewAgents ?? []).filter((a: AgentDoc) => a.tag !== "overseer");

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b px-4 py-3" style={{ borderColor: "var(--color-b1)" }}>
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] text-base"
            style={{ background: `${meta.color}1a` }}
          >
            {meta.icon}
          </div>
          <div>
            <p className="text-[13px] font-semibold" style={{ color: "var(--color-t1)" }}>
              {meta.label}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--color-green)" }} />
              <span className="font-mono text-[10px]" style={{ color: "var(--color-t3)" }}>Active</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-3 grid grid-cols-3 gap-1">
          {[
            { label: "Tasks today",      value: crewStats?.tasksToday ?? "—" },
            { label: "Cost today",       value: crewStats ? `$${(crewStats.costTodayCents / 100).toFixed(2)}` : "—" },
            { label: "Active workflows", value: crewStats?.activeWorkflows ?? "—" },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="flex flex-col items-center rounded-[4px] py-2"
              style={{ background: "var(--color-s2)" }}
            >
              <span className="font-semibold text-[13px]" style={{ color: "var(--color-t1)" }}>{value}</span>
              <span className="mt-0.5 text-center font-mono text-[9px]" style={{ color: "var(--color-t3)" }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Agent list */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--color-t3)" }}>
          Agents
        </p>
        <div className="flex flex-col gap-2">
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
          {specialists.map((a) => (
            <AgentListItem
              key={a._id}
              name={a.name}
              description={a.description}
              status={a.status as any}
              lastAction={a.lastAction}
              integrationNames={a.integrationNames}
            />
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="border-t p-3" style={{ borderColor: "var(--color-b1)" }}>
        <button
          className="w-full rounded-[6px] border py-2 font-mono text-[11px] font-semibold transition"
          style={{
            borderColor: "var(--color-b2)",
            color: "var(--color-t1)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-gold)";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--color-gold)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-b2)";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--color-t1)";
          }}
          onClick={onOpenCrewRoom}
        >
          Open Crew Room →
        </button>
      </div>
    </div>
  );
}
