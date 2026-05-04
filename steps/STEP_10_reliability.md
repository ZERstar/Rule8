# STEP 10 — Reliability (retry, idempotency, health checks)

**Phase:** 4 — Integrations
**Depends on:** STEP_09
**Estimated time:** 4–5 hours

---

## Why

One transient API timeout permanently fails a task. A webhook retry creates duplicate tasks. An integration going down is silent. These are production reliability gaps that erode founder trust fast.

---

## Part A — Task retry state machine

### Schema additions

**Modify: `convex/schema.ts`** — extend the `tasks` table:

```ts
tasks: defineTable({
  // ... existing fields ...

  // NEW retry fields:
  retryCount:   v.optional(v.number()),
  nextRetryAt:  v.optional(v.number()),
  failureMode:  v.optional(v.union(
    v.literal("transient"),   // rate limit, timeout → retry
    v.literal("permanent"),   // bad data, no agent → don't retry
    v.literal("escalated"),   // policy boundary → human
  )),
  lastError:    v.optional(v.string()),
})
```

### Retry mutation

**Modify: `convex/tasks.ts`** — add:

```ts
const MAX_RETRIES = 3;

export const scheduleRetry = internalMutation({
  args: {
    taskId:     v.id("tasks"),
    error:      v.string(),
    failureMode: v.union(v.literal("transient"), v.literal("permanent")),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) return;

    const retryCount = (task.retryCount ?? 0) + 1;

    if (args.failureMode === "permanent" || retryCount > MAX_RETRIES) {
      // Give up — mark as failed permanently
      await ctx.db.patch(args.taskId, {
        status:      "failed",
        failureMode: args.failureMode,
        lastError:   args.error,
        retryCount,
      });
      return;
    }

    // Exponential backoff: 30s, 2m, 8m
    const backoffMs = Math.pow(4, retryCount) * 30_000;
    const nextRetryAt = Date.now() + backoffMs;

    await ctx.db.patch(args.taskId, {
      status:      "pending",
      retryCount,
      nextRetryAt,
      lastError:   args.error,
      failureMode: "transient",
    });
  },
});
```

### Wire retry into agent runners

**Modify: `convex/agent_runner/billing.ts`, `support.ts`, `community.ts`**

Wrap the `handleTask` body in a try/catch. On error, determine if it's transient:

```ts
try {
  // ... existing agent logic ...
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);

  // Classify: timeout/rate-limit = transient, others = permanent
  const isTransient =
    message.includes("timeout") ||
    message.includes("rate limit") ||
    message.includes("429") ||
    message.includes("503");

  await ctx.runMutation(internal.tasks.scheduleRetry, {
    taskId:      args.taskId,
    error:       message,
    failureMode: isTransient ? "transient" : "permanent",
  });

  if (isTransient) {
    // Schedule the retry
    const task = await ctx.runQuery(internal.tasks.getById, { taskId: args.taskId });
    if (task?.nextRetryAt) {
      const delayMs = task.nextRetryAt - Date.now();
      await ctx.scheduler.runAfter(
        Math.max(delayMs, 0),
        internal.agent_runner.support.handleTask,  // or billing/community
        { taskId: args.taskId, runId: args.runId, workspaceId: args.workspaceId },
      );
    }
  } else {
    // Permanent failure → notify founder
    await ctx.runMutation(internal.notifications.create, {
      workspaceId: args.workspaceId,
      type:        "agent_failed",
      title:       "Agent task failed permanently",
      body:        message.slice(0, 140),
      taskId:      args.taskId,
      linkTo:      `/dashboard/tasks/${args.taskId}`,
    });
  }
}
```

---

## Part B — Idempotent webhook ingestion

Duplicate webhooks (Intercom/Discord retry on no-200 response) currently create duplicate tasks.

**Modify: `convex/schema.ts`** — add a compound index:

```ts
tasks: defineTable({
  // existing...
}).index("by_workspace_external_id", ["workspaceId", "externalId"])
  // ...existing indexes
```

**Modify: `convex/tasks.ts`** — add to `createFromWebhook` (or wherever webhooks insert tasks):

```ts
// At the top of the handler, before inserting:
if (args.externalId) {
  const existing = await ctx.db
    .query("tasks")
    .withIndex("by_workspace_external_id", (q) =>
      q.eq("workspaceId", args.workspaceId).eq("externalId", args.externalId)
    )
    .unique();

  if (existing) return existing._id; // idempotent — return existing task
}
```

Apply this check in both `convex/webhooks/intercom.ts` and `convex/webhooks/discord.ts`.

---

## Part C — Integration health cron

**New file: `convex/crons.ts`**

```ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Every 15 minutes, check all connected integrations
crons.interval(
  "integration-health-check",
  { minutes: 15 },
  internal.integrations.healthCheck,
);

export default crons;
```

**Add to `convex/integrations.ts`:**

```ts
export const healthCheck = internalAction({
  handler: async (ctx) => {
    // Get all connected integrations across all workspaces
    const connected = await ctx.runQuery(internal.integrations.listAllConnected);

    for (const integration of connected) {
      try {
        const config: IntegrationConfig = {
          accessToken: integration.accessTokenRef ?? undefined,
        };

        let error: string | null = null;
        if (integration.provider === "stripe")   error = await testStripeConnection(config);
        if (integration.provider === "intercom") error = await testIntercomConnection(config);
        if (integration.provider === "discord")  error = await testDiscordConnection(config);

        if (error) {
          await ctx.runMutation(internal.integrations.updateStatus, {
            id: integration._id, status: "error",
          });
          await ctx.runMutation(internal.notifications.create, {
            workspaceId: integration.workspaceId,
            type:        "integration_error",
            title:       `${integration.provider} integration error`,
            body:        error.slice(0, 140),
            linkTo:      "/dashboard/integrations",
          });
        } else {
          // Re-confirm connected if it was previously errored
          if (integration.status === "error") {
            await ctx.runMutation(internal.integrations.updateStatus, {
              id: integration._id, status: "connected",
            });
          }
        }
      } catch {
        // Silently skip — don't crash the whole cron for one bad integration
      }
    }
  },
});

export const listAllConnected = internalQuery({
  handler: async (ctx) => {
    return ctx.db
      .query("integrations")
      .filter((q) => q.eq(q.field("status"), "connected"))
      .collect();
  },
});

export const updateStatus = internalMutation({
  args: {
    id:     v.id("integrations"),
    status: v.union(
      v.literal("connected"),
      v.literal("disconnected"),
      v.literal("error"),
      v.literal("pending"),
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: args.status, updatedAt: Date.now() });
  },
});
```

**Register crons in `convex/convex.config.ts`** — ensure it imports the crons file:

```ts
import { defineApp } from "convex/server";
import betterAuth from "@convex-dev/better-auth/convex.config";

const app = defineApp();
app.use(betterAuth);

export default app;
```

The cron is auto-registered by Convex when `crons.ts` exports a `cronJobs()` default — no explicit registration needed in `convex.config.ts`.

---

## Part D — Retry count display in task detail

**Modify: `components/dashboard/TaskDetailPage.tsx`** (created in STEP_07)

Show retry info in the meta strip when `retryCount > 0`:

```tsx
{(task.retryCount ?? 0) > 0 && (
  <span className="font-mono text-[10px] text-[var(--color-accent-orange)]">
    {task.retryCount} retry{(task.retryCount ?? 0) > 1 ? "ies" : ""}
    {task.lastError && ` · ${task.lastError.slice(0, 60)}`}
  </span>
)}
```

---

## Acceptance Criteria

- [ ] `convex/schema.ts` `tasks` table has `retryCount`, `nextRetryAt`, `failureMode`, `lastError` fields
- [ ] `convex/schema.ts` `tasks` table has `by_workspace_external_id` index
- [ ] `convex/tasks.ts` exports `scheduleRetry` internalMutation
- [ ] A transient failure (simulate with a bad API key that returns 429) retries up to 3 times with backoff
- [ ] A permanent failure (simulate with bad task data) marks the task `failed` immediately without retrying
- [ ] Sending the same Intercom webhook twice creates only ONE task
- [ ] `convex/crons.ts` exists and registers the 15-minute health check
- [ ] An integration with an invalid token gets status `error` after the next cron run
- [ ] An `integration_error` notification appears in the bell when an integration fails health check
- [ ] Task detail page shows retry count when `retryCount > 0`
- [ ] `npx tsc --noEmit` passes

---

## Completion Notes

- Date completed: 2026-05-02
- Deviations from spec: Retry handling is centralized in `tasks.scheduleRetry`, which also emits the permanent failure notification after retries are exhausted or when the failure is permanent. Discord idempotency uses Discord's payload `id` when present and otherwise a stable SHA-256 hash of the raw webhook body, because the previous timestamp-based external id could never dedupe retries. The 30s/2m/8m intent is implemented as exponential backoff starting at 30s; the second and third delays are 2m and 8m. Post-review fix on 2026-05-02: inbound task creation now returns `{ taskId, created }`, and webhooks only enqueue routing/runner work for newly-created tasks, so duplicate webhook retries do not duplicate outbound side effects. Health checks now include `error` rows for recovery, mark thrown provider/network failures as integration errors, and avoid swallowing failures silently.
- New files created not listed above: None.
- Anything the next agent should know: `npx convex codegen`, `npx tsc --noEmit`, and `git diff --check` pass. Live retry, webhook replay, and health-check notification behaviour still need to be exercised against a running deployment with provider credentials or controlled failing tokens.
