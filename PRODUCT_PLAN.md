# Rule8 — Product Master Reference

> Single source of truth for business context, architecture, current state, and the full build roadmap.
> Last updated: 2026-05-01. Update this file whenever a step ships or the product direction changes.

---

## 1. What Rule8 Is

**Rule8 is a Multi-Agent OS for founders.** An "Executive" AI orchestrates specialist "Crew" agents that autonomously handle support tickets, billing queries, and community moderation on real surfaces — Intercom, Stripe, Discord — without the founder lifting a finger.

**Core proposition:** Delegate your ops layer to AI. Founder sees only what needs a human decision (escalations). Everything else is handled, traced, and auditable.

**Who it's for:** Indie hackers, solo founders, and small startups running a product with customers but no ops team.

**Why it was built:** GrowthX AI Weekender. Rubric weights: Real output (20×), Observability (7×), Eval pipeline (5×), Agent org (5×). Those weights shaped every product decision.

---

## 2. Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | Next.js 15 App Router | SSR auth gates, file-based routing |
| Backend/DB | Convex (`tough-dog-533`) | Real-time subscriptions, TypeScript schema, HTTP webhooks, scheduled actions |
| Auth | Better Auth (`@convex-dev/better-auth`) | HTTP-only cookies, Convex-integrated identity |
| Styling | Tailwind CSS v4 + CSS custom properties | Design tokens in `globals.css` (`--color-accent-orange`, etc.) |
| Components | shadcn/ui restyled with Rule8 tokens | Accessible base, easy to override |
| LLM | Anthropic `claude-sonnet-4-6` (primary) | Prompt caching on system prompt (`cache_control: ephemeral`) |
| Integrations | Stripe, Intercom, Discord | Planned: Slack, Resend, Notion, Zendesk |
| Deployment | Vercel + Convex cloud | Zero-config, serverless |

**Run `npx convex dev` after any schema or function change** to regenerate `convex/_generated/`.

**Auth fix note:** `convex/auth.ts` uses `protocol: isLocalHost ? "auto" : "https"` — NOT `NODE_ENV` (Convex always sets `NODE_ENV=production` even in dev, which broke localhost).

---

## 3. Route Map

```
/                              Public landing + waitlist form
/waitlist                      Early-access email capture
/sign-in  /sign-up             Better Auth flows
/onboarding/*                  4-step wizard (new users only — gated by workspace.onboardingComplete)
  /onboarding/industry         Step 1 — pick template
  /onboarding/crews            Step 2 — confirm/edit crews
  /onboarding/integrations     Step 3 — connect tools
  /onboarding/context          Step 4 — product description + escalation rules
/dashboard                     Main 3-panel command surface (overview)
/dashboard/escalations         Tasks flagged for human decision
/dashboard/integrations        Connect Stripe / Intercom / Discord / Resend / Slack
/dashboard/prompts             Edit agent prompts, view eval scores, version history
/dashboard/activity            Live trace timeline (LLM calls, tool runs, routing)
/dashboard/invoices            Finance crew tasks
/dashboard/tickets             Support + Community crew tasks
/dashboard/product-context     Founder knowledge base (product, policies, tone)
/dashboard/tasks/:id           Task detail page + full trace timeline
/dashboard/profile             Founder identity / session
/dashboard/settings            Preferences (notifications, compact mode, command suggestions)
/dashboard/evals               Eval scores per agent
```

---

## 4. File Map

| Concern | Path |
|---|---|
| Page shells | `app/(dashboard)/dashboard/*/page.tsx` |
| Dashboard components | `components/dashboard/*.tsx` |
| Layout (topbar, sidebar) | `components/layout/*.tsx` |
| Landing + waitlist | `components/landing/LandingPage.tsx`, `app/waitlist/` |
| Onboarding wizard | `components/onboarding/`, `app/(onboarding)/` |
| Convex functions | `convex/*.ts` |
| Agent runners | `convex/agent_runner/{billing,support,community,overseer}.ts` |
| Schema | `convex/schema.ts` |
| Auth config | `convex/auth.ts`, `lib/auth-server.ts`, `lib/auth-client.ts` |
| Routes table | `lib/routes.ts` |
| LLM client | `lib/anthropic.ts` |
| Tool executor | `lib/agents/tool-executor.ts` |
| Prompt builders | `lib/agents/prompts.ts` |
| Tool declarations | `lib/agents/tools.ts` |
| Workspace context hook | `lib/workspace-context.tsx` |
| Provider libraries | `lib/providers/{stripe,intercom,discord}.ts` |
| Industry templates | `lib/onboarding-templates.ts` |

---

## 5. Data Model

### Convex Tables

```
workspaces        ownerUserId, name, slug, plan (free|pro|scale), onboardingComplete
agents            chamberId, name, tag, crewTag (executive|finance|support|community),
                  status (idle|running|escalating|error), systemPrompt, promptVersion,
                  modelId, integrationIds, integrationNames, workflowCount, costLast24hCents
tasks             source (intercom|discord|manual), crewTag, status (pending|running|
                  resolved|escalated|failed), summary, escalationReason, resolution,
                  totalTokens, totalCostCents, externalId, retryCount, nextRetryAt, lastError
traces            taskId, agentId, stepType (llm_call|tool_call|tool_result|overseer_route|
                  escalation|resolution|error), action, status (ok|warn|error),
                  tokensIn, tokensOut, costCents, latencyMs, cacheHit, cacheTokens,
                  toolName, toolOutputPreview, model
chatMessages      workspaceId, role (founder|executive), text
productContext    workspaceId, key (product_description|pricing_tiers|refund_policy|
                  escalation_rules|agent_tone), value, category, updatedBy
integrations      workspaceId, provider, status (connected|disconnected|error|pending),
                  accessTokenRef, config
promptVersions    agentId, version, systemPrompt, changedBy, changeNote
evalCases         agentId, input, expectedOutput, tags
evalRuns          evalCaseId, agentId, output, passed, score
notifications     workspaceId, type (escalation|agent_failed|integration_error|task_resolved),
                  title, body, taskId, linkTo, read
userPreferences   userId, workspaceId, escalationNotifications, compactMode, commandSuggestions
waitlist          email, name, company, source
```

### Key indexes

- `tasks.by_workspace_and_crew_tag` — crew-scoped task pages (avoid full-table scan)
- `traces.by_workspace_and_created_at` — activity feed
- `traces.by_task` — task detail trace timeline
- `workspaces.by_owner` — workspace lookup from auth session
- `notifications.by_workspace_unread` — bell count
- `tasks.by_workspace_external_id` — idempotent webhook dedup (externalId)

---

## 6. Agent Architecture

### Org hierarchy

```
Overseer Executive  (crewTag: executive, tag: overseer, isCrewLead: true)
  ├── Finance Lead  (crewTag: finance, tag: billing, isCrewLead: true)
  │     └── Finance agents  — tools: stripe_lookup, stripe_refund
  ├── Support Lead  (crewTag: support, tag: support, isCrewLead: true)
  │     └── Support agents  — tools: intercom_reply
  └── Community Lead (crewTag: community, tag: community, isCrewLead: true)
        └── Community agents — tools: discord_reply, discord_dm
```

### Inbound task flow

```
External event (Intercom webhook / Discord event / manual submit)
  → convex/webhooks/*.ts      — creates task (status: pending, source: intercom|discord|manual)
  → overseer.routeTask        — LLM classifies to crew + confidence score
  → ctx.scheduler.runAfter    — schedules agent_runner/{billing|support|community}.ts
  → handleTask():
      1. fetch productContext rows → build system prompt with policies + tone
      2. loop up to MAX_TOOL_ROUNDS=5:
           runAgentModel → parse tool_use blocks → executeToolCall → feed result back
      3. on escalation trigger → tasks.update(status: escalated) + notifications.create
      4. on resolution → tasks.update(status: resolved, resolution: text) + outbound reply
      5. write trace rows for every LLM call and tool call
```

### Tool execution loop

```ts
for (round = 0; round < 5; round++) {
  result = await runAgentModel(systemPrompt, conversationHistory, tools, maxTokens)
  record trace (llm_call)
  if (result.stopReason === "end_turn" || result.toolCalls.length === 0) break
  for each toolCall:
    toolResult = await executeToolCall(toolCall.name, toolCall.input, integrationConfigs)
    record trace (tool_call + tool_result)
    conversationHistory.push({ role: "tool_result", content: toolResult })
}
```

### Available tools

| Tool key | Provider | Action |
|---|---|---|
| `stripe_lookup` | Stripe | Customer + subscription info by email |
| `stripe_refund` | Stripe | Create a refund for a charge |
| `intercom_reply` | Intercom | Reply to a conversation |
| `discord_reply` | Discord | Post a message to a channel |
| `discord_dm` | Discord | Send a DM to a user |

---

## 7. Memory Layers

| Layer | Table | LLM visibility |
|---|---|---|
| Chat thread | `chatMessages` | Last 12 turns injected as conversation history |
| Recent traces | `traces` | Last 12 steps injected as bullet list (post-STEP_06) |
| Product context | `productContext` | Injected into all system prompts (post-STEP_05) |
| Workspace stats | aggregated from `tasks`/`agents` | Injected as numbers (agentCount, tasksToday, costToday, escalated) |
| Page state | current pathname + visible data snapshot | Passed as `pageContext.snapshot` on each Executive send (post-STEP_06) |

**Current state (pre-STEP_05/06):** Executive only sees 4 aggregate numbers. ProductContext, traces, and page state are never injected. This is the single highest-leverage fix for AI quality.

---

## 8. Auth & Workspace Flow

```
1. Sign in → authClient.signIn.email() → Better Auth HTTP-only cookie
2. middleware.ts → injects x-pathname header
3. app/(dashboard)/layout.tsx:
     isAuthenticated() → redirect to /sign-in if false
     fetchMutation(api.workspaces.getOrCreate) → get or create workspace for this user
     if workspace.onboardingComplete === false → redirect to /onboarding
     WorkspaceProvider wraps children with workspaceId
4. Client components: const workspaceId = useWorkspaceId()
5. Convex queries: all pass workspaceId, enforce auth with ctx.auth.getUserIdentity()
```

---

## 9. Build Roadmap — 11 Steps

Steps are ordered. Each step file in `steps/` is fully self-contained (read it top to bottom, ship without reading other steps).
STEP_01 and STEP_02 are complete. STEP_03–11 are pending.

### Phase 1 — Foundation

| # | Step | Status | Summary |
|---|---|---|---|
| 01 | Codebase Cleanup | ✅ Done 2026-05-01 | Deleted dead component dirs (`center/`, `crew-room/`, `left-panel/`, `right-panel/`). Replaced `WORKSPACE_ID` constant with `WorkspaceContext` hook. |
| 02 | Workspaces & Auth | ✅ Done 2026-05-01 | Added `workspaces` table. Layout fetches/creates workspace from auth. All queries now enforce `ctx.auth.getUserIdentity()`. |
| 03 | Notifications & Prefs | ⬜ Pending | `notifications` table + bell icon in Topbar (escalation count badge, dropdown). `userPreferences` table wired to Settings page toggles. |

### Phase 2 — Agent Intelligence

| # | Step | Status | Summary |
|---|---|---|---|
| 04 | Product Context Editor | ⬜ Pending | `/dashboard/product-context` page — 5 editable fields: product description, pricing, refund policy, escalation rules, agent tone. Saves to `productContext` table. |
| 05 | Agent Intelligence | ⬜ Pending | Fetch productContext in every runner; inject into system prompts. Wire real tool executor loop (parse `tool_use`, dispatch to Stripe/Intercom/Discord, loop until `end_turn`). Agent status → running/idle during execution. |
| 06 | Executive Real Context | ⬜ Pending | `chat.send` accepts `pageContext` (current pathname + data snapshot). System prompt includes productContext + last 12 trace steps + page snapshot. Executive can dispatch tasks via `[DISPATCH: ...]` tag. |

### Phase 3 — UX Polish

| # | Step | Status | Summary |
|---|---|---|---|
| 07 | Task Detail & Trace Timeline | ⬜ Pending | `/dashboard/tasks/:id` — task meta strip, escalation reason, resolution, full trace timeline with step icons/colors/costs. Task rows on Escalations/Invoices/Tickets become clickable links. |
| 08 | UX Polish | ⬜ Pending | `EmptyState` component with CTA. Real-time Topbar health badge (escalation count). Activity page crew/status filter pills. Server-side `listByCrewTag` queries replacing client-side filtering. |

### Phase 4 — Integrations & Reliability

| # | Step | Status | Summary |
|---|---|---|---|
| 09 | Outbound Integrations | ⬜ Pending | Real `executeIntercomReply`, `executeDiscordReply`, `executeDiscordDm`. Replace Stripe mock. Connection test on save. `listConfigs` internal query passes credentials to tool executor. |
| 10 | Reliability | ⬜ Pending | Retry state machine: 3× exponential backoff (30s, 2m, 8m), transient vs permanent classification. Idempotent webhooks via `by_workspace_external_id` index. 15-min integration health cron → notifications on failure. |

### Phase 5 — Onboarding & Scale

| # | Step | Status | Summary |
|---|---|---|---|
| 11 | Onboarding Wizard | ⬜ Pending | 4-step wizard: industry picker → crew builder → integration connector → product context quick-fill. New user redirect gate in layout. `markOnboardingComplete` mutation. Industry templates in `lib/onboarding-templates.ts`. |

---

## 10. Three Ship Blockers (Priority Order)

### 1. Tool executor doesn't execute (STEP_05)
`lib/agents/tools.ts` declares `stripe_refund`, `intercom_reply`, `discord_reply`. Nothing parses or runs the tool blocks. Agent runners call `runAgentModel` exactly once and stop. **Without this, Rule8 is a dashboard, not an Agent OS.**

Fix: `lib/agents/tool-executor.ts` → registry of handlers per tool key. Agent runners loop until `stop_reason === "end_turn"`. Trace every tool call.

### 2. Executive has no real context (STEP_06)
`chat.send` builds a system prompt from 4 numbers only. ProductContext, page state, and recent traces are not injected. The "Page context" card in Executive panel is never sent to the LLM.

Fix: `chat.send` accepts `pageContext: { page, snapshot }`. Fetch productContext + last 12 traces in parallel. Inject all into system prompt.

### 3. No outbound replies (STEP_09)
Intercom/Discord events come in → tasks get created → agent "resolves" them → **nothing ever goes back out to the customer**. The tool executor in STEP_05 runs stubs. STEP_09 replaces the stubs with real API calls.

Fix: `lib/providers/intercom.ts`, `discord.ts`, updated `stripe.ts`. Wire configs from `integrations` table into tool executor.

---

## 11. Known Gaps Quick Reference

| Gap | Affects | Step |
|---|---|---|
| Tool executor is stubs | Every agent action | 05 |
| Executive AI is context-blind | Executive panel quality | 06 |
| ProductContext never injected | Agent prompt quality | 05 |
| Settings toggles do nothing | Settings page | 03 |
| No notification bell | Escalations go unnoticed | 03 |
| No task detail page | No drill-down into what happened | 07 |
| Activity has no filters | Can't find specific crew/error | 08 |
| Empty states look broken | First impressions for new users | 08 |
| Topbar health badge is hardcoded | Misleading "All crews healthy" | 08 |
| Client-side task filtering | Slow with 1k+ tasks | 08 |
| Stripe returns mocks | Finance crew is fake | 09 |
| No outbound Intercom/Discord | Customers never get replies | 09 |
| Webhooks not idempotent | Duplicate tasks on retry | 10 |
| One failure = permanent | No retry on transient errors | 10 |
| Empty dashboard on signup | New users don't know what to do | 11 |
| Crews are hardcoded enum | Can't add custom verticals | 11 → long-term |

---

## 12. Onboarding Wizard (STEP_11) Details

### 4-step flow

1. **Industry picker** — cards: SaaS/B2B, E-commerce/DTC, Agency, Community/Creator, Blank
2. **Crew builder** — pre-load template crews; allow rename / delete / add custom
3. **Integration connector** — show template's suggested integrations; skip available
4. **Quick context** — product description + escalation rules (2 key fields from productContext)

### Industry templates (from `lib/onboarding-templates.ts`)

| Template | Crews | Suggested integrations |
|---|---|---|
| SaaS/B2B (`saas-founder`) | Customer Support, Billing & Refunds, Onboarding | Intercom, Stripe, Resend |
| E-commerce (`ecommerce`) | Returns & Refunds, Customer Support, Reviews | Stripe, Resend |
| Agency (`agency`) | Client Communications, Project Billing | Stripe, Resend |
| Community (`community`) | Community Moderation, Member Support | Discord |
| Blank | User-defined | User-defined |

### Auth gate

`app/(dashboard)/layout.tsx` checks `workspace.onboardingComplete`. If false → redirect to `/onboarding`. Existing users skip wizard entirely.

---

## 13. Long-Term: Crews as Data

Crews are currently an enum (`finance | support | community | executive`). This locks all workspaces into one shape.

**Target architecture:** `crews` table — workspace data, not schema. Each workspace defines names, icons, prompts, and tool sets during onboarding. Agents/tasks/traces store `crewId: v.id("crews")` instead of the literal string.

**Migration plan:**
- Phase 1 (additive): Create `crews`, `tools`, `providerRegistry` tables. Write `crewId` alongside `crewTag`.
- Phase 2 (read new): UI and runners use `crewId`. New signups go through onboarding. Demo workspace backfilled.
- Phase 3 (drop legacy): Remove `crewTag` literal union. Delete `CREW_META` from `lib/constants.ts`.

**Future — Crew Marketplace:** Founders publish crew configs. Others clone in one click.

---

## 14. Pricing Tiers

| Plan | Price | Limits |
|---|---|---|
| Starter | $29/mo | 1 workspace, 500 tasks/mo, 3 integrations |
| Pro | $79/mo | 3 workspaces, 5,000 tasks/mo, unlimited integrations |
| Scale | $249/mo | Unlimited workspaces, tasks, priority support |

---

## 15. Definition of Done

A real-estate broker signs up → picks "Real Estate Brokerage" → confirms Leads / Showings / Closings crews → connects Resend + Twilio → enters product context → lands on a dashboard where:

- Sidebar shows their 3 crews (not Finance/Support/Community)
- Executive answers questions using actual workspace data
- A manual task routes to a crew, runs real tool calls, sends a real reply, traces every step
- Founder sees only escalations; everything else auto-resolved
- If Intercom/Discord/Stripe goes down, a notification appears in the bell

**That's the product. The steps above get there.**
