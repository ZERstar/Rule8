"use client";

import { useState, useEffect } from "react";
import { AgentTagChip } from "@/components/tokens/AgentTagChip";
import { StatusTag } from "@/components/tokens/StatusTag";
import { TraceDetail } from "./TraceDetail";
import { cn } from "@/lib/utils";

type AgentTag = "executive" | "finance" | "support" | "community" | "system";

type TraceItemProps = {
  runId: string;
  agentTag: AgentTag;
  crewName: string;
  action: string;
  stepType: string;
  model: string;
  status: "ok" | "warn" | "error";
  tokensIn: number;
  tokensOut: number;
  costCents: number;
  latencyMs: number;
  cacheHit: boolean;
  cacheTokens: number;
  confidence?: number;
  toolName?: string;
  toolOutputPreview?: string;
  createdAt: number;
  isLive?: boolean;
};

function fmt(ts: number) {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

const STATUS_MAP = {
  ok: "done",
  warn: "escalated",
  error: "critical",
} as const;

export function TraceItem({ isLive, ...trace }: TraceItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [timestamp, setTimestamp] = useState<string | null>(null);

  useEffect(() => {
    setTimestamp(fmt(trace.createdAt));
  }, [trace.createdAt]);

  return (
    <div
      className={cn(
        "group/trace cursor-pointer overflow-hidden rounded-xl border bg-white transition-all duration-200",
        expanded
          ? "border-[var(--color-accent-a30)] shadow-[0_4px_14px_rgba(0,82,255,0.15)]"
          : "border-[var(--color-b1)] hover:-translate-y-0.5 hover:border-[var(--color-b2)] hover:shadow-[0_4px_12px_rgba(15,23,42,0.06)]",
        isLive && "ring-2 ring-[var(--color-accent-a30)]",
      )}
      onClick={() => setExpanded((p) => !p)}
      style={isLive ? { animation: "fadeSlideUp 0.3s ease-out" } : undefined}
    >
      {/* Live indicator gradient bar */}
      {isLive && (
        <div className="h-0.5 bg-gradient-to-r from-[#0052FF] to-[#4D7CFF]" />
      )}

      <div className="p-4">
        {/* Header row */}
        <div className="flex flex-wrap items-center gap-2">
          <AgentTagChip tag={trace.agentTag} live={isLive} />
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-t3)]">
            {trace.crewName}
          </span>
          <span className="ml-auto shrink-0 font-mono text-[10px] tabular-nums text-[var(--color-t4)]">
            {timestamp ?? "—"}
          </span>
        </div>

        {/* Action text */}
        <p className="mt-3 text-[15px] font-semibold leading-[1.45] tracking-[-0.01em] text-foreground">
          {trace.action}
        </p>

        {/* Metrics row */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StatusTag status={STATUS_MAP[trace.status]} />
          <span className="font-mono text-[10px] tabular-nums text-[var(--color-t3)]">
            {(trace.tokensIn + trace.tokensOut).toLocaleString()} tok
          </span>
          <span className="text-[var(--color-t4)]">·</span>
          <span className="font-mono text-[10px] tabular-nums text-[var(--color-t3)]">
            ${(trace.costCents / 100).toFixed(4)}
          </span>
          <span className="text-[var(--color-t4)]">·</span>
          <span className="font-mono text-[10px] tabular-nums text-[var(--color-t3)]">
            {trace.latencyMs}ms
          </span>
          {trace.cacheHit && (
            <span className="ml-auto inline-flex items-center gap-1 rounded-md bg-[var(--color-accent-a08)] px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--color-accent)]">
              cached
            </span>
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-[var(--color-b1)] bg-[var(--color-surface-2)] px-4 py-4">
          <TraceDetail
            runId={trace.runId}
            model={trace.model}
            stepType={trace.stepType}
            cacheHit={trace.cacheHit}
            cacheTokens={trace.cacheTokens}
            confidence={trace.confidence}
            toolName={trace.toolName}
            toolOutputPreview={trace.toolOutputPreview}
            tokensIn={trace.tokensIn}
            tokensOut={trace.tokensOut}
          />
        </div>
      )}
    </div>
  );
}
