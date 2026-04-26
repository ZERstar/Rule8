"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { WORKSPACE_ID } from "@/lib/constants";

function StatCell({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex flex-col justify-center px-5 py-3">
      <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-t3)] leading-none mb-1">
        {label}
      </span>
      <span className="text-[20px] font-semibold tabular-nums tracking-[-0.02em] text-[var(--color-t1)] leading-none">
        {value}
      </span>
    </div>
  );
}

export function StatsStrip() {
  const stats = useQuery(api.tasks.getStats, { workspaceId: WORKSPACE_ID });

  const agentsManaged = stats?.agentsManaged ?? "—";
  const tasksToday = stats?.tasksToday ?? "—";

  const costDisplay = stats
    ? `$${(stats.costTodayCents / 100).toFixed(2)}`
    : "—";

  const successRate =
    stats && stats.tasksToday > 0
      ? `${Math.round((stats.autoResolved / stats.tasksToday) * 100)}%`
      : stats
      ? "100%"
      : "—";

  return (
    <div className="flex-none border-b border-[var(--color-border)] bg-[var(--color-bg)]">
      <div className="flex items-center gap-0 divide-x divide-[var(--color-border)] px-5 py-0">
        <StatCell label="Agents" value={agentsManaged} />
        <StatCell label="Tasks" value={tasksToday} />
        <StatCell label="Cost Today" value={costDisplay} />
        <StatCell label="Success Rate" value={successRate} />

        {/* Spacer */}
        <div className="flex-1" />

        {/* LIVE indicator */}
        <div className="flex items-center gap-1.5 pr-5 font-mono text-[10px] text-[var(--color-accent-green)]">
          <span className="live-dot" />
          LIVE
        </div>
      </div>
    </div>
  );
}
