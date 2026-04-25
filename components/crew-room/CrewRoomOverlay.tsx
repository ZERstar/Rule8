"use client";

import { GlobalExecBar } from "@/components/GlobalExecBar";
import { CREW_META } from "@/lib/constants";
import type { CrewTag } from "@/lib/dashboard";

import { AgentListColumn } from "./AgentListColumn";
import { ExecutivePanelColumn } from "./ExecutivePanelColumn";
import { TaskGraph } from "./TaskGraph";

export function CrewRoomOverlay({
  crewTag,
  onBack,
  onOpenExecutive,
  onSendExecutive,
}: {
  crewTag: CrewTag;
  onBack: () => void;
  onOpenExecutive: () => void;
  onSendExecutive?: (text: string) => void;
}) {
  const meta = CREW_META[crewTag];

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "var(--color-bg)", color: "var(--color-t1)" }}>
      {/* Topbar */}
      <div
        className="flex h-[50px] shrink-0 items-center justify-between border-b px-5"
        style={{ borderColor: "var(--color-b1)", background: "var(--color-s1)" }}
      >
        <button
          className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] transition"
          style={{ color: "var(--color-t2)" }}
          onClick={onBack}
          type="button"
        >
          ← Back to Overview
        </button>

        <div className="flex items-center gap-2.5">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-[6px] text-base"
            style={{ background: `${meta.color}1a` }}
          >
            {meta.icon}
          </span>
          <div>
            <p className="text-[13px] font-semibold" style={{ color: "var(--color-t1)" }}>
              {meta.label}
            </p>
            <p className="font-mono text-[10px]" style={{ color: "var(--color-t3)" }}>Crew Room</p>
          </div>
        </div>

        <span className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--color-gold)" }}>
          Live orchestration
        </span>
      </div>

      {/* 3-column body */}
      <div className="grid min-h-0 flex-1 overflow-hidden" style={{ gridTemplateColumns: "240px 1fr 260px" }}>
        {/* Agent list */}
        <div className="min-h-0 overflow-hidden border-r" style={{ borderColor: "var(--color-b1)", background: "var(--color-s1)" }}>
          <AgentListColumn crewTag={crewTag} onOpenExecutive={onOpenExecutive} />
        </div>

        {/* Task graph */}
        <div className="min-h-0 overflow-y-auto" style={{ background: "var(--color-bg)" }}>
          <TaskGraph crewLabel={meta.label} />
        </div>

        {/* Executive panel */}
        <div className="min-h-0 overflow-hidden border-l" style={{ borderColor: "var(--color-b1)", background: "var(--color-s1)" }}>
          <ExecutivePanelColumn crewTag={crewTag} />
        </div>
      </div>

      {/* Global exec bar — always visible */}
      <div className="shrink-0">
        <GlobalExecBar
          onSend={(text) => {
            onSendExecutive?.(text);
            onBack();
          }}
        />
      </div>
    </div>
  );
}
