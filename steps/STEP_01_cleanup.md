# STEP 01 — Codebase Cleanup

**Phase:** 1 — Foundation
**Depends on:** Nothing — do this first

---

## Why

Four component directories exist that are never imported by any page. They are dead code from earlier iterations. Any agent reading the codebase will waste time trying to understand them. `WORKSPACE_ID` is hardcoded and imported by 15+ components — this blocks all multi-tenancy work.

---

## Part A — Delete dead component directories

These four directories contain components that are **not imported anywhere in `app/`**. Verify with grep, then delete.

### Verify they are unused before deleting

```bash
grep -r "from.*components/center/" app/ components/dashboard/ --include="*.tsx"
grep -r "from.*components/crew-room/" app/ components/dashboard/ --include="*.tsx"
grep -r "from.*components/left-panel/" app/ components/dashboard/ --include="*.tsx"
grep -r "from.*components/right-panel/" app/ components/dashboard/ --include="*.tsx"
```

All four should return **no results**. If any return results, do not delete that directory — investigate instead.

### Delete

```bash
rm -rf components/center
rm -rf components/crew-room
rm -rf components/left-panel
rm -rf components/right-panel
```

---

## Part B — Replace WORKSPACE_ID with WorkspaceContext

### Step 1 — Create the context

**New file: `lib/workspace-context.tsx`**

```tsx
"use client";

import { createContext, useContext } from "react";

const WorkspaceContext = createContext<string>("");

export function WorkspaceProvider({
  workspaceId,
  children,
}: {
  workspaceId: string;
  children: React.ReactNode;
}) {
  return (
    <WorkspaceContext.Provider value={workspaceId}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspaceId(): string {
  const id = useContext(WorkspaceContext);
  if (!id) throw new Error("useWorkspaceId must be used inside WorkspaceProvider");
  return id;
}
```

### Step 2 — Mount the provider in the dashboard layout

**Modify: `app/(dashboard)/layout.tsx`**

The layout is a server component. It reads the auth session server-side and passes the workspace ID down.

For now (before STEP_02 adds the real `workspaces` table), use `"rule8-demo"` as the fallback so nothing breaks. The point of this step is the structural change.

```tsx
import { WorkspaceProvider } from "@/lib/workspace-context";

// Inside the return:
<WorkspaceProvider workspaceId="rule8-demo">
  <Topbar />
  <main className="flex min-h-0 flex-1 overflow-hidden">
    {children}
  </main>
</WorkspaceProvider>
```

### Step 3 — Replace all WORKSPACE_ID imports

Find every file importing `WORKSPACE_ID`:

```bash
grep -rn "WORKSPACE_ID" --include="*.tsx" --include="*.ts" .
```

For every result **except `lib/constants.ts` itself**:

1. Remove `import { WORKSPACE_ID } from "@/lib/constants"`
2. Add `import { useWorkspaceId } from "@/lib/workspace-context"` at the top
3. Inside the component function, add: `const workspaceId = useWorkspaceId();`
4. Replace every `WORKSPACE_ID` reference with `workspaceId`

**Important:** `useWorkspaceId()` is a hook — it can only be called inside client components (`"use client"` directive). Most dashboard components already are client components. If any are server components, either add `"use client"` or pass `workspaceId` as a prop from the nearest client boundary.

### Step 4 — Remove the constant

**Modify: `lib/constants.ts`**

Remove the `WORKSPACE_ID` line. Keep `CREW_META` — it's still used by active components.

```ts
// DELETE this line:
export const WORKSPACE_ID = "rule8-demo";

// KEEP this:
export const CREW_META = { ... };
```

### Step 5 — Fix Convex webhook handlers

Convex webhook handlers in `convex/webhooks/` are not React components — they can't use hooks. They currently reference `WORKSPACE_ID` as an import from `lib/constants.ts`.

Keep that reference working for now — the constant is still exported by `lib/constants.ts` with a different name:

```ts
// lib/constants.ts — rename for backend use only
export const DEMO_WORKSPACE_ID = "rule8-demo";
```

Update webhook files to import `DEMO_WORKSPACE_ID` instead. This will be replaced with real workspace lookup in STEP_02.

---

## Part C — TypeScript check

After all changes:

```bash
npx tsc --noEmit
```

Zero errors required before marking this step done.

---

## Acceptance Criteria

- [ ] `components/center/`, `components/crew-room/`, `components/left-panel/`, `components/right-panel/` do not exist
- [ ] `grep -r "from.*components/center" .` returns no results
- [ ] `grep -rn "WORKSPACE_ID" --include="*.tsx" .` returns no results (only `lib/constants.ts` and webhook files reference `DEMO_WORKSPACE_ID`)
- [ ] `lib/workspace-context.tsx` exists and exports `WorkspaceProvider` and `useWorkspaceId`
- [ ] Dashboard layout wraps children in `WorkspaceProvider`
- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `/dashboard` loads in browser with no console errors
- [ ] All secondary pages (escalations, integrations, prompts, activity) load correctly

---

## Completion Notes

- Date completed: 2026-05-01
- Deviations from spec: None. Browser verification used authenticated HTTP smoke checks because `agent-browser` is not installed in this shell.
- New files created not listed above: None.
- Anything the next agent should know: `WorkspaceProvider` currently receives the Step 1 fallback `"rule8-demo"` in the dashboard layout. STEP_02 should replace that with the real workspace ID from auth/Convex.
