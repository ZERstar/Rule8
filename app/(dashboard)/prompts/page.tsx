"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { WORKSPACE_ID } from "@/lib/constants";
import { SecondaryPageShell } from "@/components/dashboard/SecondaryPageShell";

const EVAL_RESULTS = [
  { case: "Billing refund — under limit",          score: 96, pass: true  },
  { case: "Support — password reset FAQ",          score: 91, pass: true  },
  { case: "Community — spam moderation",           score: 88, pass: true  },
  { case: "Billing refund — over limit escalation",score: 82, pass: true  },
  { case: "Support — legal language detection",    score: 61, pass: false },
];

const SYSTEM_PROMPT_DEFAULTS: Record<string, string> = {
  support: `You are the Support Agent for Rule8. Your job is to resolve customer support tickets with empathy and precision.

PRODUCT CONTEXT: [auto-injected from productContext table]
REFUND POLICY: [auto-injected from productContext table]
TONE: Friendly, concise, action-oriented.

RULES:
1. Never process refunds — escalate to Finance Crew.
2. If legal language appears (lawsuit, fraud, chargeback), escalate immediately.
3. Always confirm the resolution at the end of the reply.
4. Keep replies under 150 words.`,
  billing: `You are the Finance Agent for Rule8. Your job is to handle billing queries using Stripe data.

You have access to: stripe_lookup, stripe_refund tools.
REFUND POLICY: [auto-injected from productContext table]

RULES:
1. Only initiate refunds within the policy limit.
2. Always verify the charge with stripe_lookup before acting.
3. If refund exceeds limit, escalate with full Stripe data attached.
4. Log every Stripe action as a tool_call trace.`,
  community: `You are the Community Agent for Rule8. You moderate Discord and Slack channels.

You have access to: discord_reply, discord_dm tools.

RULES:
1. For product questions: draft reply using productContext, post in thread.
2. For feature requests: create a task record with tag "feature_request".
3. For violations: issue discord_dm warning. Escalate repeat offenders.
4. Never post in the main channel — always reply in thread.`,
};

export default function PromptsPage() {
  const agents = useQuery(api.agents.list, { workspaceId: WORKSPACE_ID });
  const [selectedTag, setSelectedTag] = useState<"support" | "billing" | "community">("support");
  const [prompt, setPrompt] = useState(SYSTEM_PROMPT_DEFAULTS.support);
  const [evalState, setEvalState] = useState<"idle" | "running" | "done">("idle");
  const [saveNote, setSaveNote] = useState("");
  const [version, setVersion] = useState(1);

  const handleAgentChange = (tag: "support" | "billing" | "community") => {
    setSelectedTag(tag);
    setPrompt(SYSTEM_PROMPT_DEFAULTS[tag]);
    setEvalState("idle");
  };

  const handleSave = () => {
    if (!prompt.trim()) return;
    setEvalState("running");
    setVersion((v) => v + 1);
    setTimeout(() => setEvalState("done"), 2800);
  };

  const TABS: { key: "support" | "billing" | "community"; label: string; icon: string }[] = [
    { key: "support",   label: "Support Agent",   icon: "🎧" },
    { key: "billing",   label: "Finance Agent",   icon: "💰" },
    { key: "community", label: "Community Agent", icon: "🌐" },
  ];

  const passCount = EVAL_RESULTS.filter((r) => r.pass).length;
  const passRate = Math.round((passCount / EVAL_RESULTS.length) * 100);

  return (
    <SecondaryPageShell>
      <div className="mx-auto max-w-5xl">
        {/* Page header */}
        <div className="mb-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: "var(--color-t3)" }}>
            Prompt Studio
          </p>
          <h1 className="mt-2 text-[26px] font-semibold tracking-[-0.02em]" style={{ color: "var(--color-t1)" }}>
            Agent system prompts
          </h1>
          <p className="mt-2 text-[13px] leading-[1.7]" style={{ color: "var(--color-t2)" }}>
            Edit an agent's system prompt and run evals to verify the change doesn't break existing cases.
            Saving triggers an automatic eval replay across all stored test cases.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          {/* Left: Editor */}
          <div className="flex flex-col gap-4">
            {/* Agent tabs */}
            <div
              className="flex rounded-[8px] border p-1"
              style={{ borderColor: "var(--color-b1)", background: "var(--color-s1)" }}
            >
              {TABS.map(({ key, label, icon }) => (
                <button
                  key={key}
                  className="flex flex-1 items-center justify-center gap-2 rounded-[6px] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] transition"
                  style={{
                    background: selectedTag === key ? "var(--color-s2)" : "transparent",
                    color: selectedTag === key ? "var(--color-t1)" : "var(--color-t3)",
                  }}
                  onClick={() => handleAgentChange(key)}
                >
                  {icon} {label}
                </button>
              ))}
            </div>

            {/* Prompt editor */}
            <div
              className="rounded-[10px] border overflow-hidden"
              style={{ borderColor: "var(--color-b1)", background: "var(--color-s1)" }}
            >
              <div
                className="flex items-center justify-between border-b px-4 py-3"
                style={{ borderColor: "var(--color-b1)" }}
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] font-semibold" style={{ color: "var(--color-t1)" }}>
                    System Prompt
                  </span>
                  <span
                    className="rounded-[4px] px-2 py-0.5 font-mono text-[9px]"
                    style={{ background: "var(--color-s2)", color: "var(--color-t3)" }}
                  >
                    v{version}
                  </span>
                </div>
                <span className="font-mono text-[10px]" style={{ color: "var(--color-t3)" }}>
                  {prompt.length} chars
                </span>
              </div>
              <textarea
                className="w-full resize-none bg-transparent px-4 py-4 font-mono text-[12px] leading-[1.7] outline-none"
                style={{ color: "var(--color-t1)", minHeight: 320 }}
                value={prompt}
                onChange={(e) => { setPrompt(e.target.value); setEvalState("idle"); }}
                spellCheck={false}
              />
            </div>

            {/* Save + note */}
            <div
              className="rounded-[10px] border p-4"
              style={{ borderColor: "var(--color-b1)", background: "var(--color-s1)" }}
            >
              <label className="block">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--color-t3)" }}>
                  Change note (optional)
                </span>
                <input
                  className="mt-2 h-10 w-full rounded-[6px] border bg-transparent px-3 text-[12px] outline-none transition"
                  style={{ borderColor: "var(--color-b2)", color: "var(--color-t1)" }}
                  onFocus={(e) => ((e.currentTarget as HTMLInputElement).style.borderColor = "rgba(200,151,42,0.40)")}
                  onBlur={(e) => ((e.currentTarget as HTMLInputElement).style.borderColor = "var(--color-b2)")}
                  placeholder="e.g. Tighten escalation threshold for legal language"
                  value={saveNote}
                  onChange={(e) => setSaveNote(e.target.value)}
                />
              </label>
              <button
                className="mt-3 w-full rounded-[8px] py-2.5 font-mono text-[11px] font-semibold text-black transition"
                style={{
                  background: evalState === "running" ? "rgba(200,151,42,0.4)" : "var(--color-gold)",
                  cursor: evalState === "running" ? "not-allowed" : "pointer",
                }}
                disabled={evalState === "running"}
                onClick={handleSave}
              >
                {evalState === "running" ? "Running evals..." : "Save + Run Eval"}
              </button>
            </div>
          </div>

          {/* Right: Eval results */}
          <div className="flex flex-col gap-4">
            {/* Summary */}
            <div
              className="rounded-[10px] border p-4"
              style={{
                borderColor: evalState === "done" && passRate < 80 ? "rgba(239,68,68,0.24)" : "var(--color-b1)",
                background: "var(--color-s1)",
              }}
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--color-t3)" }}>
                Eval Pass Rate
              </p>
              {evalState === "idle" && (
                <p className="mt-2 text-[28px] font-semibold" style={{ color: "var(--color-t3)" }}>—</p>
              )}
              {evalState === "running" && (
                <div className="mt-2 flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ background: "var(--color-gold)", animation: "pulse-gold 1s ease-in-out infinite" }}
                  />
                  <span className="font-mono text-[12px]" style={{ color: "var(--color-gold)" }}>
                    Running {EVAL_RESULTS.length} cases...
                  </span>
                </div>
              )}
              {evalState === "done" && (
                <>
                  <p className="mt-2 text-[28px] font-semibold" style={{ color: passRate >= 80 ? "var(--color-green)" : "var(--color-red)" }}>
                    {passRate}%
                  </p>
                  <p className="font-mono text-[10px]" style={{ color: "var(--color-t3)" }}>
                    {passCount} / {EVAL_RESULTS.length} cases passed
                  </p>
                  {passRate < 80 && (
                    <div
                      className="mt-3 rounded-[6px] border px-3 py-2"
                      style={{ borderColor: "rgba(239,68,68,0.20)", background: "rgba(239,68,68,0.06)" }}
                    >
                      <p className="font-mono text-[10px]" style={{ color: "var(--color-red)" }}>
                        Pass rate dropped below 80%. Prompt not activated.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Case results */}
            <div
              className="rounded-[10px] border overflow-hidden"
              style={{ borderColor: "var(--color-b1)", background: "var(--color-s1)" }}
            >
              <div className="border-b px-4 py-3" style={{ borderColor: "var(--color-b1)" }}>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--color-t3)" }}>
                  Eval Cases
                </p>
              </div>
              {EVAL_RESULTS.map((r, i) => (
                <div
                  key={r.case}
                  className="flex items-center justify-between px-4 py-3"
                  style={{ borderTop: i > 0 ? "1px solid var(--color-b1)" : undefined }}
                >
                  <p className="text-[12px]" style={{ color: evalState === "done" ? "var(--color-t1)" : "var(--color-t3)" }}>
                    {r.case}
                  </p>
                  <div className="flex shrink-0 items-center gap-2">
                    {evalState === "done" && (
                      <>
                        <span className="font-mono text-[10px]" style={{ color: "var(--color-t3)" }}>
                          {r.score}%
                        </span>
                        <span
                          className="rounded-full px-2 py-0.5 font-mono text-[9px]"
                          style={{
                            background: r.pass ? "rgba(34,197,94,0.10)" : "rgba(239,68,68,0.10)",
                            color: r.pass ? "var(--color-green)" : "var(--color-red)",
                          }}
                        >
                          {r.pass ? "Pass" : "Fail"}
                        </span>
                      </>
                    )}
                    {evalState === "running" && (
                      <span className="font-mono text-[10px]" style={{ color: "var(--color-t3)" }}>—</span>
                    )}
                    {evalState === "idle" && (
                      <span className="font-mono text-[10px]" style={{ color: "var(--color-t3)" }}>—</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Version history */}
            <div
              className="rounded-[10px] border overflow-hidden"
              style={{ borderColor: "var(--color-b1)", background: "var(--color-s1)" }}
            >
              <div className="border-b px-4 py-3" style={{ borderColor: "var(--color-b1)" }}>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--color-t3)" }}>
                  Version History
                </p>
              </div>
              {[
                { v: version, label: "Current", active: true },
                { v: version - 1, label: "2d ago", active: false },
                { v: version - 2, label: "5d ago", active: false },
              ].filter((row) => row.v > 0).map((row) => (
                <div
                  key={row.v}
                  className="flex items-center justify-between px-4 py-3"
                  style={{ borderTop: row.v !== version ? "1px solid var(--color-b1)" : undefined }}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px]" style={{ color: "var(--color-t1)" }}>v{row.v}</span>
                    {row.active && (
                      <span
                        className="rounded-[4px] px-1.5 py-0.5 font-mono text-[9px]"
                        style={{ background: "rgba(200,151,42,0.10)", color: "var(--color-gold)" }}
                      >
                        Active
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-[10px]" style={{ color: "var(--color-t3)" }}>{row.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </SecondaryPageShell>
  );
}
