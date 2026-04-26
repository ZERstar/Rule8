"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { CREW_META, WORKSPACE_ID } from "@/lib/constants";
import { AgentTagChip } from "@/components/tokens/AgentTagChip";
import type { CrewKey } from "@/lib/dashboard";
import { ROUTES, isActiveNavPath } from "@/lib/routes";

type FilterTab = "all" | "executive" | "finance" | "support" | "community";

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all",       label: "ALL" },
  { key: "executive", label: "EXECUTIVE" },
  { key: "finance",   label: "FINANCE" },
  { key: "support",   label: "SUPPORT" },
  { key: "community", label: "COMMUNITY" },
];

const CREW_LABEL: Record<string, string> = {
  executive: "Exec Chamber",
  finance:   "Finance Crew",
  support:   "Support Crew",
  community: "Community Crew",
  system:    "System",
};

const CHAMBER_CARDS = [
  { key: "finance", label: "Finance", metric: "Invoices", accent: "#10b981", href: ROUTES.dashboardInvoices },
  { key: "support", label: "Tickets", metric: "Queue", accent: "#3b82f6", href: ROUTES.dashboardTickets },
  { key: "community", label: "Agent Uptime", metric: "Live", accent: "#8b5cf6", href: ROUTES.dashboardActivity },
  { key: "eval", label: "Eval Score", metric: "84%", accent: "#f97316", href: ROUTES.dashboardEvals },
] as const;

function timeAgo(ms: number): string {
  const diff = Math.floor((Date.now() - ms) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function StatusDot({ status }: { status: string }) {
  const isEscalated = status === "warn" || status === "error";
  return (
    <span
      className="inline-flex items-center gap-1 text-[12px]"
      style={{ color: isEscalated ? "var(--color-accent-orange)" : "var(--color-accent-green)" }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{
          background: isEscalated
            ? "var(--color-accent-orange)"
            : "var(--color-accent-green)",
        }}
      />
      {isEscalated ? "Escalated" : "Done"}
    </span>
  );
}

export function TraceFeed({
  selectedCrew,
  onSelectCrew,
}: {
  selectedCrew: CrewKey;
  onSelectCrew: (crew: CrewKey) => void;
}) {
  const [filter, setFilter] = useState<FilterTab>(selectedCrew);
  const pathname = usePathname();

  const traces = useQuery(api.traces.listRecent, {
    workspaceId: WORKSPACE_ID,
    limit: 40,
  });

  const stats = useQuery(api.tasks.getStats, { workspaceId: WORKSPACE_ID });
  const costDisplay = stats ? `$${(stats.costTodayCents / 100).toFixed(2)}` : "—";
  const agentCount = stats?.agentsManaged ?? "—";
  const selectedMeta = CREW_META[selectedCrew];
  const tasksToday = stats?.tasksToday ?? "—";

  const filtered =
    !traces
      ? []
      : filter === "all"
      ? traces
      : traces.filter((t) => t.agentTag === filter);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#fffdf9]">
      <div
        className="flex-none flex items-center justify-between border-b px-6 py-4"
        style={{ borderColor: "var(--color-border)" }}
      >
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[var(--color-t3)]">
            Telemetry section
          </p>
          <h1
            className="mt-1 text-[26px] font-semibold tracking-[-0.05em] text-[var(--color-t1)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {selectedMeta.label} command surface
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-white px-3 py-1.5 text-[11px] shadow-[0_8px_20px_rgba(28,39,49,0.05)]" style={{ color: "var(--color-t3)" }}>
            Today {costDisplay}
          </span>
          <span className="rounded-full bg-white px-3 py-1.5 text-[11px] shadow-[0_8px_20px_rgba(28,39,49,0.05)]" style={{ color: "var(--color-t3)" }}>
            {agentCount} agents
          </span>
        </div>
      </div>

      <div className="flex-none border-b border-[var(--color-border)] px-6 py-5">
        <div className="grid gap-3 xl:grid-cols-4">
          {CHAMBER_CARDS.map((card) => {
            const isCrew = card.key === "finance" || card.key === "support" || card.key === "community";
            const active =
              isActiveNavPath(pathname, card.href, false) ||
              (pathname === ROUTES.dashboardOverview && isCrew && selectedCrew === card.key);
            return (
              <Link
                key={card.key}
                href={card.href}
                onClick={() => {
                  if (isCrew) {
                    onSelectCrew(card.key);
                    setFilter(card.key);
                  }
                }}
                className={`rounded-[26px] border px-4 py-4 text-left transition-all ${
                  active ? "bg-[#1f2937] text-white" : "bg-white text-[var(--color-t1)] hover:-translate-y-0.5"
                }`}
                style={{
                  borderColor: active ? "#1f2937" : "var(--color-border)",
                  boxShadow: active
                    ? "0 18px 40px rgba(31,41,55,0.18)"
                    : "0 14px 34px rgba(28,39,49,0.06)",
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: card.accent }} />
                  <span className={`font-mono text-[9px] uppercase tracking-[0.18em] ${active ? "text-white/60" : "text-[var(--color-t3)]"}`}>
                    Chamber
                  </span>
                </div>
                <p className="mt-5 text-[22px] font-semibold tracking-[-0.05em]">{card.label}</p>
                <p className={`mt-1 text-[12px] ${active ? "text-white/62" : "text-[var(--color-t3)]"}`}>
                  {card.metric}
                </p>
              </Link>
            );
          })}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {[
            { label: "Tasks today", value: tasksToday },
            { label: "Live traces", value: traces?.length ?? "—" },
            { label: "Eval score", value: "84%" },
          ].map((item) => (
            <div key={item.label} className="rounded-[22px] border border-[var(--color-border)] bg-white/74 px-4 py-3">
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--color-t3)]">{item.label}</p>
              <p className="mt-2 text-[22px] font-semibold tracking-[-0.04em] text-[var(--color-t1)]">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div
        className="flex-none flex items-center justify-between gap-4 border-b px-6 py-3"
        style={{ borderColor: "var(--color-border)" }}
      >
        <div className="flex items-center gap-2">
          <span className="live-dot" />
          <span className="kicker">Live Trace</span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {FILTER_TABS.map((tab) => {
            const active = filter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilter(tab.key)}
                className="rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors"
                style={{
                  borderColor: active ? "#1f2937" : "var(--color-border)",
                  background: active ? "#1f2937" : "var(--color-bg)",
                  color: active ? "#ffffff" : "var(--color-t2)",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        className="thin-scroll flex-1 overflow-y-auto px-6 py-4"
      >
        {traces === undefined && (
          <div className="flex h-full items-center justify-center">
            <span className="text-[12px]" style={{ color: "var(--color-t3)" }}>
              Loading traces…
            </span>
          </div>
        )}

        {traces !== undefined && filtered.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-2">
            <span className="text-[12px]" style={{ color: "var(--color-t3)" }}>
              No traces yet.
            </span>
            <span className="text-[11px]" style={{ color: "var(--color-t3)" }}>
              Agents will appear here once active.
            </span>
          </div>
        )}

        <div className="space-y-2">
        {filtered.map((trace) => (
          <div
            key={trace._id}
            className="cursor-pointer rounded-[22px] border border-[var(--color-border)] bg-white px-4 py-3 shadow-[0_12px_30px_rgba(28,39,49,0.04)] transition-colors hover:bg-[var(--color-bg-secondary)]"
          >
            {/* Row 1: tag chip + crew name + time ago */}
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <AgentTagChip tag={trace.agentTag} />
                <span
                  className="text-[11px] uppercase tracking-[0.08em]"
                  style={{ color: "var(--color-t3)" }}
                >
                  {CREW_LABEL[trace.agentTag] ?? trace.agentTag}
                </span>
              </div>
              <span className="text-[11px]" style={{ color: "var(--color-t3)" }}>
                {timeAgo(trace.createdAt)}
              </span>
            </div>

            {/* Row 2: action text */}
            <p
              className="text-[13px] font-semibold leading-snug mb-1.5"
              style={{ color: "var(--color-t1)" }}
            >
              {trace.action}
            </p>

            {/* Row 3: status dot + cost + latency */}
            <div className="flex items-center gap-3">
              <StatusDot status={trace.status} />
              <span className="text-[12px]" style={{ color: "var(--color-t3)" }}>
                {trace.latencyMs}ms
              </span>
              <span className="text-[12px]" style={{ color: "var(--color-t3)" }}>
                ${(trace.costCents / 100).toFixed(4)}
              </span>
            </div>
          </div>
        ))}
        </div>
      </div>
    </div>
  );
}
