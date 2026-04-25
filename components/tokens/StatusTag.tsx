"use client";

import { cn } from "@/lib/utils";

type Status =
  | "active" | "idle" | "done" | "orchestrating" | "critical"
  | "paused" | "escalated" | "running" | "warn" | "error";

const STATUS_CONFIG: Record<Status, { bg: string; text: string; border: string; dot: string; label: string }> = {
  active:        { bg: "rgba(16,185,129,0.10)", text: "#059669", border: "rgba(16,185,129,0.25)", dot: "#10B981", label: "Active" },
  done:          { bg: "rgba(16,185,129,0.10)", text: "#059669", border: "rgba(16,185,129,0.25)", dot: "#10B981", label: "Done" },
  running:       { bg: "rgba(0,82,255,0.08)",   text: "#0052FF", border: "rgba(0,82,255,0.25)",   dot: "#0052FF", label: "Running" },
  orchestrating: { bg: "rgba(0,82,255,0.08)",   text: "#0052FF", border: "rgba(0,82,255,0.25)",   dot: "#0052FF", label: "Orchestrating" },
  idle:          { bg: "rgba(15,23,42,0.05)",   text: "#64748B", border: "rgba(15,23,42,0.10)",   dot: "#94A3B8", label: "Idle" },
  paused:        { bg: "rgba(15,23,42,0.05)",   text: "#64748B", border: "rgba(15,23,42,0.10)",   dot: "#94A3B8", label: "Paused" },
  critical:      { bg: "rgba(239,68,68,0.10)",  text: "#DC2626", border: "rgba(239,68,68,0.25)",  dot: "#EF4444", label: "Critical" },
  escalated:     { bg: "rgba(245,158,11,0.10)", text: "#D97706", border: "rgba(245,158,11,0.25)", dot: "#F59E0B", label: "Escalated" },
  warn:          { bg: "rgba(245,158,11,0.10)", text: "#D97706", border: "rgba(245,158,11,0.25)", dot: "#F59E0B", label: "Warning" },
  error:         { bg: "rgba(239,68,68,0.10)",  text: "#DC2626", border: "rgba(239,68,68,0.25)",  dot: "#EF4444", label: "Error" },
};

export function StatusTag({ status, className }: { status: Status; className?: string }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.idle;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[9.5px] font-semibold uppercase tracking-[0.12em] leading-none",
        className,
      )}
      style={{ background: config.bg, color: config.text, borderColor: config.border }}
    >
      <span className="size-1 rounded-full" style={{ background: config.dot }} />
      {config.label}
    </span>
  );
}
