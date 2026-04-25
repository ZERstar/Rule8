"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { WORKSPACE_ID } from "@/lib/constants";

const POWER_TAGS = ["creates agents", "task graphs", "handoffs", "memory", "eval", "policy"];

export function ExecutiveBlock({ onOpen }: { onOpen: () => void }) {
  const stats = useQuery(api.tasks.getStats, { workspaceId: WORKSPACE_ID });

  return (
    <div
      className="relative flex h-full cursor-pointer flex-col overflow-hidden transition-all"
      style={{
        background: "linear-gradient(160deg, rgba(200,151,42,0.18) 0%, rgba(200,151,42,0.06) 55%, rgba(200,151,42,0.02) 100%)",
        borderBottom: "1px solid rgba(200,151,42,0.28)",
      }}
      onClick={onOpen}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = "linear-gradient(160deg, rgba(200,151,42,0.24) 0%, rgba(200,151,42,0.10) 55%, rgba(200,151,42,0.04) 100%)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = "linear-gradient(160deg, rgba(200,151,42,0.18) 0%, rgba(200,151,42,0.06) 55%, rgba(200,151,42,0.02) 100%)"; }}
    >
      {/* Watermark */}
      <span
        className="pointer-events-none absolute -right-3 -top-5 select-none font-mono font-black leading-none"
        style={{ fontSize: 160, color: "rgba(200,151,42,0.04)", zIndex: 0 }}
        aria-hidden
      >
        E
      </span>

      <div className="relative z-10 flex h-full flex-col justify-between p-4">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] font-mono text-[14px] font-black text-black"
              style={{ background: "var(--color-gold)" }}
            >
              E
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-bold" style={{ color: "var(--color-gold)" }}>
                  Executive
                </span>
                <span
                  className="flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[8px] font-bold"
                  style={{ background: "rgba(34,197,94,0.15)", color: "var(--color-green)" }}
                >
                  <span
                    className="h-[5px] w-[5px] rounded-full"
                    style={{ background: "var(--color-green)", animation: "pulse-gold 2s ease-in-out infinite" }}
                  />
                  LIVE
                </span>
              </div>
              <p className="font-mono text-[9px] uppercase tracking-[0.14em]" style={{ color: "var(--color-t3)" }}>
                Agent OS · Orchestrator
              </p>
            </div>
          </div>

          {/* Stats — PDF style: small label, big number */}
          <div className="mt-4 grid grid-cols-3 gap-1">
            {[
              { label: "AGENTS",      value: stats?.agentsManaged ?? "—" },
              { label: "TASKS TODAY", value: stats?.tasksToday    ?? "—" },
              { label: "COST TODAY",  value: stats ? `$${((stats.costTodayCents ?? 0) / 100).toFixed(2)}` : "—" },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="flex flex-col items-center rounded-[4px] px-1 py-2.5"
                style={{ background: "rgba(200,151,42,0.10)" }}
              >
                <span className="font-bold leading-none" style={{ fontSize: 22, color: "var(--color-t1)" }}>
                  {value}
                </span>
                <span className="mt-1.5 text-center font-mono text-[8px] uppercase tracking-[0.12em]" style={{ color: "var(--color-t3)" }}>
                  {label}
                </span>
              </div>
            ))}
          </div>

          {/* Power tags */}
          <div className="mt-3 flex flex-wrap gap-1">
            {POWER_TAGS.map(tag => (
              <span
                key={tag}
                className="rounded-[3px] px-[6px] py-[3px] font-mono text-[9px]"
                style={{ background: "rgba(200,151,42,0.10)", color: "var(--color-gold)", border: "1px solid rgba(200,151,42,0.20)" }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* CTA pinned to bottom */}
        <button
          className="mt-4 w-full rounded-[6px] py-2.5 font-mono text-[11px] font-bold text-black transition"
          style={{ background: "var(--color-gold)" }}
          onMouseEnter={e => (e.currentTarget.style.background = "var(--color-gold-l)")}
          onMouseLeave={e => (e.currentTarget.style.background = "var(--color-gold)")}
          onClick={e => { e.stopPropagation(); onOpen(); }}
        >
          → Open conversation
        </button>
      </div>
    </div>
  );
}
