# Rule8 — Issues Tracker

> Status: `open` | `in-progress` | `done`
> Priority: `P0` blocker · `P1` high · `P2` medium · `P3` future
> Last audited: 2026-05-02

---

## Agent Orchestration

### AGO-01 · P0 · done
**`runAgentModel` dropped tool_use blocks**
Fixed. `lib/anthropic.ts` parses Anthropic `tool_use` blocks and NVIDIA `tool_calls`. Returns `toolCalls[]` + `stopReason`.

### AGO-02 · P1 · open
**Tool loop uses string concat — not proper Anthropic multi-turn messages format**
`lib/agents/tool-loop.ts:49` — `conversationHistory: string[]` joined with `"\n\n"` as `userPrompt`. Tool results appended as plain text strings. Anthropic's API requires proper message objects: `{ role: "assistant", content: [tool_use block] }` followed by `{ role: "user", content: [{ type: "tool_result", tool_use_id, content }] }`. Without this, the model cannot associate tool call IDs with their results, breaking complex multi-step chains silently.
Fix: Change `conversationHistory` to `AnthropicMessage[]`. Track `rawContent` from each assistant turn. Feed structured `tool_result` blocks back in `{ role: "user" }` messages. Update `runAgentModel` signature to accept `messages: AnthropicMessage[]` instead of `userPrompt: string`.
Files: `lib/anthropic.ts`, `lib/agents/tool-loop.ts`

### AGO-03 · P0 · done
**No tool executor**
Fixed. `lib/agents/tool-executor.ts` — `EXECUTORS` registry for `stripe_lookup`, `stripe_refund`, `intercom_reply`, `discord_reply`, `discord_dm`.

### AGO-04 · P0 · done
**No agentic loop — single LLM call only**
Fixed. `lib/agents/tool-loop.ts` → `runAgenticToolLoop`, max 5 rounds, traces every step. Used by `support.ts` and `community.ts`.

### AGO-05 · P1 · done
**productContext never injected into prompts**
Fixed. All prompt builders accept `productDescription`, `refundPolicy`, `escalationRules`, `agentTone`. `support.ts` and `community.ts` fetch and inject. `billing.ts` partial — see AGO-11.

### AGO-06 · P1 · done
**Episodic memory only in billing runner**
Fixed. `support.ts:62-104` and `community.ts:101-143` both fetch prior tasks by `userEmail` and build episodic context. Traces `memory_lookup` step.

### AGO-07 · P1 · done
**Overseer routing had no product context**
Fixed. `convex/agent_runner/overseer.ts` fetches `productContext.listAllInternal`, passes `productDescription` and `escalationRules` to `buildOverseerSystemPrompt`.

### AGO-08 · P1 · done
**Agent status never changed during execution**
Fixed. `convex/agents.ts` → `setStatus` internalMutation. `support.ts` and `community.ts` set `running` at start, `idle` in `finally`. `billing.ts` missing — see AGO-11.

### AGO-09 · P2 · open
**NVIDIA tool_calls support unverified end-to-end**
`lib/anthropic.ts` parses NVIDIA `tool_calls` format. Default model (`qwen/qwen3.5-122b-a10b`) may not support function calling — if it doesn't, the model will hallucinate tool calls in free text and the loop will exit without executing them.
Fix: Test with a NVIDIA model that explicitly supports function calling, or gate tools on provider — skip `tools` arg entirely for NVIDIA and log a warning.
Files: `lib/anthropic.ts`

### AGO-10 · P1 · done
**No retry on transient LLM failures**
Fixed. `convex/tasks.ts` → `scheduleRetry` with exponential backoff (30s / 2m / 8m). `support.ts` and `community.ts` classify transient vs permanent errors, schedule retries via `ctx.scheduler.runAfter`. Permanent failures trigger `notifications.create`.

### AGO-11 · P1 · open
**`billing.ts` not on shared tool loop — imperative, no retry, no status tracking**
`convex/agent_runner/billing.ts` hardcodes: Stripe lookup → policy check → Stripe refund → single `runAgentModel` call. Does not use `runAgenticToolLoop`, does not call `agents.setStatus`, has no retry logic. Finance tasks bypass the entire tool executor and loop architecture.
Fix: Refactor `billing.ts` to mirror `support.ts` — use `runAgenticToolLoop` with `FINANCE_TOOLS`, let the model call `stripe_lookup` / `stripe_refund` / `intercom_reply` as tool calls, wire status + retry in `try/finally`.
Files: `convex/agent_runner/billing.ts`

### AGO-12 · P2 · open
**productContext + episodic memory fetched identically in every runner — no shared helper**
All three runners (`billing.ts`, `support.ts`, `community.ts`) independently query `productContext.listAllInternal`, build a `contextMap`, query `tasks.getRecentByUserEmail` for episodic context, and format the string. 3× code duplication. Any change to how context is assembled must be made in three places.
Fix: `lib/agents/context.ts` — `buildContextEnvelope(workspaceId, userEmail, ctx)` returns a structured `ContextEnvelope` object. `formatContextForPrompt(envelope)` returns the string to inject. Each runner calls this once.
Files: `lib/agents/context.ts` (new), `convex/agent_runner/billing.ts`, `support.ts`, `community.ts`

---

## Integrations

### INT-01 · P0 · open
**Provider is a hardcoded literal union — adding any provider touches 4 files**
`convex/schema.ts:264-274` — `provider: v.union(v.literal("intercom"), v.literal("crisp"), ...)` 9 hardcoded values. `convex/integrations.ts` mirrors it. `integrations/page.tsx` has a separate `PROVIDERS` array. Adding Razorpay requires edits to all plus a new webhook handler. Completely unscalable.
Fix: `provider: v.string()` in schema. New `providerRegistry` table seeded at deploy. `lib/integrations/registry.ts` as the single source of truth for all provider metadata.
Files: `convex/schema.ts`, `convex/integrations.ts`, `lib/integrations/registry.ts` (new), `integrations/page.tsx`

### INT-02 · P1 · open
**Single `accessTokenRef` field — multi-field credentials impossible**
`convex/schema.ts:282` — `accessTokenRef: v.optional(v.string())`. Razorpay needs API Key ID + API Key Secret + Webhook Secret (3 fields). Cashfree needs App ID + Secret Key. Structurally cannot store multi-field credentials without schema change.
Fix: Replace `accessTokenRef` with `credentialsJson: v.optional(v.string())` — stores JSON object of named fields `{ keyId, keySecret, webhookSecret }`. Each adapter declares `credentialFields: CredentialField[]` so the UI knows what to render.
Files: `convex/schema.ts`, `convex/integrations.ts`, `lib/integrations/types.ts` (new)

### INT-03 · P0 · open
**No Indian payment infrastructure — UPI, Razorpay, Cashfree all absent**
Indian SaaS founders (core Rule8 target) cannot connect payment infrastructure. Razorpay is the dominant provider. UPI differs fundamentally from Stripe: VPA (virtual payment address) instead of email, phone as primary identity, paise denomination, instant T+1 settlement, mandate-based recurring (NACH), and distinct refund timelines.
Key events to handle: `payment.captured` (with `method: "upi"`, `upi.vpa`), `payment.failed`, `refund.processed`, `subscription.charged`, `subscription.halted`, `mandate.confirmed`, `mandate.halted`.
UPI-specific task fields needed: `upiVpa`, `paymentMethod`, `currency`, `amountPaise`.
Fix: `lib/integrations/adapters/razorpay.ts` — `ProviderAdapter` implementation with HMAC-SHA256 webhook verification, event normalizer, `razorpay_refund` + `razorpay_lookup` + `razorpay_payment_link` outbound actions. Then `cashfree.ts`.
Files: `lib/integrations/adapters/razorpay.ts` (new), `lib/integrations/adapters/cashfree.ts` (new), `convex/schema.ts` (add UPI fields to tasks)

### INT-04 · P1 · open
**No shared webhook normalization — every handler is its own snowflake**
`convex/webhooks/intercom.ts` and `discord.ts` parse different payload formats, produce tasks differently, have no shared event schema. Adding provider N means handler N from scratch.
Fix: `ExternalEvent` type in `lib/integrations/types.ts` — common normalized schema (source, eventType, category, userEmail, userId, amount, currency, paymentMethod, upiVpa, externalId, summary, rawPayload). Each adapter implements `normalizeEvent(rawPayload, eventType) → ExternalEvent | null`. Universal webhook handler in `convex/http.ts` routes to adapter, produces ExternalEvent, calls `tasks.createFromExternalEvent`.
Files: `lib/integrations/types.ts` (new), `convex/http.ts`, `convex/tasks.ts`

### INT-05 · P0 · open
**Webhooks hardcode `DEMO_WORKSPACE_ID` — all inbound events route to one workspace**
Confirmed: `intercom.ts:87,91,95,106` and `discord.ts:109,113,117,127,143` all use `DEMO_WORKSPACE_ID`. A second customer's Intercom tickets land in the demo workspace. Multi-tenant inbound is completely broken.
Fix: `webhookToken: v.optional(v.string())` on `integrations` table, generated with `nanoid(21)` on connect. Webhook URL becomes `/api/webhooks/{providerKey}/{webhookToken}`. New index `by_webhook_token` for O(1) workspace lookup. Universal handler resolves workspace from token. `DEMO_WORKSPACE_ID` import deleted from webhook files.
Files: `convex/schema.ts`, `convex/integrations.ts`, `convex/http.ts`, `convex/webhooks/intercom.ts`, `convex/webhooks/discord.ts`

### INT-06 · P1 · open
**Idempotency index exists but webhook handlers don't use it — duplicate tasks likely**
`convex/schema.ts:152` has `by_workspace_external_id` index on tasks. Neither `convex/webhooks/intercom.ts` nor `discord.ts` checks for an existing task by `externalId` before inserting. Intercom/Discord both retry delivery on no-200 response — a slow Convex handler creates duplicate tasks.
Fix: At the top of each webhook handler (and in the planned universal handler), query `by_workspace_external_id` for the inbound event ID. Return `200 OK` immediately if task already exists.
Files: `convex/webhooks/intercom.ts`, `convex/webhooks/discord.ts`

### INT-07 · P0 · done
**No outbound replies — customers never got responses**
Fixed. `lib/providers/intercom.ts` → `executeIntercomReply` (real POST to Intercom API). `lib/providers/discord.ts` → `executeDiscordReply` + `executeDiscordDm`. Wired through tool executor. `support.ts` and `community.ts` call fallback reply if model didn't call the tool itself.

### INT-08 · P2 · open
**Credentials stored as plaintext in Convex DB**
`accessTokenRef` stores Stripe secret keys, bot tokens, Razorpay secrets as plain strings. DB read access = complete credential exposure. Not acceptable before public launch.
Fix: Short-term — encrypt `credentialsJson` before insert using `crypto.subtle.encrypt` with a key stored as a Convex environment variable. Long-term — dedicated secrets vault (e.g. AWS Secrets Manager, Infisical).
Files: `convex/integrations.ts`

### INT-09 · P2 · open
**No connection test on credential save — wrong keys show as "Connected"**
The 15-min health cron catches bad keys eventually but founders get no instant feedback. Pasting a wrong Razorpay key shows "Connected" immediately.
Fix: In `integrations/page.tsx` save handler, after `upsertConnection`, call a new `api.integrations.testConnection` action. On error, update status to `"error"` and show the error message inline in the card.
Files: `app/(dashboard)/dashboard/integrations/page.tsx`, `convex/integrations.ts`

### INT-10 · P2 · done
**No integration health cron**
Fixed. `convex/crons.ts` — 15-min `"integration-health-check"` via `internal.integrations.healthCheck`. Tests all connected integrations, sets `status: "error"`, creates `integration_error` notification on failure.

### INT-11 · P3 · open
**Provider count is a hard ceiling — no custom connectors**
Founders on tools outside the supported list (Typeform, their own APIs) have no path. Every integration requires a code deploy.
Fix: (1) Custom Webhook Receiver — Rule8 generates a unique URL, founder maps payload fields to ExternalEvent fields. (2) REST Polling Connector — founder provides base URL + auth + JSON path, Rule8 polls via cron. Both produce ExternalEvents and route through the standard task pipeline.
Files: New `convex/webhooks/custom.ts`, `components/dashboard/CustomConnectorForm.tsx`

### INT-12 · P3 · open
**No OAuth — only API key paste**
Stripe, Intercom, Discord, Razorpay all support OAuth. API key paste is error-prone (wrong scope, wrong key type) and gives inferior UX vs "Click to connect".
Fix: OAuth callback route per provider. Deprioritized — API key paste is sufficient for MVP.

### INT-13 · P1 · open
**`ProviderAdapter` interface and `ExternalEvent` type not implemented — planned architecture is only a plan**
The integration adapter architecture discussed (ProviderAdapter interface, ExternalEvent schema, adapter registry, credential field declarations) does not exist in the codebase yet. `lib/integrations/` directory is absent. All INT-01 through INT-05 fixes depend on this foundation being laid first.
Fix: Create `lib/integrations/types.ts` with `ProviderAdapter`, `ExternalEvent`, `CredentialField`, `ActionManifest`, `IntegrationCredentials`, `ConnectionTestResult` types. Create `lib/integrations/registry.ts` with `ADAPTER_REGISTRY` and `getAdapter()`. Migrate existing Stripe, Intercom, Discord providers to adapter format before adding new ones.
Files: `lib/integrations/types.ts` (new), `lib/integrations/registry.ts` (new), `lib/integrations/adapters/stripe.ts` (new), `lib/integrations/adapters/intercom.ts` (new), `lib/integrations/adapters/discord.ts` (new)

---

## Executive AI

### EXE-01 · P0 · done
**Executive saw only 4 aggregate numbers**
Fixed. `convex/chat.ts` fetches productContext rows, recent traces, page context in parallel. `buildExecutiveChatPrompt` injects all of them.

### EXE-02 · P1 · done
**Page context card never reached the LLM**
Fixed. `convex/chat.ts` accepts `pageContext: { page, snapshot }`. Injected into `buildExecutiveChatPrompt` as `currentPage` and `pageSnapshot`.

### EXE-03 · P2 · open
**Executive chat has no thread summarization — context degrades past 12 messages**
`chat.ts` uses last 12 messages as context. Beyond that, history is invisible to the model. No summarization or compression exists.
Fix: Long-term — periodic background summarization of older messages into a single context block stored separately. Short-term acceptable — 12-message window is fine for early usage.
Files: `convex/chat.ts`

### EXE-04 · P2 · open
**Executive dispatch (`[DISPATCH: ...]`) only creates manual tasks — no crew pre-assignment**
`convex/chat.ts:147-152` detects `[DISPATCH: ...]` tag and calls `tasks.submitManualTask`. The task goes through the overseer routing flow. But the Executive already has context about which crew is relevant — the dispatch could pre-assign the crew, skipping overseer latency.
Fix: Extend `[DISPATCH: ...]` tag to `[DISPATCH:community: ...]` or pass a suggested `crewTag` from the Executive to `submitManualTask`. If the suggested crew lead exists, skip overseer routing.
Files: `convex/chat.ts`, `convex/tasks.ts`

---

## Multi-tenancy

### MT-01 · done
**`WORKSPACE_ID` hardcoded**
Fixed in STEP_01 + STEP_02. `WorkspaceContext` replaces the constant. Dashboard layout derives workspace ID from auth session.

### MT-02 · P0 · open
**Webhook handlers use `DEMO_WORKSPACE_ID` — multi-tenant inbound broken**
Confirmed. `intercom.ts` and `discord.ts` import and use `DEMO_WORKSPACE_ID` at 5+ call sites each. All inbound webhooks from all customers route to one workspace. This is the same root cause as INT-05.
Fix: Same fix as INT-05 — per-workspace webhook tokens resolve this entirely.
Files: `convex/webhooks/intercom.ts`, `convex/webhooks/discord.ts` (deleted when universal handler ships)

### MT-03 · P2 · open
**No plan/quota enforcement — all workspaces are effectively unlimited**
`workspaces.plan` field exists but nothing reads it. Free workspaces can run unlimited tasks, agents, and integrations.
Fix: `convex/quotas.ts` — `checkTaskQuota(workspaceId, plan)` and `checkAgentQuota(workspaceId, plan)`. Call before task creation and agent creation. Return a `notifications.create` when quota is hit rather than a hard error.
Files: `convex/quotas.ts` (new), `convex/tasks.ts`, `convex/agents.ts`

---

## UX / Dashboard

### UX-01 · P1 · done
**No task detail page**
Fixed. `app/(dashboard)/dashboard/tasks/[id]/page.tsx` — full trace timeline, escalation reason, resolution, approve/dismiss actions.

### UX-02 · P1 · done
**Topbar health badge always hardcoded "All crews healthy"**
Fixed. `WorkspaceHealthBadge` in `Topbar.tsx` — reactive, queries `tasks.getStats` and `notifications.unreadCount`. Shows escalation count or notification state when issues exist.

### UX-03 · P1 · done
**Empty states looked broken**
Fixed. `components/dashboard/EmptyState.tsx` — icon, title, description, CTA. Wired in DataPages for Activity, Invoices, Tickets, Evals.

### UX-04 · P1 · done
**Settings toggles persisted nothing**
Fixed. `AccountPages.tsx` wired to `api.userPreferences.get` and `api.userPreferences.update`. `convex/userPreferences.ts` complete.

### UX-05 · P1 · done
**No notification system — escalations were silent**
Fixed. `NotificationBell` in Topbar with live unread count badge. `convex/notifications.ts` complete. Escalations and permanent failures write notification rows.

### UX-06 · P2 · done
**Activity page had no filters**
Fixed. `DataPages.tsx` — crew and status filter pills with `useSearchParams`. URL-persisted (`?crew=finance&status=error`), bookmarkable.

### UX-07 · P2 · done
**No Product Context editor**
Fixed. `/dashboard/product-context` — 5 editable fields, each saved independently via `api.productContext.upsert`.

### UX-08 · P2 · open
**Prompt editor saves but never triggers eval runs — pass-rate is stale**
`convex/evals.ts` is read-only. No function executes eval cases. The UI implies "save → test → ship" but evals are never actually run against the new prompt.
Fix: `convex/evals.ts` → `runEvals(agentId, promptVersion)` action — fetches eval cases, calls `runAgentModel` per case, grades output per `grader` type (`llm_judge`, `exact_match`, `contains`, `regex`), writes `evalRuns` rows with `triggeredBy: "prompt_save"`.
Files: `convex/evals.ts`, `components/dashboard/DataPages.tsx` (trigger on save)

### UX-09 · P2 · done
**Onboarding wizard end-to-end flow**
Fixed (STEP_11). Executive-assisted hybrid onboarding: chat (3 questions → LLM synthesises crew config via `synthesizeOnboardingConfig`) → review (founder edits crews) → connect (integration key) → run (live task + reactive trace feed) → done (`markOnboardingComplete`). Gate in dashboard layout redirects new users. All routes, components, and Convex functions wired. `npx tsc --noEmit` passes.

### UX-10 · P2 · open
**No UI showing webhook URL to copy — founders can't configure provider webhooks**
When a Razorpay or Intercom integration is connected, the founder needs the workspace-specific webhook URL to paste into the provider's dashboard. No UI exists for this. Without it, inbound events never arrive regardless of credentials being correct.
Fix: After INT-05 lands (webhook tokens), show the generated webhook URL in the integration card with a copy button. Include setup instructions per provider (which Intercom/Razorpay dashboard settings to configure).
Files: `app/(dashboard)/dashboard/integrations/page.tsx`

### UX-11 · P2 · done
**No value / ROI visibility — founder doesn't feel the product working**
Fixed (STEP_12). `components/dashboard/ROIWidget.tsx` renders in `CommandPanel` — tasks handled, estimated time saved, agent cost today, ROI multiplier. Weekly Executive digest creates a chat message + notification every Monday. Signal clustering runs every 12 hours. Anomaly detection every 30 minutes.

### UX-12 · P2 · done
**Executive shown in Prompts page agent selector — it is not configurable by founder**
Fixed (STEP_12). `AgentKey = "support" | "billing" | "community"` — executive is absent from `AGENTS_META` and the tab selector. Executive's system prompt is a Rule8 engineering decision.

---

## Schema / Backend

### SCH-01 · P1 · open
**Crews are a hardcoded enum — no new verticals without a deploy**
`crewTag: v.union(v.literal("executive"), v.literal("finance"), v.literal("support"), v.literal("community"))` appears in `agents`, `tasks`, `traces`, `productContext`. Same for `agentTag` and `integrations.provider`. Adding any new vertical (Returns, Patient Intake, Onboarding) requires schema edits and a redeploy.
Fix: Long-term `crews` table migration. `crewId: v.id("crews")` on agents/tasks/traces written alongside `crewTag` during Phase 1, then reads switch in Phase 2, legacy dropped in Phase 3. See `ONBOARDING_PLAN.md`.
Files: `convex/schema.ts` (additive in Phase 1)

### SCH-02 · P1 · done
**Tasks table had no retry fields**
Fixed. `convex/schema.ts` — `retryCount`, `nextRetryAt`, `failureMode`, `lastError` on tasks table.

### SCH-03 · P1 · done
**Full task table fetched and filtered client-side**
Fixed. `convex/tasks.ts` → `listByCrewTag` using `by_workspace_and_crew_tag` index. Used in Invoices and Tickets pages.

### SCH-04 · P2 · done
**Token and cost accounting hardcoded to 0**
Fixed for LLM calls. `support.ts` and `community.ts` pass real metrics from `modelResult` into `resolveTaskInternal`. `billing.ts` pending (AGO-11).

### SCH-05 · P3 · open
**`productContext.category` is a literal union — same coupling as SCH-01**
`v.union(v.literal("product"), v.literal("billing"), ...)` tied to hardcoded crews. When crews become data, this becomes `crewId + free-form topic`.
Fix: Long-term, alongside SCH-01 Phase 2.

### SCH-06 · P1 · open
**Tasks table missing structured payment fields — UPI data buried in `rawPayload`**
When Razorpay events land, payment method, currency, amount in paise, and UPI VPA are all buried inside `rawPayload` JSON. The overseer can't route on them without parsing. No structured query is possible. Indian payment context is invisible to agents.
Fix: Add to tasks schema: `amount: v.optional(v.number())`, `currency: v.optional(v.string())`, `paymentMethod: v.optional(v.string())`, `upiVpa: v.optional(v.string())`. Populate from `ExternalEvent` during `createFromExternalEvent`. Add `by_workspace_and_payment_method` index.
Files: `convex/schema.ts`, `convex/tasks.ts`

---

## Security

### SEC-01 · P1 · open
**API keys stored as plaintext in Convex DB**
`accessTokenRef` stores live Stripe keys, bot tokens, and (once added) Razorpay secrets as plain strings. DB access = full credential exposure for all connected providers across all workspaces.
Fix: Short-term — encrypt `credentialsJson` before insert using `crypto.subtle` with a workspace-derived key or Convex env var secret. Long-term — secrets vault (AWS Secrets Manager, Infisical, Vault). Priority increases sharply once Razorpay keys (which can initiate refunds) are stored.
Files: `convex/integrations.ts`

### SEC-02 · P1 · done
**No workspace ownership check in Convex queries**
Fixed. `convex/workspaces.ts` → `assertOwned` internalQuery. Called at the start of all sensitive queries across `chat.ts`, `tasks.ts`, `agents.ts`, `traces.ts`, `notifications.ts`, `userPreferences.ts`, `integrations.ts`.

### SEC-03 · P2 · done
**Webhook signature verification absent**
Fixed. Intercom: HMAC-SHA256 against `x-hub-signature`. Discord: Ed25519 against `x-signature-ed25519`. Both reject invalid signatures with 401.

### SEC-04 · P2 · open
**No rate limiting on webhook endpoints or chat action**
`convex/chat.ts → send` and webhook handlers have no rate limiting. A malicious actor with a workspace ID could spam `chat.send` to exhaust LLM quota. Webhook endpoints with known URLs could be spammed.
Fix: Track call count per workspace per minute in a lightweight Convex table or use Convex's built-in rate limiting patterns. Reject with 429 when limit exceeded.
Files: `convex/chat.ts`, `convex/http.ts`

---

## Observability

### OBS-01 · P2 · done
**No real cost accounting**
Fixed for LLM calls. `support.ts` and `community.ts` wire real `tokensIn`, `tokensOut`, `costCents` into `resolveTaskInternal`. Tool traces correctly show 0. `billing.ts` pending (AGO-11).

### OBS-02 · P2 · open
**Eval pipeline is read-only — no eval runs ever execute**
`convex/evals.ts` has `listCasesWithResults` and `listRecentRuns` only. No function runs evals against the LLM. Pass-rate shown is from stored historical runs only. The entire eval system is display-only.
Fix: `runEvals(agentId, promptVersion, triggeredBy)` action. Per case: call `runAgentModel` with the eval input, grade against expected output using the case's `grader` type, write `evalRun` row. Wire to prompt save and manual "Run evals" button.
Files: `convex/evals.ts`

### OBS-03 · P3 · open
**No per-crew cost breakdown in the stats strip**
`tasks.getStats` returns workspace-level aggregates only. No way to know the Finance crew is costing 10× more than Support, or which agent model is most expensive.
Fix: `tasks.getCrewCostStats(workspaceId)` — returns `{ crewTag, totalCostCents, taskCount }[]`. Wire into the stats strip or a new "Cost by crew" section on the Activity page.
Files: `convex/tasks.ts`, `components/dashboard/StatsStrip.tsx`

---

## Summary

| Status | Count |
|---|---|
| ✅ done | 23 |
| 🔴 P0 open | 5 — INT-01, INT-03, INT-05, MT-02, AGO-02 |
| 🟠 P1 open | 8 — AGO-11, AGO-12, INT-02, INT-06, INT-13, SCH-01, SCH-06, SEC-01 |
| 🟡 P2 open | 9 — AGO-09, EXE-03, EXE-04, INT-08, INT-09, MT-03, SEC-04, UX-08, UX-10, OBS-02 |
| ⚪ P3 open | 4 — INT-11, INT-12, SCH-05, OBS-03 |
| **Total open** | **26** |

**Steps completed as of 2026-05-04:** STEP_01 through STEP_12 all done.

**Natural implementation order for remaining open issues:**
1. `INT-13` → adapter interface foundation (everything INT-related depends on this)
2. `INT-01 + INT-02 + INT-05 + MT-02` → schema + webhook tokens + universal handler
3. `INT-03 + SCH-06` → Razorpay/UPI adapter + structured payment fields in tasks
4. `AGO-02 + AGO-11 + AGO-12` → tool loop protocol fix + billing refactor + shared context builder
5. `INT-06 + INT-08 + INT-09` → idempotency + credential encryption + on-save test
6. `UX-10` → webhook URL copy widget (blocked on INT-05)
7. `UX-08 + OBS-02` → eval pipeline

*Last updated: 2026-05-04*
