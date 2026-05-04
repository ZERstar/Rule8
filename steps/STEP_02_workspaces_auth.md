# STEP 02 — Workspaces & Auth Foundation

**Phase:** 1 — Foundation
**Depends on:** STEP_01
**Estimated time:** 4–6 hours

---

## Why

Every user currently shares `"rule8-demo"`. This step creates real workspace isolation: each sign-up gets their own workspace, all queries scope to it, and the dashboard layout derives it from the auth session instead of a constant.

---

## Part A — Schema changes

**Modify: `convex/schema.ts`**

Add the `workspaces` table. Place it before `agents`:

```ts
workspaces: defineTable({
  ownerUserId:        v.string(),
  name:               v.string(),
  slug:               v.string(),
  plan:               v.union(
                        v.literal("free"),
                        v.literal("pro"),
                        v.literal("scale"),
                      ),
  industryTemplate:   v.optional(v.string()),
  onboardingComplete: v.boolean(),
  createdAt:          v.number(),
})
  .index("by_owner",  ["ownerUserId"])
  .index("by_slug",   ["slug"]),
```

No changes to existing tables yet — `workspaceId` stays as `v.string()` everywhere. In STEP_11 it becomes `v.id("workspaces")`.

---

## Part B — Convex workspace functions

**New file: `convex/workspaces.ts`**

```ts
import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";

/** Called by the dashboard layout on every load — gets or creates the workspace for this user */
export const getOrCreate = mutation({
  args: { ownerUserId: v.string(), name: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("workspaces")
      .withIndex("by_owner", (q) => q.eq("ownerUserId", args.ownerUserId))
      .unique();

    if (existing) return existing;

    const slug = args.ownerUserId.slice(0, 12).replace(/[^a-z0-9]/gi, "-").toLowerCase();
    const id = await ctx.db.insert("workspaces", {
      ownerUserId:        args.ownerUserId,
      name:               args.name,
      slug,
      plan:               "free",
      industryTemplate:   undefined,
      onboardingComplete: false,
      createdAt:          Date.now(),
    });
    return await ctx.db.get(id);
  },
});

export const getByOwner = query({
  args: { ownerUserId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("workspaces")
      .withIndex("by_owner", (q) => q.eq("ownerUserId", args.ownerUserId))
      .unique();
  },
});

export const markOnboardingComplete = mutation({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.workspaceId, { onboardingComplete: true });
  },
});
```

---

## Part C — Seed workspace on first load

**Modify: `app/(dashboard)/layout.tsx`**

The layout is a server component — it can call Better Auth to get the current user, then call a Convex mutation server-side via the Convex HTTP client.

```tsx
import { auth } from "@/lib/auth-server";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { WorkspaceProvider } from "@/lib/workspace-context";

export default async function DashboardLayout({ children }) {
  // 1. Get Better Auth session (already used for isAuthenticated check)
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect(ROUTES.signIn);

  // 2. Get or create workspace for this user
  const workspace = await fetchMutation(api.workspaces.getOrCreate, {
    ownerUserId: session.user.id,
    name:        session.user.name ?? "My Workspace",
  });

  const workspaceId = workspace?._id ?? "rule8-demo"; // fallback keeps demo working

  return (
    <div className="flex h-screen flex-col overflow-hidden" ...>
      <WorkspaceProvider workspaceId={workspaceId}>
        <Topbar />
        <main className="flex min-h-0 flex-1 overflow-hidden">
          {children}
        </main>
      </WorkspaceProvider>
    </div>
  );
}
```

**Note:** `fetchMutation` / `fetchQuery` from `convex/nextjs` work in server components. Import from `"convex/nextjs"`, not `"convex/react"`.

---

## Part D — Auth enforcement in Convex queries

Add a lightweight auth check to the most sensitive queries. This doesn't fully lock down the system (that comes with workspace ownership verification) but stops unauthenticated API calls.

**Modify these files — add the identity check at the start of each handler:**

Files to update:
- `convex/tasks.ts` — `list`, `listEscalated`, `getStats`, `getCrewStats`
- `convex/agents.ts` — `list`, `listByCrew`
- `convex/traces.ts` — `listRecent`
- `convex/integrations.ts` — `list`

Pattern to add at the top of each handler:

```ts
const identity = await ctx.auth.getUserIdentity();
if (!identity) throw new Error("Unauthenticated");
```

Do **not** add this to public queries like `waitlist.getCount` or any `internalQuery`.

---

## Part E — Update webhook handlers

Webhooks in `convex/webhooks/intercom.ts` and `convex/webhooks/discord.ts` currently hardcode `DEMO_WORKSPACE_ID`. 

For now: keep `DEMO_WORKSPACE_ID` as the fallback (webhooks don't have a user session). In a later step (STEP_10), webhooks will lookup workspace by a webhook secret. This step is about not breaking them.

Verify they still import correctly after STEP_01 renamed the constant.

---

## Part F — Update WorkspaceProvider in layout

After this step, `WorkspaceProvider` receives the real `workspace._id` (a Convex document ID string like `"jd7abc123"`). The `useWorkspaceId()` hook in every component now returns this real ID automatically — no other component changes needed.

---

## Acceptance Criteria

- [ ] `convex/schema.ts` has a `workspaces` table
- [ ] `convex/workspaces.ts` exists with `getOrCreate`, `getByOwner`, `markOnboardingComplete`
- [ ] Signing in as a new user creates a workspace row in Convex
- [ ] Signing in as an existing user does not create a duplicate workspace
- [ ] `app/(dashboard)/layout.tsx` derives `workspaceId` from the auth session
- [ ] `WorkspaceProvider` receives the real workspace ID (not the hardcoded constant)
- [ ] Authenticated queries (`tasks.list`, `agents.list`, etc.) throw `"Unauthenticated"` if called without a session
- [ ] `npx tsc --noEmit` passes
- [ ] `/dashboard` loads for an authenticated user with no console errors
- [ ] Demo data still visible (workspace seeds from `rule8-demo` data or is empty but functional)

---

## Completion Notes

- Date completed: 2026-05-01
- Deviations from spec: `workspaces.getOrCreate` derives `ownerUserId` from `ctx.auth.getUserIdentity().tokenIdentifier` instead of accepting a client-provided owner ID. This follows the project Convex auth guidance and prevents forged workspace ownership.
- New files created not listed above: None.
- Anything the next agent should know: New users now receive an empty real workspace, so demo data from `rule8-demo` is no longer shown for those accounts. The UI remains functional with empty states/counts.
