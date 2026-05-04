# Rule8 — Onboarding & Flexible Verticals Plan

> **Goal:** Stop hardcoding "Finance / Support / Community" as the only crews. Let each workspace define its own verticals during onboarding, scoped to its industry, with full freedom to customize afterwards.

---

## 1. The Problem

Crews are currently **enums baked into the schema** (`convex/schema.ts:22-27`):

```ts
const crewTag = v.union(
  v.literal("executive"),
  v.literal("finance"),
  v.literal("support"),
  v.literal("community"),
);
```

Same pattern for `agentTag`, `productContext.category`, `integrations.provider`, `traces.agentTag`. To add "Returns" or "Patient Triage" today, you'd edit the schema and redeploy.

This locks every customer into one shape: a SaaS founder with finance, support, and a Discord community. Real businesses don't fit that mold.

---

## 2. The Mental Model

**Crews are workspace data, not schema.**

A crew is a workspace-scoped vertical with:
- a name (`label`)
- an icon and color
- a system prompt (prepended to all agents in this crew)
- a set of tools it can call
- a set of integrations it depends on

The user defines it. The platform stores it. The schema doesn't care if it's "Finance" or "Insurance Claims" or "Concierge."

---

## 3. Schema Changes

### 3.1 New Tables

```ts
workspaces: defineTable({
  ownerUserId: v.string(),         // from auth
  name:        v.string(),
  industryTemplate: v.optional(v.string()), // "saas-founder", "ecommerce", etc.
  plan:        v.union(v.literal("free"), v.literal("pro"), v.literal("scale")),
  createdAt:   v.number(),
}).index("by_owner", ["ownerUserId"])

crews: defineTable({
  workspaceId:    v.id("workspaces"),
  key:            v.string(),                 // slug, e.g. "returns" or "patient-triage"
  label:          v.string(),                 // display name
  icon:           v.string(),                 // emoji or url
  color:          v.string(),                 // hex
  systemPrompt:   v.string(),                 // crew-level prompt
  toolKeys:       v.array(v.string()),        // refs to tools registry
  integrationIds: v.array(v.id("integrations")),
  archived:       v.boolean(),
  createdAt:      v.number(),
})
  .index("by_workspace", ["workspaceId"])
  .index("by_workspace_key", ["workspaceId", "key"])

tools: defineTable({
  workspaceId: v.optional(v.id("workspaces")), // null = global tool, set = custom
  key:         v.string(),                     // "stripe_refund"
  label:       v.string(),                     // "Refund a Stripe charge"
  description: v.string(),                     // shown to LLM as tool description
  inputSchema: v.string(),                     // JSON schema for tool args
  providerKey: v.optional(v.string()),         // "stripe" → needs that integration
  scope:       v.union(v.literal("read"), v.literal("write")),
  approvalRequired: v.boolean(),
}).index("by_provider", ["providerKey"])
```

### 3.2 Foreign-Key Migrations

Replace literal-union fields with `v.id()` references:

| Table | Old field | New field |
|---|---|---|
| `agents` | `crewTag: crewTag` (literal union) | `crewId: v.id("crews")` |
| `tasks` | `crewTag: crewTag` | `crewId: v.id("crews")` |
| `traces` | `crewTag: crewTag` | `crewId: v.id("crews")` |
| `productContext` | `category: <literal union>` | `crewId: v.id("crews")` + free-form `topic: v.string()` |
| `integrations` | `provider: <literal union of 9>` | `providerKey: v.string()` (FK to `provider_registry`) |

### 3.3 Provider Registry

Make integration providers data too — adding Zendesk shouldn't require a deploy:

```ts
providerRegistry: defineTable({
  key:         v.string(),                  // "zendesk"
  label:       v.string(),                  // "Zendesk"
  category:    v.string(),                  // "support" | "billing" | "community" | "data"
  icon:        v.string(),
  authType:    v.union(v.literal("api_key"), v.literal("oauth")),
  inboundWebhook:  v.boolean(),
  outboundActions: v.array(v.string()),     // ["create_ticket", "reply_to_ticket"]
})
```

---

## 4. Industry Templates (Seed Data)

Templates are **starter kits**, not constraints. They live in code (or a JSON file) and get cloned into the workspace at onboarding. The user can delete, rename, reorder anything after.

### 4.1 Template Shape

```ts
type IndustryTemplate = {
  key: string;
  label: string;
  description: string;
  crews: Array<{
    key: string;
    label: string;
    icon: string;
    color: string;
    systemPrompt: string;
    toolKeys: string[];
  }>;
  suggestedIntegrations: string[];
};
```

### 4.2 Starter Templates

```ts
const TEMPLATES: IndustryTemplate[] = [
  {
    key: "saas-founder",
    label: "SaaS / B2B Software",
    description: "For founders running a software product with paying customers.",
    crews: [
      { key: "support",    label: "Customer Support",  toolKeys: ["intercom_reply", "linear_create"] },
      { key: "billing",    label: "Billing & Refunds", toolKeys: ["stripe_lookup", "stripe_refund"] },
      { key: "onboarding", label: "Onboarding",        toolKeys: ["resend_email"] },
    ],
    suggestedIntegrations: ["intercom", "stripe", "linear", "resend"],
  },
  {
    key: "ecommerce",
    label: "E-commerce / DTC",
    description: "For online stores handling orders, returns, and customer experience.",
    crews: [
      { key: "returns",     label: "Returns & Refunds",       toolKeys: ["shopify_order_lookup", "shopify_refund"] },
      { key: "fulfillment", label: "Fulfillment Issues",      toolKeys: ["shopify_order_lookup"] },
      { key: "reviews",     label: "Reviews & Reputation",    toolKeys: ["resend_email"] },
      { key: "marketing",   label: "Lifecycle Marketing",     toolKeys: ["klaviyo_sync"] },
    ],
    suggestedIntegrations: ["shopify", "klaviyo", "gorgias"],
  },
  {
    key: "healthcare-practice",
    label: "Healthcare Practice",
    description: "For clinics and small practices managing patient communication.",
    crews: [
      { key: "scheduling", label: "Patient Scheduling",     toolKeys: [] },
      { key: "intake",     label: "New Patient Intake",     toolKeys: [] },
      { key: "insurance",  label: "Insurance Verification", toolKeys: [] },
      { key: "followup",   label: "Post-Visit Followup",    toolKeys: ["resend_email"] },
    ],
    suggestedIntegrations: ["resend", "calendly"],
  },
  {
    key: "real-estate",
    label: "Real Estate Brokerage",
    description: "For agents and small brokerages handling leads and transactions.",
    crews: [
      { key: "leads",    label: "Lead Qualification",   toolKeys: ["resend_email"] },
      { key: "showings", label: "Showing Coordination", toolKeys: ["resend_email"] },
      { key: "closings", label: "Closing Coordinator",  toolKeys: [] },
    ],
    suggestedIntegrations: ["resend", "twilio"],
  },
  {
    key: "agency",
    label: "Marketing / Creative Agency",
    description: "For agencies juggling multiple clients and projects.",
    crews: [
      { key: "client-comms", label: "Client Communications", toolKeys: ["slack_post", "resend_email"] },
      { key: "billing",      label: "Project Billing",       toolKeys: ["stripe_lookup"] },
      { key: "ops",          label: "Project Ops",           toolKeys: ["notion_create_page"] },
    ],
    suggestedIntegrations: ["slack", "stripe", "notion", "resend"],
  },
  {
    key: "blank",
    label: "Start from scratch",
    description: "I'll define my own verticals.",
    crews: [],
    suggestedIntegrations: [],
  },
];
```

---

## 5. Onboarding Flow

5 steps. Each one skippable except step 1.

### Step 1 — Industry

> "What kind of business are you running?"

A grid of cards: SaaS, E-commerce, Healthcare, Real Estate, Agency, Custom. The user picks one. We seed `workspace.industryTemplate` and pre-load the template's crews into a working draft.

### Step 2 — Confirm Verticals

> "Here are the crews we'd set up for you. Edit anything."

Each crew shows as a row with `[icon] [editable label] [delete]`. Below the list: `+ Add a crew` button (creates a blank crew the user names).

This is where the user can:
- Rename "Customer Support" → "Tier 1 Triage"
- Delete crews they don't need
- Reorder them
- Add custom crews ("Compliance", "Vendor Management")

### Step 3 — Connect Integrations

> "Which tools do you already use?"

Show the template's `suggestedIntegrations` first, then a search/grid of all providers. Connect via OAuth or API key. Skippable — they can connect later.

### Step 4 — Customize Agents

> "Each crew gets one starter agent. Tweak it or accept the default."

Auto-name agents (e.g. "Returns Agent", "Patient Scheduling Agent"). Show the crew's pre-filled system prompt with an "Edit" button. Skip = accept defaults.

### Step 5 — Import Existing Data (Optional)

> "Bring your tickets, customers, or invoices into Rule8."

CSV upload, or pull from connected integrations (e.g. last 30 days of Intercom tickets). Skippable. This seeds the dashboard so it doesn't look empty on day one.

### Done

Land on the main dashboard with crews populated, agents idle but ready, and Executive's first message: *"You're set up with N crews. Ready to handle your first task — try sending one or connecting an integration."*

---

## 6. UI Components Needed

| Component | Purpose | New / Reuse |
|---|---|---|
| `OnboardingWizard.tsx` | Container with step navigation | New |
| `IndustryPicker.tsx` | Step 1 grid of templates | New |
| `CrewBuilder.tsx` | Step 2 — list, add, edit, remove crews | New |
| `IntegrationConnector.tsx` | Step 3 — connect/skip integrations | Refactor existing `IntegrationsPage` |
| `AgentCustomizer.tsx` | Step 4 — review agent prompts | New |
| `DataImporter.tsx` | Step 5 — CSV/API import | New (deferrable) |

Routes:
- `/onboarding` — wizard entry
- `/onboarding/industry`
- `/onboarding/crews`
- `/onboarding/integrations`
- `/onboarding/agents`
- `/onboarding/import`

Middleware redirect: if `user.workspace.onboardingComplete === false`, redirect to `/onboarding` from any `/dashboard/*` route.

---

## 7. Migration Path (Don't Break the Demo)

You already have demo data. Don't drop the literal unions in one shot.

### Phase 1 — Additive (week 1)
- Create `workspaces`, `crews`, `tools`, `providerRegistry` tables
- Add `crewId` *alongside* `crewTag` on agents/tasks/traces (write to both)
- Build the wizard against new tables
- Existing `WORKSPACE_ID = "rule8-demo"` continues working with legacy `crewTag`

### Phase 2 — Read from new (week 2)
- Switch UI queries to use `crewId`
- Switch agent runners to look up crew by ID for system prompt + tools
- Templates seed data ships
- New signups go through onboarding; existing demo workspace gets backfilled

### Phase 3 — Drop legacy (week 3)
- Remove `crewTag` literal union from schema → `crewId` is the only source of truth
- Same for `agentTag`, `productContext.category`, `integrations.provider`
- Delete hardcoded `CREW_META` from `lib/constants.ts`

---

## 8. Crew Marketplace (Future, Not Now)

Once crews are data, this becomes a one-line feature:

```ts
crewTemplates: defineTable({
  publishedBy:  v.string(),     // user or team
  industryKey:  v.string(),     // "ecommerce"
  label:        v.string(),     // "Subscription Box DTC v1"
  description:  v.string(),
  crewSpec:     v.string(),     // JSON of the crew config
  installs:     v.number(),
  rating:       v.optional(v.number()),
  isOfficial:   v.boolean(),
  createdAt:    v.number(),
}).index("by_industry", ["industryKey"])
```

Founders can publish their working crews as templates. Other founders clone them with one click. This is what turns Rule8 from a tool into a community-driven platform.

---

## 9. Open Questions

- **Crew limits per plan?** Free = 3 crews, Pro = 10, Scale = unlimited?
- **Approval required on crew system prompt edits?** Likely yes for write tools, no for read-only.
- **How does "Executive" relate to crews?** Suggest: Executive is workspace-level (not a crew), routes tasks across crews, has read access to everything.
- **Cross-crew tools?** Some tools (e.g. `resend_email`) are useful to many crews. Allow a tool to be attached to multiple crews — already supported by `crews.toolKeys` being an array.

---

## 10. Definition of Done

A user signs up, picks "Real Estate Brokerage," confirms 3 crews (Leads / Showings / Closings), connects Resend + Twilio, and lands on a dashboard where:

- The sidebar shows their 3 crews (not Finance/Support/Community)
- The Executive panel reads their workspace's actual crews, not hardcoded labels
- They can send a manual task and have it route to one of their crews
- Anywhere "crewTag" is shown in the UI, it's pulling from `crews.label` not from a constants file
- The original demo workspace still works for the existing screens

When all six bullets pass, ship it.
