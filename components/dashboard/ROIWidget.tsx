"use client";

import { api } from "@/convex/_generated/api";
import { useAuthenticatedQuery } from "@/lib/use-authenticated-query";
import { useWorkspaceId } from "@/lib/workspace-context";

const MINUTES_SAVED_PER_RESOLUTION = 6;
const FOUNDER_HOURLY_RATE_CENTS = 10_000;

export function ROIWidget() {
  const workspaceId = useWorkspaceId();
  const stats = useAuthenticatedQuery(api.tasks.getStats, { workspaceId });

  if (!stats) {
    return (
      <div className="rounded-[18px] border border-[var(--color-border)] bg-white/70 px-3 py-3">
        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--color-t3)]">Value engine</p>
        <p className="mt-2 text-[12px] text-[var(--color-t3)]">Calculating ROI...</p>
      </div>
    );
  }

  const minutesSaved = stats.autoResolved * MINUTES_SAVED_PER_RESOLUTION;
  const valueSavedCents = Math.round((minutesSaved / 60) * FOUNDER_HOURLY_RATE_CENTS);
  const roiMultiplier = stats.costTodayCents > 0 ? valueSavedCents / stats.costTodayCents : 0;

  return (
    <div className="rounded-[18px] border border-[var(--color-border)] bg-white/82 px-3 py-3 shadow-[0_10px_24px_rgba(28,39,49,0.05)]">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--color-t3)]">Value engine</p>
        <span className="rounded-full bg-[#10b981]/10 px-2 py-1 font-mono text-[9px] text-[#047857]">
          {roiMultiplier > 0 ? `${roiMultiplier.toFixed(1)}x` : "new"}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Metric label="Handled" value={`${stats.autoResolved}/${stats.tasksToday}`} />
        <Metric label="Time saved" value={`${minutesSaved}m`} />
        <Metric label="Agent cost" value={`$${(stats.costTodayCents / 100).toFixed(2)}`} />
        <Metric label="Value" value={`$${(valueSavedCents / 100).toFixed(0)}`} />
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] bg-[var(--color-bg-secondary)] px-2.5 py-2">
      <p className="font-mono text-[8px] uppercase tracking-[0.12em] text-[var(--color-t3)]">{label}</p>
      <p className="mt-1 text-[14px] font-semibold text-[var(--color-t1)]">{value}</p>
    </div>
  );
}
