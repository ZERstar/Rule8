# STEP 03 — Notifications & User Preferences

**Phase:** 1 — Foundation
**Depends on:** STEP_02
**Estimated time:** 3–4 hours

---

## Why

Escalations are currently silent — an agent flags something and the founder has no idea unless they manually check the page. Settings toggles save nothing. This step adds a lightweight notification system and wires the Settings page to real data.

---

## Part A — Schema additions

**Modify: `convex/schema.ts`**

Add two tables:

```ts
notifications: defineTable({
  workspaceId: v.string(),
  type: v.union(
    v.literal("escalation"),
    v.literal("agent_failed"),
    v.literal("integration_error"),
    v.literal("task_resolved"),
  ),
  title:   v.string(),
  body:    v.string(),
  taskId:  v.optional(v.id("tasks")),
  linkTo:  v.optional(v.string()),   // e.g. "/dashboard/escalations"
  read:    v.boolean(),
  createdAt: v.number(),
})
  .index("by_workspace_created", ["workspaceId", "createdAt"])
  .index("by_workspace_unread",  ["workspaceId", "read"]),

userPreferences: defineTable({
  userId:      v.string(),
  workspaceId: v.string(),
  escalationNotifications: v.boolean(),
  compactMode:             v.boolean(),
  commandSuggestions:      v.boolean(),
  updatedAt:   v.number(),
})
  .index("by_user", ["userId"]),
```

---

## Part B — Notification functions

**New file: `convex/notifications.ts`**

```ts
import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";

export const listUnread = query({
  args: { workspaceId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    return ctx.db
      .query("notifications")
      .withIndex("by_workspace_created", (q) => q.eq("workspaceId", args.workspaceId))
      .order("desc")
      .take(20);
  },
});

export const unreadCount = query({
  args: { workspaceId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return 0;
    const rows = await ctx.db
      .query("notifications")
      .withIndex("by_workspace_unread", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("read", false)
      )
      .collect();
    return rows.length;
  },
});

export const markAllRead = mutation({
  args: { workspaceId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_workspace_unread", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("read", false)
      )
      .collect();
    await Promise.all(unread.map((n) => ctx.db.patch(n._id, { read: true })));
  },
});

/** Internal — called by agent runners when they escalate or fail */
export const create = internalMutation({
  args: {
    workspaceId: v.string(),
    type: v.union(
      v.literal("escalation"),
      v.literal("agent_failed"),
      v.literal("integration_error"),
      v.literal("task_resolved"),
    ),
    title:  v.string(),
    body:   v.string(),
    taskId: v.optional(v.id("tasks")),
    linkTo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("notifications", {
      ...args,
      read:      false,
      createdAt: Date.now(),
    });
  },
});
```

### Wire notifications to escalations

**Modify: `convex/tasks.ts`** — find `escalateTaskInternal` mutation and add a notification write after the task update:

```ts
await ctx.runMutation(internal.notifications.create, {
  workspaceId: args.workspaceId,   // add workspaceId to escalateTaskInternal args if not present
  type:   "escalation",
  title:  "New escalation",
  body:   args.reason,
  taskId: args.taskId,
  linkTo: "/dashboard/escalations",
});
```

Also wire to `failTaskInternal` with type `"agent_failed"`.

---

## Part C — Notification bell in Topbar

**Modify: `components/layout/Topbar.tsx`**

Add a bell icon between the health status and the avatar. It reads the unread count reactively.

```tsx
// New component inside Topbar.tsx:
function NotificationBell() {
  const workspaceId = useWorkspaceId();
  const count = useQuery(api.notifications.unreadCount, { workspaceId }) ?? 0;
  const notifications = useQuery(api.notifications.listUnread, { workspaceId }) ?? [];
  const markRead = useMutation(api.notifications.markAllRead);
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => { setOpen(!open); if (count > 0) markRead({ workspaceId }); }}
        className="relative flex h-8 w-8 items-center justify-center rounded-full hover:bg-[var(--color-surface-2)] transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4 text-[var(--color-t2)]" />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-accent-orange)] font-mono text-[9px] text-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-[100] w-[320px] overflow-hidden rounded-[24px] border border-border/70 bg-[#fffdf8] shadow-[0_24px_80px_rgba(28,39,49,0.18)]">
          <div className="border-b border-border/70 px-4 py-3">
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--color-t3)]">Notifications</p>
          </div>
          <div className="max-h-[360px] overflow-y-auto">
            {notifications.length === 0 && (
              <p className="px-4 py-6 text-center text-[13px] text-[var(--color-t3)]">No notifications</p>
            )}
            {notifications.map((n) => (
              <div key={n._id} className="flex items-start gap-3 border-b border-border/50 px-4 py-3 last:border-0">
                <NotificationIcon type={n.type} />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-[var(--color-t1)]">{n.title}</p>
                  <p className="mt-0.5 text-[12px] leading-5 text-[var(--color-t3)]">{n.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationIcon({ type }: { type: string }) {
  if (type === "escalation") return <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-accent-orange)]" />;
  if (type === "agent_failed") return <X className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />;
  return <Bell className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-t3)]" />;
}
```

Add `<NotificationBell />` in the Topbar right section, before the avatar.

---

## Part D — User preferences

**New file: `convex/userPreferences.ts`**

```ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const defaults = {
  escalationNotifications: true,
  compactMode:             false,
  commandSuggestions:      true,
};

export const get = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    const prefs = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();
    return prefs ?? { ...defaults, userId: args.userId, workspaceId: "", updatedAt: 0 };
  },
});

export const update = mutation({
  args: {
    userId:                  v.string(),
    workspaceId:             v.string(),
    escalationNotifications: v.optional(v.boolean()),
    compactMode:             v.optional(v.boolean()),
    commandSuggestions:      v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const { userId, workspaceId, ...patch } = args;
    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { ...patch, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("userPreferences", {
        userId,
        workspaceId,
        ...defaults,
        ...patch,
        updatedAt: Date.now(),
      });
    }
  },
});
```

### Wire Settings page to real data

**Modify: `components/dashboard/AccountPages.tsx` — `SettingsPage` component**

```tsx
// Add at top of SettingsPage:
const { data: session } = authClient.useSession();
const userId = session?.user?.id ?? "";
const workspaceId = useWorkspaceId();

const prefs = useQuery(api.userPreferences.get, userId ? { userId } : "skip");
const updatePref = useMutation(api.userPreferences.update);

function toggle(key: "escalationNotifications" | "compactMode" | "commandSuggestions") {
  const current = prefs?.[key] ?? true;
  updatePref({ userId, workspaceId, [key]: !current });
}
```

Each `<SettingRow>` toggle's `enabled` prop reads from `prefs` and its `onChange` calls `toggle(key)`. Replace the hardcoded `enabled` values.

---

## Acceptance Criteria

- [ ] `convex/schema.ts` has `notifications` and `userPreferences` tables
- [ ] `convex/notifications.ts` exists and exports `listUnread`, `unreadCount`, `markAllRead`, `create`
- [ ] `convex/userPreferences.ts` exists and exports `get`, `update`
- [ ] Topbar has a bell icon that shows the unread notification count
- [ ] When a task escalates, a notification row is inserted and the bell count increments in real-time
- [ ] Clicking the bell marks all as read and count drops to 0
- [ ] Settings page toggles read from `userPreferences` table
- [ ] Toggling a setting persists after page refresh
- [ ] `npx tsc --noEmit` passes

---

## Completion Notes

- Date completed: 2026-05-01
- Deviations from spec: `userPreferences.get` and `userPreferences.update` derive the user ID from `ctx.auth.getUserIdentity().tokenIdentifier` instead of accepting a client-provided `userId`. Notification index names use the project Convex guideline style (`by_workspace_and_*`). Browser verification used authenticated HTTP smoke checks plus direct Convex function checks. Post-review fix on 2026-05-02: `Topbar` notification queries and `SettingsPage` preferences query now use `useAuthenticatedQuery` so they do not fire before Convex auth is ready.
- New files created not listed above: None.
- Anything the next agent should know: Notification bell shows unread rows and marks them read on open. `escalateTaskInternal` and `failTaskInternal` now create notification rows by reading the task's workspace ID.
