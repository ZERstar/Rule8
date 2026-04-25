"use client";

export type NodeState = "done" | "running" | "pending";

export type Checkpoint = {
  id: number;
  label: string;
  state: NodeState;
  cost?: string;
  latency?: string;
};

const STATE_COLOR: Record<NodeState, { dot: string; text: string }> = {
  done: { dot: "#10B981", text: "var(--color-t1)" },
  running: { dot: "#0052FF", text: "#0052FF" },
  pending: { dot: "#94A3B8", text: "#94A3B8" },
};

export function CheckpointNode({
  checkpoint,
  isLast,
}: {
  checkpoint: Checkpoint;
  isLast: boolean;
}) {
  const { dot, text } = STATE_COLOR[checkpoint.state];

  return (
    <div className="flex items-start gap-4">
      <div className="flex flex-col items-center">
        <span
          className="mt-1 size-2.5 shrink-0 rounded-full"
          style={{
            background: dot,
            boxShadow: checkpoint.state === "running" ? "0 0 0 4px rgba(0,82,255,0.18)" : undefined,
            animation: checkpoint.state === "running" ? "pulseDot 1.6s ease-in-out infinite" : undefined,
          }}
        />
        {!isLast && (
          <div className="mt-1.5 w-px flex-1" style={{ height: 32, background: "var(--color-b1)" }} />
        )}
      </div>

      <div className="pb-6">
        <p className="text-[13px] font-medium" style={{ color: text }}>
          {checkpoint.label}
        </p>
        {(checkpoint.cost || checkpoint.latency) && (
          <p className="mt-1 font-mono text-[10px]" style={{ color: "var(--color-t3)" }}>
            {checkpoint.cost ?? "—"} · {checkpoint.latency ?? "—"}
          </p>
        )}
        {checkpoint.state === "running" && (
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-accent)]">
            In progress…
          </p>
        )}
      </div>
    </div>
  );
}
