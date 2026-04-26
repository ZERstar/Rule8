"use client";

import { useMutation, useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { SecondaryPageShell } from "@/components/dashboard/SecondaryPageShell";
import { StatStrip } from "@/components/dashboard/StatStrip";
import { Button } from "@/components/ui/button";
import { StatusTag } from "@/components/tokens/StatusTag";
import { CREW_META, WORKSPACE_ID } from "@/lib/constants";
import { Check, X } from "lucide-react";

const SOURCE_LABEL: Record<string, string> = {
  intercom: "Intercom",
  discord: "Discord",
  stripe: "Stripe",
  slack: "Slack",
  crisp: "Crisp",
  manual: "Manual",
};

const CREW_COLOR: Record<string, string> = {
  finance: "#14B8A6",
  support: "#4D7CFF",
  community: "#8B5CF6",
  executive: "#0052FF",
};

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

export default function EscalationsPage() {
  const tasksQuery = useQuery(api.tasks.listEscalated, { workspaceId: WORKSPACE_ID });
  const resolve = useMutation(api.tasks.resolveEscalation);
  const tasks: Doc<"tasks">[] | undefined = tasksQuery;
  const totalCost = (tasks ?? []).reduce((sum, t) => sum + (t.totalCostCents ?? 0), 0);
  const crewCounts = (tasks ?? []).reduce<Record<string, number>>((acc, t) => {
    acc[t.crewTag] = (acc[t.crewTag] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <SecondaryPageShell>
      <PageHeader
        eyebrow="Escalation Queue"
        title="Items requiring your review"
        highlight="your review"
        description="Tasks the agents flagged as outside operating policy. Approve or dismiss to close the loop."
      />

      <StatStrip
        items={[
          { label: "Open escalations", value: tasks?.length ?? "—", sub: "Pending review" },
          { label: "Total cost impact", value: tasks ? `$${(totalCost / 100).toFixed(2)}` : "—", sub: "Across flagged tasks" },
          {
            label: "Oldest item",
            value: tasks?.length ? timeAgo(Math.min(...tasks.map((t) => t.createdAt))) : "—",
            sub: "Since escalation",
          },
        ]}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* Queue */}
        <div>
          {!tasks ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-[140px] rounded-2xl border border-[var(--color-b1)] bg-[var(--color-surface-2)] animate-pulse" />
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-[var(--color-b1)] bg-white p-12 text-center">
              <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-[var(--color-green-bg)]">
                <Check className="size-5 text-[var(--color-green)]" strokeWidth={2.5} />
              </div>
              <p className="text-[20px] font-semibold tracking-[-0.02em] text-foreground">
                Queue is clear
              </p>
              <p className="mt-2 max-w-md text-[13.5px] leading-[1.6] text-[var(--color-t3)]">
                All crews are operating within policy. New escalations appear here only when an agent crosses a routing or approval boundary.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => {
                const crew = CREW_META[task.crewTag as keyof typeof CREW_META];
                const color = CREW_COLOR[task.crewTag] ?? "var(--color-t3)";

                return (
                  <div
                    key={task._id}
                    className="relative overflow-hidden rounded-2xl border border-[var(--color-b1)] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]"
                  >
                    {/* color strip */}
                    <span
                      className="absolute inset-y-0 left-0 w-[3px]"
                      style={{ background: color }}
                    />

                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <StatusTag status="escalated" />
                          {crew && (
                            <span
                              className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.12em]"
                              style={{ background: `${color}12`, color, borderColor: `${color}30` }}
                            >
                              {crew.icon} {crew.label}
                            </span>
                          )}
                          <span className="rounded-md border border-[var(--color-b1)] bg-[var(--color-surface-2)] px-2 py-0.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-t3)]">
                            {SOURCE_LABEL[task.source] ?? task.source}
                          </span>
                          <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-t4)]">
                            {timeAgo(task.createdAt)}
                          </span>
                        </div>

                        <p className="text-[16px] font-semibold leading-[1.45] tracking-[-0.01em] text-foreground">
                          {task.summary}
                        </p>

                        {task.escalationReason && (
                          <div className="mt-3 rounded-lg border border-[var(--color-amber-bg)] bg-[var(--color-amber-bg)] px-3.5 py-2.5">
                            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-amber)]">
                              Reason flagged
                            </p>
                            <p className="mt-1.5 text-[13px] leading-[1.55] text-foreground">
                              {task.escalationReason}
                            </p>
                          </div>
                        )}

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[10px] tabular-nums text-[var(--color-t3)]">
                            {(task.totalTokens ?? 0).toLocaleString()} tok
                          </span>
                          <span className="text-[var(--color-t4)]">·</span>
                          <span className="font-mono text-[10px] tabular-nums text-[var(--color-t3)]">
                            ${((task.totalCostCents ?? 0) / 100).toFixed(4)}
                          </span>
                          {task.latencyMs && (
                            <>
                              <span className="text-[var(--color-t4)]">·</span>
                              <span className="font-mono text-[10px] tabular-nums text-[var(--color-t3)]">
                                {task.latencyMs.toLocaleString()}ms
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-col gap-2 lg:w-[140px]">
                        <Button
                          size="sm"
                          onClick={() =>
                            void resolve({
                              taskId: task._id as Id<"tasks">,
                              resolution: "Approved by founder",
                            })
                          }
                        >
                          <Check className="size-3.5" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            void resolve({
                              taskId: task._id as Id<"tasks">,
                              resolution: "Dismissed by founder",
                            })
                          }
                        >
                          <X className="size-3.5" />
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <div className="rounded-2xl border border-[var(--color-b1)] bg-white p-5">
            <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[var(--color-t3)]">
              Founder review lane
            </p>
            <h3
              className="mt-2 text-[18px] leading-[1.1] tracking-[-0.02em] text-foreground"
              style={{ fontFamily: "var(--font-display)" }}
            >
              How to process the queue
            </h3>
            <div className="mt-4 space-y-2.5">
              {[
                "Approve when the agent made the correct escalation and the next step should proceed.",
                "Dismiss when the escalation was unnecessary and the underlying prompt or routing should be tightened.",
                "Use the source and crew badges to understand which operating lane triggered the review.",
              ].map((rule) => (
                <div key={rule} className="rounded-lg border border-[var(--color-b1)] bg-[var(--color-surface-2)]/50 px-3.5 py-2.5">
                  <p className="text-[12.5px] leading-[1.55] text-[var(--color-t3)]">{rule}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--color-b1)] bg-white p-5">
            <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[var(--color-t3)]">
              Crew pressure
            </p>
            <h3
              className="mt-2 text-[18px] leading-[1.1] tracking-[-0.02em] text-foreground"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Queue distribution
            </h3>
            <div className="mt-4 space-y-2">
              {tasks && tasks.length > 0 ? (
                Object.entries(crewCounts).map(([crewTag, count]) => {
                  const crew = CREW_META[crewTag as keyof typeof CREW_META];
                  const color = CREW_COLOR[crewTag] ?? "var(--color-t3)";
                  return (
                    <div
                      key={crewTag}
                      className="flex items-center justify-between rounded-lg border border-[var(--color-b1)] bg-[var(--color-surface-2)]/50 px-3.5 py-2.5"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className="flex size-9 items-center justify-center rounded-lg text-[14px]"
                          style={{ background: `${color}14`, border: `1px solid ${color}28` }}
                        >
                          {crew?.icon ?? "•"}
                        </span>
                        <div>
                          <p className="text-[13px] font-semibold tracking-[-0.01em] text-foreground">
                            {crew?.label ?? crewTag}
                          </p>
                          <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--color-t3)]">
                            Flagged items
                          </p>
                        </div>
                      </div>
                      <span className="text-[18px] font-semibold tabular-nums tracking-[-0.02em] text-foreground">
                        {count}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-lg border border-[var(--color-b1)] bg-[var(--color-surface-2)]/50 px-3.5 py-2.5">
                  <p className="text-[12.5px] leading-[1.55] text-[var(--color-t3)]">
                    Crew distribution appears here once the queue contains active escalations.
                  </p>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </SecondaryPageShell>
  );
}
