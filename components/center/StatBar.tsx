"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { WORKSPACE_ID } from "@/lib/constants";

export function StatBar() {
  const stats = useQuery(api.tasks.getStats, { workspaceId: WORKSPACE_ID });

  const cells = [
    { label: "Tasks today",   value: stats?.tasksToday   ?? "—" },
    { label: "Auto-resolved", value: stats?.autoResolved ?? "—" },
    { label: "Total tokens",  value: stats ? (stats.totalTokens / 1000).toFixed(1) + "k" : "—" },
    { label: "Escalated",     value: stats?.escalated    ?? "—" },
  ];

  return (
    <div
      className="grid grid-cols-4"
      style={{ borderTop: "1px solid rgba(255,255,255,0.07)", height: 52, background: "var(--color-s1)" }}
    >
      {cells.map(({ label, value }, i) => (
        <div
          key={label}
          className="flex flex-col items-center justify-center"
          style={{ borderRight: i < 3 ? "1px solid rgba(255,255,255,0.07)" : undefined }}
        >
          <span className="font-semibold leading-none" style={{ fontSize: 16, color: "var(--color-t1)" }}>
            {value}
          </span>
          <span className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em]" style={{ color: "var(--color-t3)" }}>
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}
