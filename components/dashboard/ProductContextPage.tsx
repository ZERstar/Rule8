"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Save } from "lucide-react";
import { useMutation } from "convex/react";

import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { SecondaryPageShell } from "@/components/dashboard/SecondaryPageShell";
import { useAuthenticatedQuery } from "@/lib/use-authenticated-query";
import { useWorkspaceId } from "@/lib/workspace-context";

type ProductContextKey =
  | "product_description"
  | "pricing_tiers"
  | "refund_policy"
  | "escalation_rules"
  | "agent_tone";

type ProductContextCategory = Doc<"productContext">["category"];

const FIELDS: ReadonlyArray<{
  key: ProductContextKey;
  label: string;
  category: ProductContextCategory;
  description: string;
  placeholder: string;
}> = [
  {
    key: "product_description",
    label: "What your product does",
    category: "product",
    description: "Core positioning, customer, and product facts agents should rely on.",
    placeholder: "Rule8 is...",
  },
  {
    key: "pricing_tiers",
    label: "Pricing tiers",
    category: "billing",
    description: "Plan names, limits, trial rules, and billing caveats.",
    placeholder: "Starter: ...\nGrowth: ...\nScale: ...",
  },
  {
    key: "refund_policy",
    label: "Refund policy",
    category: "billing",
    description: "Refund eligibility, approval limits, and exceptions.",
    placeholder: "Refunds are available when...",
  },
  {
    key: "escalation_rules",
    label: "Escalation rules",
    category: "support",
    description: "Conditions that should move an issue from agent handling to founder review.",
    placeholder: "Escalate when...",
  },
  {
    key: "agent_tone",
    label: "Agent tone",
    category: "product",
    description: "Voice, level of formality, and phrases agents should prefer or avoid.",
    placeholder: "Clear, concise, founder-led...",
  },
];

const EMPTY_VALUES: Record<ProductContextKey, string> = {
  product_description: "",
  pricing_tiers: "",
  refund_policy: "",
  escalation_rules: "",
  agent_tone: "",
};

export function ProductContextPage() {
  const workspaceId = useWorkspaceId();
  const records = useAuthenticatedQuery(api.productContext.listAll, { workspaceId });
  const upsert = useMutation(api.productContext.upsert);
  const [values, setValues] = useState<Record<ProductContextKey, string>>(EMPTY_VALUES);
  const [savingKey, setSavingKey] = useState<ProductContextKey | null>(null);
  const [savedKey, setSavedKey] = useState<ProductContextKey | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const recordsByKey = useMemo(() => {
    const next = new Map<string, Doc<"productContext">>();
    for (const record of records ?? []) {
      next.set(record.key, record);
    }
    return next;
  }, [records]);

  useEffect(() => {
    if (!records) return;

    setValues(
      FIELDS.reduce<Record<ProductContextKey, string>>((next, field) => {
        next[field.key] = recordsByKey.get(field.key)?.value ?? "";
        return next;
      }, { ...EMPTY_VALUES }),
    );
  }, [records, recordsByKey]);

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  async function saveField(field: (typeof FIELDS)[number]) {
    setSavingKey(field.key);
    setSavedKey(null);

    try {
      await upsert({
        workspaceId,
        key: field.key,
        value: values[field.key],
        category: field.category,
      });
      setSavedKey(field.key);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSavedKey(null), 2000);
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <SecondaryPageShell contentClassName="max-w-[1180px]">
      <PageHeader
        eyebrow="· Product Context"
        title="Product context"
        description="Workspace-level source material agents use when answering product, billing, and support questions."
      />

      <div className="grid gap-4">
        {FIELDS.map((field) => {
          const isSaving = savingKey === field.key;
          const isSaved = savedKey === field.key;

          return (
            <Card key={field.key} className="bg-card">
              <CardHeader className="flex flex-row items-start justify-between gap-4 border-b border-border/70">
                <div>
                  <CardTitle>{field.label}</CardTitle>
                  <p className="mt-1 max-w-2xl text-[12.5px] leading-5 text-muted-foreground">
                    {field.description}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Button size="sm" onClick={() => void saveField(field)} disabled={isSaving}>
                    <Save className="size-3.5" />
                    {isSaving ? "Saving" : isSaved ? "Saved ✓" : "Save"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={values[field.key]}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      [field.key]: event.target.value,
                    }))
                  }
                  placeholder={field.placeholder}
                  rows={5}
                  className="min-h-[140px] resize-y rounded-[18px] font-mono text-[12.5px] leading-6"
                />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </SecondaryPageShell>
  );
}
