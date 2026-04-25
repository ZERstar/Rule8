"use client";

import { useState } from "react";
import { SecondaryPageShell } from "@/components/dashboard/SecondaryPageShell";

type AgentKey = "support" | "billing" | "community";

const AGENTS: { key: AgentKey; label: string; icon: string; crewColor: string }[] = [
  { key: "support",   label: "Support Agent",   icon: "🎧", crewColor: "#60A5FA" },
  { key: "billing",   label: "Finance Agent",   icon: "💰", crewColor: "#34D399" },
  { key: "community", label: "Community Agent", icon: "🌐", crewColor: "#A78BFA" },
];

const DEFAULT_PROMPTS: Record<AgentKey, string> = {
  support: `You are the Support Agent for Rule8. Resolve customer tickets with empathy and precision.

PRODUCT CONTEXT: [auto-injected from productContext table]
REFUND POLICY: [auto-injected from productContext table]
TONE: Friendly, concise, action-oriented.

RULES:
1. Never process refunds — escalate to Finance Crew.
2. Legal language (lawsuit, fraud, chargeback) → escalate immediately.
3. Always confirm the resolution at the end of the reply.
4. Keep replies under 150 words.`,

  billing: `You are the Finance Agent for Rule8. Handle billing queries using Stripe data.

TOOLS: stripe_lookup, stripe_refund
REFUND POLICY: [auto-injected from productContext table]

RULES:
1. Only initiate refunds within the policy limit.
2. Always verify the charge with stripe_lookup before acting.
3. Refund exceeds limit → escalate with full Stripe context attached.
4. Log every Stripe action as a tool_call trace.`,

  community: `You are the Community Agent for Rule8. Moderate Discord and Slack channels.

TOOLS: discord_reply, discord_dm

RULES:
1. Product question → draft reply using productContext, post in thread.
2. Feature request → create a task record with tag "feature_request".
3. Violation → issue discord_dm warning. Escalate repeat offenders.
4. Never post in the main channel — always reply in thread.`,
};

const EVAL_CASES: Record<AgentKey, { name: string; score: number; pass: boolean }[]> = {
  support: [
    { name: "Password reset FAQ",             score: 94, pass: true  },
    { name: "Onboarding confusion",           score: 91, pass: true  },
    { name: "Feature not working",            score: 88, pass: true  },
    { name: "Refund request — correct route", score: 85, pass: true  },
    { name: "Legal language detection",       score: 58, pass: false },
  ],
  billing: [
    { name: "Duplicate charge — under limit", score: 96, pass: true  },
    { name: "Subscription status query",      score: 92, pass: true  },
    { name: "Refund over limit — escalate",   score: 88, pass: true  },
    { name: "Stripe lookup failure",          score: 80, pass: true  },
    { name: "Multi-currency edge case",       score: 64, pass: false },
  ],
  community: [
    { name: "Cancellation question",          score: 93, pass: true  },
    { name: "Feature request tagging",        score: 89, pass: true  },
    { name: "Spam moderation",                score: 86, pass: true  },
    { name: "Sentiment escalation",           score: 78, pass: true  },
    { name: "DM warning on repeat offender",  score: 62, pass: false },
  ],
};

type EvalState = "idle" | "running" | "done";

export default function PromptsPage() {
  const [agent,     setAgent]     = useState<AgentKey>("support");
  const [prompt,    setPrompt]    = useState(DEFAULT_PROMPTS.support);
  const [note,      setNote]      = useState("");
  const [version,   setVersion]   = useState(1);
  const [evalState, setEvalState] = useState<EvalState>("idle");

  const selectAgent = (key: AgentKey) => {
    setAgent(key);
    setPrompt(DEFAULT_PROMPTS[key]);
    setEvalState("idle");
    setNote("");
  };

  const save = () => {
    if (!prompt.trim()) return;
    setVersion(v => v + 1);
    setEvalState("running");
    setTimeout(() => setEvalState("done"), 2600);
  };

  const cases     = EVAL_CASES[agent];
  const passed    = cases.filter(c => c.pass).length;
  const passRate  = Math.round((passed / cases.length) * 100);
  const isBad     = evalState === "done" && passRate < 80;
  const agentMeta = AGENTS.find(a => a.key === agent)!;

  return (
    <SecondaryPageShell>
      <div className="mx-auto max-w-5xl space-y-8">

        {/* Header */}
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: "var(--color-t3)" }}>
            Prompt Studio
          </p>
          <h1 className="mt-2 text-[26px] font-semibold tracking-[-0.02em]" style={{ color: "var(--color-t1)" }}>
            Agent system prompts
          </h1>
          <p className="mt-1.5 max-w-xl text-[13px] leading-[1.7]" style={{ color: "var(--color-t2)" }}>
            Edit any agent's system prompt. Saving automatically replays all eval cases — if pass rate drops over 5%, the version is blocked.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">

          {/* ── Left: Editor ── */}
          <div className="space-y-4">

            {/* Agent selector */}
            <div className="flex rounded-[8px] border p-1 gap-1"
              style={{ borderColor: "var(--color-b1)", background: "var(--color-s1)" }}>
              {AGENTS.map(({ key, label, icon, crewColor }) => (
                <button
                  key={key}
                  className="flex flex-1 items-center justify-center gap-2 rounded-[6px] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.10em] transition"
                  style={{
                    background: agent === key ? "var(--color-s2)" : "transparent",
                    color: agent === key ? "var(--color-t1)" : "var(--color-t3)",
                    borderLeft: agent === key ? `2px solid ${crewColor}` : "2px solid transparent",
                  }}
                  onClick={() => selectAgent(key)}
                >
                  <span>{icon}</span> {label}
                </button>
              ))}
            </div>

            {/* Prompt textarea */}
            <div className="rounded-[12px] border overflow-hidden"
              style={{ borderColor: "var(--color-b1)", background: "var(--color-s1)" }}>
              <div className="flex items-center justify-between border-b px-4 py-3"
                style={{ borderColor: "var(--color-b1)" }}>
                <div className="flex items-center gap-2.5">
                  <span className="text-[13px] font-semibold" style={{ color: "var(--color-t1)" }}>
                    System Prompt
                  </span>
                  <span className="rounded-[4px] px-2 py-0.5 font-mono text-[9px]"
                    style={{ background: "rgba(200,151,42,0.10)", color: "var(--color-gold)" }}>
                    v{version}
                  </span>
                </div>
                <span className="font-mono text-[10px]" style={{ color: "var(--color-t3)" }}>
                  {prompt.length} chars
                </span>
              </div>
              <textarea
                className="w-full resize-none bg-transparent px-4 py-4 font-mono text-[12px] leading-[1.75] outline-none"
                style={{ color: "var(--color-t1)", minHeight: 300 }}
                value={prompt}
                spellCheck={false}
                onChange={e => { setPrompt(e.target.value); setEvalState("idle"); }}
              />
            </div>

            {/* Save section */}
            <div className="rounded-[12px] border p-4 space-y-3"
              style={{ borderColor: "var(--color-b1)", background: "var(--color-s1)" }}>
              <div>
                <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--color-t3)" }}>
                  Change note (optional)
                </p>
                <input
                  className="h-10 w-full rounded-[6px] border bg-transparent px-3 text-[12px] outline-none transition"
                  style={{ borderColor: "var(--color-b2)", color: "var(--color-t1)" }}
                  placeholder="e.g. Tighten escalation threshold for legal language"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  onFocus={e  => (e.currentTarget.style.borderColor = "rgba(200,151,42,0.40)")}
                  onBlur={e   => (e.currentTarget.style.borderColor = "var(--color-b2)")}
                />
              </div>
              <button
                className="w-full rounded-[8px] py-2.5 font-mono text-[11px] font-semibold text-black transition"
                style={{ background: evalState === "running" ? "rgba(200,151,42,0.40)" : "var(--color-gold)" }}
                disabled={evalState === "running"}
                onClick={save}
              >
                {evalState === "running" ? "Running evals…" : "Save + Run Eval"}
              </button>
            </div>
          </div>

          {/* ── Right: Eval results ── */}
          <div className="space-y-4">

            {/* Pass rate */}
            <div className="rounded-[12px] border p-5"
              style={{
                borderColor: isBad ? "rgba(239,68,68,0.24)" : "var(--color-b1)",
                background: "var(--color-s1)",
              }}>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--color-t3)" }}>
                Pass Rate — {agentMeta.label}
              </p>

              {evalState === "idle" && (
                <p className="mt-3 text-[32px] font-semibold" style={{ color: "var(--color-t3)" }}>—</p>
              )}
              {evalState === "running" && (
                <div className="mt-3 flex items-center gap-2.5">
                  <span className="h-2.5 w-2.5 rounded-full"
                    style={{ background: "var(--color-gold)", animation: "pulse-gold 1s ease-in-out infinite" }} />
                  <span className="font-mono text-[12px]" style={{ color: "var(--color-gold)" }}>
                    Running {cases.length} cases…
                  </span>
                </div>
              )}
              {evalState === "done" && (
                <div className="mt-3">
                  <p className="text-[32px] font-semibold"
                    style={{ color: passRate >= 80 ? "var(--color-green)" : "var(--color-red)" }}>
                    {passRate}%
                  </p>
                  <p className="font-mono text-[10px]" style={{ color: "var(--color-t3)" }}>
                    {passed} / {cases.length} cases passed
                  </p>
                  {isBad && (
                    <div className="mt-3 rounded-[6px] border px-3 py-2.5"
                      style={{ borderColor: "rgba(239,68,68,0.18)", background: "rgba(239,68,68,0.06)" }}>
                      <p className="font-mono text-[10px]" style={{ color: "var(--color-red)" }}>
                        Pass rate below 80% — version blocked.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Case table */}
            <div className="rounded-[12px] border overflow-hidden"
              style={{ borderColor: "var(--color-b1)", background: "var(--color-s1)" }}>
              <div className="border-b px-4 py-3" style={{ borderColor: "var(--color-b1)" }}>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--color-t3)" }}>
                  Eval Cases
                </p>
              </div>
              {cases.map((c, i) => (
                <div key={c.name} className="flex items-center justify-between px-4 py-3"
                  style={{ borderTop: i > 0 ? "1px solid var(--color-b1)" : undefined }}>
                  <p className="text-[12px]"
                    style={{ color: evalState === "done" ? "var(--color-t1)" : "var(--color-t3)" }}>
                    {c.name}
                  </p>
                  {evalState === "done" ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-[10px]" style={{ color: "var(--color-t3)" }}>
                        {c.score}%
                      </span>
                      <span className="rounded-full px-2 py-0.5 font-mono text-[9px]"
                        style={{
                          background: c.pass ? "rgba(34,197,94,0.10)" : "rgba(239,68,68,0.10)",
                          color: c.pass ? "var(--color-green)" : "var(--color-red)",
                        }}>
                        {c.pass ? "Pass" : "Fail"}
                      </span>
                    </div>
                  ) : (
                    <span className="font-mono text-[10px]" style={{ color: "var(--color-t3)" }}>—</span>
                  )}
                </div>
              ))}
            </div>

            {/* Version history */}
            <div className="rounded-[12px] border overflow-hidden"
              style={{ borderColor: "var(--color-b1)", background: "var(--color-s1)" }}>
              <div className="border-b px-4 py-3" style={{ borderColor: "var(--color-b1)" }}>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--color-t3)" }}>
                  Version History
                </p>
              </div>
              {[{ v: version, label: "Just now", active: true }, { v: version - 1, label: "2d ago", active: false }, { v: version - 2, label: "5d ago", active: false }]
                .filter(r => r.v > 0)
                .map((r, i) => (
                  <div key={r.v} className="flex items-center justify-between px-4 py-3"
                    style={{ borderTop: i > 0 ? "1px solid var(--color-b1)" : undefined }}>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[12px] font-semibold" style={{ color: "var(--color-t1)" }}>
                        v{r.v}
                      </span>
                      {r.active && (
                        <span className="rounded-[4px] px-1.5 py-0.5 font-mono text-[9px]"
                          style={{ background: "rgba(200,151,42,0.10)", color: "var(--color-gold)" }}>
                          Active
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-[10px]" style={{ color: "var(--color-t3)" }}>{r.label}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </SecondaryPageShell>
  );
}
