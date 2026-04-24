# Rule8 — Stack Setup & Sprint Plan

## Context

Rule8 is a Multi-Agent-as-a-Service platform for indie hackers. Founders connect Intercom, Stripe, and Discord once; a team of 4 AI agents (Overseer + Support + Billing + Community) handles all ops autonomously. The design system JSON (`rule8-design-system.json`) and a static landing page (`Rule8 Landing.html`) already exist. No application code exists yet.

**Goal of this plan:** Set up the project scaffold, lock the stack, and define what gets built first (Sprint 1) vs second (Sprint 2) based on rubric weights.

---

## Stack Decisions

| Layer | Choice | Reason |
|---|---|---|
| Frontend | **Next.js 15 App Router** | Server Components, streaming, Vercel-native |
| Database + backend | **Convex** | Real-time subscriptions (live trace panel for free), serverless HTTP actions (webhook ingestion), TypeScript-first schema |
| Auth | **Convex Auth** | Session data co-located with agent data; single-read-transaction access |
| Styling | **Tailwind CSS v4** | `@theme` block maps directly from design system JSON — no config file |
| Component primitives | **shadcn/ui** (restyled) | Radix UI accessibility (Dialog, Tabs, ScrollArea) skinned with Rule8 tokens |
| Icons | **Lucide React** | Matches landing page stroke style; tree-shakeable |
| Agent execution | **Anthropic SDK** (`@anthropic-ai/sdk`) | `claude-sonnet-4-6`, prompt caching on system prompt block |
| Deployment | **Vercel** | As specified in plan_rule8.md |

---

## Project Root

All code lives inside `/Users/tejas/Developer/GrowthX/Rule8/`. The existing `rule8-design-system.json` and `Rule8 Landing.html` stay at root.

---

## Directory Structure

```
Rule8/
├── rule8-design-system.json     ← existing, never imported at runtime
├── Rule8 Landing.html           ← existing, keep as reference
│
├── package.json
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
├── .env.local                   ← CONVEX_URL, ANTHROPIC_API_KEY, etc.
│
├── convex/
│   ├── schema.ts                ← ALL table definitions (critical, written first)
│   ├── auth.ts
│   ├── agents.ts                ← agent CRUD queries + mutations
│   ├── traces.ts                ← trace insert + listRecent reactive query
│   ├── tasks.ts                 ← task lifecycle
│   ├── evals.ts                 ← eval cases + run results
│   ├── integrations.ts
│   ├── productContext.ts
│   ├── promptVersions.ts
│   ├── http.ts                  ← HTTP router for webhooks
│   ├── webhooks/
│   │   ├── stripe.ts
│   │   ├── intercom.ts
│   │   └── discord.ts
│   └── agent_runner/
│       ├── overseer.ts
│       ├── support.ts
│       ├── billing.ts
│       └── community.ts
│
├── app/
│   ├── globals.css              ← @theme block with ALL design tokens (written second)
│   ├── layout.tsx               ← root: Inter + JetBrains Mono fonts
│   ├── (auth)/
│   │   ├── layout.tsx           ← centered card, bg-base, no sidebar
│   │   ├── sign-in/page.tsx
│   │   └── sign-up/page.tsx
│   └── (dashboard)/
│       ├── layout.tsx           ← 3-column grid: 220px | 1fr | 320px, ConvexProvider
│       ├── chamber/page.tsx     ← "The Chamber" — agent roster (Sprint 1)
│       ├── dashboard/page.tsx   ← Executive Dashboard (Sprint 1)
│       ├── activity/page.tsx    ← Full trace explorer
│       ├── evals/page.tsx       ← Eval suite
│       ├── prompts/page.tsx     ← Prompt editor + versioning
│       ├── agents/page.tsx      ← Agent management
│       ├── integrations/page.tsx
│       └── sandbox/page.tsx
│
├── components/
│   ├── ui/                      ← ejected shadcn primitives (button, dialog, tabs, scroll-area)
│   ├── layout/
│   │   ├── Sidebar.tsx          ← BLOCKING: 220px, logo + nav + 8 agent rows
│   │   ├── SidebarLogo.tsx
│   │   ├── SidebarNavItem.tsx
│   │   ├── SidebarAgentRow.tsx  ← status dot + name + id
│   │   ├── Topbar.tsx           ← 52px, page title + action slot
│   │   └── TracePanel.tsx       ← BLOCKING: 320px, real-time Convex subscription
│   ├── tokens/
│   │   ├── StatusTag.tsx        ← active/idle/critical/warning pill
│   │   ├── AgentTagChip.tsx     ← support/billing/community/overseer/system chip
│   │   ├── IntegrationChip.tsx  ← connected/disconnected badge
│   │   └── StatBox.tsx          ← label + value + delta
│   ├── chamber/
│   │   ├── AgentCard.tsx
│   │   ├── AgentGrid.tsx
│   │   └── StatsRow.tsx         ← 4-stat bar, 1px gap grid trick
│   ├── trace/
│   │   ├── TraceItem.tsx        ← collapsible, live state = gold left border
│   │   ├── TraceDetail.tsx      ← key/value rows
│   │   ├── TraceFilterTabs.tsx  ← all/support/billing/community tabs
│   │   └── LiveIndicator.tsx    ← pulsing green dot
│   └── evals/
│       ├── EvalTable.tsx
│       └── EvalRunBadge.tsx
│
├── hooks/
│   ├── useAgents.ts             ← useQuery(api.agents.list)
│   ├── useTraces.ts             ← useQuery(api.traces.listRecent) — reactive
│   ├── useDashboardStats.ts
│   └── useSelectedAgent.ts      ← URL search param ?agent=01
│
├── lib/
│   ├── utils.ts                 ← cn() with clsx + tailwind-merge (first utility written)
│   ├── convex.ts                ← ConvexReactClient singleton
│   ├── anthropic.ts             ← Anthropic client (server-only)
│   └── agents/
│       ├── types.ts
│       ├── prompts.ts           ← system prompt builders per agent type
│       └── tools.ts             ← tool definitions for Claude tool_use
│
└── scripts/
    └── seed-agents.ts           ← populates 8 agents from design system JSON
```

---

## Convex Schema (convex/schema.ts)

```typescript
agents: defineTable({
  chamberId: v.string(),          // "01"–"08"
  name: v.string(),
  tag: v.union(v.literal("support"), v.literal("billing"), v.literal("community"),
               v.literal("outreach"), v.literal("overseer"), v.literal("system")),
  description: v.string(),
  status: v.union(v.literal("active"), v.literal("idle"), v.literal("critical"), v.literal("paused")),
  isEnabled: v.boolean(),
  systemPrompt: v.string(),
  promptVersion: v.number(),
  promptUpdatedAt: v.number(),
  modelId: v.string(),
  integrationIds: v.array(v.id("integrations")),
  actionsLast24h: v.number(),     // denormalized for fast dashboard
  costLast24hCents: v.number(),
  lastActiveAt: v.optional(v.number()),
  userId: v.id("users"),
  workspaceId: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_workspace", ["workspaceId"])
  .index("by_chamber_id", ["chamberId"])

tasks: defineTable({
  source: v.union(v.literal("intercom"), v.literal("crisp"), v.literal("stripe"),
                  v.literal("discord"), v.literal("slack"), v.literal("manual")),
  externalId: v.optional(v.string()),
  rawPayload: v.string(),
  assignedAgentId: v.optional(v.id("agents")),
  routedByOverseer: v.boolean(),
  overseerReasoning: v.optional(v.string()),
  status: v.union(v.literal("pending"), v.literal("running"), v.literal("resolved"),
                  v.literal("escalated"), v.literal("failed")),
  resolution: v.optional(v.string()),
  escalationReason: v.optional(v.string()),
  totalTokensIn: v.number(),
  totalTokensOut: v.number(),
  totalCostCents: v.number(),
  latencyMs: v.optional(v.number()),
  workspaceId: v.string(),
  createdAt: v.number(),
  completedAt: v.optional(v.number()),
})
  .index("by_workspace_status", ["workspaceId", "status"])
  .index("by_workspace_created", ["workspaceId", "createdAt"])

traces: defineTable({
  taskId: v.optional(v.id("tasks")),
  agentId: v.id("agents"),
  agentTag: v.string(),           // denormalized for filter queries
  action: v.string(),             // "Classified ticket #8821 as billing"
  stepType: v.union(v.literal("llm_call"), v.literal("tool_call"), v.literal("tool_result"),
                    v.literal("escalation"), v.literal("resolution"), v.literal("overseer_route"), v.literal("error")),
  toolName: v.optional(v.string()),
  toolInput: v.optional(v.string()),
  toolOutput: v.optional(v.string()),
  promptSnippet: v.optional(v.string()),
  responseSnippet: v.optional(v.string()),
  tokensIn: v.number(),
  tokensOut: v.number(),
  costCents: v.number(),
  latencyMs: v.number(),
  status: v.union(v.literal("ok"), v.literal("warn"), v.literal("error")),
  errorMessage: v.optional(v.string()),
  cacheHit: v.boolean(),
  cacheTokens: v.number(),
  workspaceId: v.string(),
  createdAt: v.number(),
})
  .index("by_workspace_created", ["workspaceId", "createdAt"])
  .index("by_agent_tag", ["agentTag"])
  .index("by_task", ["taskId"])

evalCases: defineTable({
  agentId: v.id("agents"),
  name: v.string(),
  inputPayload: v.string(),
  expectedOutcome: v.string(),
  grader: v.union(v.literal("llm_judge"), v.literal("exact_match"), v.literal("contains"), v.literal("regex")),
  graderConfig: v.optional(v.string()),
  passingThreshold: v.number(),
  workspaceId: v.string(),
  createdAt: v.number(),
})

evalRuns: defineTable({
  evalCaseId: v.id("evalCases"),
  agentId: v.id("agents"),
  promptVersion: v.number(),
  status: v.union(v.literal("running"), v.literal("pass"), v.literal("fail"), v.literal("error")),
  score: v.optional(v.number()),
  actualOutput: v.optional(v.string()),
  graderReasoning: v.optional(v.string()),
  tokensIn: v.number(),
  tokensOut: v.number(),
  costCents: v.number(),
  triggeredBy: v.union(v.literal("manual"), v.literal("ci"), v.literal("prompt_save")),
  workspaceId: v.string(),
  createdAt: v.number(),
  completedAt: v.optional(v.number()),
})
  .index("by_agent_created", ["agentId", "createdAt"])

productContext: defineTable({
  workspaceId: v.string(),
  key: v.string(),
  value: v.string(),
  category: v.union(v.literal("product"), v.literal("billing"), v.literal("support"),
                    v.literal("community"), v.literal("legal")),
  updatedAt: v.number(),
  updatedByUserId: v.id("users"),
})
  .index("by_workspace", ["workspaceId"])

integrations: defineTable({
  workspaceId: v.string(),
  provider: v.union(v.literal("intercom"), v.literal("crisp"), v.literal("stripe"),
                    v.literal("discord"), v.literal("slack"), v.literal("github"),
                    v.literal("notion"), v.literal("resend")),
  status: v.union(v.literal("connected"), v.literal("disconnected"), v.literal("error"), v.literal("pending")),
  webhookSecret: v.optional(v.string()),
  accessTokenRef: v.optional(v.string()),
  config: v.optional(v.string()),
  connectedAt: v.optional(v.number()),
  lastWebhookAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_workspace_provider", ["workspaceId", "provider"])

promptVersions: defineTable({
  agentId: v.id("agents"),
  version: v.number(),
  systemPrompt: v.string(),
  changedBy: v.id("users"),
  changeNote: v.optional(v.string()),
  evalPassRate: v.optional(v.number()),
  workspaceId: v.string(),
  createdAt: v.number(),
})
  .index("by_agent_version", ["agentId", "version"])
```

---

## Design Token Bridge (app/globals.css)

The `@theme` block maps every token from `rule8-design-system.json` to Tailwind v4 CSS variables. Written once from the JSON, never imported at runtime.

```css
@import "tailwindcss";

@theme {
  --color-bg-base: #0C0C0E;
  --color-bg-s1:   #111114;
  --color-bg-s2:   #16161A;
  --color-bg-s3:   #1C1C21;

  --color-border-sub:   rgba(255,255,255,0.06);
  --color-border-def:   rgba(255,255,255,0.10);
  --color-border-str:   rgba(255,255,255,0.16);
  --color-border-focus: rgba(200,151,42,0.40);

  --color-text-pri: #F0F0F2;
  --color-text-sec: #9898A6;
  --color-text-ter: #5A5A6A;
  --color-text-acc: #C8972A;

  --color-gold:     #C8972A;
  --color-gold-lt:  #E3B040;
  --color-gold-a08: rgba(200,151,42,0.08);
  --color-gold-a12: rgba(200,151,42,0.12);
  --color-gold-a16: rgba(200,151,42,0.16);
  --color-gold-a20: rgba(200,151,42,0.20);

  --color-green:     #22C55E;
  --color-green-a10: rgba(22,163,74,0.10);
  --color-green-a20: rgba(34,197,94,0.20);
  --color-red:       #EF4444;
  --color-red-a10:   rgba(185,28,28,0.10);
  --color-amber:     #F59E0B;
  --color-blue:      #60A5FA;
  --color-blue-a10:  rgba(59,130,246,0.10);
  --color-purple:    #A78BFA;
  --color-purple-a10:rgba(139,92,246,0.10);
  --color-teal:      #34D399;
  --color-teal-a10:  rgba(16,185,129,0.10);

  --radius-sm:   3px;
  --radius-md:   6px;
  --radius-lg:   8px;
  --radius-xl:   12px;
  --radius-pill: 9999px;

  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;

  --sidebar-width:      220px;
  --topbar-height:      52px;
  --trace-panel-width:  320px;
}

@keyframes pulse-live {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.3; }
}
.animate-pulse-live { animation: pulse-live 2.5s ease-in-out infinite; }
```

---

## Sprint 1 — Foundation + Observability UI (Covers 7x rubric weight)

**Goal:** Functional real-time dashboard shell with live trace panel. All pages render from Convex data. No actual agent execution yet — but the infrastructure is ready to receive traces the moment agents are wired up in Sprint 2.

### Build Order (strict — each step unblocks the next)

1. **`lib/utils.ts`** — `cn()` with clsx + tailwind-merge. First file. Every component depends on it.
2. **`convex/schema.ts`** — All table definitions. Run `npx convex dev` to generate typed client. Blocks all hooks.
3. **`app/globals.css`** — `@theme` block. Blocks all styling.
4. **`app/layout.tsx`** — Root layout with `next/font` for Inter + JetBrains Mono.
5. **`convex/auth.ts` + auth pages** — Sign in/up with Convex Auth.
6. **`scripts/seed-agents.ts`** — Seeds 8 agents from design system JSON into Convex. Run once.
7. **Token components** — `StatusTag`, `AgentTagChip`, `StatBox`, `Button` (exact spec from design JSON).
8. **`Sidebar.tsx` + `SidebarAgentRow.tsx`** — Blocking for dashboard layout. Reads agents from `useQuery(api.agents.list)`.
9. **`Topbar.tsx`** — 52px bar, page title from pathname, action slot.
10. **`app/(dashboard)/layout.tsx`** — 3-column CSS grid shell: `grid-cols-[220px_1fr_320px]`. ConvexProvider here.
11. **`TracePanel.tsx`** — Real-time via `useQuery(api.traces.listRecent)`. Add a "Inject Demo Trace" button that calls `insertDemo` mutation so live updates are demonstrable without agents.
12. **`StatsRow.tsx` + `AgentCard.tsx` + `AgentGrid.tsx`** — The Chamber page (`/chamber`).
13. **Executive Dashboard** (`/dashboard`) — Aggregated stats + activity feed from tasks table.
14. **Auth middleware** — `middleware.ts` redirects unauthenticated users to `/sign-in`.
15. **Vercel deploy** — Configure `CONVEX_URL`, `CONVEX_DEPLOY_KEY`, `ANTHROPIC_API_KEY` env vars.

### Sprint 1 Explicitly Excludes
- Claude API calls
- Webhook receivers
- Real Stripe/Intercom/Discord connections
- Eval pipeline execution
- Prompt editor save functionality

---

## Sprint 2 — Agent Execution + Integrations (Covers 20x + 5x rubric weight)

**Priority order:**

1. **Overseer action** (`convex/agent_runner/overseer.ts`) — Convex action, calls Claude with `route_to_agent` tool_use. Writes task row + first trace row.
2. **Specialist actions** — support.ts / billing.ts / community.ts — each with their tool definitions and trace writing.
3. **Webhook HTTP actions** — `convex/http.ts` registers Stripe + Intercom + Discord routes. Each validates signature, creates task, triggers Overseer.
4. **Prompt editor + eval-on-save** — `/prompts` page, save triggers `promptVersions` insert + eval replay via Convex scheduled function.
5. **GitHub Actions eval CI** — `.github/workflows/eval.yml` calls Convex HTTP action to run evals, fails on score drop > 5%.
6. **Integration connection UI** — `/integrations` page, provider cards with connected/disconnected chips.
7. **Episodic memory** — agents query their own recent `traces` before responding to a user.
8. **Testing sandbox** — `/sandbox` page to manually trigger agent runs with custom payloads.

---

## Key Architectural Decisions

**TracePanel lives in the dashboard layout, not individual pages.** Persists across route changes — navigating from `/chamber` to `/dashboard` doesn't remount the trace panel or interrupt the live feed.

**Selected agent is URL state (`?agent=01`).** Bookmarkable, no global state manager needed.

**`rule8-design-system.json` is never imported at runtime.** It is a design source of truth that is translated once to CSS variables. Import it only in the seed script.

**Prompt caching on system prompts.** Every Claude API call sets `cache_control: { type: "ephemeral" }` on the system prompt block. The system prompt is the most expensive re-read (800–1,200 tokens per agent call) and this cuts it to ~zero after the first invocation within the 5-minute TTL window.

**Convex costs are stored as cents (integer).** Avoids floating-point representation issues. Display layer converts: `formatCost(cents: number) => "$" + (cents / 100).toFixed(4)`.

---

## Verification (end-to-end test for Sprint 1)

1. `npx convex dev` — schema deploys, no TypeScript errors in generated files
2. `npx next dev` — dashboard loads at `localhost:3000`, redirects to `/sign-in` if unauthenticated
3. Sign up → lands on `/chamber` — 8 agent cards visible with correct names, tags, and status indicators from Convex
4. Sidebar — 8 agent rows with colored dots; active nav item highlighted in `bg-s2`
5. Click "Inject Demo Trace" in TracePanel — new trace item appears at top within <200ms, live gold border visible
6. Filter tabs in TracePanel — switching to "billing" shows only billing-tagged traces
7. Navigate `/dashboard` — stats row shows live counts from tasks table; sidebar persists; trace panel persists
