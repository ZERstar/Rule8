# STEP 08 — UX Polish

**Phase:** 3 — UX Polish
**Depends on:** STEP_07
**Estimated time:** 4–5 hours

---

## Why

Pages with empty databases look broken. The Topbar health badge is hardcoded. The Activity page has no filtering. These are the differences between "demo" and "product a founder would trust."

---

## Part A — Empty states with CTAs

Every data page needs an empty state that tells the founder what to do next. Replace all bare `<p>No X yet.</p>` with a proper component.

### Shared empty state component

**New file: `components/dashboard/EmptyState.tsx`**

```tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon:        LucideIcon;
  title:       string;
  description: string;
  cta?:        { label: string; href: string };
}

export function EmptyState({ icon: Icon, title, description, cta }: EmptyStateProps) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-[var(--color-b1)] bg-white px-8 py-12 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-surface-2)]">
        <Icon className="h-6 w-6 text-[var(--color-t3)]" />
      </div>
      <p className="text-[18px] font-semibold tracking-[-0.02em] text-foreground">{title}</p>
      <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-[var(--color-t3)]">{description}</p>
      {cta && (
        <Button asChild className="mt-6 h-10 px-6 font-mono text-[10px] uppercase tracking-[0.14em]">
          <Link href={cta.href}>{cta.label}</Link>
        </Button>
      )}
    </div>
  );
}
```

### Wire empty states per page

**Modify `components/dashboard/DataPages.tsx`:**

```tsx
import { Activity, Receipt, Ticket, ListChecks } from "lucide-react";
import { EmptyState } from "./EmptyState";
import { ROUTES } from "@/lib/routes";

// ActivityPage — replace the "No activity yet" paragraph:
{traces?.length === 0 && (
  <EmptyState
    icon={Activity}
    title="No agent activity yet"
    description="Send a manual task or connect an integration to start seeing agent traces here."
    cta={{ label: "Connect an integration", href: ROUTES.dashboardIntegrations }}
  />
)}

// InvoicesPage:
{invoiceTasks.length === 0 && (
  <EmptyState
    icon={Receipt}
    title="No finance tasks yet"
    description="Finance crew handles billing queries, refund requests, and charge lookups. Connect Stripe to activate it."
    cta={{ label: "Connect Stripe", href: ROUTES.dashboardIntegrations }}
  />
)}

// TicketsPage:
{ticketTasks.length === 0 && (
  <EmptyState
    icon={Ticket}
    title="No tickets yet"
    description="Support and Community crews handle inbound tickets. Connect Intercom or Discord to start routing."
    cta={{ label: "Connect integrations", href: ROUTES.dashboardIntegrations }}
  />
)}

// EvalsPage — no cases:
{cases?.length === 0 && (
  <EmptyState
    icon={ListChecks}
    title="No eval cases yet"
    description="Eval cases are created when you run evaluations from the Prompts page."
    cta={{ label: "Open Prompts", href: ROUTES.dashboardPrompts }}
  />
)}
```

**Modify `app/(dashboard)/dashboard/escalations/page.tsx`** — the "Queue is clear" state is already good. No change needed.

**Modify `app/(dashboard)/dashboard/integrations/page.tsx`** — the provider grid always renders. No empty state needed.

---

## Part B — Topbar real-time status

**Modify: `components/layout/Topbar.tsx`**

Replace the hardcoded "All agents healthy" badge with a reactive component.

```tsx
// New component inside Topbar.tsx:
function WorkspaceHealthBadge() {
  const workspaceId = useWorkspaceId();
  const stats = useAuthenticatedQuery(api.tasks.getStats, { workspaceId });
  const unread = useAuthenticatedQuery(api.notifications.unreadCount, { workspaceId });

  // Derive status
  const escalated = stats?.escalated ?? 0;
  const hasIssues = escalated > 0 || (unread ?? 0) > 0;

  if (hasIssues) {
    return (
      <div className="hidden sm:flex items-center gap-1.5 shrink-0">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent-orange)]" />
        <span className="whitespace-nowrap text-[11px]" style={{ color: "var(--color-accent-orange)" }}>
          {escalated > 0 ? `${escalated} escalation${escalated > 1 ? "s" : ""}` : "Notifications pending"}
        </span>
      </div>
    );
  }

  return (
    <div className="hidden sm:flex items-center gap-1.5 shrink-0">
      <span className="live-dot" />
      <span className="whitespace-nowrap text-[11px]" style={{ color: "var(--color-t2)" }}>
        All agents healthy
      </span>
    </div>
  );
}
```

Replace the existing hardcoded health status section in Topbar with `<WorkspaceHealthBadge />`.

---

## Part C — Activity page filters

**Modify: `components/dashboard/DataPages.tsx` — `ActivityPage`**

Add crew and status filter pills above the trace table. Use URL search params so filters are bookmarkable.

```tsx
"use client";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

// Inside ActivityPage:
const searchParams = useSearchParams();
const router = useRouter();
const currentPathname = usePathname();

const crewFilter   = searchParams.get("crew")   ?? "all";
const statusFilter = searchParams.get("status") ?? "all";

function setFilter(key: "crew" | "status", value: string) {
  const params = new URLSearchParams(searchParams.toString());
  if (value === "all") params.delete(key);
  else params.set(key, value);
  router.replace(`${currentPathname}?${params.toString()}`);
}

// Filter the traces array:
const filtered = (traces ?? []).filter((t) => {
  const crewOk   = crewFilter   === "all" || t.crewTag   === crewFilter;
  const statusOk = statusFilter === "all" || t.status    === statusFilter;
  return crewOk && statusOk;
});
```

Filter pill UI — place between the PageHeader and the MetricCard grid:

```tsx
<div className="mb-4 flex flex-wrap items-center gap-2">
  {/* Crew filters */}
  {(["all", "finance", "support", "community", "executive"] as const).map((crew) => (
    <button
      key={crew}
      type="button"
      onClick={() => setFilter("crew", crew)}
      className="rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors"
      style={{
        borderColor: crewFilter === crew ? "#1f2937" : "var(--color-border)",
        background:  crewFilter === crew ? "#1f2937" : "white",
        color:       crewFilter === crew ? "white"   : "var(--color-t2)",
      }}
    >
      {crew === "all" ? "All crews" : crew}
    </button>
  ))}

  <span className="mx-1 text-[var(--color-b1)]">|</span>

  {/* Status filters */}
  {(["all", "ok", "warn", "error"] as const).map((status) => (
    <button
      key={status}
      type="button"
      onClick={() => setFilter("status", status)}
      className="rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors"
      style={{
        borderColor: statusFilter === status ? "#1f2937" : "var(--color-border)",
        background:  statusFilter === status ? "#1f2937" : "white",
        color:       statusFilter === status ? "white"   : "var(--color-t2)",
      }}
    >
      {status === "all" ? "All statuses" : status}
    </button>
  ))}
</div>
```

Use `filtered` instead of `traces` in the card content render.

---

## Part D — Server-side task queries

Replace client-side filtering in Invoices and Tickets with server-side queries.

**Modify: `convex/tasks.ts`** — add:

```ts
export const listByCrewTag = query({
  args: {
    workspaceId: v.string(),
    crewTag:     v.string(),
    limit:       v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    return ctx.db
      .query("tasks")
      .withIndex("by_workspace_and_crew_tag", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("crewTag", args.crewTag)
      )
      .order("desc")
      .take(args.limit ?? 100);
  },
});
```

**Modify: `components/dashboard/DataPages.tsx`**

```tsx
// InvoicesPage — replace:
// const tasks = useQuery(api.tasks.list, { workspaceId });
// const invoiceTasks = tasks?.filter((t) => t.crewTag === "finance") ?? [];
// With:
const invoiceTasks = useAuthenticatedQuery(api.tasks.listByCrewTag, {
  workspaceId, crewTag: "finance",
}) ?? [];

// TicketsPage — replace:
// const tasks = useQuery(api.tasks.list, { workspaceId });
// const ticketTasks = tasks?.filter(...) ?? [];
// With:
const supportTasks   = useAuthenticatedQuery(api.tasks.listByCrewTag, { workspaceId, crewTag: "support" })    ?? [];
const communityTasks = useAuthenticatedQuery(api.tasks.listByCrewTag, { workspaceId, crewTag: "community" })  ?? [];
const ticketTasks    = [...supportTasks, ...communityTasks].sort((a, b) => b.createdAt - a.createdAt);
```

---

## Acceptance Criteria

- [ ] `EmptyState` component exists at `components/dashboard/EmptyState.tsx`
- [ ] Activity, Invoices, Tickets, Evals pages show proper empty states with CTA buttons when data is empty
- [ ] Topbar health badge shows escalation count when `stats.escalated > 0`, otherwise "All agents healthy"
- [ ] Topbar health badge updates in real-time without page refresh
- [ ] Activity page has crew and status filter pills
- [ ] Selecting a filter pill updates the URL (`?crew=finance&status=error`)
- [ ] Refreshing the page with filter params in the URL preserves the active filters
- [ ] Invoices page uses `api.tasks.listByCrewTag` instead of fetching all tasks
- [ ] Tickets page uses `api.tasks.listByCrewTag` instead of fetching all tasks
- [ ] `npx tsc --noEmit` passes

---

## Completion Notes

- Date completed: 2026-05-02
- Deviations from spec: Also closed review-found security gaps before UX polish. Public task and trace workspace reads now validate workspace ownership, `submitManualTask` validates ownership before creating/routing work, and `resolveEscalation` validates ownership before mutating a task. Activity filtered empty state reuses the same `EmptyState` component with no CTA when filters exclude all rows. Post-review fix on 2026-05-02: Invoices and Tickets now keep `undefined` loading state separate from empty arrays, and the Activity trace metric reports `0` for zero-result filters instead of falling back to total trace count.
- New files created not listed above: None.
- Anything the next agent should know: Verified unauthorized failures for `tasks:getStats`, `tasks:listByCrewTag`, `tasks:listRecent`, `tasks:getByExternalId`, `tasks:submitManualTask`, `tasks:resolveEscalation`, `traces:listRecent`, `traces:listByTaskId`, and `traces:listByUser` against workspace `kd7b05wd1exma39j621spqwa7n85zah1`. Owned `tasks:getStats` and `tasks:listByCrewTag` still work. `npx convex codegen` and `npx tsc --noEmit` pass.
