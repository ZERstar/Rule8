"use client";

import type { Checkpoint } from "./CheckpointNode";
import { CheckpointNode } from "./CheckpointNode";

const DEMO_CHECKPOINTS: Checkpoint[] = [
  {
    id: 1,
    label: "Classify inbound request",
    state: "done",
    cost: "$0.02",
    latency: "820ms",
  },
  {
    id: 2,
    label: "Stripe customer lookup",
    state: "done",
    cost: "$0.03",
    latency: "1.2s",
  },
  {
    id: 3,
    label: "Evaluate refund eligibility",
    state: "running",
    cost: "—",
    latency: "—",
  },
  { id: 4, label: "Draft resolution response", state: "pending" },
  { id: 5, label: "Executive synthesis", state: "pending" },
];

export function TaskGraph({
  workflowId = "wf-2041",
  crewLabel = "Support Crew",
  checkpoints = DEMO_CHECKPOINTS,
}: {
  workflowId?: string;
  crewLabel?: string;
  checkpoints?: Checkpoint[];
}) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-0 px-8 py-8">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: "var(--color-gold)" }}>
        Workflow — {workflowId}
      </p>
      <h2 className="mt-2 text-[28px] font-semibold tracking-[-0.03em]" style={{ color: "var(--color-t1)" }}>
        {crewLabel} execution path
      </h2>
      <p className="mt-2 max-w-2xl text-[13px] leading-[1.7]" style={{ color: "var(--color-t2)" }}>
        Live checkpoint graph for the currently orchestrated workflow. Costs and latency are shown for completed steps while pending nodes stay muted until execution reaches them.
      </p>

      <div className="mt-8 rounded-[16px] border bg-[var(--color-s1)] px-8 py-6" style={{ borderColor: "var(--color-b1)" }}>
        {checkpoints.map((checkpoint, index) => (
          <div key={checkpoint.id}>
            {index === checkpoints.length - 1 ? (
              <div className="my-4 flex items-center gap-3">
                <div className="h-px flex-1" style={{ background: "var(--color-gold)" }} />
                <span
                  className="rounded-full px-3 py-1 font-mono text-[10px]"
                  style={{
                    background: "rgba(200,151,42,0.10)",
                    color: "var(--color-gold)",
                  }}
                >
                  Handoff → {crewLabel}
                </span>
                <div className="h-px flex-1" style={{ background: "var(--color-gold)" }} />
              </div>
            ) : null}

            <CheckpointNode checkpoint={checkpoint} isLast={index === checkpoints.length - 1} />
          </div>
        ))}
      </div>
    </div>
  );
}
