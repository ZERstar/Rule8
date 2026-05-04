# STEP 07 — Task Detail & Trace Timeline

**Phase:** 3 — UX Polish
**Depends on:** STEP_02
**Estimated time:** 4–5 hours

---

## Why

Every task row in Invoices, Tickets, Escalations, and Activity is currently read-only and flat. The founder has no way to see what actually happened — which agent ran, which tools were called, what the resolution was. This step adds a task detail slide-over with a full trace timeline, turning the dashboard into a real observability tool.

---

## Part A — Route

**Modify: `lib/routes.ts`**

```ts
dashboardTask: (id: string) => `/dashboard/tasks/${id}` as const,
```

**New file: `app/(dashboard)/dashboard/tasks/[id]/page.tsx`**

```tsx
import { TaskDetailPage } from "@/components/dashboard/TaskDetailPage";

export default function Page({ params }: { params: { id: string } }) {
  return <TaskDetailPage taskId={params.id} />;
}
```

---

## Part B — Backend queries

**Modify: `convex/tasks.ts`** — add a public query for a single task:

```ts
export const getById = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    return ctx.db.get(args.taskId);
  },
});
```

**Modify: `convex/traces.ts`** — add a query to list all traces for a task:

```ts
export const listByTask = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    return ctx.db
      .query("traces")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .order("asc")
      .collect();
  },
});
```

---

## Part C — TaskDetailPage component

**New file: `components/dashboard/TaskDetailPage.tsx`**

```tsx
"use client";

import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { SecondaryPageShell } from "./SecondaryPageShell";
import { PageHeader } from "./PageHeader";
import { StatusTag } from "@/components/tokens/StatusTag";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, XCircle, AlertTriangle, Clock, Zap } from "lucide-react";
import { ROUTES } from "@/lib/routes";

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

function money(cents: number) {
  return `$${(cents / 100).toFixed(4)}`;
}

const STEP_ICON: Record<string, React.ElementType> = {
  llm_call:      Zap,
  tool_call:     Zap,
  tool_result:   CheckCircle2,
  overseer_route: AlertTriangle,
  escalation:    AlertTriangle,
  resolution:    CheckCircle2,
  error:         XCircle,
};

const STEP_COLOR: Record<string, string> = {
  llm_call:      "var(--color-accent-orange)",
  tool_call:     "#4D7CFF",
  tool_result:   "var(--color-accent-green)",
  overseer_route: "var(--color-t3)",
  escalation:    "var(--color-accent-orange)",
  resolution:    "var(--color-accent-green)",
  error:         "#ef4444",
};

export function TaskDetailPage({ taskId }: { taskId: string }) {
  const router = useRouter();
  const task   = useQuery(api.tasks.getById,     { taskId: taskId as Id<"tasks"> });
  const traces = useQuery(api.traces.listByTask, { taskId: taskId as Id<"tasks"> });
  const resolve = useMutation(api.tasks.resolveEscalation);

  if (task === undefined) {
    return (
      <SecondaryPageShell>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-[var(--color-surface-2)]" />
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
          <Button variant="outline" className="mt-4" onClick={() => router.back()}>Go back</Button>
        </div>
      </SecondaryPageShell>
    );
  }

  return (
    <SecondaryPageShell>
      {/* Back button */}
      <button
        type="button"
        onClick={() => router.back()}
        className="mb-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-t3)] hover:text-[var(--color-t1)] transition-colors"
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
                onClick={() => resolve({ taskId: task._id, resolution: "Approved by founder" })}
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => resolve({ taskId: task._id, resolution: "Dismissed by founder" })}
              >
                Dismiss
              </Button>
            </div>
          ) : undefined
        }
      />

      {/* Meta strip */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <StatusTag status={task.status} />
        <Badge variant="outline" className="rounded-full font-mono text-[9px] uppercase">
          {task.crewTag}
        </Badge>
        <Badge variant="outline" className="rounded-full font-mono text-[9px] uppercase">
          {task.source}
        </Badge>
        <span className="font-mono text-[10px] text-[var(--color-t3)]">
          {timeAgo(task.createdAt)}
        </span>
        <span className="ml-auto font-mono text-[10px] tabular-nums text-[var(--color-t3)]">
          {(task.totalTokens ?? 0).toLocaleString()} tok · {money(task.totalCostCents)}
        </span>
      </div>

      {/* Escalation reason */}
      {task.escalationReason && (
        <div className="mb-6 rounded-2xl border border-[var(--color-amber-bg)] bg-[var(--color-amber-bg)] px-4 py-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-amber)]">Escalation reason</p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-foreground">{task.escalationReason}</p>
        </div>
      )}

      {/* Resolution */}
      {task.resolution && (
        <div className="mb-6 rounded-2xl border border-[rgba(34,197,94,0.20)] bg-[rgba(34,197,94,0.06)] px-4 py-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-accent-green)]">Resolution</p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-foreground">{task.resolution}</p>
        </div>
      )}

      {/* Trace timeline */}
      <div>
        <p className="mb-4 font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--color-t3)]">
          Trace timeline — {traces?.length ?? 0} steps
        </p>

        {!traces && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-2xl bg-[var(--color-surface-2)]" />
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
            {/* Vertical connector line */}
            <div className="absolute left-[19px] top-5 bottom-5 w-px bg-[var(--color-b1)]" />

            {traces.map((trace, i) => {
              const Icon  = STEP_ICON[trace.stepType]  ?? Zap;
              const color = STEP_COLOR[trace.stepType] ?? "var(--color-t3)";
              return (
                <div key={trace._id} className="relative flex gap-4 pb-4">
                  {/* Icon dot */}
                  <div
                    className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-white bg-white shadow-sm"
                    style={{ outline: `2px solid ${color}28`, background: `${color}10` }}
                  >
                    <Icon className="h-4 w-4" style={{ color }} />
                  </div>

                  {/* Content */}
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
                      <div className="shrink-0 text-right">
                        <Badge
                          variant="outline"
                          className="rounded-full font-mono text-[8px] uppercase"
                          style={{
                            color:            trace.status === "ok" ? "var(--color-accent-green)" : trace.status === "error" ? "#ef4444" : "var(--color-accent-orange)",
                            borderColor:      trace.status === "ok" ? "rgba(34,197,94,0.3)" : trace.status === "error" ? "rgba(239,68,68,0.3)" : "rgba(249,115,22,0.3)",
                            backgroundColor:  trace.status === "ok" ? "rgba(34,197,94,0.08)" : trace.status === "error" ? "rgba(239,68,68,0.08)" : "rgba(249,115,22,0.08)",
                          }}
                        >
                          {trace.status}
                        </Badge>
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--color-t3)]">
                        {trace.stepType}
                      </span>
                      {trace.model && (
                        <span className="font-mono text-[9px] text-[var(--color-t4)]">
                          {trace.model}
                        </span>
                      )}
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
```

---

## Part D — Make task rows clickable

Every page that shows task rows should link to the detail page. Update the following components to wrap each task row with a `<Link>`:

**Files to update:**
- `components/dashboard/DataPages.tsx` — `TaskTable` component
- `app/(dashboard)/dashboard/escalations/page.tsx` — task rows
- `app/(dashboard)/dashboard/activity/page.tsx` — trace rows (link to task detail if `trace.taskId` exists)

Pattern:
```tsx
import Link from "next/link";

// Wrap the row div:
<Link href={`/dashboard/tasks/${task._id}`} className="block hover:bg-[var(--color-surface-2)] transition-colors">
  {/* existing row content */}
</Link>
```

For trace rows in Activity: only linkable if `trace.taskId` is set.

---

## Acceptance Criteria

- [ ] `/dashboard/tasks/:id` loads for a valid task ID
- [ ] Page shows task summary, status badge, crew badge, source badge, cost, token count
- [ ] Escalation reason and resolution panels render when present
- [ ] Trace timeline shows all steps in chronological order with icons, status badges, latency, cost
- [ ] Each step type has a distinct icon and colour
- [ ] Task rows in Invoices, Tickets, Escalations are clickable and navigate to task detail
- [ ] "Back" button returns to previous page
- [ ] Approve/Dismiss buttons visible and functional when task status is `escalated`
- [ ] Loading skeleton shown while data fetches
- [ ] `npx tsc --noEmit` passes

---

## Completion Notes

- Date completed: 2026-05-02
- Deviations from spec: The existing internal `tasks.getById` was renamed to `tasks.getByIdInternal` so `api.tasks.getById` can serve the authenticated task detail UI. Task and trace detail queries validate workspace ownership, not just authentication. Escalation rows use a clickable content area to avoid nesting action buttons inside a link. Post-review fix on 2026-05-02: `tasks.resolveEscalation` now validates task workspace ownership before approve/dismiss writes. A malformed task URL segment is now skipped client-side and renders the intended "Task not found" UI instead of sending an invalid Convex id. Trace step icons and colours are distinct per step type.
- New files created not listed above: None.
- Anything the next agent should know: Verified direct task detail queries with owned workspace `kd7094pytr6ppd5ts52vggc7rx85z7ev` and task `k17592amdk59jg42w30rdh9y1x85z45y`; trace timeline returned `overseer_route`, `llm_call`, `tool_call`, and `tool_result` rows. Unauthorized task and trace reads for the same task fail with `Unauthorized`.
