"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { WORKSPACE_ID } from "@/lib/constants";
import { FilterTabs, type TraceFilter } from "./FilterTabs";
import { TraceItem } from "./TraceItem";
import { StatBar } from "./StatBar";

export function TraceFeed() {
  const traces = useQuery(api.traces.listRecent, { workspaceId: WORKSPACE_ID, limit: 20 });
  const insertDemo = useMutation(api.traces.insertDemo);
  const [filter, setFilter] = useState<TraceFilter>("all");
  const [liveIds, setLiveIds] = useState<Set<Id<"traces">>>(new Set());
  const prevIdsRef = useRef<Set<Id<"traces">>>(new Set());
  const stats = useQuery(api.tasks.getStats, { workspaceId: WORKSPACE_ID });

  // Mark newly injected traces as live for 3 seconds
  useEffect(() => {
    if (!traces) return;
    const currentIds = new Set(traces.map((t) => t._id));
    const newIds = [...currentIds].filter((id) => !prevIdsRef.current.has(id));
    if (newIds.length > 0 && prevIdsRef.current.size > 0) {
      setLiveIds((prev) => {
        const next = new Set(prev);
        newIds.forEach((id) => next.add(id));
        return next;
      });
      setTimeout(() => {
        setLiveIds((prev) => {
          const next = new Set(prev);
          newIds.forEach((id) => next.delete(id));
          return next;
        });
      }, 3000);
    }
    prevIdsRef.current = currentIds;
  }, [traces]);

  // Inject demo trace every 6 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      void insertDemo({ workspaceId: WORKSPACE_ID });
    }, 6000);
    return () => clearInterval(interval);
  }, [insertDemo]);

  type TraceDoc = NonNullable<typeof traces>[number];
  const visible = (traces ?? []).filter(
    (t: TraceDoc) => filter === "all" || t.agentTag === filter,
  );

  const runningCostCents = stats?.costTodayCents ?? 0;

  return (
    <div className="flex flex-col" style={{ height: "100%", overflow: "hidden" }}>
      {/* Header */}
      <div
        className="flex items-center justify-between border-b px-4"
        style={{ borderColor: "var(--color-b1)", height: 50 }}
      >
        <span className="text-[14px] font-semibold" style={{ color: "var(--color-t1)" }}>
          Live Trace Feed
        </span>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px]" style={{ color: "var(--color-gold)" }}>
            ${(runningCostCents / 100).toFixed(2)} today
          </span>
          <span className="font-mono text-[11px]" style={{ color: "var(--color-t3)" }}>
            {traces?.length ?? 0} traces
          </span>
        </div>
      </div>

      {/* Filter tabs */}
      <FilterTabs active={filter} onChange={setFilter} />

      {/* Trace list */}
      <div className="flex-1 overflow-y-auto">
        {visible.length === 0 ? (
          <div className="flex h-full items-center justify-center font-mono text-[11px]" style={{ color: "var(--color-t3)" }}>
            No traces for this filter
          </div>
        ) : (
          visible.map((t) => (
            <TraceItem
              key={t._id}
              runId={t.runId}
              agentTag={t.agentTag as any}
              crewName={t.crewName}
              action={t.action}
              stepType={t.stepType}
              model={t.model}
              status={t.status}
              tokensIn={t.tokensIn}
              tokensOut={t.tokensOut}
              costCents={t.costCents}
              latencyMs={t.latencyMs}
              cacheHit={t.cacheHit}
              cacheTokens={t.cacheTokens}
              confidence={t.confidence}
              toolName={t.toolName}
              toolOutputPreview={t.toolOutputPreview}
              createdAt={t.createdAt}
              isLive={liveIds.has(t._id)}
            />
          ))
        )}
      </div>

      {/* Stat bar */}
      <StatBar />
    </div>
  );
}
