"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { WORKSPACE_ID, CREW_META } from "@/lib/constants";
import { SecondaryPageShell } from "@/components/dashboard/SecondaryPageShell";

const SOURCE_LABEL: Record<string, string> = {
  intercom: "Intercom", discord: "Discord", stripe: "Stripe",
  slack: "Slack", crisp: "Crisp", manual: "Manual",
};

const CREW_COLOR: Record<string, string> = {
  finance: "#34D399", support: "#60A5FA", community: "#A78BFA", executive: "#C8972A",
};

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

export default function EscalationsPage() {
  const tasksQuery = useQuery(api.tasks.listEscalated, { workspaceId: WORKSPACE_ID });
  const resolve    = useMutation(api.tasks.resolveEscalation);
  const tasks: Doc<"tasks">[] | undefined = tasksQuery;
  const totalCost  = (tasks ?? []).reduce((s, t) => s + (t.totalCostCents ?? 0), 0);

  return (
    <SecondaryPageShell>
      {/* Page header */}
      <div className="mb-8 border-b pb-6" style={{ borderColor: "var(--color-b1)" }}>
        <p className="font-mono text-[10px] uppercase tracking-[0.20em]" style={{ color: "var(--color-amber)" }}>
          · Escalation Queue
        </p>
        <h1 className="mt-2 text-[28px] font-semibold tracking-[-0.02em]" style={{ color: "var(--color-t1)" }}>
          Items requiring your review
        </h1>
        <p className="mt-1 text-[13px] leading-[1.65]" style={{ color: "var(--color-t2)" }}>
          Tasks the agents flagged as outside operating policy. Approve or dismiss to close the loop.
        </p>
      </div>

      {/* Stat strip — PDF style */}
      <div className="mb-8 grid grid-cols-3 gap-px" style={{ background: "var(--color-b1)" }}>
        {[
          { label: "OPEN ESCALATIONS",  value: tasks?.length          ?? "—", sub: "Pending review"      },
          { label: "TOTAL COST IMPACT", value: tasks ? `$${(totalCost / 100).toFixed(2)}` : "—", sub: "Across flagged tasks" },
          { label: "OLDEST ITEM",       value: tasks?.length ? timeAgo(Math.min(...tasks.map(t => t.createdAt))) : "—", sub: "Since escalation"    },
        ].map(({ label, value, sub }) => (
          <div key={label} className="px-5 py-4" style={{ background: "var(--color-s1)" }}>
            <p className="font-mono text-[9px] uppercase tracking-[0.18em]" style={{ color: "var(--color-t3)" }}>
              {label}
            </p>
            <p className="mt-2 text-[28px] font-semibold leading-none tracking-[-0.02em]" style={{ color: "var(--color-t1)" }}>
              {value}
            </p>
            <p className="mt-1 font-mono text-[10px]" style={{ color: "var(--color-t3)" }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* List */}
      {!tasks ? (
        <div className="space-y-2">
          {[1, 2].map(i => (
            <div key={i} className="h-[100px] rounded-[8px]"
              style={{ background: "var(--color-s1)", border: "1px solid var(--color-b1)", animation: "pulse 2s infinite" }} />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center rounded-[8px] border py-16"
          style={{ borderColor: "var(--color-b1)", background: "var(--color-s1)" }}
        >
          <div
            className="mb-3 flex h-12 w-12 items-center justify-center rounded-full"
            style={{ background: "rgba(34,197,94,0.10)" }}
          >
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
              <path d="M5 13l4 4L19 7" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="text-[14px] font-semibold" style={{ color: "var(--color-t1)" }}>Queue is clear</p>
          <p className="mt-1 font-mono text-[10px]" style={{ color: "var(--color-t3)" }}>
            All crews operating within policy.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task: Doc<"tasks">) => {
            const crew  = CREW_META[task.crewTag as keyof typeof CREW_META];
            const color = CREW_COLOR[task.crewTag] ?? "var(--color-t2)";
            return (
              <div
                key={task._id}
                className="rounded-[8px] border"
                style={{
                  borderColor: "var(--color-b1)",
                  background: "var(--color-s1)",
                  borderLeft: "3px solid var(--color-amber)",
                }}
              >
                <div className="flex items-start gap-4 p-4">
                  <div className="min-w-0 flex-1">
                    {/* Badge row */}
                    <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
                      <span className="rounded-[3px] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.10em]"
                        style={{ background: "rgba(217,119,6,0.12)", color: "var(--color-amber)" }}>
                        Escalated
                      </span>
                      {crew && (
                        <span className="rounded-[3px] px-2 py-0.5 font-mono text-[9px]"
                          style={{ background: `${color}14`, color }}>
                          {crew.icon} {crew.label}
                        </span>
                      )}
                      <span className="rounded-[3px] px-2 py-0.5 font-mono text-[9px]"
                        style={{ background: "var(--color-s2)", color: "var(--color-t3)" }}>
                        {SOURCE_LABEL[task.source] ?? task.source}
                      </span>
                      <span className="ml-auto font-mono text-[9px]" style={{ color: "var(--color-t3)" }}>
                        {timeAgo(task.createdAt)}
                      </span>
                    </div>

                    {/* Summary */}
                    <p className="text-[13px] font-medium leading-snug" style={{ color: "var(--color-t1)" }}>
                      {task.summary}
                    </p>

                    {/* Reason */}
                    {task.escalationReason && (
                      <div className="mt-2.5 rounded-[6px] border-l-2 pl-3"
                        style={{ borderColor: "var(--color-amber)" }}>
                        <p className="font-mono text-[9px] uppercase tracking-[0.12em]" style={{ color: "var(--color-amber)" }}>
                          Reason flagged
                        </p>
                        <p className="mt-0.5 text-[12px] leading-snug" style={{ color: "var(--color-t2)" }}>
                          {task.escalationReason}
                        </p>
                      </div>
                    )}

                    {/* Metrics */}
                    <div className="mt-2.5 flex gap-4 font-mono text-[10px]" style={{ color: "var(--color-t3)" }}>
                      <span>{(task.totalTokens ?? 0).toLocaleString()} tok</span>
                      <span>${((task.totalCostCents ?? 0) / 100).toFixed(4)}</span>
                      {task.latencyMs && <span>{task.latencyMs.toLocaleString()}ms</span>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 flex-col gap-1.5 pt-0.5">
                    <button
                      className="rounded-[6px] px-3 py-1.5 font-mono text-[10px] font-semibold text-black transition"
                      style={{ background: "var(--color-gold)" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "var(--color-gold-l)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "var(--color-gold)")}
                      onClick={() => void resolve({ taskId: task._id as Id<"tasks">, resolution: "Approved by founder" })}
                    >
                      Approve
                    </button>
                    <button
                      className="rounded-[6px] border px-3 py-1.5 font-mono text-[10px] transition"
                      style={{ borderColor: "var(--color-b2)", color: "var(--color-t3)" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--color-red)"; e.currentTarget.style.color = "var(--color-red)"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--color-b2)"; e.currentTarget.style.color = "var(--color-t3)"; }}
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
    </SecondaryPageShell>
  );
}
