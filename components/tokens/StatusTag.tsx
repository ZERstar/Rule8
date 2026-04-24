type Status = "active" | "idle" | "done" | "orchestrating" | "critical" | "paused" | "escalated" | "running";

const STATUS_STYLES: Record<Status, { bg: string; color: string; label: string }> = {
  active:        { bg: "rgba(22,163,74,0.10)",    color: "#22C55E", label: "Active"        },
  done:          { bg: "rgba(22,163,74,0.10)",    color: "#22C55E", label: "Done"          },
  running:       { bg: "rgba(22,163,74,0.10)",    color: "#22C55E", label: "Running"       },
  orchestrating: { bg: "rgba(200,151,42,0.08)",   color: "#C8972A", label: "Orchestrating" },
  idle:          { bg: "rgba(26,26,33,0.60)",     color: "#5A5A6A", label: "Idle"          },
  paused:        { bg: "rgba(26,26,33,0.60)",     color: "#5A5A6A", label: "Paused"        },
  critical:      { bg: "rgba(185,28,28,0.10)",    color: "#EF4444", label: "Critical"      },
  escalated:     { bg: "rgba(217,119,6,0.10)",    color: "#D97706", label: "Escalated"     },
};

export function StatusTag({ status }: { status: Status }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.idle;
  return (
    <span
      className="inline-flex items-center rounded-[4px] px-[6px] py-[2px] font-mono text-[10px] font-medium"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}
