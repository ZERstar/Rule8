"use client";

export type NodeState = "done" | "running" | "pending";

export type Checkpoint = {
  id: number;
  label: string;
  state: NodeState;
  cost?: string;
  latency?: string;
};

const DOT: Record<NodeState, React.CSSProperties> = {
  done: { background: "var(--color-green)" },
  running: {
    background: "var(--color-gold)",
    animation: "pulse-gold 1.5s ease-in-out infinite",
  },
  pending: { background: "var(--color-t3)" },
};

const TEXT_COLOR: Record<NodeState, string> = {
  done: "var(--color-t1)",
  running: "var(--color-gold)",
  pending: "var(--color-t3)",
};

export function CheckpointNode({
  checkpoint,
  isLast,
}: {
  checkpoint: Checkpoint;
  isLast: boolean;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex flex-col items-center">
        <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full" style={DOT[checkpoint.state]} />
        {!isLast ? (
          <div className="mt-1 w-px flex-1" style={{ height: 32, background: "var(--color-b2)" }} />
        ) : null}
      </div>

      <div className="pb-6">
        <p className="text-[12px] font-medium" style={{ color: TEXT_COLOR[checkpoint.state] }}>
          {checkpoint.label}
        </p>
        {checkpoint.cost || checkpoint.latency ? (
          <p className="mt-0.5 font-mono text-[10px]" style={{ color: "var(--color-t3)" }}>
            {checkpoint.cost ?? "—"} · {checkpoint.latency ?? "—"}
          </p>
        ) : null}
        {checkpoint.state === "running" ? (
          <p className="mt-0.5 font-mono text-[10px]" style={{ color: "var(--color-gold)" }}>
            In progress...
          </p>
        ) : null}
      </div>
    </div>
  );
}
