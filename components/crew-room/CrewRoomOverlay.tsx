"use client";

import { useState } from "react";
import { CREW_META } from "@/lib/constants";
import type { CrewTag } from "@/lib/dashboard";

import { AgentListColumn } from "./AgentListColumn";
import { ExecutivePanelColumn } from "./ExecutivePanelColumn";
import { TaskGraph } from "./TaskGraph";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Pause, Play, Plus } from "lucide-react";

export function CrewRoomOverlay({
  crewTag,
  onBack,
  onOpenExecutive,
}: {
  crewTag: CrewTag;
  onBack: () => void;
  onOpenExecutive: () => void;
  onSendExecutive?: (text: string) => void;
}) {
  const meta = CREW_META[crewTag];
  const [paused, setPaused] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background text-foreground">
      {/* Top bar */}
      <div className="border-b border-[var(--color-b1)] bg-white/80 backdrop-blur-xl">
        <div className="px-5 md:px-6 xl:px-8">
          <div className="page-frame flex items-center justify-between gap-4 py-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="font-mono text-[10px] uppercase tracking-[0.14em]"
            >
              <ArrowLeft className="size-3.5" />
              Back
            </Button>

            <div className="flex items-center gap-3">
              <span
                className="flex size-9 items-center justify-center rounded-xl text-[16px]"
                style={{
                  background: `${meta.color}14`,
                  border: `1px solid ${meta.color}28`,
                }}
              >
                {meta.icon}
              </span>
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--color-t3)]">
                  Crew Room
                </p>
                <p className="text-[14px] font-semibold tracking-[-0.01em] text-foreground">
                  {meta.label}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPaused((p) => !p)}
                className="font-mono text-[10px] uppercase tracking-[0.12em]"
              >
                {paused ? <Play className="size-3" /> : <Pause className="size-3" />}
                {paused ? "Resume" : "Pause"} Crew
              </Button>
              <Button size="sm" className="font-mono text-[10px] uppercase tracking-[0.12em]">
                <Plus className="size-3" />
                Add Agent
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="min-h-0 flex-1 px-4 py-4 md:px-6 md:py-5">
        <div className="page-frame grid h-full min-h-0 gap-4 xl:grid-cols-[280px_minmax(0,1fr)_320px] xl:gap-5">
          <aside className="surface-panel flex min-h-0 flex-col overflow-hidden">
            <AgentListColumn crewTag={crewTag} onOpenExecutive={onOpenExecutive} />
          </aside>

          <section className="surface-panel flex min-h-0 flex-col overflow-hidden">
            <div className="app-scroll h-full overflow-y-auto">
              <TaskGraph crewLabel={meta.label} />
            </div>
          </section>

          <aside className="surface-panel flex min-h-0 flex-col overflow-hidden">
            <ExecutivePanelColumn crewTag={crewTag} />
          </aside>
        </div>
      </div>
    </div>
  );
}
