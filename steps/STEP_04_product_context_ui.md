# STEP 04 — Product Context Editor

**Phase:** 2 — Agent Intelligence
**Depends on:** STEP_02
**Estimated time:** 3–4 hours

---

## Why

The `productContext` table exists in the schema and `getRefundLimitCents` is read by the billing agent — but there is zero UI to populate it. Agents currently use generic prompts with no knowledge of what the product does, what the refund policy is, or how to escalate. This page is the single highest-leverage change for agent quality. Once this data exists, STEP_05 injects it everywhere.

---

## Part A — Add route

**Modify: `lib/routes.ts`**

```ts
dashboardProductContext: "/dashboard/product-context",
```

**Modify: `lib/routes.ts` — DASHBOARD_NAV**

```ts
{ href: ROUTES.dashboardProductContext, label: "Product Context", section: "ops" },
```

**New file: `app/(dashboard)/dashboard/product-context/page.tsx`**

```tsx
import { ProductContextPage } from "@/components/dashboard/ProductContextPage";
export default function Page() { return <ProductContextPage />; }
```

---

## Part B — Sidebar icon

**Modify: `components/layout/Sidebar.tsx`**

Add `BookOpen` to the icons map:

```ts
import { BookOpen } from "lucide-react";
const ICONS = {
  ...existing,
  "Product Context": BookOpen,
};
```

---

## Part C — The page component

**New file: `components/dashboard/ProductContextPage.tsx`**

The page is a form with 5 fields. Each field maps to a `productContext` row with a specific key. Saving each field calls `api.productContext.upsert`.

### Field → key mapping

| UI label | key | category |
|---|---|---|
| What your product does | `product_description` | `product` |
| Pricing tiers | `pricing_tiers` | `billing` |
| Refund policy | `refund_policy` | `billing` |
| Escalation rules | `escalation_rules` | `support` |
| Agent tone | `agent_tone` | `product` |

### Component structure

```tsx
"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useWorkspaceId } from "@/lib/workspace-context";
import { authClient } from "@/lib/auth-client";
import { SecondaryPageShell } from "./SecondaryPageShell";
import { PageHeader } from "./PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const FIELDS = [
  {
    key: "product_description",
    category: "product" as const,
    label: "What your product does",
    placeholder: "e.g. Rule8 is a SaaS platform that lets founders delegate customer support, billing, and community management to AI agents...",
    hint: "2–3 sentences. Agents read this to understand what they're supporting.",
    rows: 4,
  },
  {
    key: "pricing_tiers",
    category: "billing" as const,
    label: "Pricing tiers",
    placeholder: "e.g. Starter: $29/mo — 1 workspace, 100 tasks. Pro: $99/mo — 3 workspaces, unlimited tasks...",
    hint: "Billing agent uses this to explain charges and verify subscriptions.",
    rows: 4,
  },
  {
    key: "refund_policy",
    category: "billing" as const,
    label: "Refund policy",
    placeholder: "e.g. Full refund within 14 days, no questions asked. Partial refund after 14 days at our discretion. Max auto-refund: $50.",
    hint: "Billing agent will auto-refund within this policy. Anything outside it escalates to you.",
    rows: 3,
  },
  {
    key: "escalation_rules",
    category: "support" as const,
    label: "Escalation rules",
    placeholder: "e.g. Always escalate: legal threats, data deletion requests, chargebacks over $200, anything mentioning lawyers or GDPR...",
    hint: "Agents escalate immediately when these conditions are met. Be specific.",
    rows: 4,
  },
  {
    key: "agent_tone",
    category: "product" as const,
    label: "Agent tone",
    placeholder: "e.g. Friendly and direct. Sound like a knowledgeable colleague, not a corporate bot. Use first names. Keep it short.",
    hint: "All agent responses follow this tone. One paragraph is enough.",
    rows: 3,
  },
];

type FieldValues = Record<string, string>;

export function ProductContextPage() {
  const workspaceId = useWorkspaceId();
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id ?? "system";

  // Load all context rows once
  const rows = useQuery(api.productContext.listAll, { workspaceId });
  const upsert = useMutation(api.productContext.upsert);

  const [values, setValues] = useState<FieldValues>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  // Populate form once rows load
  useEffect(() => {
    if (!rows) return;
    const initial: FieldValues = {};
    rows.forEach((r) => { initial[r.key] = r.value; });
    setValues(initial);
  }, [rows]);

  async function saveField(key: string, category: "product" | "billing" | "support" | "community" | "legal") {
    setSaving((s) => ({ ...s, [key]: true }));
    await upsert({ workspaceId, key, value: values[key] ?? "", category, updatedBy: userId });
    setSaving((s) => ({ ...s, [key]: false }));
    setSaved((s) => ({ ...s, [key]: true }));
    setTimeout(() => setSaved((s) => ({ ...s, [key]: false })), 2000);
  }

  return (
    <SecondaryPageShell>
      <PageHeader
        eyebrow="· Product Context"
        title="What your agents know"
        description="This is the knowledge base your agents read before every task. Fill it in once — update it whenever your product, pricing, or policies change."
      />

      <div className="space-y-5">
        {FIELDS.map((field) => (
          <Card key={field.key} className="bg-card">
            <CardHeader className="border-b border-border/70 pb-4">
              <CardTitle className="text-[16px]">{field.label}</CardTitle>
              <p className="mt-1 text-[12.5px] text-muted-foreground">{field.hint}</p>
            </CardHeader>
            <CardContent className="pt-4">
              <Textarea
                rows={field.rows}
                placeholder={field.placeholder}
                value={values[field.key] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                className="resize-none bg-white/70 text-[13px] leading-relaxed"
              />
              <div className="mt-3 flex justify-end">
                <Button
                  size="sm"
                  disabled={saving[field.key]}
                  onClick={() => saveField(field.key, field.category)}
                  className="h-9 px-5 font-mono text-[10px] uppercase tracking-[0.14em]"
                >
                  {saving[field.key] ? "Saving…" : saved[field.key] ? "Saved ✓" : "Save"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </SecondaryPageShell>
  );
}
```

---

## Part D — Add `listAll` to productContext backend

**Modify: `convex/productContext.ts`**

Add one query that returns all context rows for a workspace:

```ts
export const listAll = query({
  args: { workspaceId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    return ctx.db
      .query("productContext")
      .withIndex("by_workspace_and_key", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
  },
});
```

---

## Part E — Update Sidebar section label

The "Operations" section currently has Integrations and Prompts. Add Product Context here. It should appear between Prompts and Integrations:

```
Operations
  ├ Integrations
  ├ Prompts
  └ Product Context   ← new
```

This is controlled by the `DASHBOARD_NAV` order in `lib/routes.ts`.

---

## Acceptance Criteria

- [ ] `/dashboard/product-context` loads without errors
- [ ] All 5 fields are pre-populated when context rows exist in the DB
- [ ] Saving a field calls `api.productContext.upsert` and the row updates in Convex
- [ ] "Saved ✓" feedback appears on the button for 2 seconds after save
- [ ] Page refreshes and pre-populates the saved values
- [ ] Sidebar "Operations" section shows "Product Context" link
- [ ] `npx tsc --noEmit` passes

---

## Completion Notes

- Date completed: 2026-05-02
- Deviations from spec: The page uses `useAuthenticatedQuery` instead of raw `useQuery` for `productContext.listAll`, matching the Step 3 auth-readiness fix. `productContext.getByKey` and `productContext.upsert` were also auth-guarded, and `upsert` records `updatedBy` from `ctx.auth.getUserIdentity().tokenIdentifier` instead of trusting a client-provided value. Browser verification used authenticated HTTP smoke checks because `agent-browser` is not installed in this environment.
- New files created not listed above: None.
- Anything the next agent should know: Verified an authenticated `productContext.upsert`/`listAll` round trip against workspace `step4-test-workspace`; the saved row remains in Convex as test data.
