"use client";

import type { ElementType } from "react";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import {
  AlertOctagon,
  ArrowLeft,
  Bot,
  CheckCircle2,
  CircleCheckBig,
  Clock,
  Compass,
  Terminal,
  XCircle,
} from "lucide-react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { SecondaryPageShell } from "@/components/dashboard/SecondaryPageShell";
import { StatusTag } from "@/components/tokens/StatusTag";
import { useAuthenticatedQuery } from "@/lib/use-authenticated-query";

function timeAgo(ts: number) {
  const seconds = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

function money(cents: number) {
  return `$${(cents / 100).toFixed(4)}`;
}

const STEP_ICON: Record<string, ElementType> = {
  llm_call: Bot,
  tool_call: Terminal,
  tool_result: CheckCircle2,
  overseer_route: Compass,
  escalation: AlertOctagon,
  resolution: CircleCheckBig,
  error: XCircle,
};

const STEP_COLOR: Record<string, string> = {
  llm_call: "#8B5CF6",
  tool_call: "#4D7CFF",
  tool_result: "var(--color-accent-green)",
  overseer_route: "#0F766E",
  escalation: "var(--color-accent-orange)",
  resolution: "#16A34A",
  error: "#ef4444",
};

function isValidTaskId(value: string): value is Id<"tasks"> {
  return /^k[0-9a-z]{31}$/.test(value);
}

export function TaskDetailPage({ taskId }: { taskId: string }) {
  const router = useRouter();
  const validTaskId = isValidTaskId(taskId) ? taskId : null;
  const task = useAuthenticatedQuery(
    api.tasks.getById,
    validTaskId ? { taskId: validTaskId } : "skip",
  );
  const traces = useAuthenticatedQuery(
    api.traces.listByTask,
    validTaskId ? { taskId: validTaskId } : "skip",
  );
  const resolve = useMutation(api.tasks.resolveEscalation);

  if (!validTaskId) {
    return (
      <SecondaryPageShell>
        <div className="flex min-h-[320px] flex-col items-center justify-center">
          <p className="text-[16px] font-semibold text-foreground">Task not found</p>
          <Button variant="outline" className="mt-4" onClick={() => router.back()}>
            Go back
          </Button>
        </div>
      </SecondaryPageShell>
    );
  }

  if (task === undefined) {
    return (
      <SecondaryPageShell>
        <div className="space-y-4">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-20 animate-pulse rounded-2xl bg-[var(--color-surface-2)]" />
          ))}
        </div>
      </SecondaryPageShell>
    );
  }

  if (task === null) {
    return (
      <SecondaryPageShell>
        <div className="flex min-h-[320px] flex-col items-center justify-center">
          <p className="text-[16px] font-semibold text-foreground">Task not found</p>
          <Button variant="outline" className="mt-4" onClick={() => router.back()}>
            Go back
          </Button>
        </div>
      </SecondaryPageShell>
    );
  }

  return (
    <SecondaryPageShell contentClassName="max-w-[1180px]">
      <button
        type="button"
        onClick={() => router.back()}
        className="mb-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-t3)] transition-colors hover:text-[var(--color-t1)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back
      </button>

      <PageHeader
        eyebrow={`· Task · ${task.source}`}
        title={task.summary}
        action={
          task.status === "escalated" ? (
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() =>
                  void resolve({ taskId: task._id, resolution: "Approved by founder" })
                }
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  void resolve({ taskId: task._id, resolution: "Dismissed by founder" })
                }
              >
                Dismiss
              </Button>
            </div>
          ) : undefined
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <StatusTag status={task.status} />
        <Badge variant="outline" className="rounded-full font-mono text-[9px] uppercase">
          {task.crewTag}
        </Badge>
        <Badge variant="outline" className="rounded-full font-mono text-[9px] uppercase">
          {task.source}
        </Badge>
        <span className="inline-flex items-center gap-1 font-mono text-[10px] text-[var(--color-t3)]">
          <Clock className="h-3 w-3" />
          {timeAgo(task.createdAt)}
        </span>
        {(task.retryCount ?? 0) > 0 && (
          <span className="font-mono text-[10px] text-[var(--color-accent-orange)]">
            {task.retryCount} retry{(task.retryCount ?? 0) > 1 ? "ies" : ""}
            {task.lastError ? ` · ${task.lastError.slice(0, 60)}` : ""}
          </span>
        )}
        <span className="ml-auto font-mono text-[10px] tabular-nums text-[var(--color-t3)]">
          {task.totalTokens.toLocaleString()} tok · {money(task.totalCostCents)}
        </span>
      </div>

      {task.escalationReason && (
        <div className="mb-6 rounded-2xl border border-[rgba(249,115,22,0.20)] bg-[rgba(249,115,22,0.08)] px-4 py-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-accent-orange)]">
            Escalation reason
          </p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-foreground">{task.escalationReason}</p>
        </div>
      )}

      {task.resolution && (
        <div className="mb-6 rounded-2xl border border-[rgba(34,197,94,0.20)] bg-[rgba(34,197,94,0.06)] px-4 py-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-accent-green)]">
            Resolution
          </p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-foreground">{task.resolution}</p>
        </div>
      )}

      <div>
        <p className="mb-4 font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--color-t3)]">
          Trace timeline - {traces?.length ?? 0} steps
        </p>

        {traces === undefined && (
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-16 animate-pulse rounded-2xl bg-[var(--color-surface-2)]" />
            ))}
          </div>
        )}

        {traces?.length === 0 && (
          <div className="rounded-2xl border border-[var(--color-b1)] bg-white px-5 py-8 text-center">
            <p className="text-[13px] text-[var(--color-t3)]">No trace steps recorded for this task.</p>
          </div>
        )}

        {traces && traces.length > 0 && (
          <div className="relative space-y-0">
            <div className="absolute bottom-5 left-[19px] top-5 w-px bg-[var(--color-b1)]" />

            {traces.map((trace) => {
              const Icon = STEP_ICON[trace.stepType] ?? Clock;
              const color = STEP_COLOR[trace.stepType] ?? "var(--color-t3)";

              return (
                <div key={trace._id} className="relative flex gap-4 pb-4">
                  <div
                    className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-white bg-white shadow-sm"
                    style={{ outline: `2px solid ${color}28`, background: `${color}10` }}
                  >
                    <Icon className="h-4 w-4" style={{ color }} />
                  </div>

                  <div className="min-w-0 flex-1 rounded-2xl border border-[var(--color-b1)] bg-white px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold leading-snug text-foreground">
                          {trace.action}
                        </p>
                        {trace.toolOutputPreview && (
                          <p className="mt-1 text-[11.5px] leading-relaxed text-[var(--color-t3)]">
                            {trace.toolOutputPreview}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline" className="shrink-0 rounded-full font-mono text-[8px] uppercase">
                        {trace.status}
                      </Badge>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--color-t3)]">
                        {trace.stepType}
                      </span>
                      <span className="font-mono text-[9px] text-[var(--color-t4)]">{trace.model}</span>
                      {trace.latencyMs > 0 && (
                        <span className="font-mono text-[9px] tabular-nums text-[var(--color-t4)]">
                          {trace.latencyMs}ms
                        </span>
                      )}
                      {trace.tokensIn + trace.tokensOut > 0 && (
                        <span className="font-mono text-[9px] tabular-nums text-[var(--color-t4)]">
                          {(trace.tokensIn + trace.tokensOut).toLocaleString()} tok
                        </span>
                      )}
                      {trace.costCents > 0 && (
                        <span className="font-mono text-[9px] tabular-nums text-[var(--color-t4)]">
                          {money(trace.costCents)}
                        </span>
                      )}
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
