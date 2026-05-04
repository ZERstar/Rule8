# STEP 11 — Onboarding (Executive-Assisted, Hybrid)

**Phase:** 5 — Onboarding & Scale
**Depends on:** STEP_02, STEP_04, STEP_06
**Estimated time:** 8–10 hours

---

## Why

Every new user lands on a dashboard showing "Finance Crew", "Support Crew", "Community Crew" with zero data and no idea what to do. Onboarding needs to get them to their first autonomous task as fast as possible — that's the aha moment.

**The approach here is hybrid and intentionally flexible.** The long-term vision (from `business_product_plan.md`) is fully conversational onboarding — Executive asks 3 questions, builds the workspace config, runs the first task live. That requires a mature Executive and battle-tested specialist runners. We are not there yet. So this step builds a hybrid: Executive assists but structured UI backs it up. Every decision in the UI can be pre-filled or suggested by Executive. The form is the fallback, not the experience.

This will go through multiple iterations as Executive matures. Build it so it's easy to shift more weight toward the conversational side over time.

---

## The Model

```
Sign up
  → Executive opens a short conversation (3 questions max)
  → Answers pre-fill the workspace config visually
  → Founder sees and confirms what was built (not fills from scratch)
  → One integration connected
  → One test task run live
  → Land on dashboard
```

The difference from a wizard: **Executive writes, founder edits.** Not: founder fills, system accepts.

---

## Part A — Routes and layout

**New files:**
```
app/(onboarding)/layout.tsx
app/(onboarding)/onboarding/page.tsx         ← entry point
app/(onboarding)/onboarding/chat/page.tsx    ← Executive conversation (new — replaces industry picker)
app/(onboarding)/onboarding/review/page.tsx  ← Founder reviews what Executive built
app/(onboarding)/onboarding/connect/page.tsx ← Connect one integration
app/(onboarding)/onboarding/run/page.tsx     ← First live task run
app/(onboarding)/onboarding/done/page.tsx    ← Completion + redirect
```

**`app/(onboarding)/layout.tsx`**

```tsx
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth-server";
import { ROUTES } from "@/lib/routes";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const authed = await isAuthenticated();
  if (!authed) redirect(ROUTES.signIn);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-bg)]">
      {children}
    </div>
  );
}
```

**`app/(onboarding)/onboarding/page.tsx`**

```tsx
import { redirect } from "next/navigation";
export default function Page() { redirect("/onboarding/chat"); }
```

**Modify: `lib/routes.ts`** — add onboarding routes:

```ts
onboarding:              "/onboarding",
onboardingChat:          "/onboarding/chat",
onboardingReview:        "/onboarding/review",
onboardingConnect:       "/onboarding/connect",
onboardingRun:           "/onboarding/run",
onboardingDone:          "/onboarding/done",
```

**Modify: `app/(dashboard)/layout.tsx`** — gate on onboarding completion:

```ts
const workspace = await fetchMutation(api.workspaces.getOrCreate, { ... });
if (!workspace?.onboardingComplete) {
  redirect(ROUTES.onboarding);
}
```

---

## Part B — Onboarding state in Convex

**Modify: `convex/schema.ts`** — extend `workspaces` table:

```ts
workspaces: defineTable({
  // existing fields...

  // Onboarding state
  onboardingComplete:     v.boolean(),
  onboardingStep:         v.optional(v.string()),  // "chat" | "review" | "connect" | "run" | "done"

  // What Executive built during onboarding
  onboardingCrewConfig:   v.optional(v.string()),  // JSON — crew definitions from Executive
  industryTemplate:       v.optional(v.string()),  // detected industry key
})
```

**Modify: `convex/workspaces.ts`** — add:

```ts
export const saveOnboardingConfig = mutation({
  args: {
    workspaceId:          v.id("workspaces"),
    onboardingStep:       v.string(),
    onboardingCrewConfig: v.optional(v.string()),
    industryTemplate:     v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    await ctx.db.patch(args.workspaceId, {
      onboardingStep:       args.onboardingStep,
      onboardingCrewConfig: args.onboardingCrewConfig,
      industryTemplate:     args.industryTemplate,
    });
  },
});
```

---

## Part C — Step 1: Executive conversation

**New file: `components/onboarding/OnboardingChat.tsx`**

This is a stripped-down chat interface — not the full ExecutivePanel, just a focused 3-question flow. Executive asks, founder answers, Executive synthesises.

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useWorkspaceId } from "@/lib/workspace-context";
import { ROUTES } from "@/lib/routes";

type Message = { role: "executive" | "founder"; text: string };

// The three questions Executive needs answered to build the workspace
const INITIAL_MESSAGE = `Hi — I'm Executive, your operational co-founder. I'll set up your workspace in a few questions.

First: what does your product do, and who are your customers? (2–3 sentences is enough.)`;

const QUESTION_2 = `Got it. What tools do your customers use to reach you today — support tickets, billing issues, Discord, email? Just the ones you actively manage.`;

const QUESTION_3 = `Last one: what's your biggest operational time drain right now — the thing that interrupts building most?`;

export function OnboardingChat() {
  const router      = useRouter();
  const workspaceId = useWorkspaceId();
  const sendChat    = useAction(api.chat.send);
  const saveConfig  = useMutation(api.workspaces.saveOnboardingConfig);

  const [messages,  setMessages]  = useState<Message[]>([{ role: "executive", text: INITIAL_MESSAGE }]);
  const [input,     setInput]     = useState("");
  const [step,      setStep]      = useState(0); // 0 = Q1, 1 = Q2, 2 = Q3, 3 = synthesising
  const [answers,   setAnswers]   = useState<string[]>([]);
  const [isTyping,  setIsTyping]  = useState(false);

  async function send() {
    if (!input.trim() || isTyping) return;
    const text = input.trim();
    setInput("");

    // Add founder message
    setMessages((m) => [...m, { role: "founder", text }]);
    const newAnswers = [...answers, text];
    setAnswers(newAnswers);

    setIsTyping(true);

    if (step < 2) {
      // Ask next question
      const nextQ = step === 0 ? QUESTION_2 : QUESTION_3;
      await new Promise((r) => setTimeout(r, 600)); // brief pause feels natural
      setMessages((m) => [...m, { role: "executive", text: nextQ }]);
      setStep(step + 1);
      setIsTyping(false);
      return;
    }

    // All 3 answers collected — synthesise
    const synthesisPrompt = `You are setting up a founder's Rule8 workspace. Based on these three answers, synthesise their workspace configuration.

Answer 1 (product + customers): ${newAnswers[0]}
Answer 2 (tools they use): ${newAnswers[1]}
Answer 3 (biggest time drain): ${newAnswers[2]}

Return a JSON block in this exact format:
\`\`\`json
{
  "industryTemplate": "saas-founder | ecommerce | agency | community | custom",
  "crews": [
    { "key": "slug", "label": "Crew Name", "icon": "emoji", "color": "#hex", "description": "one line" }
  ],
  "suggestedIntegrations": ["stripe", "intercom", "discord"],
  "productSummary": "one sentence",
  "dominantPain": "one sentence"
}
\`\`\`

Then in plain English, in 2–3 sentences, tell the founder what you've set up and why.`;

    try {
      const result = await sendChat({ workspaceId, text: synthesisPrompt });

      // Parse JSON from result
      const jsonMatch = result.match(/```json\n([\s\S]*?)\n```/);
      let config: string | undefined;
      if (jsonMatch) {
        config = jsonMatch[1];
        // Save to workspace
        const parsed = JSON.parse(config);
        await saveConfig({
          workspaceId: workspaceId as any,
          onboardingStep:       "review",
          onboardingCrewConfig: config,
          industryTemplate:     parsed.industryTemplate,
        });
      }

      // Strip JSON from visible message
      const visibleText = result.replace(/```json[\s\S]*?```/g, "").trim() ||
        "I've set up your workspace based on what you told me. Let me show you what I've built.";

      setMessages((m) => [...m, {
        role: "executive",
        text: visibleText + "\n\nLet me show you what I've configured →",
      }]);

      setTimeout(() => router.push(ROUTES.onboardingReview), 1800);
    } catch {
      setMessages((m) => [...m, {
        role: "executive",
        text: "I've noted your setup. Let me show you what I've configured based on what you told me.",
      }]);
      setTimeout(() => router.push(ROUTES.onboardingReview), 1800);
    } finally {
      setIsTyping(false);
      setStep(3);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-4 py-12">
      {/* Progress */}
      <div className="mb-8 flex items-center gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-colors"
            style={{ background: i <= step ? "var(--color-accent-orange)" : "var(--color-b1)" }}
          />
        ))}
      </div>

      {/* Messages */}
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto pb-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`max-w-[88%] rounded-[22px] px-4 py-3 text-[14px] leading-relaxed ${
              msg.role === "executive"
                ? "self-start bg-white text-foreground shadow-[0_2px_12px_rgba(28,39,49,0.06)]"
                : "self-end bg-[var(--color-accent-orange)] text-white"
            }`}
          >
            {msg.text.split("\n").map((line, j) => (
              <span key={j}>{line}{j < msg.text.split("\n").length - 1 && <br />}</span>
            ))}
          </div>
        ))}

        {isTyping && (
          <div className="self-start flex items-center gap-1 rounded-[18px] bg-white px-4 py-3 shadow-sm">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="block h-2 w-2 rounded-full bg-[var(--color-t3)]"
                style={{ animation: "pulseDot 1.2s ease-in-out infinite", animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      {step <= 2 && (
        <div className="mt-6 flex items-end gap-3">
          <textarea
            rows={2}
            className="flex-1 resize-none rounded-[20px] border border-[var(--color-b1)] bg-white px-4 py-3 text-[14px] outline-none placeholder:text-[var(--color-t3)] focus:border-[rgba(249,115,22,0.4)]"
            placeholder="Type your answer…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
            }}
          />
          <button
            type="button"
            onClick={send}
            disabled={!input.trim() || isTyping}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-orange)] disabled:opacity-40"
          >
            <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
              <path d="M12.5 7L2 2L4.5 7L2 12L12.5 7Z" fill="white" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      )}

      {/* Skip option */}
      <button
        type="button"
        onClick={() => router.push(ROUTES.onboardingReview)}
        className="mt-4 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-t3)] hover:text-[var(--color-t1)] transition-colors"
      >
        Skip and set up manually →
      </button>
    </div>
  );
}
```

---

## Part D — Step 2: Review what Executive built

**New file: `components/onboarding/OnboardingReview.tsx`**

Shows what Executive configured. Each crew is an editable card. Founder confirms or adjusts.

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useWorkspaceId } from "@/lib/workspace-context";
import { INDUSTRY_TEMPLATES, type CrewTemplate } from "@/lib/onboarding-templates";
import { ROUTES } from "@/lib/routes";
import { Button } from "@/components/ui/button";
import { X, Plus } from "lucide-react";

export function OnboardingReview() {
  const router      = useRouter();
  const workspaceId = useWorkspaceId();
  const workspace   = useQuery(api.workspaces.getByOwner, { ownerUserId: "" }); // filled from context
  const saveConfig  = useMutation(api.workspaces.saveOnboardingConfig);

  const [crews, setCrews] = useState<CrewTemplate[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Try to load Executive's config from workspace, fall back to template
    const raw = (workspace as any)?.onboardingCrewConfig;
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setCrews(parsed.crews ?? []);
        setLoaded(true);
        return;
      } catch {}
    }
    // Fallback: detect from sessionStorage template key or use SaaS default
    const key = sessionStorage.getItem("ob_template") ?? "saas-founder";
    const t = INDUSTRY_TEMPLATES.find((x) => x.key === key);
    setCrews(t?.crews ?? INDUSTRY_TEMPLATES[0].crews);
    setLoaded(true);
  }, [workspace]);

  function updateCrew(idx: number, patch: Partial<CrewTemplate>) {
    setCrews((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  }

  function removeCrew(idx: number) {
    setCrews((prev) => prev.filter((_, i) => i !== idx));
  }

  function addCrew() {
    setCrews((prev) => [...prev, {
      key: `crew-${Date.now()}`, label: "New Crew", icon: "⚡", color: "#6B7280",
      systemPrompt: "", toolKeys: [],
    }]);
  }

  async function confirm() {
    await saveConfig({
      workspaceId: workspaceId as any,
      onboardingStep:       "connect",
      onboardingCrewConfig: JSON.stringify({ crews }),
    });
    router.push(ROUTES.onboardingConnect);
  }

  if (!loaded) return null;

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-12">
      <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--color-t3)]">Your crews</p>
      <h1 className="mt-3 text-[28px] font-semibold tracking-[-0.04em] text-foreground">
        Here's what I've set up
      </h1>
      <p className="mt-2 text-[14px] leading-relaxed text-[var(--color-t2)]">
        These are your operational crews. Rename or remove any of them — you can always add more later.
      </p>

      <div className="mt-6 space-y-3">
        {crews.map((crew, idx) => (
          <div key={crew.key} className="flex items-center gap-3 rounded-[20px] border border-[var(--color-b1)] bg-white px-4 py-3">
            <span className="text-[20px]">{crew.icon}</span>
            <div className="min-w-0 flex-1">
              <input
                className="w-full bg-transparent text-[14px] font-semibold text-foreground outline-none"
                value={crew.label}
                onChange={(e) => updateCrew(idx, { label: e.target.value })}
              />
              {crew.description && (
                <p className="mt-0.5 truncate text-[11.5px] text-[var(--color-t3)]">{crew.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => removeCrew(idx)}
              className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--color-t3)] hover:bg-[var(--color-surface-2)]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={addCrew}
          className="flex w-full items-center justify-center gap-2 rounded-[20px] border border-dashed border-[var(--color-b1)] py-3 text-[13px] text-[var(--color-t3)] hover:border-[var(--color-accent-orange)] hover:text-[var(--color-accent-orange)] transition-colors"
        >
          <Plus className="h-4 w-4" /> Add a crew
        </button>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <button type="button" onClick={() => router.back()} className="text-[13px] text-[var(--color-t3)] hover:text-[var(--color-t1)]">← Back</button>
        <Button onClick={confirm} className="h-11 px-8 font-mono text-[11px] uppercase tracking-[0.14em]">
          Looks good →
        </Button>
      </div>
    </div>
  );
}
```

---

## Part E — Step 3: Connect one integration

**New file: `components/onboarding/OnboardingConnect.tsx`**

Simple — show one or two suggested integrations based on the crew config. Low pressure. Skip is equal to connect.

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useWorkspaceId } from "@/lib/workspace-context";
import { ROUTES } from "@/lib/routes";
import { Button } from "@/components/ui/button";

const PROVIDER_META: Record<string, { label: string; hint: string; placeholder: string }> = {
  intercom: { label: "Intercom",  hint: "Support tickets → Support specialists.",   placeholder: "dG9rOm..." },
  stripe:   { label: "Stripe",    hint: "Billing queries → Payment specialists.",   placeholder: "sk_live_..." },
  discord:  { label: "Discord",   hint: "Community channels → Community specialists.", placeholder: "Bot token..." },
  resend:   { label: "Resend",    hint: "Email replies when no support tool.",       placeholder: "re_..." },
};

export function OnboardingConnect() {
  const router      = useRouter();
  const workspaceId = useWorkspaceId();
  const workspace   = useQuery(api.workspaces.getByOwner, { ownerUserId: "" });
  const upsert      = useMutation(api.integrations.upsertConnection);
  const saveConfig  = useMutation(api.workspaces.saveOnboardingConfig);

  const [suggested, setSuggested] = useState<string[]>([]);
  const [keys,  setKeys]  = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved,  setSaved]  = useState<Record<string, boolean>>({});

  useEffect(() => {
    const raw = (workspace as any)?.onboardingCrewConfig;
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setSuggested(parsed.suggestedIntegrations?.slice(0, 2) ?? ["intercom", "stripe"]);
        return;
      } catch {}
    }
    setSuggested(["intercom", "stripe"]);
  }, [workspace]);

  async function connect(provider: string) {
    if (!keys[provider]?.trim()) return;
    setSaving((s) => ({ ...s, [provider]: true }));
    await upsert({ workspaceId, provider: provider as any, accessToken: keys[provider], status: "connected" });
    setSaving((s) => ({ ...s, [provider]: false }));
    setSaved((s) => ({ ...s, [provider]: true }));
  }

  async function proceed() {
    await saveConfig({ workspaceId: workspaceId as any, onboardingStep: "run" });
    router.push(ROUTES.onboardingRun);
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-12">
      <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--color-t3)]">Connect your tools</p>
      <h1 className="mt-3 text-[28px] font-semibold tracking-[-0.04em] text-foreground">Connect one integration</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-[var(--color-t2)]">
        One is enough to start. You can add more from the Integrations page any time.
      </p>

      <div className="mt-6 space-y-4">
        {suggested.map((provider) => {
          const meta = PROVIDER_META[provider];
          if (!meta) return null;
          return (
            <div key={provider} className="rounded-[20px] border border-[var(--color-b1)] bg-white px-4 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[14px] font-semibold text-foreground">{meta.label}</p>
                  <p className="mt-0.5 text-[12px] text-[var(--color-t3)]">{meta.hint}</p>
                </div>
                {saved[provider] && (
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-accent-green)]">Connected ✓</span>
                )}
              </div>
              {!saved[provider] && (
                <div className="mt-3 flex gap-2">
                  <input
                    className="min-w-0 flex-1 rounded-full border border-[var(--color-b1)] bg-[var(--color-surface-2)] px-3 py-2 font-mono text-[12px] outline-none"
                    placeholder={meta.placeholder}
                    value={keys[provider] ?? ""}
                    onChange={(e) => setKeys((k) => ({ ...k, [provider]: e.target.value }))}
                  />
                  <Button
                    size="sm"
                    disabled={!keys[provider]?.trim() || saving[provider]}
                    onClick={() => connect(provider)}
                    className="h-9 px-4 font-mono text-[10px] uppercase tracking-[0.12em]"
                  >
                    {saving[provider] ? "..." : "Connect"}
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <button type="button" onClick={() => router.back()} className="text-[13px] text-[var(--color-t3)] hover:text-[var(--color-t1)]">← Back</button>
        <div className="flex gap-3">
          <Button variant="outline" onClick={proceed} className="h-11 px-6">Skip for now</Button>
          <Button onClick={proceed} className="h-11 px-8 font-mono text-[11px] uppercase tracking-[0.14em]">Continue →</Button>
        </div>
      </div>
    </div>
  );
}
```

---

## Part F — Step 4: First live run

**New file: `components/onboarding/OnboardingRun.tsx`**

The aha moment. Founder sends a test task. They watch the trace feed populate live.

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useWorkspaceId } from "@/lib/workspace-context";
import { ROUTES } from "@/lib/routes";
import { Button } from "@/components/ui/button";

const SUGGESTED_TASKS = [
  "A customer says they were charged twice last month",
  "User can't figure out how to reset their password",
  "Someone in Discord is posting spam links repeatedly",
];

export function OnboardingRun() {
  const router      = useRouter();
  const workspaceId = useWorkspaceId();
  const submit      = useAction(api.tasks.submitManualTask);
  const complete    = useMutation(api.workspaces.markOnboardingComplete);
  const traces      = useQuery(api.traces.listRecent, { workspaceId, limit: 8 });

  const [input,    setInput]    = useState("");
  const [running,  setRunning]  = useState(false);
  const [taskDone, setTaskDone] = useState(false);

  async function runTask(text: string) {
    setInput(text);
    setRunning(true);
    try {
      await submit({ workspaceId, summary: text });
      setTaskDone(true);
    } finally {
      setRunning(false);
    }
  }

  async function finish() {
    await complete({ workspaceId: workspaceId as any });
    router.push(ROUTES.onboardingDone);
  }

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-12">
      <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--color-t3)]">First live run</p>
      <h1 className="mt-3 text-[28px] font-semibold tracking-[-0.04em] text-foreground">
        Watch your first task run
      </h1>
      <p className="mt-2 text-[14px] leading-relaxed text-[var(--color-t2)]">
        Send any task. Your specialists will handle it live. This is the whole product in one moment.
      </p>

      {!taskDone ? (
        <>
          <div className="mt-6 space-y-2">
            {SUGGESTED_TASKS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => runTask(t)}
                disabled={running}
                className="w-full rounded-[18px] border border-[var(--color-b1)] bg-white px-4 py-3 text-left text-[13px] text-[var(--color-t2)] hover:border-[var(--color-accent-orange)] hover:text-foreground transition-colors"
              >
                {t}
              </button>
            ))}
          </div>

          <div className="mt-4 flex gap-2">
            <input
              className="min-w-0 flex-1 rounded-full border border-[var(--color-b1)] bg-white px-4 py-2.5 text-[13px] outline-none"
              placeholder="Or type your own task…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") runTask(input); }}
            />
            <Button disabled={!input.trim() || running} onClick={() => runTask(input)} className="h-10 px-5">
              {running ? "Running…" : "Run"}
            </Button>
          </div>
        </>
      ) : (
        <div className="mt-6">
          {/* Live trace feed */}
          <div className="rounded-2xl border border-[var(--color-b1)] bg-white">
            <div className="border-b border-[var(--color-b1)] px-4 py-3">
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--color-t3)]">
                Live trace — {traces?.length ?? 0} steps
              </p>
            </div>
            <div className="divide-y divide-[var(--color-b1)] max-h-[280px] overflow-y-auto">
              {!traces && (
                <div className="p-4 text-[13px] text-[var(--color-t3)]">Processing…</div>
              )}
              {traces?.map((trace) => (
                <div key={trace._id} className="flex items-start gap-3 px-4 py-3">
                  <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${trace.status === "ok" ? "bg-[var(--color-accent-green)]" : trace.status === "error" ? "bg-red-400" : "bg-[var(--color-accent-orange)]"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] text-foreground">{trace.action}</p>
                    <p className="mt-0.5 font-mono text-[9px] text-[var(--color-t3)]">
                      {trace.stepType} · {trace.latencyMs}ms
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Button onClick={finish} className="mt-6 h-11 w-full font-mono text-[11px] uppercase tracking-[0.14em]">
            Go to dashboard →
          </Button>
        </div>
      )}

      <button
        type="button"
        onClick={finish}
        className="mt-4 w-full text-center font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-t3)] hover:text-[var(--color-t1)] transition-colors"
      >
        Skip to dashboard
      </button>
    </div>
  );
}
```

---

## Part G — Done page

**New file: `app/(onboarding)/onboarding/done/page.tsx`**

```tsx
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/lib/routes";

export default function OnboardingDonePage() {
  const router = useRouter();
  useEffect(() => { setTimeout(() => router.push(ROUTES.dashboardOverview), 2000); }, []);
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[rgba(34,197,94,0.12)] text-[40px]">✓</div>
      <h1 className="text-[30px] font-semibold tracking-[-0.04em] text-foreground">You're in.</h1>
      <p className="mt-3 max-w-sm text-[14px] leading-relaxed text-[var(--color-t2)]">
        Taking you to the dashboard now…
      </p>
    </div>
  );
}
```

---

## Part H — Wire page components

```tsx
// app/(onboarding)/onboarding/chat/page.tsx
import { OnboardingChat } from "@/components/onboarding/OnboardingChat";
export default function Page() { return <OnboardingChat />; }

// app/(onboarding)/onboarding/review/page.tsx
import { OnboardingReview } from "@/components/onboarding/OnboardingReview";
export default function Page() { return <OnboardingReview />; }

// app/(onboarding)/onboarding/connect/page.tsx
import { OnboardingConnect } from "@/components/onboarding/OnboardingConnect";
export default function Page() { return <OnboardingConnect />; }

// app/(onboarding)/onboarding/run/page.tsx
import { OnboardingRun } from "@/components/onboarding/OnboardingRun";
export default function Page() { return <OnboardingRun />; }
```

---

## Iteration notes (read before building)

This step is explicitly designed to evolve. The following are known areas where future iterations will shift:

- **Conversation depth**: Right now Executive asks 3 fixed questions. As Executive matures (STEP_06), the conversation becomes free-form — Executive extracts intent from natural replies, asks clarifying questions, handles "I don't know yet" gracefully.
- **Config quality**: The JSON synthesis (Part C) depends on the LLM being well-prompted. Add the full context to `buildExecutiveChatPrompt` — what fields it should extract, what format to return — so the synthesis is reliable.
- **Crew seeding**: Currently the `onboardingCrewConfig` JSON is saved but not applied to the `agents` table. A follow-on task should seed actual agent rows per crew using the config after onboarding completes.
- **productContext**: The short answers from the chat should also seed `productContext` rows (`product_description`, `escalation_rules`) so agents are immediately context-aware without requiring the founder to visit the Product Context page.
- **The run step**: Works best when agents actually resolve tasks (tool executor live). If STEP_09 is not done yet, agents will run but may not close the loop on the source. The trace feed still populates and the aha moment still lands.

---

## Acceptance Criteria

- [ ] New user is redirected to `/onboarding/chat` on first sign-in
- [ ] Executive asks 3 questions in the chat interface
- [ ] After Q3, Executive synthesises and saves `onboardingCrewConfig` to the workspace
- [ ] Review page loads with Executive's suggested crews pre-filled
- [ ] Crews are renameable and deletable; "+ Add a crew" works
- [ ] Connect step shows the integrations Executive suggested
- [ ] API key paste + connect saves to `integrations` table
- [ ] Run step submits a manual task and shows the live trace feed
- [ ] Finishing sets `workspace.onboardingComplete = true`
- [ ] Returning user (already onboarded) is not redirected to onboarding
- [ ] "Skip" on chat goes to review; "Skip" on connect goes to run; all paths reach done
- [ ] `npx tsc --noEmit` passes

---

## Completion Notes

- Date completed: 2026-05-04
- Deviations from spec: The hybrid model is implemented as specified — Executive asks 3 questions, `workspaces.synthesizeOnboardingConfig` (action) calls the LLM to produce a JSON crew config and saves it via `saveOnboardingConfigInternal`. The review page reads `onboardingCrewConfig` from the workspace row and lets the founder rename/delete/add crews before proceeding. The connect step uses the existing `integrations.upsertConnection` mutation — no separate onboarding-specific save path needed. The run page subscribes to `traces.listByTaskId` reactively so the founder sees the live trace as agents process the test task. The done page reads `getOnboardingState` to merge sessionStorage fallback with persisted config before calling `markOnboardingComplete`. The `workspaces` table gained two new fields: `onboardingCrewConfig: v.optional(v.string())` (JSON) and `onboardingStep: v.optional(v.string())` to track wizard progress. The original spec pages (industry, crews, integrations, context) were replaced with the Executive-assisted hybrid pages (chat, review, connect, run, done) per the updated STEP_11 spec.
- New files created not listed above: `components/onboarding/OnboardingReview.tsx`, `components/onboarding/OnboardingConnect.tsx` (not listed in original spec since that spec predated the hybrid model).
- Anything the next agent should know: `workspaces.synthesizeOnboardingConfig` passes the 3 founder answers to the LLM with `mockText` fallback to a SaaS-founder config when no API key is set. The gate in `app/(dashboard)/layout.tsx` redirects unonboarded users to `/onboarding` which immediately redirects to `/onboarding/chat`. A user who skips every step still reaches done and sets `onboardingComplete: true`. `npx tsc --noEmit` passes with zero errors.
