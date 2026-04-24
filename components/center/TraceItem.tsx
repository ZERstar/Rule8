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
  const d = new Date(ts);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

const STATUS_COLOR: Record<string, string> = {
  ok:    "var(--color-green)",
  warn:  "var(--color-amber)",
  error: "var(--color-red)",
};

export function TraceItem({ isLive, ...trace }: TraceItemProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="border-b cursor-pointer px-4 py-3 transition-colors"
      style={{
        animation: isLive ? "fadeSlide 200ms ease-out" : undefined,
        borderColor: "var(--color-b1)",
        background: expanded ? "var(--color-s1)" : "transparent",
        borderLeft: isLive ? "3px solid var(--color-gold)" : "3px solid transparent",
        transition: "background 150ms ease, border-left-color 1s ease",
      }}
      onClick={() => setExpanded((p) => !p)}
    >
      {/* Row 1 — metadata */}
      <div className="flex items-center gap-2">
        <AgentTagChip tag={trace.agentTag} live={isLive} />
        <span className="font-mono text-[10px]" style={{ color: "var(--color-t2)" }}>
          {trace.crewName}
        </span>
        <span className="ml-auto font-mono text-[10px]" style={{ color: "var(--color-t3)" }}>
          {fmt(trace.createdAt)}
        </span>
      </div>

      {/* Row 2 — action */}
      <p className="mt-1.5 text-[13px] leading-[1.55]" style={{ color: "var(--color-t1)" }}>
        {trace.action}
      </p>

      {/* Row 3 — metrics */}
      <div className="mt-1.5 flex items-center gap-3 font-mono text-[11px]">
        <span style={{ color: STATUS_COLOR[trace.status] ?? "var(--color-t2)" }}>
          {trace.status === "ok" ? "Resolved" : trace.status === "warn" ? "Warning" : "Error"}
        </span>
        <span style={{ color: "var(--color-t3)" }}>{(trace.tokensIn + trace.tokensOut).toLocaleString()} tok</span>
        <span style={{ color: "var(--color-t3)" }}>${(trace.costCents / 100).toFixed(4)}</span>
        <span style={{ color: "var(--color-t3)" }}>{trace.latencyMs}ms</span>
      </div>

      {/* Expanded detail */}
      {expanded && (
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
      )}
    </div>
  );
}
