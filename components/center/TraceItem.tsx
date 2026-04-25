"use client";

import { useState } from "react";
import { AgentTagChip } from "@/components/tokens/AgentTagChip";
import { TraceDetail } from "./TraceDetail";

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
  return new Date(ts).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

const STATUS_COLOR: Record<string, string> = {
  ok:    "var(--color-green)",
  warn:  "var(--color-amber)",
  error: "var(--color-red)",
};

const STATUS_LABEL: Record<string, string> = { ok: "Resolved", warn: "Warning", error: "Error" };

export function TraceItem({ isLive, ...trace }: TraceItemProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="cursor-pointer border-b transition-colors"
      style={{
        borderColor: "rgba(255,255,255,0.07)",
        background: expanded ? "var(--color-s1)" : "transparent",
        borderLeft: isLive ? "3px solid var(--color-gold)" : "3px solid transparent",
        animation: isLive ? "fadeSlide 200ms ease-out" : undefined,
      }}
      onClick={() => setExpanded(p => !p)}
      onMouseEnter={e => { if (!expanded) (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.02)"; }}
      onMouseLeave={e => { if (!expanded) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
    >
      <div className="px-4 py-3.5">
        {/* Row 1 — chip · crew · time */}
        <div className="flex items-center gap-2">
          <AgentTagChip tag={trace.agentTag} live={isLive} />
          <span className="font-mono text-[10px]" style={{ color: "var(--color-t3)" }}>
            {trace.crewName}
          </span>
          <span className="ml-auto shrink-0 font-mono text-[10px]" style={{ color: "var(--color-t3)" }}>
            {fmt(trace.createdAt)}
          </span>
        </div>

        {/* Row 2 — action */}
        <p className="mt-2 text-[13px] font-medium leading-[1.5]" style={{ color: "var(--color-t1)" }}>
          {trace.action}
        </p>

        {/* Row 3 — metrics */}
        <div className="mt-2 flex items-center gap-3 font-mono text-[11px]">
          <span style={{ color: STATUS_COLOR[trace.status] }}>
            {STATUS_LABEL[trace.status]}
          </span>
          <span style={{ color: "var(--color-t3)" }}>
            {(trace.tokensIn + trace.tokensOut).toLocaleString()} tok
          </span>
          <span style={{ color: "var(--color-t3)" }}>
            ${(trace.costCents / 100).toFixed(4)}
          </span>
          <span style={{ color: "var(--color-t3)" }}>
            {trace.latencyMs}ms
          </span>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-3">
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
