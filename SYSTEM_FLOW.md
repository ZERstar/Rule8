# Rule8 — System Flow & Information Architecture

> **Purpose:** A page-by-page map of every route in Rule8, the data each page depends on, the mutations it can perform, and how information flows across session, persistence, and AI memory layers. Use this as the canonical reference for any change that touches data flow.

---

## Table of Contents

1. [System Layers (10,000 ft)](#1-system-layers-10000-ft)
2. [Session & Auth Lifecycle](#2-session--auth-lifecycle)
3. [Memory Layers](#3-memory-layers)
4. [Reactive Data Model (Convex)](#4-reactive-data-model-convex)
5. [Page-by-Page Reference](#5-page-by-page-reference)
6. [Cross-Page State](#6-cross-page-state)
7. [End-to-End Information Flows](#7-end-to-end-information-flows)
8. [Known Gaps](#8-known-gaps)

---

## 1. System Layers (10,000 ft)

```
┌─────────────────────────────────────────────────────────────┐
│  Browser  ── React Client Components ── Convex React hooks  │
│                          │                                  │
│         (cookie session, Better Auth client)                │
│                          │                                  │
├──────────────────────────┼──────────────────────────────────┤
│  Next.js Server                                             │
│    ── middleware.ts (sets x-pathname)                       │
│    ── (dashboard)/layout.tsx (auth gate)                    │
│    ── lib/auth-server.ts (isAuthenticated)                  │
│                          │                                  │
├──────────────────────────┼──────────────────────────────────┤
│  Convex Backend (deployment: tough-dog-533)                 │
│    ── queries  → reactive reads                             │
│    ── mutations → writes (transactional)                    │
│    ── actions   → external calls + LLMs                     │
│    ── webhooks  → http.ts / webhooks/*.ts                   │
│    ── tables    → schema.ts                                 │
│                          │                                  │
├──────────────────────────┼──────────────────────────────────┤
│  External                                                   │
│    ── Anthropic / NVIDIA model API (lib/anthropic.ts)       │
│    ── Stripe / Intercom / Discord (mostly mocked today)     │
└─────────────────────────────────────────────────────────────┘
```

### Where things live

| Concern | Location |
|---|---|
| Routes (UI) | `app/**/*.tsx` |
| Page components | `app/(dashboard)/dashboard/*/page.tsx` |
| Reusable UI | `components/dashboard/`, `components/ui/`, `components/layout/` |
| Backend functions | `convex/*.ts` |
| Backend agent runners | `convex/agent_runner/*.ts` |
| Schema | `convex/schema.ts` |
| Auth | `convex/auth.ts`, `lib/auth-server.ts`, `lib/auth-client.ts` |
| Routes table | `lib/routes.ts` |
| Constants (workspace, crews) | `lib/constants.ts` |
| LLM client | `lib/anthropic.ts` |
| Tool definitions (declared, not executed) | `lib/agents/tools.ts` |
| Prompt templates | `lib/agents/prompts.ts` |

---

## 2. Session & Auth Lifecycle

### 2.1 The flow

1. **Sign-in / sign-up** → `app/(auth)/sign-in/page.tsx` or `sign-up/page.tsx` → calls `authClient.signIn.email(...)` from `lib/auth-client.ts`.
2. **Better Auth** sets an **HTTP-only session cookie** scoped to the host. Cookie is checked on every server request.
3. **Middleware** (`middleware.ts`) injects `x-pathname` header so the dashboard layout knows the original path for the post-login redirect (it does not gate access).
4. **Server-side gate** — `app/(dashboard)/layout.tsx:13` calls `isAuthenticated()` from `lib/auth-server.ts`. If false → redirect to `/sign-in?redirectTo=<originalPath>`.
5. **Convex requests** — the React provider in `app/providers.tsx` carries the session to Convex. Convex auth is configured in `convex/auth.config.ts` to use Better Auth. Currently this is **wired but not enforced** — queries don't check `ctx.auth.getUserIdentity()`.

### 2.2 Sign-out

- `app/api/auth/[...all]/route.ts` is the Better Auth catch-all.
- Sign-out is triggered from the profile dropdown via `authClient.signOut()` → cookie cleared → next request hits the auth gate and redirects.

### 2.3 Session memory (current)

| Item | Where it lives | Lifetime |
|---|---|---|
| Auth session token | HTTP-only cookie (Better Auth) | Until expiry / sign-out |
| User identity (`name`, `email`) | `authClient.useSession()` (client) | Until cookie expires |
| Workspace | `WORKSPACE_ID` constant in `lib/constants.ts` | **Hardcoded** — same for everyone |
| Selected crew | React local state (`useState` in `DashboardShell`) | Page lifetime only — lost on navigation |
| Executive chat input | React local state | Lost on page navigation |
| Executive chat thread | Convex `chatMessages` table | Persistent, per workspace |

### 2.4 Gaps

- **No user → workspace mapping.** A new sign-up doesn't get a workspace; everyone shares `rule8-demo`.
- **Convex queries don't authenticate.** `api.tasks.list` accepts any `workspaceId` string and returns the data. A leaked workspace ID = full read access.
- **Selected crew is page-local.** Navigate away from `/dashboard` and the selected crew resets to `finance`.

---

## 3. Memory Layers

There are six distinct memory surfaces. Each has a different lifetime and visibility.

### 3.1 Persistent (database-backed)

| Layer | Table | Used for | Visible to LLM today? |
|---|---|---|---|
| **Chat thread** | `chatMessages` | Executive ↔ founder conversation | Last 10 turns serialised as plain text (`convex/chat.ts:87-90`) |
| **Traces** | `traces` | Every LLM call, tool invocation, routing decision | **No** — never read by Executive |
| **Tasks** | `tasks` | Inbound work items (tickets, charges, mentions) | Aggregate counts only |
| **Agents** | `agents` | Per-crew agent state (status, prompt version, integrations) | Aggregate counts only |
| **Prompt versions** | `promptVersions` | Prompt edit history per agent | Read by prompts page only |
| **Eval cases / runs** | `evalCases`, `evalRuns` | Evaluation harness | Read by evals page only |
| **Product context** | `productContext` | Founder-supplied facts ("our refund limit is $200") | **No** — table exists but isn't injected into prompts |
| **Integrations** | `integrations` | Connected third-party providers | Listed in agent's `integrationNames` field |

### 3.2 Ephemeral (in-process)

| Layer | Where | Lifetime |
|---|---|---|
| Convex query subscriptions | Browser, via `useQuery` | Until component unmount |
| Page state (selected crew, input drafts) | `useState` in component | Until page navigation |
| Chat input draft | `execInput` in `DashboardShell` | Until navigation |

### 3.3 What "Executive memory" actually is, today

When the founder sends a message, `convex/chat.ts:53-114` does this:

```
1. insert founder message
2. fetch stats (agentsManaged, tasksToday, costTodayCents, escalated)
3. fetch last 10 chatMessages (newest-first), reverse
4. build systemPrompt with the 4 numbers
5. build userPrompt = "<history serialised>\nFounder: <text>"
6. call runAgentModel with system + user
7. insert executive reply
```

That's the entire memory model. **No traces, no tasks, no integrations, no productContext, no page state, no selection state, no embeddings.** Everything else in the database is invisible to Executive.

This is the single biggest lever for product quality.

---

## 4. Reactive Data Model (Convex)

Convex queries are **reactive subscriptions**. When the underlying tables change, every component that called `useQuery(...)` re-renders automatically. This is why no manual cache invalidation exists in the UI.

### 4.1 Subscription map (today)

Multiple components subscribe to the **same** queries independently. Each is its own subscription — Convex deduplicates the network call but each component sees its own React state copy.

Most-subscribed queries:

| Query | Subscribers | Purpose |
|---|---|---|
| `api.agents.list` | 7 components | Sidebar, command panel, crew detail, executive panel, left panel, prompts, data pages |
| `api.tasks.getStats` | 6 components | Stats strip, trace feed, executive panel, etc. |
| `api.tasks.list` | 2 components | Invoices, tickets pages |
| `api.tasks.listEscalated` | 2 components | Escalations page, executive panel |
| `api.traces.listRecent` | 2 components | Trace feed, activity page |
| `api.chat.list` | 2 components | Dashboard shell, executive panel |
| `api.agents.listByCrew` | 2 components | Right panel crew detail |

### 4.2 Mutation/action surface

| Operation | File | Purpose |
|---|---|---|
| `agents.createFromBrief` (mutation) | `convex/agents.ts` | Create a new agent from a freeform brief |
| `agents.updatePrompt` (mutation) | `convex/agents.ts` | Save a new prompt version |
| `chat.send` (action) | `convex/chat.ts` | Send a message to Executive, get reply |
| `tasks.submitManualTask` (action) | `convex/tasks.ts` | Manually queue a task |
| `tasks.resolveEscalation` (mutation) | `convex/tasks.ts` | Founder approves/dismisses an escalation |
| `integrations.upsertConnection` (mutation) | `convex/integrations.ts` | Save an integration credential |
| `waitlist.joinWaitlist` (mutation) | `convex/waitlist.ts` | Public landing-page waitlist |

---

## 5. Page-by-Page Reference

Each page entry has: **purpose, queries, mutations, memory used, key gaps**.

### 5.1 `/` — Landing (`app/page.tsx`)

- **Purpose:** Public marketing landing page.
- **Queries:** `api.waitlist.getCount`
- **Mutations:** `api.waitlist.joinWaitlist`
- **Memory:** None (anonymous).
- **Auth:** Public.
- **Gaps:** None — works as designed.

### 5.2 `/waitlist` — Waitlist (`app/waitlist/page.tsx`)

- **Purpose:** Capture early-access emails.
- **Queries:** `api.waitlist.getCount`
- **Mutations:** `api.waitlist.joinWaitlist`
- **Memory:** None.
- **Gaps:** No verification email; duplicates allowed by `email` index but not enforced unique.

### 5.3 `/sign-in` and `/sign-up` (`app/(auth)/...`)

- **Purpose:** Better Auth flows.
- **Queries / mutations:** None directly — `authClient.signIn.email()` / `signUp.email()` from `lib/auth-client.ts`.
- **Memory written:** Better Auth session cookie.
- **Redirect on success:** `?redirectTo` query param → normalised by `normalizeRedirectTarget` in `lib/routes.ts:31`.
- **Gaps:** No email verification flow surfaced; no password reset UI.

### 5.4 `/dashboard` — Command Surface (`DashboardShell`)

- **Purpose:** The 3-panel "Founder OS" view: chambers (left) + traces (center) + executive (right).
- **Queries:**
  - `api.chat.list` (executive thread)
  - `api.agents.list` (crew rooms, agent counts)
  - `api.tasks.getStats` (workspace-level numbers)
  - `api.tasks.getCrewStats` (per-crew numbers, scoped to selected crew)
  - `api.traces.listRecent` (trace feed, limit 20)
- **Mutations / actions:**
  - `api.agents.createFromBrief` (when user types "create an agent that…")
  - `api.chat.send` (Executive chat)
- **Memory used:** chat thread, stats, agents, traces. **Selected crew is page-local (`useState`)**, lost on navigation.
- **Gaps:**
  - Selected crew not persisted across pages.
  - Sub-components fetch overlapping queries independently — no shared workspace context.

### 5.5 `/dashboard/escalations` (`escalations/page.tsx`)

- **Purpose:** Queue of tasks the agents flagged as outside operating policy. Founder approves or dismisses.
- **Queries:** `api.tasks.listEscalated`
- **Mutations:** `api.tasks.resolveEscalation`
- **Memory used:** tasks table.
- **Gaps:**
  - No bulk-resolve. No filter by crew or by source.
  - Resolution doesn't write a trace, so the audit log misses the human decision.

### 5.6 `/dashboard/integrations` (`integrations/page.tsx`)

- **Purpose:** Connect third-party providers (Stripe, Intercom, Discord, Slack, Resend).
- **Queries:** `api.integrations.list`
- **Mutations:** `api.integrations.upsertConnection`
- **Memory used:** `integrations` table; agents reference connections via `integrationIds`.
- **Gaps:**
  - Provider list is **hardcoded** (`PROVIDERS` array, integrations/page.tsx ~30). Adding a provider requires code edit.
  - No OAuth flows — only API-key paste.
  - No connection-test or token-rotation flow.
  - `accessTokenRef` exists in schema but no secret store is wired (likely stored as plaintext today).

### 5.7 `/dashboard/prompts` (`prompts/page.tsx`)

- **Purpose:** Edit agent system prompts; see eval results; see version history.
- **Queries:**
  - `api.agents.list` (which agents exist)
  - `api.evals.listCasesWithResults` (eval scores per agent)
  - `api.agents.listPromptVersions` (last 5 versions)
- **Mutations:** `api.agents.updatePrompt`
- **Memory used:** `agents.systemPrompt`, `promptVersions`, `evalCases`, `evalRuns`.
- **Gaps:**
  - Saving creates a new version but doesn't run the evals — pass-rate is from stored runs only. UI implies "save → eval → ship" but it's actually "save → static result".
  - No diff view between versions; no rollback button.

### 5.8 `/dashboard/activity` (`DataPages.tsx → ActivityPage`)

- **Purpose:** Live trace timeline (model calls, tool runs, handoffs, policy checks).
- **Queries:**
  - `api.traces.listRecent` (limit 80)
  - `api.tasks.getStats`
- **Mutations:** None.
- **Memory used:** `traces` table.
- **Gaps:**
  - No filter by agent/crew/status. No time-range picker. No drill-down from a trace into the original task.

### 5.9 `/dashboard/evals` (`DataPages.tsx → EvalsPage`)

- **Purpose:** Read-only eval scores per agent.
- **Queries:**
  - `api.agents.list`
  - `api.evals.listCasesWithResults`
- **Mutations:** None.
- **Memory used:** `evalCases`, `evalRuns`.
- **Gaps:** Cannot trigger an eval run from this page; no historical pass-rate trend.

### 5.10 `/dashboard/invoices` (`DataPages.tsx → InvoicesPage`)

- **Purpose:** Tasks routed to the Finance crew.
- **Queries:** `api.tasks.list` (filtered client-side to `crewTag === "finance"`)
- **Mutations:** None.
- **Memory used:** `tasks` table.
- **Gaps:**
  - **Filtering done in JS** — every page load fetches all tasks. With ~10k tasks this is slow.
  - No actions (refund, dispute, escalate) — view-only.

### 5.11 `/dashboard/tickets` (`DataPages.tsx → TicketsPage`)

- **Purpose:** Support and community tickets.
- **Queries:** `api.tasks.list` (filtered client-side to `support` or `community`)
- **Mutations:** None.
- **Gaps:** Same as invoices — client-side filtering, view-only.

### 5.12 `/dashboard/profile` (`AccountPages.tsx → ProfilePage`)

- **Purpose:** Show founder identity, session, role, workspace badge.
- **Queries:** None (uses `authClient.useSession()`).
- **Mutations:** None.
- **Memory used:** Auth session only.
- **Gaps:** Static — no edit name/email, no MFA, no API token management, no workspace switcher.

### 5.13 `/dashboard/settings` (`AccountPages.tsx → SettingsPage`)

- **Purpose:** Workspace preferences (notifications, compact mode, command suggestions).
- **Queries:** None.
- **Mutations:** None.
- **Memory used:** Toggles are **visual only** — no persistence.
- **Gaps:** Every setting is hardcoded. Toggling does nothing.

---

## 6. Cross-Page State

State that needs to persist as the founder navigates:

| State | Today | Should be |
|---|---|---|
| Workspace ID | Hardcoded constant | Derived from auth session, in a `WorkspaceContext` provider |
| Selected user (founder identity) | `authClient.useSession()` — global | Same, no change |
| Selected crew | Local `useState` in `DashboardShell` only | URL param + workspace-scoped React context |
| Executive chat thread | DB-persisted, queried per page | Same — already correct |
| Theme / dashboard density | Settings page UI only, not persisted | A `userPreferences` table |
| Pinned filters | None | A per-page filter state (URL-scoped) |
| Notification queue | None | A `notifications` table + bell icon in topbar |

---

## 7. End-to-End Information Flows

### 7.1 Founder asks Executive a question

```
DashboardShell.handleExecSend(text)
  → api.chat.send (action)
       ├─ insert founder message  → chatMessages
       ├─ run api.tasks.getStats   → returns aggregate numbers
       ├─ run internal.chat.listRecent → last 10 messages
       ├─ buildExecutiveChatPrompt → system prompt with 4 numbers
       ├─ runAgentModel (lib/anthropic.ts)
       │    → POST to NVIDIA/Anthropic endpoint
       │    → returns text
       └─ insert executive message → chatMessages
            ↓ (Convex reactivity)
ExecutivePanel.useQuery(api.chat.list) re-renders with new message
```

**What's missing:** the page the user is on, the data on screen, any task/trace/integration knowledge.

### 7.2 Inbound Intercom webhook → ticket → AI reply

```
Intercom POST → http.ts → webhooks/intercom.ts:handleIntercomWebhook
  → tasks.insert (status: pending, source: intercom)
  → overseer.routeTask → picks crew (support|community)
  → tasks.assignToCrewLead
  → schedule agent_runner/support.ts via ctx.scheduler.runAfter
  → support.ts.runAgent
       ├─ load agent system prompt
       ├─ runAgentModel(systemPrompt, taskSummary)
       ├─ parse response → if escalation → tasks.update status=escalated
       └─ if not escalated → tasks.update status=resolved (BUT NEVER REPLIES TO INTERCOM)
       ↓ (Convex reactivity)
EscalationsPage / ActivityPage / TicketsPage all re-render
```

**Critical gap:** no outbound `intercom_reply` ever fires. Customer waits forever.

### 7.3 Founder edits a prompt

```
PromptsPage.save()
  → api.agents.updatePrompt (mutation)
       ├─ insert new row in promptVersions
       └─ update agents.systemPrompt + promptVersion
            ↓
PromptsPage.useQuery(api.agents.listPromptVersions) → re-renders
PromptsPage shows "Saved" badge
```

**Note:** evals are NOT triggered. Pass-rate shown is from prior runs only.

### 7.4 Founder approves an escalation

```
EscalationsPage.resolve(taskId)
  → api.tasks.resolveEscalation (mutation)
       └─ tasks.update status=resolved, resolution=<text>
            ↓
EscalationsPage useQuery(listEscalated) → row disappears
ExecutivePanel useQuery(listEscalated) → counter decrements
ActivityPage / TraceFeed → unaffected (no trace written)
```

**Gap:** No `escalation_resolved` trace, no notification to original source.

---

## 8. Known Gaps

Quick-reference for what's broken or missing across the system. Each row maps to a fix in the upcoming work.

| Gap | Impact | Fix lives in |
|---|---|---|
| `WORKSPACE_ID` hardcoded | No real multi-tenancy | New `workspaces` table + auth-derived context |
| Convex queries don't enforce auth | Any authenticated user reads any workspace | `ctx.auth.getUserIdentity()` checks in every query |
| Crews are an enum | No new verticals possible | `crews` table (see ONBOARDING_PLAN.md) |
| Tools declared but not executed | "Agents" can't act | Tool executor loop in `agent_runner/*` |
| No outbound integration writes | Customers never get replies | Implement provider-side actions |
| Executive sees only 4 numbers | AI feels generic | Inject page context + retrieved traces |
| Page-local state lost on navigation | UX feels disjointed | URL-param state for filters + selection |
| Provider list hardcoded | Adding a provider = code edit | `providerRegistry` table |
| Settings toggles do nothing | Settings page is decorative | `userPreferences` table |
| No notifications | Escalations are silent | `notifications` table + bell |
| Client-side task filtering | Slow at scale | `api.tasks.listByCrewTag` server query |
| Webhooks not idempotent | Duplicate tickets / refunds | Unique constraint on `(workspaceId, externalId)` |

---

## 9. How to Use This Doc

- **Adding a new page?** Mirror Section 5 entries: state purpose, queries, mutations, memory used.
- **Touching memory or persistence?** Update Section 3 first so the rest of the team knows.
- **Changing the auth model?** Update Sections 2 and 6 — they're the contract.
- **Investigating a bug?** Section 7 flows are the canonical traces. Match symptom → flow → step.

Keep this doc adjacent to `ONBOARDING_PLAN.md`. Together they define what Rule8 is today and where it's heading.
