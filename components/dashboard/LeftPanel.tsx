"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { WORKSPACE_ID, CREW_META } from "@/lib/constants";
import type { CrewKey } from "@/lib/dashboard";

const CREW_KEYS: CrewKey[] = ["finance", "support", "community"];

interface LeftPanelProps {
  selectedCrew: CrewKey;
  onSelectCrew: (crew: CrewKey) => void;
  onExecOpen: () => void;
}

export function LeftPanel({ selectedCrew, onSelectCrew, onExecOpen }: LeftPanelProps) {
  const stats = useQuery(api.tasks.getStats, { workspaceId: WORKSPACE_ID });
  const agents = useQuery(api.agents.list, { workspaceId: WORKSPACE_ID });

  const agentsManaged = stats?.agentsManaged ?? "—";
  const tasksToday    = stats?.tasksToday ?? "—";
  const costDisplay   = stats ? `$${(stats.costTodayCents / 100).toFixed(2)}` : "—";

  function agentCountForCrew(tag: CrewKey) {
    return agents?.filter((a) => a.crewTag === tag).length ?? 0;
  }

  function workflowCountForCrew(tag: CrewKey) {
    return (
      agents
        ?.filter((a) => a.crewTag === tag)
        .reduce((sum, a) => sum + (a.workflowCount ?? 0), 0) ?? 0
    );
  }

  return (
    <div className="flex flex-col p-4 gap-5">

      {/* ─── Executive Chamber card ─── */}
      <div className="card flex flex-col gap-4 p-4">

        {/* Kicker + LIVE */}
        <div className="flex items-center justify-between">
          <span className="kicker">Executive Chamber</span>
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{ background: "rgba(34,197,94,0.12)", color: "var(--color-accent-green)" }}
          >
            <span className="live-dot" style={{ width: 5, height: 5 }} />
            LIVE
          </span>
        </div>

        {/* Avatar + title + body */}
        <div className="flex items-start gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-bold text-white text-[15px]"
            style={{ background: "var(--color-accent-orange)" }}
          >
            E
          </div>
          <div className="min-w-0">
            <h2 className="text-[15px] font-bold leading-tight" style={{ color: "var(--color-t1)" }}>
              Strategic orchestration
            </h2>
            <p className="mt-1 text-[12px] leading-relaxed" style={{ color: "var(--color-t2)" }}>
              Launch agents, review escalations, and route work without touching infrastructure.
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div
          className="grid grid-cols-3 overflow-hidden rounded-[var(--radius-sm)] border"
          style={{ borderColor: "var(--color-border)" }}
        >
          {[
            { value: agentsManaged, label: "Agents" },
            { value: tasksToday,    label: "Tasks" },
            { value: costDisplay,   label: "Cost" },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className="flex flex-col items-center justify-center py-3"
              style={{ borderRight: i < 2 ? "1px solid var(--color-border)" : undefined }}
            >
              <span
                className="text-[16px] font-bold tabular-nums leading-none"
                style={{ color: "var(--color-t1)" }}
              >
                {stat.value}
              </span>
              <span
                className="mt-1 text-[10px] uppercase tracking-[0.08em]"
                style={{ color: "var(--color-t3)" }}
              >
                {stat.label}
              </span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={onExecOpen}
          className="w-full rounded-[var(--radius-md)] text-[11px] font-bold uppercase tracking-[0.08em] text-white transition-opacity hover:opacity-90"
          style={{ background: "var(--color-accent-orange)", height: 38 }}
        >
          Open Executive Conversation
        </button>
      </div>

      {/* ─── Crew Pods ─── */}
      <div className="flex flex-col gap-2">

        {/* Section header */}
        <div className="flex items-center justify-between px-0.5 mb-1">
          <span className="kicker">Crew Pods</span>
          <span className="text-[10px] uppercase tracking-[0.08em]" style={{ color: "var(--color-t3)" }}>
            {CREW_KEYS.length} crews
          </span>
        </div>

        {/* Crew cards */}
        {CREW_KEYS.map((key) => {
          const meta       = CREW_META[key];
          const agentCount = agentCountForCrew(key);
          const wfCount    = workflowCountForCrew(key);
          const isSelected = selectedCrew === key;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectCrew(key)}
              className="card w-full text-left px-3 py-3 transition-all cursor-pointer hover:shadow-md"
              style={isSelected
                ? { outline: "2px solid var(--color-accent-orange)", outlineOffset: "1px" }
                : undefined
              }
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[16px]">{meta.icon}</span>
                  <span className="text-[13px] font-semibold" style={{ color: "var(--color-t1)" }}>
                    {meta.label}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: "var(--color-accent-green)" }}
                  />
                  <span className="text-[10px] font-semibold" style={{ color: "var(--color-accent-green)" }}>
                    Active
                  </span>
                </div>
              </div>
              <p className="mt-1.5 text-[11px]" style={{ color: "var(--color-t3)" }}>
                {agentCount} agent{agentCount !== 1 ? "s" : ""}
                {wfCount > 0 && ` · ${wfCount} WF`}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
