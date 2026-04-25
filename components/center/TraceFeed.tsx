"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { WORKSPACE_ID } from "@/lib/constants";

import { FilterTabs, type TraceFilter } from "./FilterTabs";
import { TraceItem } from "./TraceItem";
import { StatBar } from "./StatBar";
import { SectionLabel } from "@/components/ui/section-label";
import { GradientText } from "@/components/ui/gradient-text";

export function TraceFeed() {
  const tracesQuery = useQuery(api.traces.listRecent, { workspaceId: WORKSPACE_ID, limit: 20 });
  const [filter, setFilter] = useState<TraceFilter>("all");
  const [liveIds, setLiveIds] = useState<Set<Id<"traces">>>(new Set());
  const prevIdsRef = useRef<Set<Id<"traces">>>(new Set());
  const stats = useQuery(api.tasks.getStats, { workspaceId: WORKSPACE_ID });
  const traces: Doc<"traces">[] = tracesQuery ?? [];
  const feedTraces = traces;
  const statsData = stats ?? { costTodayCents: 0 };

  // Mark newly injected traces as live for 3 seconds
  useEffect(() => {
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



  const visible = feedTraces.filter((trace) => filter === "all" || trace.agentTag === filter);
  const runningCostCents = statsData.costTodayCents ?? 0;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-[var(--color-b1)] px-6 py-5">
        <div className="flex flex-col gap-4 min-[1080px]:flex-row min-[1080px]:items-start min-[1080px]:justify-between">
          <div>
            <SectionLabel>Live Trace Stream</SectionLabel>
            <h2
              className="mt-3 text-[26px] leading-[1.1] tracking-[-0.025em] text-foreground xl:text-[30px]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Everything your <GradientText>agents</GradientText> just did
            </h2>
            <p className="mt-2 max-w-[640px] text-[13px] leading-[1.65] text-[var(--color-t3)]">
              Model calls, tool runs, policy checks, and escalations from every crew in one running timeline.
            </p>
          </div>
          <div className="grid shrink-0 grid-cols-2 gap-2 min-[1080px]:min-w-[200px]">
            <div className="rounded-xl border border-[var(--color-b1)] bg-white px-3.5 py-3 text-right">
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-t3)]">
                Today
              </p>
              <p className="mt-1.5 text-[18px] font-semibold tabular-nums tracking-[-0.02em] text-foreground">
                ${(runningCostCents / 100).toFixed(2)}
              </p>
            </div>
            <div className="rounded-xl border border-[var(--color-b1)] bg-white px-3.5 py-3 text-right">
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-t3)]">
                Shown
              </p>
              <p className="mt-1.5 text-[18px] font-semibold tabular-nums tracking-[-0.02em] text-foreground">
                {visible.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <FilterTabs active={filter} onChange={setFilter} />

      {/* Trace list */}
      <div className="app-scroll flex-1 overflow-y-auto px-4 py-4 md:px-5">
        {visible.length === 0 ? (
          <div className="flex h-full min-h-[280px] items-center justify-center rounded-xl border border-dashed border-[var(--color-b2)] bg-white/40 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-t3)]">
            No traces for this filter
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {visible.map((t) => (
              <TraceItem
                key={"_id" in t ? t._id : t.runId}
                runId={t.runId}
                agentTag={t.agentTag}
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
                isLive={"_id" in t ? liveIds.has(t._id) : false}
              />
            ))}
          </div>
        )}
      </div>

      <StatBar />
    </div>
  );
}
