export function StatusTag({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    active:    { label: "Active",    bg: "rgba(34,197,94,0.12)",  color: "#22c55e" },
    running:   { label: "Running",   bg: "rgba(34,197,94,0.12)",  color: "#22c55e" },
    resolved:  { label: "Resolved",  bg: "rgba(34,197,94,0.12)",  color: "#22c55e" },
    idle:      { label: "Idle",      bg: "#f3f4f6",               color: "#9b9b9b" },
    pending:   { label: "Pending",   bg: "#f3f4f6",               color: "#9b9b9b" },
    paused:    { label: "Paused",    bg: "#f3f4f6",               color: "#9b9b9b" },
    escalated: { label: "Escalated", bg: "rgba(249,115,22,0.12)", color: "#f97316" },
    warning:   { label: "Warning",   bg: "rgba(249,115,22,0.12)", color: "#f97316" },
    critical:  { label: "Critical",  bg: "rgba(239,68,68,0.12)",  color: "#ef4444" },
    failed:    { label: "Failed",    bg: "rgba(239,68,68,0.12)",  color: "#ef4444" },
    error:     { label: "Error",     bg: "rgba(239,68,68,0.12)",  color: "#ef4444" },
    done:      { label: "Done",      bg: "#f3f4f6",               color: "#6b7280" },
  };

  const s = map[status] ?? map.idle;

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em]"
      style={{ background: s.bg, color: s.color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
      {s.label}
    </span>
  );
}
