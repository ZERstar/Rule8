"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { WORKSPACE_ID } from "@/lib/constants";

const POWER_TAGS = ["creates agents", "task graphs", "handoffs", "memory", "eval", "policy"];

export function ExecutiveBlock({ onOpen }: { onOpen: () => void }) {
  const stats = useQuery(api.tasks.getStats, { workspaceId: WORKSPACE_ID });

  return (
    <div
      className="relative flex h-full cursor-pointer flex-col overflow-hidden p-4 transition-all"
      style={{
        background: "linear-gradient(135deg, rgba(200,151,42,0.14), rgba(200,151,42,0.04))",
        borderBottom: "1px solid rgba(200,151,42,0.24)",
      }}
      onClick={onOpen}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.background =
          "linear-gradient(135deg, rgba(200,151,42,0.20), rgba(200,151,42,0.08))";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.background =
          "linear-gradient(135deg, rgba(200,151,42,0.14), rgba(200,151,42,0.04))";
      }}
    >
      {/* Watermark */}
      <span
        className="pointer-events-none absolute -right-2 -top-4 select-none font-mono font-bold leading-none"
        style={{ fontSize: 140, color: "rgba(200,151,42,0.05)", zIndex: 0 }}
        aria-hidden
      >
        E
      </span>

      {/* Content fills height, pushes CTA to bottom */}
      <div className="relative z-10 flex h-full flex-col justify-between gap-3">
        <div className="flex flex-col gap-3">
          {/* Header */}
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[6px] font-mono text-[15px] font-bold text-black"
              style={{ background: "var(--color-gold)" }}
            >
              E
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-semibold" style={{ color: "var(--color-gold)" }}>
                  Executive
                </span>
                <span
                  className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-mono text-[8px] font-semibold"
                  style={{ background: "rgba(34,197,94,0.14)", color: "var(--color-green)" }}
                >
                  <span
                    className="h-[5px] w-[5px] rounded-full"
                    style={{ background: "var(--color-green)", animation: "pulse-gold 2.5s ease-in-out infinite" }}
                  />
                  LIVE
                </span>
              </div>
              <p className="font-mono text-[10px]" style={{ color: "var(--color-t3)" }}>
                Agent OS · Orchestrator
              </p>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-1">
            {[
              { label: "Agents",      value: stats?.agentsManaged ?? "—" },
              { label: "Tasks today", value: stats?.tasksToday    ?? "—" },
              { label: "Cost today",  value: stats ? `$${((stats.costTodayCents ?? 0) / 100).toFixed(2)}` : "—" },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="flex flex-col items-center rounded-[4px] px-1 py-2"
                style={{ background: "rgba(200,151,42,0.07)" }}
              >
                <span className="font-semibold leading-none" style={{ fontSize: 17, color: "var(--color-t1)" }}>
                  {value}
                </span>
                <span className="mt-1 text-center font-mono text-[9px] leading-none" style={{ color: "var(--color-t3)" }}>
                  {label}
                </span>
              </div>
            ))}
          </div>

          {/* Power tags */}
          <div className="flex flex-wrap gap-1">
            {POWER_TAGS.map((tag) => (
              <span
                key={tag}
                className="rounded-[3px] px-[5px] py-[2px] font-mono text-[8px]"
                style={{
                  background: "rgba(200,151,42,0.08)",
                  color: "var(--color-gold)",
                  border: "1px solid rgba(200,151,42,0.16)",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* CTA — pinned to bottom */}
        <button
          className="w-full rounded-[6px] py-2.5 font-mono text-[11px] font-semibold text-black transition"
          style={{ background: "var(--color-gold)" }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "var(--color-gold-l)")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "var(--color-gold)")}
          onClick={(e) => { e.stopPropagation(); onOpen(); }}
        >
          → Open conversation
        </button>
      </div>
    </div>
  );
}
