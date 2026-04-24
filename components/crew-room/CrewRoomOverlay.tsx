"use client";

import { CREW_META } from "@/lib/constants";
import type { CrewTag } from "@/lib/dashboard";

import { AgentListColumn } from "./AgentListColumn";
import { ExecutivePanelColumn } from "./ExecutivePanelColumn";
import { TaskGraph } from "./TaskGraph";

export function CrewRoomOverlay({
  crewTag,
  onBack,
  onOpenExecutive,
}: {
  crewTag: CrewTag;
  onBack: () => void;
  onOpenExecutive: () => void;
}) {
  const meta = CREW_META[crewTag];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--color-bg)]">
      <div
        className="flex h-[50px] items-center justify-between border-b px-5"
        style={{ borderColor: "var(--color-b1)", background: "var(--color-s1)" }}
      >
        <button
          className="font-mono text-[11px] uppercase tracking-[0.16em] transition"
          style={{ color: "var(--color-t2)" }}
          onClick={onBack}
          type="button"
        >
          ← Back to Overview
        </button>

        <div className="flex items-center gap-2">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-[6px] text-base"
            style={{ background: `${meta.color}1a` }}
          >
            {meta.icon}
          </span>
          <div>
            <p className="text-[13px] font-semibold" style={{ color: "var(--color-t1)" }}>
              {meta.label}
            </p>
            <p className="font-mono text-[10px]" style={{ color: "var(--color-t3)" }}>
              Crew Room
            </p>
          </div>
        </div>

        <span className="font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: "var(--color-gold)" }}>
          Live orchestration
        </span>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[240px_minmax(0,1fr)_260px] overflow-hidden">
        <div className="min-h-0 border-r bg-[var(--color-s1)]" style={{ borderColor: "var(--color-b1)" }}>
          <AgentListColumn crewTag={crewTag} onOpenExecutive={onOpenExecutive} />
        </div>

        <div className="min-h-0 overflow-y-auto bg-[var(--color-bg)]">
          <TaskGraph crewLabel={meta.label} />
        </div>

        <div className="min-h-0 border-l bg-[var(--color-s1)]" style={{ borderColor: "var(--color-b1)" }}>
          <ExecutivePanelColumn crewTag={crewTag} />
        </div>
      </div>
    </div>
  );
}
