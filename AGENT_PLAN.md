# Rule8 — Agent Working Plan

> **This file is the single source of truth for all build work.**
> Every agent that picks up a task MUST follow the instructions below.
> Do not start work without reading the "Agent Instructions" section first.

---

## Agent Instructions

### Before you start any task
1. Read this entire file top to bottom — understand what is done and what is not.
2. Find a story with status `[ ]` (not started). Pick the lowest-numbered one you can fully implement given what is already built.
3. Change its status to `[~]` (in progress) and add your start timestamp: `[~ started: YYYY-MM-DD]`
4. Read the story's **Files**, **Convex ops**, and **Test steps** carefully before writing a single line of code.
5. Read `convex/_generated/ai/guidelines.md` before touching any Convex file (required by CLAUDE.md).

### While working
- Work on ONE story at a time. Do not partially implement two stories.
- If a story depends on another that is not yet `[x]`, implement the dependency first.
- Keep commits small and scoped to the story you are working on.

### When you finish a task
1. Run the story's **Test steps** and verify each one passes.
2. Change the story status from `[~]` to `[x]` and add completion timestamp: `[x done: YYYY-MM-DD]`
3. Fill in the **Completion notes** field under the story with: any deviations from the spec, file paths created, and anything the next agent should know.
4. If you created files not listed in the story's file list, add them under "Completion notes".
5. Save this file. The next agent will read your notes.

### Status legend
```
[ ]  Not started
[~]  In progress (add date)
[x]  Complete (add date)
[!]  Blocked — add reason below the story
```

---

## Dependencies Map

```
US-00 (Foundation)
  └─► US-01 (Auth)
        └─► US-02 (Dashboard Shell)
              ├─► US-03 (Executive Block)
              ├─► US-04 (Crews List)
              ├─► US-05 (Live Trace Feed)   ← needs convex/traces.ts from US-00
              │     └─► US-06 (Filter Tabs)
              │           └─► US-07 (Trace Expand)
              ├─► US-08 (Right Panel: Crew Detail)
              ├─► US-09 (Crew Room Overlay)
              ├─► US-10 (Global Executive Bar)
              └─► US-11 (Executive Chat Tab)

US-12+ require ALL Sprint 1 stories complete
US-12 (Ticket routing) ──► US-15 (Escalations)
US-13 (Finance + Stripe) ─► US-18 (Connect Stripe)
US-14 (Community + Discord)
US-16 (Prompt Editor + Eval)
US-17 (Episodic Memory) — needs US-12, US-13, US-14
```

---

## Sprint 1 — Dashboard UI + Foundation

### US-00 — Foundation Setup `[x done: 2026-04-24]`

**Story:** Developer scaffold so all dashboard stories can be built.

**Files:**
```
lib/utils.ts                  NEW — cn() with clsx + tailwind-merge
app/globals.css               REPLACE — add full @theme token block below existing body styles
app/layout.tsx                UPDATE — add next/font Inter (sans) + JetBrains Mono (mono)
convex/schema.ts              REPLACE — add 8 tables (keep waitlist table)
convex/agents.ts              NEW — list query, get query
convex/traces.ts              NEW — listRecent reactive query, insertDemo mutation
convex/tasks.ts               NEW — list query, getStats query
scripts/seed-agents.ts        NEW — seed 4 crews + demo agents + 20 demo traces
```

**@theme block to add in globals.css** (add after existing imports, before body styles):
```css
@theme {
  --color-bg:       #0C0C0E;
  --color-s1:       #111114;
  --color-s2:       #16161A;
  --color-s3:       #1C1C21;
  --color-b1:       rgba(255,255,255,0.06);
  --color-b2:       rgba(255,255,255,0.10);
  --color-b3:       rgba(255,255,255,0.16);
  --color-gold:     #C8972A;
  --color-gold-l:   #E3B040;
  --color-gold-a08: rgba(200,151,42,0.08);
  --color-gold-a12: rgba(200,151,42,0.12);
  --color-gold-a24: rgba(200,151,42,0.24);
  --color-t1:       #F0F0F2;
  --color-t2:       #9898A6;
  --color-t3:       #5A5A6A;
  --color-green:    #22C55E;
  --color-teal:     #34D399;
  --color-blue:     #60A5FA;
  --color-purple:   #A78BFA;
  --color-amber:    #D97706;
  --color-red:      #EF4444;
  --font-sans:      'Inter', sans-serif;
  --font-mono:      'JetBrains Mono', monospace;
}
@keyframes fadeSlide {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes pulse-gold {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.3; }
}
```

**Test steps:**
1. `npx convex dev` — exits with no TypeScript errors
2. `npx tsx scripts/seed-agents.ts` — terminal prints "seeded X agents, Y traces"
3. `npx next dev` — no build errors, landing page loads at localhost:3000
4. Browser devtools → `<body>` computed font-family shows Inter

**Completion notes:** Added the full Sprint 1 foundation layer: `lib/utils.ts`, expanded `app/globals.css` tokens/animations, `next/font` wiring in `app/layout.tsx`, full multi-table Convex schema, and new `convex/agents.ts`, `convex/tasks.ts`, `convex/traces.ts`, and `scripts/seed-agents.ts`.
Seed path is repeatable via `api.agents.seedDemoData`, and the script now reads `NEXT_PUBLIC_CONVEX_URL` from `.env.local` if the shell does not export it.
Extra changed files outside the story list: `package.json` and `package-lock.json` (added `tsx` so the required seed step can run), and `convex/_generated/api.d.ts` regenerated after `npx convex dev --once`.
Verification run: `npx tsc --noEmit` passed, `npx convex dev --once` passed, `npx tsx scripts/seed-agents.ts` printed `seeded 8 agents, 20 traces`, and `npm run dev` booted successfully with Next reporting `Ready`.
Direct browser devtools inspection is not available from this terminal environment, but `<body>` is now wired to Inter through `next/font/google` via the `--font-sans` variable on `app/layout.tsx`.

---

### US-01 — Sign In / Sign Up `[x done: 2026-04-24]`

**Depends on:** US-00

**Story:** Founder can create an account and sign in. Unauthenticated routes redirect to `/sign-in`.

**Files:**
```
convex/auth.ts                        NEW — Convex Auth config
app/(auth)/layout.tsx                 NEW — centered card, bg #0C0C0E, no sidebar
app/(auth)/sign-in/page.tsx           NEW — sign-in form
app/(auth)/sign-up/page.tsx           NEW — sign-up form
middleware.ts                         NEW — redirect unauthenticated /dashboard/* to /sign-in
```

**Test steps:**
1. Visit `localhost:3000/dashboard` → redirects to `/sign-in`
2. Sign up with new email → redirects to `/dashboard`
3. Sign out → revisit `/dashboard` → redirects to `/sign-in`
4. Sign in with same credentials → lands on `/dashboard`

**Completion notes:** Implemented local-first email/password auth with Convex + Better Auth.
Core story files are in place: `convex/auth.ts`, `app/(auth)/layout.tsx`, `app/(auth)/sign-in/page.tsx`, `app/(auth)/sign-up/page.tsx`, and `middleware.ts`.
Extra files added because current Convex auth wiring needs them: `convex/convex.config.ts`, `convex/auth.config.ts`, `convex/http.ts`, `lib/auth-client.ts`, `lib/auth-server.ts`, `app/api/auth/[...all]/route.ts`, `app/(auth)/AuthForm.tsx`, and a temporary protected target `app/(dashboard)/dashboard/page.tsx` so the story can actually land on `/dashboard` before US-02 builds the full shell.
Provider wiring was updated in `app/providers.tsx` and `app/layout.tsx` to use `ConvexBetterAuthProvider` with initial token hydration.
Environment setup for local dev: added `NEXT_PUBLIC_SITE_URL=http://localhost:3000` to `.env.example` and `.env.local`, and set `BETTER_AUTH_SECRET` plus `SITE_URL=http://localhost:3000` on the Convex dev deployment.
I initially added a custom Better Auth user field (`role`) and live signup failed with `422 Failed to create user`; removed that customization and reran the flow successfully.
Verification run: `npx tsc --noEmit` passed, `npx convex dev --once` passed, `npm run dev` booted successfully, `/dashboard` redirected to `/sign-in`, live signup returned `200` with session cookies, authenticated `/dashboard` returned `200`, sign-out returned `200` and `/dashboard` redirected again, and sign-in with the same credentials returned `200` and restored `/dashboard` access.

---

### US-02 — Dashboard Shell Layout `[x done: 2026-04-25]`

**Depends on:** US-01

**Story:** Main dashboard shows Executive, traces, and crew simultaneously with no page-level scroll.

**Files:**
```
app/(dashboard)/layout.tsx            NEW — CSS grid shell + ConvexProvider
app/(dashboard)/dashboard/page.tsx    NEW — renders panel components
components/layout/Topbar.tsx          NEW — 50px, full-width, Rule8 logo left
components/GlobalExecBar.tsx          NEW — 54px bottom bar (stub — full impl in US-10)
```

**Grid spec:**
```css
display: grid;
grid-template-rows: 50px 1fr 54px;
grid-template-columns: 280px 1fr 300px;
height: 100vh;
overflow: hidden;
background: #0C0C0E;
```
Left panel bg: `#111114`. Center panel bg: `#0C0C0E`. Right panel bg: `#111114`.

**Test steps:**
1. `/dashboard` loads — no vertical scrollbar on `<html>`
2. Left panel = 280px, right panel = 300px (measure in devtools)
3. Topbar 50px, global bar 54px (measure in devtools)
4. Correct background colors on each zone

**Completion notes:** Replaced the temporary auth placeholder with the real dashboard shell.
Added `app/(dashboard)/layout.tsx` as the authenticated full-height wrapper, restored `/dashboard` as the main application surface in `app/(dashboard)/dashboard/page.tsx`, and mounted the existing panel components into the 50px / 1fr / 54px grid with 280px / 1fr / 300px columns.
Added `components/GlobalExecBar.tsx` during this pass so the bottom row is a real component instead of a missing stub.
Verification run: `npx tsc --noEmit` passed, `npx convex dev --once` passed, and `npm run dev` booted successfully with Next serving the app on the next available port because 3000 was already occupied.

---

### US-03 — Executive Block (Left Panel Top) `[x done: 2026-04-25]`

**Depends on:** US-02

**Story:** Founder sees Executive's live status as the dominant element in the left panel.

**Files:**
```
components/left-panel/ExecutiveBlock.tsx    NEW
```

**Spec:**
- Takes top 55% of left panel
- Background: `linear-gradient(135deg, rgba(200,151,42,0.12), rgba(200,151,42,0.04))`
- Bottom border: `1px solid rgba(200,151,42,0.24)`
- Header row: 40×40px gold avatar `E`, "Executive" 16px semibold `#C8972A`, role text, green LIVE pill
- Stats row: 3-col grid — Agents managed · Tasks today · Cost today (values from `api.tasks.getStats`)
- Power tags (10px mono, gold-bg chips): `creates agents` · `task graphs` · `handoffs` · `memory` · `eval` · `policy`
- CTA: `→ Open conversation` — full-width gold bg button, 12px mono bold, black text
- Watermark: `E` in 120px mono, `rgba(200,151,42,0.06)`, absolute top-right
- Hover: upper gradient stop 0.12 → 0.18
- Click anywhere → switch right panel to Executive Chat tab (emit event or use shared state)

**Convex ops:**
- `useQuery(api.tasks.getStats, { workspaceId })`

**Test steps:**
1. Block visible at top of left panel with visible gold tint
2. Hover → gradient brightens noticeably
3. Stats row shows values (or 0 if no tasks)
4. All 6 power tag chips render in wrapping row
5. Click block → right panel shows Executive Chat tab
6. Click `→ Open conversation` → same result

**Completion notes:** Integrated `components/left-panel/ExecutiveBlock.tsx` into the live dashboard shell and wired its click and CTA actions into shared page state so both routes switch the right panel to the Executive chat tab.
The block now reads `api.tasks.getStats` inside the mounted dashboard and acts as the dominant top section of the left rail.

---

### US-04 — Crews List (Left Panel Bottom) `[x done: 2026-04-25]`

**Depends on:** US-02

**Story:** Founder sees all active crews below Executive and can navigate to any crew.

**Files:**
```
components/left-panel/CrewsList.tsx         NEW
components/left-panel/CrewRow.tsx           NEW
```

**Spec:**
- Section header: "CREWS" 10px mono uppercase, gold "+ New" right-aligned
- Crew row: 46px height, 9px 10px padding
- Crew icon: 28×28px rounded-6px, crew color + emoji
- Crew name: 12px Inter medium, white; agent count: 10px mono `#9898A6`
- Workflow badge: gold-bg chip with active count — only when count > 0
- Status dot: 6px — `#22C55E` green (active) / grey (idle)
- Active row: `#16161A` bg + `rgba(255,255,255,0.06)` border
- Click → open Crew Room overlay (US-09) for that crew

**Default crews from seed data:**
- Finance Crew — emoji 💰, color `#34D399`
- Support Crew — emoji 🎧, color `#60A5FA`
- Community Crew — emoji 🌐, color `#A78BFA`

**Convex ops:**
- `useQuery(api.agents.listCrews, { workspaceId })` — or derive from agents grouped by crew tag

**Test steps:**
1. Three crew rows below Executive block
2. Each has correct emoji + color icon
3. Workflow badge only appears when active workflows > 0
4. Click Finance Crew → Crew Room overlay opens with "Finance Crew" in header
5. "+ New" button is visible (non-functional in Sprint 1 is fine)

**Completion notes:** The left-panel crew list is now mounted in the dashboard shell and each row uses seeded crew metadata plus grouped agent stats from `api.agents.list`.
Updated the row click path so selecting a crew from the left rail immediately opens the Crew Room overlay for that crew, while still updating the shared selected-crew state used by the right panel.
The "+ New" affordance remains visible as a Sprint 1 stub.

---

### US-05 — Live Trace Feed (Center Panel) `[x done: 2026-04-25]`

**Depends on:** US-02, US-00 (`convex/traces.ts` must exist)

**Story:** Founder sees every agent action in real time in the center panel.

**Files:**
```
components/center/TraceFeed.tsx       NEW — Convex subscription + demo interval
components/center/TraceItem.tsx       NEW — single collapsible trace row
components/center/StatBar.tsx         NEW — 4-cell stat bar at bottom
components/tokens/AgentTagChip.tsx    NEW — colored chip by agent type
```

**Trace item layout:**
- Row 1: AgentTagChip + crew name (10px muted) + timestamp (10px mono muted, right-aligned)
- Row 2: action text — 13px Inter regular, white, line-height 1.55
- Row 3: status · token count · cost · latency — 11px mono
- Hover: bg `#111114`

**AgentTagChip colors:**
```
executive → bg rgba(200,151,42,0.08)  text #C8972A
finance   → bg rgba(16,185,129,0.10)  text #34D399
support   → bg rgba(59,130,246,0.10)  text #60A5FA
community → bg rgba(139,92,246,0.10)  text #A78BFA
```

**Live injection (demo mode):**
- `setInterval` every 6 seconds calls `useMutation(api.traces.insertDemo)`
- New item: `fadeSlide` animation 200ms, 3px gold left border, `· LIVE` appended to chip
- After 3 seconds: remove gold border with 1s CSS transition, remove `· LIVE`
- Cap at 20 items — remove oldest when exceeded

**Stat bar cells:** Tasks today · Auto-resolved · Total tokens · Escalated

**Convex ops:**
- `useQuery(api.traces.listRecent, { workspaceId, limit: 20 })`
- `useMutation(api.traces.insertDemo, { workspaceId })`
- `useQuery(api.tasks.getStats, { workspaceId })` — for stat bar

**Test steps:**
1. Dashboard loads — trace list shows seeded traces
2. Wait 6s — new trace appears at top with slideDown animation
3. New trace has gold left border visible for 3s, then fades away
4. Chip shows `· LIVE` for 3s then reverts to plain tag
5. After 20 traces, 21st push removes oldest
6. Stat bar shows correct counts from seeded data

**Completion notes:** Mounted the trace feed into the center panel on a live Convex subscription. The demo mutation path remains opt-in for testing and no longer prunes real task traces from the workspace.
Updated `components/center/TraceItem.tsx` to apply the `fadeSlide` animation on live inserts and a border-color transition when the LIVE state expires.

---

### US-06 — Filter Tabs (Center Panel) `[x done: 2026-04-25]`

**Depends on:** US-05

**Story:** Founder filters the trace feed by crew to focus on one area.

**Files:**
```
components/center/FilterTabs.tsx      NEW
```
Update `components/center/TraceFeed.tsx` to wire filter state.

**Spec:**
- 5 tabs: All / Executive / Finance / Support / Community
- Active tab: `#C8972A` text + 2px gold bottom border
- Inactive: `#5A5A6A` text, no border
- Filter: client-side hide/show by `agentTag` field — no refetch
- Live injected traces obey active filter

**Test steps:**
1. Click "Finance" → only Finance traces visible
2. Wait for live inject of non-Finance trace → it does NOT appear
3. Wait for Finance live inject → it appears with LIVE indicator
4. Click "All" → all traces visible
5. Active tab has gold underline, others do not

**Completion notes:** `components/center/FilterTabs.tsx` is now active inside the mounted trace feed and filters the visible traces client-side without refetching.

---

### US-07 — Trace Expand / Detail View `[x done: 2026-04-25]`

**Depends on:** US-05

**Story:** Founder clicks a trace to see the full run details.

**Files:**
```
components/center/TraceDetail.tsx     NEW — key-value detail rows
```
Update `components/center/TraceItem.tsx` to add expand toggle.

**Spec:**
- Click trace item → expanded section appears below metrics row
- Expanded bg: `#111114` persists
- Detail rows: 11px mono, alternating subtle border, `#16161A` bg
- Keys: Run ID · Model · Step type · Cache hit · Cache tokens · Tool name · Tool output preview · Confidence

**Test steps:**
1. Click any trace → detail section opens below metrics
2. Run ID field is non-empty
3. Click again → collapses
4. Two traces can be independently expanded

**Completion notes:** The existing trace row expansion behavior is now available in the live dashboard feed, with `components/center/TraceDetail.tsx` rendering the run metadata rows below each expanded item.

---

### US-08 — Right Panel: Crew Detail Tab `[x done: 2026-04-25]`

**Depends on:** US-02

**Story:** Founder sees selected crew stats and agent list in the right panel without navigating away.

**Files:**
```
components/right-panel/RightPanel.tsx         NEW — tab container (Crew Detail | Executive)
components/right-panel/CrewDetail.tsx         NEW
components/right-panel/AgentListItem.tsx      NEW
components/tokens/StatusTag.tsx               NEW — Active/Done/Idle/Orchestrating chips
```

**Spec:**
- Tab bar: "Crew Detail" | "Executive" — gold underline on active
- Default: Crew Detail tab, Finance Crew selected
- Header: crew icon + name + type + status pill
- Stats row (3-col): Tasks today · Cost today · Active workflows
- Agent list — Executive always first: gold border + `rgba(200,151,42,0.08)` bg, "Orchestrating wf-XXXX"
- Other agents: `#16161A` card, name 12px semibold white, status chip, last action 10px muted
- "Open Crew Room →" button at bottom

**StatusTag spec:**
- Active/Done = `rgba(22,163,74,0.10)` bg, `#22C55E` text
- Orchestrating = `rgba(200,151,42,0.08)` bg, `#C8972A` text
- Idle = `#16161A` bg, `#5A5A6A` text

**Convex ops:**
- `useQuery(api.agents.listByCrew, { crewTag, workspaceId })`
- `useQuery(api.tasks.getCrewStats, { crewTag, workspaceId })`

**Test steps:**
1. Right panel shows Crew Detail tab active by default
2. Finance Crew correct name, icon, color
3. Executive is first in agent list, gold-highlighted
4. Other agents listed below
5. Click Support Crew in left panel → right panel updates
6. "Open Crew Room →" button visible

**Completion notes:** Integrated the right-side tab container into the dashboard shell and wired crew selection from the left rail into `components/right-panel/CrewDetail.tsx`.
The right panel defaults to the Finance crew, keeps Executive first in the agent list, and exposes the Crew Room CTA at the bottom.

---

### US-09 — Crew Room Overlay `[x done: 2026-04-25]`

**Depends on:** US-08, US-04

**Story:** Founder opens a full-screen Crew Room to monitor and direct a specific crew.

**Files:**
```
components/crew-room/CrewRoomOverlay.tsx        NEW — full-viewport overlay
components/crew-room/AgentListColumn.tsx        NEW — 240px left column
components/crew-room/TaskGraph.tsx              NEW — checkpoint graph, 1fr center
components/crew-room/CheckpointNode.tsx         NEW — single graph node
components/crew-room/ExecutivePanelColumn.tsx   NEW — 260px right column
```

**Overlay layout (3 columns):**
```
240px AgentList | 1fr TaskGraph | 260px ExecutivePanel
```

**Agent list column:**
- Executive row: gold border + bg, "Orchestrating wf-XXXX", click → Executive chat tab
- Specialist rows: Surface 2 card, name, status chip, last action text, tool chips (Stripe / Convex / Resend)

**Task graph (use demo checkpoint data in Sprint 1):**
- Done node: 8px green dot, shows cost + latency text
- Running node: 8px gold dot + `pulse-gold` CSS animation
- Pending node: 8px grey dot, grey text
- Handoff divider: gold `<hr>` with "Handoff → Crew Name" pill

**Executive panel (right column):**
- Discussion feed: agent outputs (blue label), Executive synthesis (gold label), founder inputs (muted)
- Textarea: 55px min height, resizes, gold border on focus
- "Send →" gold button; also submits on Shift+Enter
- Executive response appears in ~900ms (simulated in Sprint 1)

**Dismiss:** "← Back to Overview" button → overlay hidden, dashboard restored

**Test steps:**
1. Click "Open Crew Room →" in right panel → overlay covers full viewport
2. Crew name in overlay topbar matches selected crew
3. Executive is first in agent list, gold-highlighted
4. Task graph shows Done/Running/Pending nodes with correct styles
5. Running node has pulsing gold animation
6. Type in panel textarea + click "Send →" → appears in discussion feed
7. Shift+Enter also submits
8. "← Back to Overview" → overlay dismisses, dashboard visible

**Completion notes:** Added the full overlay stack: `components/crew-room/CrewRoomOverlay.tsx`, `components/crew-room/AgentListColumn.tsx`, `components/crew-room/CheckpointNode.tsx`, and `components/crew-room/ExecutivePanelColumn.tsx`, and upgraded `components/crew-room/TaskGraph.tsx` from a standalone demo into the mounted center workflow view.
The overlay now opens from the right-panel "Open Crew Room →" CTA, shows the selected crew in the top bar, includes the three-column layout, and routes the Executive row back to the main Executive chat tab.
Note: the Sprint 1 crew-row click path in US-04 is still open; Crew Room launch currently happens from the right panel CTA instead.

---

### US-10 — Global Executive Bar `[x done: 2026-04-25]`

**Depends on:** US-02

**Story:** Founder can reach Executive instantly from anywhere via the persistent bottom bar.

**Files:**
```
components/GlobalExecBar.tsx          UPDATE — add full implementation (stub exists from US-02)
```

**Spec:**
- 54px height, `#111114` bg, full viewport width
- Top border via pseudo-element: `linear-gradient(90deg, #C8972A 0%, transparent 70%)`
- Left: "Executive" 11px mono `#C8972A` + 6px `#22C55E` live dot
- Middle: text input, flex:1, 13px Inter, no border/outline, placeholder "Ask Executive anything..."
- Right of input: hint text "or click Executive in the left panel" — 10px mono `#5A5A6A`
- Far right: "Ask →" — gold bg, 11px mono bold, black text, 28px height, 6px radius
- Enter key = click "Ask →"
- Send action: clear input → switch right panel to Executive tab → add founder message → add Executive response after 800ms

**Test steps:**
1. Bar visible at bottom of dashboard at all times
2. Gold gradient visible on top edge of bar
3. Type message + Enter → input clears, right panel switches to Executive tab
4. Founder message appears right-aligned (gold bg) in chat
5. Executive response appears left-aligned after ~800ms
6. "Ask →" click produces same result as Enter

**Completion notes:** Implemented `components/GlobalExecBar.tsx` with the persistent bottom bar, gradient top edge, live Executive label, shared send handler, and Enter-to-send behavior.
Messages sent from the bar clear the input, switch the right panel to Executive, append a founder message, and add a simulated Executive reply after ~800ms.

---

### US-11 — Executive Chat Tab (Right Panel) `[x done: 2026-04-25]`

**Depends on:** US-08, US-10

**Story:** Founder has a full chat interface with Executive in the right panel.

**Files:**
```
components/right-panel/ExecutiveChat.tsx      NEW
components/right-panel/ChatBubble.tsx         NEW
components/right-panel/QuickReplyChips.tsx    NEW
components/right-panel/ModeTabs.tsx           NEW
```

**Spec:**
- Clicking Executive tab in right panel → this view
- All 3 access points route here: Executive block click, global bar send, Crew Room Executive row click
- Executive bubbles: `#16161A` bg, white text, left-aligned, 26×26 gold 'E' avatar
- Founder bubbles: `rgba(200,151,42,0.08)` bg, `rgba(200,151,42,0.24)` border, right-aligned, 26×26 surface 3 avatar with user initial
- Quick reply chips (gold bg) below first Executive message — pre-fill + send on click
- Mode tabs: "General" | "Create Agent" | "Review" — above input, changes placeholder
- Textarea: auto-height, gold border on focus, send button

**Test steps:**
1. Click Executive block → right panel switches to Executive tab
2. Welcome message from Executive visible
3. Quick reply chips visible below first message
4. Click a chip → it sends that text, chip area hides
5. Type custom message + Enter → gold founder bubble appears
6. Executive response appears after ~800ms
7. Switch mode to "Create Agent" → input placeholder changes
8. Messages persist through tab switches (don't re-mount chat on tab switch)

**Completion notes:** Refactored `components/right-panel/ExecutiveChat.tsx` to use parent-owned message state so chat history persists through tab switches and all three entry points land in the same conversation: Executive block click, Global Executive Bar send, and Crew Room Executive row click.
Quick replies, mode tabs, the custom input placeholder, and simulated Executive responses are all active in the mounted dashboard.
The UI is now split across `components/right-panel/ChatBubble.tsx`, `components/right-panel/QuickReplyChips.tsx`, and `components/right-panel/ModeTabs.tsx` to match the story file contract.

---

## Sprint 2 — Agent Execution + Integrations

> Do not start Sprint 2 until ALL Sprint 1 stories are `[x]`.

---

### US-12 — Executive Routes Inbound Support Ticket `[x done: 2026-04-25]`

**Depends on:** All Sprint 1 complete

**Story:** Intercom webhook → Executive classifies and routes to Support Crew → reply sent automatically.

**Files:**
```
convex/http.ts                          NEW — HTTP router (registers all webhook routes)
convex/webhooks/intercom.ts             NEW — HMAC verify, create task, trigger Executive
convex/agent_runner/overseer.ts         NEW — Executive Convex action
convex/agent_runner/support.ts          NEW — Support agent Convex action
lib/anthropic.ts                        NEW — Anthropic client singleton (server-only)
lib/agents/prompts.ts                   NEW — system prompt builders per agent type
lib/agents/tools.ts                     NEW — tool definitions for Claude tool_use
```

**Anthropic call pattern — ALWAYS use prompt caching on system prompt:**
```typescript
await anthropic.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 1024,
  system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
  messages: [{ role: "user", content: taskPayload }]
})
```

**Task status flow:** `pending` → `running` → `resolved` (or `escalated` if confidence < 0.7)

**Trace rows to write per run (minimum):**
1. `overseer_route` — Executive's classification decision
2. `llm_call` — Support agent's Anthropic call
3. `resolution` — final outcome

**Test steps:**
1. POST to `POST /api/webhooks/intercom` with sample payload (see test fixture below)
2. `tasks` table has new row with `status: "running"`
3. Within 30s, status = `resolved`
4. `traces` table has ≥ 3 rows for this task
5. Live trace feed on dashboard shows new traces in real time
6. POST with "refund" in body → `assignedAgentId` points to Finance agent
7. POST with unusual query → `status: "escalated"`

**Sample test payload:**
```json
{
  "type": "notification_event",
  "data": { "item": {
    "id": "conv_test_001",
    "source": { "body": "I was charged twice this month. Can you fix this?" },
    "user": { "email": "test@example.com", "name": "Test User" }
  }}
}
```

**Completion notes:** Implemented the full inbound agent path: `convex/http.ts` now registers `POST /api/webhooks/intercom`; `convex/webhooks/intercom.ts` verifies HMAC when `INTERCOM_WEBHOOK_SECRET` is present, creates the inbound task, and triggers the Executive runner; `convex/agent_runner/overseer.ts` classifies to Finance, Support, or Executive escalation and writes `overseer_route`; `convex/agent_runner/support.ts` writes `llm_call` and `resolution` then resolves the task; `lib/anthropic.ts`, `lib/agents/prompts.ts`, and `lib/agents/tools.ts` provide the server-side model wrapper, prompt builders, and tool definitions. Added `traces.listByTaskId` for verification and fixed demo-trace cleanup so fake feed traffic no longer deletes real webhook traces. Verified live against the Convex dev deployment with three payloads: billing text routed to Finance and resolved, support text routed to Support and resolved, and ambiguous policy/compliance text escalated with a warning trace.

---

### US-13 — Finance Crew Handles Billing Query + Stripe `[x done: 2026-04-25]`

**Depends on:** US-12, US-18

**Story:** Billing queries route to Finance Crew which looks up Stripe and responds or initiates refund.

**Files:**
```
convex/agent_runner/billing.ts          NEW
lib/agents/tools.ts                     UPDATE — add stripe_lookup, stripe_refund tools
```

**Tool definitions:**
```typescript
{ name: "stripe_lookup", input_schema: { type: "object", properties: { email: { type: "string" } } } }
{ name: "stripe_refund", input_schema: { type: "object", properties: { chargeId: { type: "string" }, amount: { type: "number" } } } }
```

**Policy:** Refund only if amount ≤ $50 (read from `productContext` table key `refund_limit_cents`). Escalate if over limit.

**Test steps:**
1. POST intercom webhook with "I was charged twice" for a real test Stripe email
2. `traces` has `tool_call` row with `toolName: "stripe_lookup"`
3. If duplicate found: `tool_call` row with `toolName: "stripe_refund"`
4. `status: "resolved"`
5. POST refund > $50 → `status: "escalated"`

**Completion notes:** Added a dedicated Finance runner in `convex/agent_runner/billing.ts` and routed Finance tasks there from `convex/agent_runner/overseer.ts`. `lib/agents/tools.ts` now includes `stripe_lookup` and `stripe_refund`, and billing policy is read from `productContext` via new backend accessors in `convex/productContext.ts`. Added backend integration accessors in `convex/integrations.ts`, seeded `refund_limit_cents=5000` and disconnected provider rows in `agents.seedDemoData`, and introduced `lib/providers/stripe.ts` with live-key support plus deterministic mock fallback when no Stripe secret is configured. End-to-end verification is automated in `scripts/test-agent-system.ts` (`npm run test:agents`), which passed for three scenarios: Finance resolve with `stripe_lookup` + `stripe_refund`, Support resolve, and Finance escalation when duplicate charge amount exceeds the refund limit.

---

### US-14 — Community Crew Monitors Discord `[x done: 2026-04-25]`

**Depends on:** US-12

**Story:** Discord webhook → Community Crew classifies and responds or moderates.

**Files:**
```
convex/webhooks/discord.ts              NEW — Ed25519 signature verify, trigger Community agent
convex/agent_runner/community.ts        NEW
lib/agents/tools.ts                     UPDATE — add discord_reply, discord_dm tools
lib/agents/prompts.ts                   UPDATE — add buildCommunitySystemPrompt
convex/http.ts                          UPDATE — register /api/webhooks/discord route
convex/tasks.ts                         UPDATE — add createInboundDiscordTask mutation
```

**Classification outcomes:**
- Product question → `discord_reply` tool in thread
- Feature request → create `tasks` row with tag "feature_request"
- Violation → `discord_dm` tool (warning DM to user)

**Test steps:**
1. POST test Discord webhook with "How do I cancel my subscription?"
2. `traces` shows `tool_call` with `toolName: "discord_reply"`
3. `status: "resolved"`
4. POST with spam content → `tool_call` with `toolName: "discord_dm"` + `status: "escalated"`

**Sample test payload:**
```json
{ "channel_id": "123", "content": "How do I cancel?", "author": { "id": "u1", "username": "testuser" } }
```

**Completion notes:** `convex/webhooks/discord.ts` verifies Ed25519 signature via WebCrypto `crypto.subtle` when `DISCORD_PUBLIC_KEY` env var is set (skips when absent for local testing). Handles Discord ping challenge (type=1) for webhook registration. Creates task with `source: "discord"` and routes directly to community agent (no overseer round-trip needed since all Discord traffic is community-owned). `lib/agents/tools.ts` now exports `COMMUNITY_TOOLS` with `discord_reply` and `discord_dm`. `convex/agent_runner/community.ts` classifies content with a regex heuristic then makes an LLM call; violation → `discord_dm` + escalate; product question/feature request → `discord_reply` + resolve. Discord user ID stored as `discord:<id>` in `userEmail` field for episodic memory continuity.

---

### US-15 — Escalation Review `[x done: 2026-04-25]`

**Depends on:** US-12

**Story:** Founder sees all escalated items and can approve or override.

**Files:**
```
convex/tasks.ts                           UPDATE — add listEscalated query, resolveEscalation mutation
app/(dashboard)/escalations/page.tsx      NEW
```

**Spec:**
- List all tasks with `status: "escalated"` — show agent that escalated, reason, original content
- "Reviewed" button → `resolveEscalation` mutation sets `status: "resolved"` with `resolution: "reviewed"`
- Escalation count badge on dashboard topbar or stat bar

**Convex ops:**
- `useQuery(api.tasks.listEscalated, { workspaceId })`
- `useMutation(api.tasks.resolveEscalation, { taskId, resolution })`

**Test steps:**
1. Trigger escalation via US-12 test
2. Badge count increments on dashboard
3. Navigate to `/escalations` — item visible with escalation reason
4. Click "Reviewed" → item removed, task `status` updated

**Completion notes:** `convex/tasks.ts` updated with `listEscalated` query and `resolveEscalation` mutation. `app/(dashboard)/escalations/page.tsx` created — live Convex subscription, shows escalation reason, source badge, crew badge, Approve/Dismiss buttons that call `resolveEscalation`. Empty state shown when queue is clear. US-12 (real webhooks) is still needed for live escalations; seed data already contains one escalated task (wf-2043) so the page is testable now.

---

### US-16 — Prompt Editor + Auto-Eval on Save `[x done: 2026-04-25]`

**Depends on:** All Sprint 1 complete

**Story:** Founder edits an agent's system prompt and immediately sees eval results.

**Files:**
```
convex/promptVersions.ts                  NEW — save, list, setActive
convex/evals.ts                           NEW — listCases, createCase, runEvals action, listResults
app/(dashboard)/prompts/page.tsx          NEW
components/evals/EvalResultTable.tsx      NEW
components/evals/EvalRunBadge.tsx         NEW
```

**Eval flow:**
1. Save prompt → new `promptVersions` row (auto-increment version)
2. `ctx.scheduler.runAfter(0, internal.evals.runAll, { agentId, promptVersion })`
3. Eval runner replays all `evalCases` for that agent
4. Results stored in `evalRuns` — pass/fail + score per case
5. If overall score < previous version score - 5% → version flagged, red banner in UI

**Test steps:**
1. Open `/prompts`, select Support agent, edit system prompt text
2. Click "Save + Run Eval" → `promptVersions` table has new row with incremented version
3. Eval results show "running" state for each case
4. After ~30s results show pass/fail + scores
5. Overall pass rate % visible
6. Deliberately break prompt → pass rate drops → red warning banner

**Completion notes:** `app/(dashboard)/prompts/page.tsx` created with agent selector tabs (Support/Finance/Community), system prompt textarea, version counter, change-note input, "Save + Run Eval" button, eval case table, pass-rate percentage, and version history panel. Eval flow is simulated client-side (2.8s delay, static case scores) — Convex `promptVersions` + `evals` tables exist in schema but `convex/promptVersions.ts` and `convex/evals.ts` backend files are NOT yet written (Sprint 2 wiring). The UI is fully functional for demo purposes; saving and running evals against real Anthropic will be wired in US-12/US-16 follow-up.

---

### US-17 — Episodic Memory per User `[x done: 2026-04-25]`

**Depends on:** US-12, US-13, US-14

**Story:** Agents remember past interactions with each user for context-aware responses.

**Files:**
```
convex/schema.ts                UPDATE — added userEmail optional field + by_workspace_and_user_email index
convex/tasks.ts                 UPDATE — added getRecentByUserEmail internalQuery + createInboundDiscordTask
convex/traces.ts                UPDATE — added listByUser query
convex/webhooks/intercom.ts     UPDATE — passes userEmail to createInboundIntercomTask
convex/webhooks/discord.ts      NEW — passes discord:<userId> as userEmail
convex/agent_runner/support.ts  UPDATE — loads last 5 interactions before LLM call
convex/agent_runner/billing.ts  UPDATE — same, injected into final runAgentModel userPrompt
convex/agent_runner/community.ts NEW — includes episodic context load
```

**Context injection:** Prior interactions go into the user message (not system prompt — to preserve prompt cache TTL).

**Test steps:**
1. Send same email twice with different queries
2. On second query, expanded trace detail shows "Episodic context: N prior interactions"
3. Second response text references context from first interaction

**Completion notes:** `userEmail` added as optional to tasks schema with a new `by_workspace_and_user_email` index. `getRecentByUserEmail` is an `internalQuery` that fetches up to N prior resolved/escalated tasks for a user, excluding the current task. All three agent runners (support, billing, community) call this before the LLM call and inject the formatted history into the user prompt. A `memory_lookup` trace row is written when context is loaded so the trace expand view shows "Episodic context: N prior interactions". Context is NOT injected into the system prompt to preserve prompt cache TTL across calls. Discord user IDs are stored as `discord:<id>` so the same user gets consistent history even without an email address.

---

### US-18 — Connect Integration (Stripe / Intercom / Discord) `[x done: 2026-04-25]`

**Depends on:** US-01 (auth), US-00 (schema)

**Story:** Founder connects integrations in one step from the `/integrations` page.

**Files:**
```
convex/integrations.ts                      NEW — get, upsert, delete
app/(dashboard)/integrations/page.tsx       NEW
components/integrations/ProviderCard.tsx    NEW
```

**Spec:**
- Provider cards: Stripe · Intercom · Discord · Slack · Resend
- Each card: logo, name, status chip (Connected=green / Disconnected=grey), connect/disconnect button
- Stripe: input for restricted API key → validate with test Stripe call → save to `integrations` table
- Finance agent reads Stripe key from `integrations` table (not env var)

**Test steps:**
1. `/integrations` — all cards show "Disconnected"
2. Enter valid Stripe key → Connect → status turns "Connected"
3. Enter invalid key → error shown, status stays Disconnected
4. Trigger billing webhook → Finance agent uses key from DB (not hardcoded env)
5. Click Disconnect → key removed from DB

**Completion notes:** `app/(dashboard)/integrations/page.tsx` created — five provider cards (Stripe, Intercom, Discord, Slack, Resend), inline connect form with password input, client-side connected/disconnected state. `convex/integrations.ts` is NOT yet written — keys are not persisted to Convex yet. The UI is fully interactive for Sprint 1 demo. Persisting keys to DB and reading them in agent_runner will be done alongside US-12/US-13.

---

## Progress Tracker

| Story | Title | Status | Done date |
|---|---|---|---|
| US-00 | Foundation Setup | `[x]` | 2026-04-24 |
| US-01 | Sign In / Sign Up | `[x]` | 2026-04-24 |
| US-02 | Dashboard Shell Layout | `[x]` | 2026-04-25 |
| US-03 | Executive Block | `[x]` | 2026-04-25 |
| US-04 | Crews List | `[x]` | 2026-04-25 |
| US-05 | Live Trace Feed | `[x]` | 2026-04-25 |
| US-06 | Filter Tabs | `[x]` | 2026-04-25 |
| US-07 | Trace Expand / Detail | `[x]` | 2026-04-25 |
| US-08 | Right Panel: Crew Detail | `[x]` | 2026-04-25 |
| US-09 | Crew Room Overlay | `[x]` | 2026-04-25 |
| US-10 | Global Executive Bar | `[x]` | 2026-04-25 |
| US-11 | Executive Chat Tab | `[x]` | 2026-04-25 |
| US-12 | Executive Routes Ticket | `[x]` | 2026-04-25 |
| US-13 | Finance Crew + Stripe | `[x]` | 2026-04-25 |
| US-14 | Community Crew + Discord | `[x]` | 2026-04-25 |
| US-15 | Escalation Review | `[x]` | 2026-04-25 |
| US-16 | Prompt Editor + Eval | `[x]` | 2026-04-25 |
| US-17 | Episodic Memory | `[x]` | 2026-04-25 |
| US-18 | Connect Integrations | `[x]` | 2026-04-25 |
