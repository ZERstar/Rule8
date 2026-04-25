"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { WORKSPACE_ID, CREW_META } from "@/lib/constants";
import { SecondaryPageShell } from "@/components/dashboard/SecondaryPageShell";

const SOURCE_LABEL: Record<string, string> = {
  intercom: "Intercom",
  discord:  "Discord",
  stripe:   "Stripe",
  slack:    "Slack",
  crisp:    "Crisp",
  manual:   "Manual",
};

const CREW_COLOR: Record<string, string> = {
  finance:   "#34D399",
  support:   "#60A5FA",
  community: "#A78BFA",
  executive: "#C8972A",
};

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60)   return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

export default function EscalationsPage() {
  const tasks   = useQuery(api.tasks.listEscalated, { workspaceId: WORKSPACE_ID });
  const resolve = useMutation(api.tasks.resolveEscalation);
  type TaskDoc  = NonNullable<typeof tasks>[number];

  const totalCost = (tasks ?? []).reduce((s: number, t: TaskDoc) => s + (t.totalCostCents ?? 0), 0);

  return (
    <SecondaryPageShell>
      <div className="mx-auto max-w-4xl space-y-8">

        {/* ── Header ── */}
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: "var(--color-t3)" }}>
            Escalation Queue
          </p>
          <h1 className="mt-2 text-[26px] font-semibold tracking-[-0.02em]" style={{ color: "var(--color-t1)" }}>
            Items requiring your review
          </h1>
          <p className="mt-1.5 max-w-xl text-[13px] leading-[1.7]" style={{ color: "var(--color-t2)" }}>
            Tasks the agents flagged as outside their operating policy. Approve or dismiss each item to close the loop.
          </p>
        </div>

        {/* ── Stat strip ── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Open escalations",  value: tasks?.length ?? "—" },
            { label: "Total cost impact", value: tasks ? `$${(totalCost / 100).toFixed(2)}` : "—" },
            { label: "Oldest item",       value: tasks?.length ? timeAgo(Math.min(...tasks.map((t: TaskDoc) => t.createdAt))) : "—" },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="rounded-[10px] border p-4"
              style={{ borderColor: "var(--color-b1)", background: "var(--color-s1)" }}
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--color-t3)" }}>
                {label}
              </p>
              <p className="mt-2 text-[22px] font-semibold tracking-[-0.02em]" style={{ color: "var(--color-t1)" }}>
                {value}
              </p>
            </div>
          ))}
        </div>

        {/* ── List ── */}
        {!tasks ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="h-[120px] animate-pulse rounded-[10px]"
                style={{ background: "var(--color-s1)", border: "1px solid var(--color-b1)" }} />
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center rounded-[12px] border py-20"
            style={{ borderColor: "var(--color-b1)", background: "var(--color-s1)" }}
          >
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full"
              style={{ background: "rgba(34,197,94,0.10)" }}>
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
                <path d="M5 13l4 4L19 7" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="text-[15px] font-semibold" style={{ color: "var(--color-t1)" }}>
              Queue is clear
            </p>
            <p className="mt-1 font-mono text-[11px]" style={{ color: "var(--color-t3)" }}>
              All crews are operating within policy.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task: TaskDoc) => {
              const crew  = CREW_META[task.crewTag as keyof typeof CREW_META];
              const color = CREW_COLOR[task.crewTag] ?? "var(--color-t2)";
              return (
                <div
                  key={task._id}
                  className="rounded-[10px] border p-5"
                  style={{
                    borderColor: "var(--color-b1)",
                    background: "var(--color-s1)",
                    borderLeft: "3px solid var(--color-amber)",
                  }}
                >
                  <div className="flex items-start gap-5">
                    <div className="min-w-0 flex-1 space-y-3">

                      {/* Badge row */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-[4px] px-2 py-0.5 font-mono text-[10px]"
                          style={{ background: "rgba(217,119,6,0.12)", color: "var(--color-amber)" }}>
                          Escalated
                        </span>
                        {crew && (
                          <span className="rounded-[4px] px-2 py-0.5 font-mono text-[10px]"
                            style={{ background: `${color}14`, color }}>
                            {crew.icon} {crew.label}
                          </span>
                        )}
                        <span className="rounded-[4px] px-2 py-0.5 font-mono text-[10px]"
                          style={{ background: "var(--color-s2)", color: "var(--color-t3)" }}>
                          {SOURCE_LABEL[task.source] ?? task.source}
                        </span>
                        <span className="ml-auto font-mono text-[10px]" style={{ color: "var(--color-t3)" }}>
                          {timeAgo(task.createdAt)}
                        </span>
                      </div>

                      {/* Summary */}
                      <p className="text-[14px] font-medium leading-snug" style={{ color: "var(--color-t1)" }}>
                        {task.summary}
                      </p>

                      {/* Escalation reason */}
                      {task.escalationReason && (
                        <div className="rounded-[6px] border px-3 py-2.5"
                          style={{ borderColor: "rgba(217,119,6,0.18)", background: "rgba(217,119,6,0.06)" }}>
                          <p className="font-mono text-[9px] uppercase tracking-[0.14em]" style={{ color: "var(--color-amber)" }}>
                            Reason flagged
                          </p>
                          <p className="mt-1 text-[12px] leading-snug" style={{ color: "var(--color-t2)" }}>
                            {task.escalationReason}
                          </p>
                        </div>
                      )}

                      {/* Metrics */}
                      <div className="flex gap-5 font-mono text-[10px]" style={{ color: "var(--color-t3)" }}>
                        <span>{(task.totalTokens ?? 0).toLocaleString()} tokens</span>
                        <span>${((task.totalCostCents ?? 0) / 100).toFixed(4)}</span>
                        {task.latencyMs && <span>{task.latencyMs.toLocaleString()}ms</span>}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex shrink-0 flex-col gap-2 pt-1">
                      <button
                        className="rounded-[6px] px-4 py-2 font-mono text-[11px] font-semibold text-black transition"
                        style={{ background: "var(--color-gold)" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "var(--color-gold-l)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "var(--color-gold)")}
                        onClick={() => void resolve({ taskId: task._id as Id<"tasks">, resolution: "Approved by founder" })}
                      >
                        Approve
                      </button>
                      <button
                        className="rounded-[6px] border px-4 py-2 font-mono text-[11px] transition"
                        style={{ borderColor: "var(--color-b2)", color: "var(--color-t2)" }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--color-red)"; e.currentTarget.style.color = "var(--color-red)"; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--color-b2)"; e.currentTarget.style.color = "var(--color-t2)"; }}
                        onClick={() => void resolve({ taskId: task._id as Id<"tasks">, resolution: "Dismissed by founder" })}
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </SecondaryPageShell>
  );
}
