"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { WORKSPACE_ID } from "@/lib/constants";


export function StatBar() {
  const stats = useQuery(api.tasks.getStats, { workspaceId: WORKSPACE_ID });
  const statData = stats ?? { tasksToday: 0, autoResolved: 0, totalTokens: 0, escalated: 0 };

  const cells = [
    { label: "Tasks today",   value: statData.tasksToday },
    { label: "Auto-resolved", value: statData.autoResolved },
    { label: "Total tokens",  value: (statData.totalTokens / 1000).toFixed(1) + "k" },
    { label: "Escalated",     value: statData.escalated },
  ];

  return (
    <div className="grid grid-cols-2 divide-x divide-[var(--color-b1)] border-t border-[var(--color-b1)] bg-white sm:grid-cols-4">
      {cells.map(({ label, value }) => (
        <div key={label} className="flex flex-col items-center justify-center px-4 py-4">
          <span className="text-[20px] font-semibold leading-none tracking-[-0.02em] text-foreground">
            {value}
          </span>
          <span className="mt-2 font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-t3)]">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}
