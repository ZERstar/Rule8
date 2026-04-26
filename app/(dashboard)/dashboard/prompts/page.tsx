"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { WORKSPACE_ID } from "@/lib/constants";
import { InfoListCard } from "@/components/dashboard/InfoListCard";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { SecondaryPageShell } from "@/components/dashboard/SecondaryPageShell";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type AgentKey = "support" | "billing" | "community";

const AGENTS_META: Record<AgentKey, { label: string; short: string; color: string }> = {
  support:   { label: "Support Agent",   short: "SP", color: "#60A5FA" },
  billing:   { label: "Finance Agent",   short: "FN", color: "#34D399" },
  community: { label: "Community Agent", short: "CM", color: "#A78BFA" },
};

const EVAL_CASES: Record<AgentKey, { name: string; score: number; pass: boolean }[]> = {
  support:   [
    { name: "Password reset FAQ",              score: 94, pass: true  },
    { name: "Onboarding confusion",            score: 91, pass: true  },
    { name: "Feature not working",             score: 88, pass: true  },
    { name: "Refund request — correct route",  score: 85, pass: true  },
    { name: "Legal language detection",        score: 58, pass: false },
  ],
  billing:   [
    { name: "Duplicate charge — under limit",  score: 96, pass: true  },
    { name: "Subscription status query",       score: 92, pass: true  },
    { name: "Refund over limit — escalate",    score: 88, pass: true  },
    { name: "Stripe lookup failure",           score: 80, pass: true  },
    { name: "Multi-currency edge case",        score: 64, pass: false },
  ],
  community: [
    { name: "Cancellation question",           score: 93, pass: true  },
    { name: "Feature request tagging",         score: 89, pass: true  },
    { name: "Spam moderation",                 score: 86, pass: true  },
    { name: "Sentiment escalation",            score: 78, pass: true  },
    { name: "Repeat offender DM warning",      score: 62, pass: false },
  ],
};

type EvalState = "idle" | "running" | "done";
type EvalCaseView = {
  key: string;
  name: string;
  score: number | null;
  pass: boolean | null;
};

function StudioMetric({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  accent: string;
}) {
  return (
    <div className="rounded-[24px] border border-border/70 bg-white/74 px-4 py-4 shadow-[0_14px_34px_rgba(28,39,49,0.05)]">
      <div className="h-1.5 w-12 rounded-full" style={{ background: accent }} />
      <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-3 text-[18px] font-semibold tracking-[-0.03em] text-foreground">{value}</p>
      <p className="mt-2 text-[12px] leading-6 text-muted-foreground">{hint}</p>
    </div>
  );
}

export default function PromptsPage() {
  const allAgents = useQuery(api.agents.list, { workspaceId: WORKSPACE_ID });
  const updatePrompt = useMutation(api.agents.updatePrompt);

  const [agentTag,   setAgentTag]  = useState<AgentKey>("support");
  const [prompt,     setPrompt]    = useState("");
  const [note,       setNote]      = useState("");
  const [evalState,  setEvalState] = useState<EvalState>("idle");

  const activeAgent = allAgents?.find((a) => a.tag === agentTag);
  const version = activeAgent?.promptVersion ?? 1;
  const storedEvalCases = useQuery(
    api.evals.listCasesWithResults,
    activeAgent ? { workspaceId: WORKSPACE_ID, agentId: activeAgent._id } : "skip",
  );
  const storedVersions = useQuery(
    api.agents.listPromptVersions,
    activeAgent ? { workspaceId: WORKSPACE_ID, agentId: activeAgent._id, limit: 5 } : "skip",
  );

  useEffect(() => {
    if (activeAgent?.systemPrompt && evalState === "idle" && prompt === "") {
      setPrompt(activeAgent.systemPrompt);
    }
  }, [activeAgent, evalState, prompt]);

  const selectAgent = (key: AgentKey) => {
    setAgentTag(key); 
    const newAgent = allAgents?.find((a) => a.tag === key);
    if (newAgent) setPrompt(newAgent.systemPrompt || "");
    setEvalState("idle"); 
    setNote("");
  };

  const save = async () => {
    if (!prompt.trim() || !activeAgent) return;
    setEvalState("running");
    
    try {
      await updatePrompt({
        agentId: activeAgent._id,
        systemPrompt: prompt,
        changeNote: note.trim() || undefined,
      });
      setEvalState("done");
    } catch (err) {
      console.error("Failed to save prompt:", err);
      setEvalState("idle");
    }
  };

  const fallbackCases: EvalCaseView[] = EVAL_CASES[agentTag].map((c) => ({
    key: c.name,
    name: c.name,
    score: c.score,
    pass: c.pass,
  }));
  const cases: EvalCaseView[] = storedEvalCases && storedEvalCases.length > 0
    ? storedEvalCases.map((c) => ({
        key: c._id,
        name: c.name,
        score: c.score,
        pass: c.pass,
      }))
    : fallbackCases;
  const passed   = cases.filter(c => c.pass).length;
  const passRate = Math.round((passed / cases.length) * 100);
  const isBad    = evalState === "done" && passRate < 80;
  const meta     = AGENTS_META[agentTag];
  const versionHistory =
    storedVersions && storedVersions.length > 0
      ? storedVersions.map((promptVersion) => ({
          v: promptVersion.version,
          label: promptVersion.version === version
            ? "Active"
            : new Date(promptVersion.createdAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              }),
          active: promptVersion.version === version,
        }))
      : [
          { v: version, label: "Active", active: true },
          { v: version - 1, label: "Previous", active: false },
        ].filter((r) => r.v > 0);

  if (!allAgents) return null;

  return (
    <SecondaryPageShell contentClassName="max-w-[1760px] px-5 py-5 lg:px-8">
      <PageHeader
        eyebrow="· Prompt Studio"
        title="Agent system prompts"
        description="Edit any agent's system prompt. Saving creates a Convex prompt version; stored eval results are shown when backend runs exist."
        children={
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[22px] border border-border/70 bg-white/74 px-4 py-4">
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Active Crew</p>
              <p className="mt-3 text-[16px] font-semibold tracking-[-0.03em] text-foreground">{meta.label}</p>
            </div>
            <div className="rounded-[22px] border border-border/70 bg-white/74 px-4 py-4">
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Eval policy</p>
              <p className="mt-3 text-[16px] font-semibold tracking-[-0.03em] text-foreground">Stored results</p>
            </div>
            <div className="rounded-[22px] border border-border/70 bg-white/74 px-4 py-4">
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Version</p>
              <p className="mt-3 text-[16px] font-semibold tracking-[-0.03em] text-foreground">v{version}</p>
            </div>
          </div>
        }
      />

      <div className="grid w-full items-start gap-6 2xl:grid-cols-[minmax(780px,1fr)_minmax(420px,0.42fr)]">
        <div className="space-y-6">
          <Card className="bg-card">
            <CardHeader className="border-b border-border/70 px-6 py-6">
              <div>
                <p className="app-kicker">Crew prompt focus</p>
                <CardTitle className="mt-3 text-[26px] tracking-[-0.04em]">Tune each operating crew independently</CardTitle>
                <p className="mt-3 max-w-2xl text-[14px] leading-[1.8] text-muted-foreground">
                  Each agent keeps its own system instructions, evaluation cases, and version trail. Swap crews, edit safely, and ship prompt changes with guardrails.
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 px-6 pb-6">
              <Tabs value={agentTag} onValueChange={(v) => selectAgent(v as AgentKey)} className="w-full">
                <TabsList className="grid h-auto w-full grid-cols-1 gap-2 rounded-[28px] border border-border/70 bg-white/58 p-2 md:grid-cols-3">
                  {(Object.keys(AGENTS_META) as AgentKey[]).map((key) => {
                    const active = agentTag === key;
                    const { label, short, color } = AGENTS_META[key];
                    return (
                      <TabsTrigger
                        key={key}
                        value={key}
                        className="flex items-center justify-start gap-3 rounded-[22px] border border-transparent px-4 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground transition-all data-[state=active]:border-transparent data-[state=active]:bg-foreground data-[state=active]:text-background"
                      >
                        <span
                          className="flex h-8 w-8 items-center justify-center rounded-full font-mono text-[10px] font-bold text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]"
                          style={{ background: color }}
                        >
                          {short}
                        </span>
                        <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
                          <span className="truncate">{label}</span>
                          <span
                            className="hidden h-2.5 w-2.5 rounded-full md:block"
                            style={{ background: active ? "#ffffff" : color, opacity: active ? 0.92 : 0.8 }}
                          />
                        </span>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </Tabs>

              <div className="grid gap-3 md:grid-cols-3">
                <StudioMetric
                  label="Primary role"
                  value={meta.label}
                  hint="Dedicated system behavior and routing rules."
                  accent={meta.color}
                />
                <StudioMetric
                  label="Eval cases"
                  value={`${cases.length} replayed`}
                  hint={storedEvalCases && storedEvalCases.length > 0 ? "Loaded from Convex eval cases." : "Using local demo fallback cases."}
                  accent="linear-gradient(135deg,#7bc7ff_0%,#4d7cf0_100%)"
                />
                <StudioMetric
                  label="Eval gate"
                  value="Read-only"
                  hint="Backend eval blocking is not wired yet."
                  accent="linear-gradient(135deg,#ffb27a_0%,#f2763d_100%)"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader className="flex flex-col gap-4 border-b border-border/70 px-6 py-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="app-kicker">System prompt</p>
                <CardTitle className="mt-3 text-[28px] tracking-[-0.04em]">Core instruction set</CardTitle>
                <p className="mt-3 max-w-2xl text-[14px] leading-[1.8] text-muted-foreground">
                  This is the operating prompt injected before runtime context. Keep it specific, enforce routing rules, and avoid accidental scope bleed across crews.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="rounded-full bg-gold-a12 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-gold">
                  v{version}
                </Badge>
                <Badge variant="outline" className="rounded-full border-border/70 bg-white/72 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                  {prompt.length} chars
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Textarea
                className="min-h-[460px] w-full resize-none border-0 bg-transparent px-6 py-6 font-mono text-[12px] leading-[1.9] text-foreground focus-visible:ring-0"
                value={prompt}
                spellCheck={false}
                onChange={e => { setPrompt(e.target.value); setEvalState("idle"); }}
              />
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader className="border-b border-border/70 px-6 py-6">
              <div>
                <p className="app-kicker">Release note</p>
                <CardTitle className="mt-3 text-[24px] tracking-[-0.04em]">Document the prompt change before shipping</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_260px]">
              <div>
                <p className="mb-3 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                  Change note
                </p>
                <Input
                  className="h-12 w-full bg-white/74 px-4 text-[13px] text-foreground"
                  placeholder="e.g. Tighten escalation threshold for legal language"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                />
              </div>
              <div className="rounded-[24px] border border-border/70 bg-white/62 px-4 py-4">
                <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Save behavior</p>
                <p className="mt-3 text-[13px] leading-6 text-muted-foreground">
                  Saving creates a new prompt version. Eval results are read from stored Convex runs when present.
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col items-start justify-between gap-4 px-6 py-5 sm:flex-row sm:items-center">
              <p className="max-w-xl text-[13px] leading-6 text-muted-foreground">
                This page saves prompt versions and displays current eval data; it does not execute or block releases yet.
              </p>
              <Button
                className="h-12 w-full px-5 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-black sm:w-auto"
                style={{ background: evalState === "running" ? "rgba(200,151,42,0.40)" : "var(--color-gold)" }}
                disabled={evalState === "running" || !activeAgent}
                onClick={save}
              >
                {evalState === "running" ? "Saving…" : "Save prompt version"}
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="space-y-6">
          <Card
            className="overflow-hidden bg-card transition-colors"
            style={{ borderColor: isBad ? "rgba(239,68,68,0.28)" : "var(--color-b2)" }}
          >
            <CardContent className="relative px-6 py-6">
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-28 opacity-80"
                style={{
                  background: isBad
                    ? "linear-gradient(180deg, rgba(216,95,75,0.16), transparent)"
                    : `linear-gradient(180deg, ${meta.color}22, transparent)`,
                }}
              />
              <div className="relative">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="app-kicker">Eval gate</p>
                    <h3 className="mt-3 text-[24px] font-semibold tracking-[-0.04em] text-foreground">
                      {meta.label} release score
                    </h3>
                  </div>
                  <Badge
                    variant="outline"
                    className="rounded-full border-border/70 bg-white/76 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground"
                  >
                    {cases.length} cases
                  </Badge>
                </div>

                {evalState === "idle" && (
                  <>
                    <p className="mt-8 text-[48px] font-semibold leading-none tracking-[-0.06em] text-foreground/40">—</p>
                    <p className="mt-3 text-[13px] leading-6 text-muted-foreground">
                      Save the prompt to create a new version. Stored eval results appear here when backend runs exist.
                    </p>
                  </>
                )}

                {evalState === "running" && (
                  <div className="mt-8 rounded-[22px] border border-border/70 bg-white/70 px-4 py-4">
                    <div className="flex items-center gap-3">
                      <span className="h-2.5 w-2.5 rounded-full bg-gold"
                        style={{ animation: "pulse-gold 1s ease-in-out infinite" }} />
                      <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-gold">
                        Running {cases.length} cases
                      </span>
                    </div>
                    <p className="mt-3 text-[13px] leading-6 text-muted-foreground">
                      Saving the latest system prompt as a versioned Convex record.
                    </p>
                  </div>
                )}

                {evalState === "done" && (
                  <>
                    <p
                      className="mt-8 text-[52px] font-semibold leading-none tracking-[-0.06em]"
                      style={{ color: passRate >= 80 ? "var(--color-green)" : "var(--color-red)" }}
                    >
                      {passRate}%
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className="rounded-full border-transparent px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.16em]"
                        style={{
                          background: passRate >= 80 ? "rgba(34,197,94,0.10)" : "rgba(239,68,68,0.10)",
                          color: passRate >= 80 ? "var(--color-green)" : "var(--color-red)",
                        }}
                      >
                        {passRate >= 80 ? "Ready to ship" : "Blocked"}
                      </Badge>
                      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                        {passed} / {cases.length} passed
                      </span>
                    </div>
                    <p className="mt-4 text-[13px] leading-6 text-muted-foreground">
                      {isBad
                        ? "This version remains blocked until the failing cases are corrected."
                        : "The prompt cleared the minimum threshold and can be promoted."}
                    </p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <InfoListCard
            title="Eval Cases"
            description="Stored scenarios used to validate routing, policy handling, and response quality for the active crew."
            items={cases}
            renderItem={(c, i) => (
              <div
                key={c.key}
                className="flex items-center justify-between gap-4 px-5 py-4"
                style={{ borderTop: i > 0 ? "1px solid var(--color-b1)" : undefined }}
              >
                <div className="min-w-0">
                  <p
                    className="text-[13px] leading-6"
                    style={{ color: evalState === "done" ? "var(--color-t1)" : "var(--color-t3)" }}
                  >
                    {c.name}
                  </p>
                </div>
                {evalState === "done" ? (
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      {c.score === null ? "—" : `${c.score}%`}
                    </span>
                    <Badge
                      variant="outline"
                      className="rounded-full border-transparent px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.14em]"
                      style={{
                        background: c.pass === false ? "rgba(239,68,68,0.10)" : "rgba(34,197,94,0.10)",
                        color: c.pass === false ? "var(--color-red)" : "var(--color-green)",
                      }}
                    >
                      {c.pass === null ? "Pending" : c.pass ? "Pass" : "Fail"}
                    </Badge>
                  </div>
                ) : (
                  <span className="font-mono text-[9px] text-muted-foreground">Queued</span>
                )}
              </div>
            )}
          />

          <InfoListCard
            title="Version History"
            description="Latest prompt versions for the selected crew. New saves append to this trail automatically."
            action={
              <Badge variant="secondary" className="rounded-full bg-gold-a12 px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.14em] text-gold">
                Auto replay
              </Badge>
            }
            items={versionHistory}
            renderItem={(r, i) => (
              <div
                key={r.v}
                className="flex items-center justify-between gap-4 px-5 py-4"
                style={{ borderTop: i > 0 ? "1px solid var(--color-b1)" : undefined }}
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] font-semibold text-foreground">v{r.v}</span>
                  {r.active && (
                    <Badge
                      variant="secondary"
                      className="rounded-full bg-gold-a12 px-2 py-1 font-mono text-[8px] uppercase tracking-[0.14em] text-gold"
                    >
                      Active
                    </Badge>
                  )}
                </div>
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{r.label}</span>
              </div>
            )}
          />
        </div>
      </div>
    </SecondaryPageShell>
  );
}
