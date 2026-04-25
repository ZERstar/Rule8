"use client";

import type { Checkpoint } from "./CheckpointNode";
import { CheckpointNode } from "./CheckpointNode";
import { SectionLabel } from "@/components/ui/section-label";
import { GradientText } from "@/components/ui/gradient-text";



export function TaskGraph({
  workflowId = "wf-2041",
  crewLabel = "Support Crew",
  checkpoints = [],
}: {
  workflowId?: string;
  crewLabel?: string;
  checkpoints?: Checkpoint[];
}) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col px-8 py-8">
      <SectionLabel>Workflow · {workflowId}</SectionLabel>
      <h2
        className="mt-3 text-[28px] leading-[1.05] tracking-[-0.025em] text-foreground"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {crewLabel} <GradientText>execution path</GradientText>
      </h2>
      <p className="mt-2 max-w-2xl text-[13px] leading-[1.65] text-[var(--color-t3)]">
        Live checkpoint graph for the currently orchestrated workflow. Costs and latency are shown for completed steps; pending nodes stay muted until execution reaches them.
      </p>

      <div className="mt-6 rounded-2xl border border-[var(--color-b1)] bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        {checkpoints.map((checkpoint, index) => (
          <div key={checkpoint.id}>
            <CheckpointNode checkpoint={checkpoint} isLast={index === checkpoints.length - 1} />
          </div>
        ))}
      </div>
    </div>
  );
}
