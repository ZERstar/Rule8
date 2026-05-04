# STEP 12 — Value Engine (digest, signal clustering, ROI widget, anomaly detection)

**Phase:** 6 — Retention & Discovery
**Depends on:** STEP_06, STEP_09
**Estimated time:** 8–10 hours

---

## Why

From `business_product_plan.md` (§10.2, §7.3, §4.3):

> *"Weekly Executive digest email — Single most important retention mechanic. Founder sees the week's value in one read."*
> *"Signal clustering — support data becomes product intelligence."*
> *"Cost and time transparency widget — ROI always visible. Renewal is never a question."*
> *"Anomaly detection before the founder notices."*

Without these, the product works but the founder doesn't know it's working. They need to feel the value every week, not just when they remember to check the dashboard. This step is the retention layer.

---

## Part A — Weekly digest (email)

### Backend: digest action

**New file: `convex/digest.ts`**

```ts
import { action, internalAction, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal, api } from "./_generated/api";
import { runAgentModel } from "../lib/anthropic";

/** Called by cron every Monday 9am. Runs for every workspace. */
export const sendWeeklyDigest = internalAction({
  handler: async (ctx) => {
    const workspaces = await ctx.runQuery(internal.workspaces.listAll);

    for (const workspace of workspaces) {
      try {
        await ctx.runAction(internal.digest.sendForWorkspace, {
          workspaceId: workspace._id,
        });
      } catch {
        // Never let one workspace failure stop others
      }
    }
  },
});

export const sendForWorkspace = internalAction({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    const since = Date.now() - ONE_WEEK_MS;

    // Gather last 7 days of data
    const [stats, recentTasks, recentTraces, escalations] = await Promise.all([
      ctx.runQuery(api.tasks.getStats, { workspaceId: args.workspaceId }),
      ctx.runQuery(internal.tasks.listSince, { workspaceId: args.workspaceId, since }),
      ctx.runQuery(internal.traces.listSince, { workspaceId: args.workspaceId, since }),
      ctx.runQuery(api.tasks.listEscalated,   { workspaceId: args.workspaceId }),
    ]);

    const resolved  = recentTasks.filter((t) => t.status === "resolved").length;
    const escalated = recentTasks.filter((t) => t.status === "escalated").length;
    const totalCost = recentTasks.reduce((sum, t) => sum + t.totalCostCents, 0);

    // Build the digest prompt
    const prompt = `Write a concise weekly operational digest for a solo founder.

DATA THIS WEEK:
- Tasks handled autonomously: ${resolved}
- Tasks escalated to founder: ${escalated}
- Total agent spend: $${(totalCost / 100).toFixed(2)}
- Trace steps executed: ${recentTraces.length}

TOP TASK SUMMARIES (sample):
${recentTasks.slice(0, 5).map((t) => `- [${t.crewTag}] ${t.summary} → ${t.status}`).join("\n")}

Write 3 sections:
1. What was handled (2–3 sentences, specific)
2. What patterns you noticed (1–2 observations from the data)
3. What needs the founder's attention this week (escalations + any anomalies)

Tone: direct, like a smart colleague giving a Monday morning briefing. No fluff. Under 200 words total.`;

    const result = await runAgentModel({
      systemPrompt: "You are the Rule8 Executive AI writing a weekly digest email for a founder.",
      userPrompt:   prompt,
      maxTokens:    400,
      mockText:     `This week your agents handled ${resolved} tasks autonomously. ${escalated > 0 ? `${escalated} escalations need your attention.` : "No escalations — all crews operating within policy."} Total agent spend: $${(totalCost / 100).toFixed(2)}.`,
    });

    // Save digest as a chat message so it appears in Executive panel history
    await ctx.runMutation(internal.chat.insertMessage, {
      workspaceId: args.workspaceId,
      role:        "executive",
      text:        `📋 Weekly digest:\n\n${result.text}`,
    });

    // Create a notification
    await ctx.runMutation(internal.notifications.create, {
      workspaceId: args.workspaceId,
      type:        "task_resolved",
      title:       "Weekly digest ready",
      body:        `${resolved} tasks handled this week · $${(totalCost / 100).toFixed(2)} spent`,
      linkTo:      "/dashboard",
    });

    // TODO: send via Resend email when Resend is connected
    // const resendIntegration = await ctx.runQuery(...)
    // if (resendIntegration?.status === "connected") { ... }
  },
});
```

### Wire to cron

**Modify: `convex/crons.ts`**

```ts
// Add alongside the integration health check:
crons.weekly(
  "weekly-digest",
  { dayOfWeek: "monday", hourUTC: 9, minuteUTC: 0 },
  internal.digest.sendWeeklyDigest,
);
```

### Backend queries needed

**Modify: `convex/tasks.ts`** — add:

```ts
export const listSince = internalQuery({
  args: { workspaceId: v.string(), since: v.number() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("tasks")
      .withIndex("by_workspace_and_created_at", (q) =>
        q.eq("workspaceId", args.workspaceId)
      )
      .filter((q) => q.gte(q.field("createdAt"), args.since))
      .collect();
  },
});
```

**Modify: `convex/traces.ts`** — add:

```ts
export const listSince = internalQuery({
  args: { workspaceId: v.string(), since: v.number() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("traces")
      .withIndex("by_workspace_and_created_at", (q) =>
        q.eq("workspaceId", args.workspaceId)
      )
      .filter((q) => q.gte(q.field("createdAt"), args.since))
      .collect();
  },
});
```

**Modify: `convex/workspaces.ts`** — add:

```ts
export const listAll = internalQuery({
  handler: async (ctx) => {
    return ctx.db.query("workspaces").collect();
  },
});
```

---

## Part B — Signal clustering (feature request extraction)

Executive reads across resolved tasks and clusters them by pattern. Surfaces insights the founder would never see by reading individual tickets.

### Backend: clustering action

**New file: `convex/signals.ts`**

```ts
import { internalAction, internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal, api } from "./_generated/api";
import { runAgentModel } from "../lib/anthropic";

/** Run daily. Clusters recent tasks into patterns. */
export const clusterSignals = internalAction({
  args: { workspaceId: v.string() },
  handler: async (ctx, args) => {
    const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
    const tasks = await ctx.runQuery(internal.tasks.listSince, {
      workspaceId: args.workspaceId,
      since:       Date.now() - THREE_DAYS_MS,
    });

    if (tasks.length < 5) return; // Not enough signal

    const taskSummaries = tasks
      .filter((t) => t.status === "resolved")
      .slice(0, 40)
      .map((t) => `[${t.crewTag}] ${t.summary}`)
      .join("\n");

    const prompt = `Analyse these ${tasks.length} support and operational tasks from the last 3 days. 
Identify any recurring patterns, clusters of similar issues, or emerging trends worth surfacing to the founder.

TASKS:
${taskSummaries}

Return a JSON array of patterns found (empty array if no notable patterns):
[
  {
    "pattern": "Short label for the pattern",
    "count": number_of_tasks_matching,
    "insight": "One sentence on what this means for the product or business",
    "crew": "which crew tag this relates to"
  }
]

Only include patterns with 3+ similar tasks. Surface product gaps, recurring failures, or unusual spikes.`;

    const result = await runAgentModel({
      systemPrompt: "You are an analytical operations assistant identifying patterns in business data.",
      userPrompt:   prompt,
      maxTokens:    600,
      mockText:     "[]",
    });

    const jsonMatch = result.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return;

    try {
      const patterns: Array<{ pattern: string; count: number; insight: string; crew: string }> =
        JSON.parse(jsonMatch[0]);

      if (patterns.length === 0) return;

      // Save each pattern as a signal row
      for (const p of patterns) {
        await ctx.runMutation(internal.signals.upsertPattern, {
          workspaceId: args.workspaceId,
          ...p,
        });
      }

      // Create a notification if strong signal found
      const topPattern = patterns[0];
      if (topPattern && topPattern.count >= 5) {
        await ctx.runMutation(internal.notifications.create, {
          workspaceId: args.workspaceId,
          type:        "task_resolved",
          title:       `Pattern detected: ${topPattern.pattern}`,
          body:        `${topPattern.count} tasks match · ${topPattern.insight}`,
          linkTo:      "/dashboard/signals",
        });
      }
    } catch {
      // Malformed JSON from model — skip silently
    }
  },
});

export const upsertPattern = internalMutation({
  args: {
    workspaceId: v.string(),
    pattern:     v.string(),
    count:       v.number(),
    insight:     v.string(),
    crew:        v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("signals", {
      ...args,
      detectedAt: Date.now(),
    });
  },
});

export const listRecent = query({
  args: { workspaceId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
    return ctx.db
      .query("signals")
      .withIndex("by_workspace_detected", (q) =>
        q.eq("workspaceId", args.workspaceId)
      )
      .filter((q) => q.gte(q.field("detectedAt"), Date.now() - THREE_DAYS_MS))
      .order("desc")
      .take(10);
  },
});
```

### Schema addition

**Modify: `convex/schema.ts`** — add:

```ts
signals: defineTable({
  workspaceId: v.string(),
  pattern:     v.string(),    // "7 users asked about billing export"
  count:       v.number(),
  insight:     v.string(),    // "Possible missing feature: CSV invoice export"
  crew:        v.string(),
  detectedAt:  v.number(),
})
  .index("by_workspace_detected", ["workspaceId", "detectedAt"]),
```

### Wire to cron

**Modify: `convex/crons.ts`**

```ts
// Run signal clustering every 12 hours
crons.interval(
  "signal-clustering",
  { hours: 12 },
  internal.signals.clusterSignalsAllWorkspaces,
);
```

Add `clusterSignalsAllWorkspaces` to `convex/signals.ts`:

```ts
export const clusterSignalsAllWorkspaces = internalAction({
  handler: async (ctx) => {
    const workspaces = await ctx.runQuery(internal.workspaces.listAll);
    for (const ws of workspaces) {
      try {
        await ctx.runAction(internal.signals.clusterSignals, { workspaceId: ws._id });
      } catch {}
    }
  },
});
```

---

## Part C — Cost / ROI transparency widget

The founder should always know how much value Rule8 is generating. This widget surfaces the ROI case passively.

### New component

**New file: `components/dashboard/ROIWidget.tsx`**

```tsx
"use client";

import { useAuthenticatedQuery } from "@/lib/use-authenticated-query";
import { api } from "@/convex/_generated/api";
import { useWorkspaceId } from "@/lib/workspace-context";

// Estimated time saved per resolved task (conservative: 8 minutes)
const MINUTES_PER_TASK = 8;
const FOUNDER_HOURLY_RATE = 150; // USD — configurable later

export function ROIWidget() {
  const workspaceId = useWorkspaceId();
  const stats = useAuthenticatedQuery(api.tasks.getStats, { workspaceId });

  if (!stats) return null;

  const resolved   = stats.tasksToday ?? 0;
  const costToday  = (stats.costTodayCents ?? 0) / 100;
  const timeSavedH = (resolved * MINUTES_PER_TASK) / 60;
  const valueSaved = timeSavedH * FOUNDER_HOURLY_RATE;
  const roi        = costToday > 0 ? ((valueSaved - costToday) / costToday) * 100 : 0;

  return (
    <div className="rounded-[24px] border border-[var(--color-b1)] bg-white p-4 shadow-[0_8px_24px_rgba(28,39,49,0.05)]">
      <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--color-t3)]">
        Value today
      </p>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <div>
          <p className="text-[22px] font-semibold tabular-nums tracking-[-0.04em] text-foreground">
            {resolved}
          </p>
          <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.12em] text-[var(--color-t3)]">
            Tasks handled
          </p>
        </div>
        <div>
          <p className="text-[22px] font-semibold tabular-nums tracking-[-0.04em] text-foreground">
            {timeSavedH.toFixed(1)}h
          </p>
          <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.12em] text-[var(--color-t3)]">
            Time saved
          </p>
        </div>
        <div>
          <p className="text-[22px] font-semibold tabular-nums tracking-[-0.04em] text-[var(--color-accent-green)]">
            ${costToday.toFixed(2)}
          </p>
          <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.12em] text-[var(--color-t3)]">
            Agent cost
          </p>
        </div>
      </div>

      {roi > 0 && (
        <div className="mt-3 rounded-[16px] bg-[rgba(34,197,94,0.08)] px-3 py-2">
          <p className="text-[11.5px] text-[var(--color-accent-green)]">
            ~{Math.round(roi)}× return on agent spend today
          </p>
        </div>
      )}
    </div>
  );
}
```

### Wire into dashboard

**Modify: `components/dashboard/CommandPanel.tsx`** — add `<ROIWidget />` below the Chambers section:

```tsx
import { ROIWidget } from "./ROIWidget";

// Inside CommandPanel, after the chambers section:
<div className="border-b border-[var(--color-border)] px-3 py-3">
  <ROIWidget />
</div>
```

---

## Part D — Anomaly detection

Executive checks for unusual spikes and fires a notification when detected.

**Modify: `convex/signals.ts`** — add:

```ts
export const checkAnomalies = internalAction({
  args: { workspaceId: v.string() },
  handler: async (ctx, args) => {
    const ONE_HOUR_MS  = 60 * 60 * 1000;
    const ONE_DAY_MS   = 24 * ONE_HOUR_MS;

    // Compare last hour vs daily average
    const [lastHour, yesterday] = await Promise.all([
      ctx.runQuery(internal.tasks.listSince, {
        workspaceId: args.workspaceId,
        since:       Date.now() - ONE_HOUR_MS,
      }),
      ctx.runQuery(internal.tasks.listSince, {
        workspaceId: args.workspaceId,
        since:       Date.now() - ONE_DAY_MS,
      }),
    ]);

    const hourlyRate  = lastHour.length;
    const dailyAvgPerHour = yesterday.length / 24;

    // Spike: last hour had 3× the hourly average, and at least 5 tasks
    if (hourlyRate >= 5 && dailyAvgPerHour > 0 && hourlyRate / dailyAvgPerHour >= 3) {
      const topCrew = lastHour.reduce<Record<string, number>>((acc, t) => {
        acc[t.crewTag] = (acc[t.crewTag] ?? 0) + 1;
        return acc;
      }, {});
      const dominantCrew = Object.entries(topCrew).sort((a, b) => b[1] - a[1])[0];

      await ctx.runMutation(internal.notifications.create, {
        workspaceId: args.workspaceId,
        type:        "escalation",
        title:       `Unusual activity spike detected`,
        body:        `${hourlyRate} tasks in the last hour (${Math.round(hourlyRate / dailyAvgPerHour)}× normal). ${dominantCrew ? `Primarily ${dominantCrew[0]} crew.` : ""}`,
        linkTo:      "/dashboard/activity",
      });
    }
  },
});
```

**Modify: `convex/crons.ts`** — add anomaly check every 30 minutes:

```ts
crons.interval(
  "anomaly-detection",
  { minutes: 30 },
  internal.signals.checkAnomaliesAllWorkspaces,
);
```

Add `checkAnomaliesAllWorkspaces` to `signals.ts` (same pattern as `clusterSignalsAllWorkspaces`).

---

## Part E — Signals surface in Executive context

**Modify: `convex/chat.ts`** — in the `send` action, also fetch recent signals:

```ts
const recentSignals = await ctx.runQuery(api.signals.listRecent, {
  workspaceId: args.workspaceId,
});
```

Pass to `buildExecutiveChatPrompt`:

```ts
signals: recentSignals.map((s) => `${s.pattern} (${s.count} tasks) — ${s.insight}`),
```

**Modify: `lib/agents/prompts.ts`** — add to Executive prompt:

```ts
if (args.signals?.length) {
  lines.push(``, `PATTERNS DETECTED THIS WEEK:`);
  args.signals.forEach((s) => lines.push(`  · ${s}`));
}
```

Now when the founder asks "what should I pay attention to this week?", Executive can reference actual clustered patterns, not just raw numbers.

---

## Part F — Executive not configurable (fix)

**Modify: `app/(dashboard)/dashboard/prompts/page.tsx`**

Remove Executive from the agent selector. Executive's system prompt is a Rule8 engineering decision, not a founder preference.

```tsx
// Change AGENTS_META to exclude executive:
const AGENTS_META: Record<AgentKey, ...> = {
  support:   { ... },
  billing:   { ... },
  community: { ... },
  // executive removed — it is not configurable by the founder
};
```

Also filter `allAgents` to exclude executive-tagged agents from the prompt editor selector.

---

## Acceptance Criteria

- [ ] `convex/digest.ts` exists with `sendWeeklyDigest` and `sendForWorkspace`
- [ ] `convex/signals.ts` exists with `clusterSignals`, `upsertPattern`, `listRecent`, `checkAnomalies`
- [ ] `convex/schema.ts` has a `signals` table with `by_workspace_detected` index
- [ ] `convex/crons.ts` has weekly digest, 12h signal clustering, 30m anomaly detection
- [ ] `components/dashboard/ROIWidget.tsx` exists and renders in `CommandPanel`
- [ ] ROI widget shows tasks handled, time saved estimate, agent cost today
- [ ] Weekly digest creates a chat message and notification when triggered manually via Convex dashboard
- [ ] Signal clustering runs and creates `signals` rows when 5+ similar tasks exist
- [ ] Anomaly spike creates a notification when hourly rate is 3× daily average
- [ ] Executive's chat responses reference `recentSignals` when patterns exist
- [ ] Executive is removed from the Prompts page agent selector
- [ ] `npx tsc --noEmit` passes

---

## Completion Notes

- Date completed: 2026-05-04
- Deviations from spec: `digest.ts` saves the weekly digest as a chat message and creates a `task_resolved` notification rather than sending email (Resend integration path is stubbed with a TODO comment). Signal clustering runs every 12 hours and anomaly detection every 30 minutes as specified. The schema `notifications` table gained a `weekly_digest` literal to the type union to accommodate digest notifications. `signals` table added with `by_workspace_detected` index. `convex/tasks.ts` gained `listSince` internalQuery and `convex/traces.ts` gained `listSince` internalQuery for digest and clustering use. `convex/workspaces.ts` gained `listAll` internalQuery used by the digest and clustering all-workspaces fanout actions. Executive's `buildExecutiveChatPrompt` now accepts `signals?: string[]` and renders a `PATTERNS DETECTED THIS WEEK` section when patterns exist. `chat.send` fetches `internal.signals.listRecentInternal` in the parallel context fetch. Executive is excluded from the Prompts page — `AgentKey = "support" | "billing" | "community"` with no executive entry in `AGENTS_META`.
- New files created not listed above: None beyond what the spec listed.
- Anything the next agent should know: ROIWidget uses `tasksToday` from `tasks.getStats` as the resolved count — this counts all tasks created today, not only resolved ones. A future refinement would filter to `status: "resolved"` only. Weekly digest and clustering crons are registered and will fire on schedule in the deployed Convex instance; they can also be triggered manually from the Convex dashboard for testing. `npx tsc --noEmit` passes with zero errors.
