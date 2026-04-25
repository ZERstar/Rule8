"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { WORKSPACE_ID, CREW_META } from "@/lib/constants";
import { SecondaryPageShell } from "@/components/dashboard/SecondaryPageShell";
import type { Id } from "@/convex/_generated/dataModel";

const SOURCE_LABEL: Record<string, string> = {
  intercom: "Intercom",
  discord:  "Discord",
  stripe:   "Stripe",
  slack:    "Slack",
  crisp:    "Crisp",
  manual:   "Manual",
};

const CREW_COLOR: Record<string, string> = {
  finance:   "var(--color-teal)",
  support:   "var(--color-blue)",
  community: "var(--color-purple)",
  executive: "var(--color-gold)",
};

function timeAgo(ts: number) {
  const secs = Math.floor((Date.now() - ts) / 1000);
  if (secs < 60)  return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  return `${Math.floor(secs / 3600)}h ago`;
}

export default function EscalationsPage() {
  const tasks = useQuery(api.tasks.listEscalated, { workspaceId: WORKSPACE_ID });
  const resolve = useMutation(api.tasks.resolveEscalation);

  return (
    <SecondaryPageShell>
      <div className="mx-auto max-w-4xl">
        {/* Page header */}
        <div className="mb-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: "var(--color-t3)" }}>
            Escalation Queue
          </p>
          <h1 className="mt-2 text-[26px] font-semibold tracking-[-0.02em]" style={{ color: "var(--color-t1)" }}>
            Items requiring your review
          </h1>
          <p className="mt-2 text-[13px] leading-[1.7]" style={{ color: "var(--color-t2)" }}>
            Tasks the agents flagged as outside their operating policy. Approve or override to close each item.
          </p>
        </div>

        {/* List */}
        {!tasks ? (
          <div className="font-mono text-[11px]" style={{ color: "var(--color-t3)" }}>Loading...</div>
        ) : tasks.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center rounded-[12px] border py-16"
            style={{ borderColor: "var(--color-b1)", background: "var(--color-s1)" }}
          >
            <div
              className="mb-4 flex h-12 w-12 items-center justify-center rounded-full"
              style={{ background: "rgba(34,197,94,0.10)" }}
            >
              <span style={{ color: "var(--color-green)", fontSize: 22 }}>✓</span>
            </div>
            <p className="font-semibold" style={{ color: "var(--color-t1)" }}>No escalations</p>
            <p className="mt-1 font-mono text-[11px]" style={{ color: "var(--color-t3)" }}>
              All crews are operating within policy.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {tasks.map((task) => {
              const crew = CREW_META[task.crewTag as keyof typeof CREW_META];
              return (
                <div
                  key={task._id}
                  className="rounded-[10px] border p-5 transition"
                  style={{
                    borderColor: "var(--color-b1)",
                    background: "var(--color-s1)",
                    borderLeft: "3px solid var(--color-amber)",
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      {/* Badges */}
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span
                          className="rounded-[4px] px-2 py-0.5 font-mono text-[10px]"
                          style={{ background: "rgba(217,119,6,0.10)", color: "var(--color-amber)" }}
                        >
                          Escalated
                        </span>
                        {crew && (
                          <span
                            className="rounded-[4px] px-2 py-0.5 font-mono text-[10px]"
                            style={{ background: "var(--color-s2)", color: CREW_COLOR[task.crewTag] ?? "var(--color-t2)" }}
                          >
                            {crew.icon} {crew.label}
                          </span>
                        )}
                        <span className="rounded-[4px] px-2 py-0.5 font-mono text-[10px]" style={{ background: "var(--color-s2)", color: "var(--color-t3)" }}>
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
                        <div
                          className="mt-3 rounded-[6px] border px-3 py-2"
                          style={{ borderColor: "rgba(217,119,6,0.20)", background: "rgba(217,119,6,0.06)" }}
                        >
                          <p className="font-mono text-[10px] uppercase tracking-[0.12em]" style={{ color: "var(--color-amber)" }}>
                            Escalation reason
                          </p>
                          <p className="mt-1 text-[12px] leading-snug" style={{ color: "var(--color-t2)" }}>
                            {task.escalationReason}
                          </p>
                        </div>
                      )}

                      {/* Cost/tokens */}
                      <div className="mt-3 flex gap-4 font-mono text-[10px]" style={{ color: "var(--color-t3)" }}>
                        <span>{(task.totalTokens ?? 0).toLocaleString()} tokens</span>
                        <span>${((task.totalCostCents ?? 0) / 100).toFixed(4)} cost</span>
                        {task.latencyMs && <span>{task.latencyMs}ms</span>}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex shrink-0 flex-col gap-2">
                      <button
                        className="rounded-[6px] px-4 py-2 font-mono text-[11px] font-semibold text-black transition"
                        style={{ background: "var(--color-gold)" }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "var(--color-gold-l)")}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "var(--color-gold)")}
                        onClick={() => void resolve({ taskId: task._id as Id<"tasks">, resolution: "Reviewed and approved by founder" })}
                      >
                        Approve
                      </button>
                      <button
                        className="rounded-[6px] border px-4 py-2 font-mono text-[11px] transition"
                        style={{ borderColor: "var(--color-b2)", color: "var(--color-t2)" }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-red)";
                          (e.currentTarget as HTMLButtonElement).style.color = "var(--color-red)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-b2)";
                          (e.currentTarget as HTMLButtonElement).style.color = "var(--color-t2)";
                        }}
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
