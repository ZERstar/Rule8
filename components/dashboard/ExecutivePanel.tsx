"use client";

import { KeyboardEvent, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useAction } from "convex/react";

import { api } from "@/convex/_generated/api";
import { ROUTES } from "@/lib/routes";
import { useAuthenticatedQuery } from "@/lib/use-authenticated-query";
import { useWorkspaceId } from "@/lib/workspace-context";

// ─── Page-specific quick prompts ─────────────────────────────────────────────

const PAGE_PROMPTS: Record<string, string[]> = {
  [ROUTES.dashboardActivity]:     ["Summarise recent agent activity", "Any anomalies in the last hour?", "Which agent ran the most tasks?"],
  [ROUTES.dashboardEvals]:        ["What is the current pass rate?", "Which eval cases are failing?", "Is any agent ready to ship?"],
  [ROUTES.dashboardInvoices]:     ["Summarise finance tasks", "Flag high-cost items", "Any failed payment tasks?"],
  [ROUTES.dashboardTickets]:      ["Prioritise open tickets", "Which crew handles the most tickets?", "Summarise escalated tickets"],
  [ROUTES.dashboardEscalations]:  ["Summarise open escalations", "Which crew is most flagged?", "Should I approve these?"],
  [ROUTES.dashboardIntegrations]: ["Which integrations are active?", "What does Finance Crew use?", "Any disconnected integrations?"],
  [ROUTES.dashboardPrompts]:      ["Review my latest prompt changes", "What should I improve?", "Is the active agent ready to ship?"],
  [ROUTES.dashboardProductContext]: ["What product context is missing?", "Summarise my refund policy", "What will agents use from this page?"],
  [ROUTES.dashboardProfile]:      ["Check workspace health", "What is my total agent count?", "Any issues to address?"],
  [ROUTES.dashboardSettings]:     ["What settings should I review?", "Check system posture", "Any recommended changes?"],
};

const DEFAULT_PROMPTS = [
  "Summarise workspace status",
  "Any issues to address?",
  "What is happening right now?",
];

// ─── Page context card data ───────────────────────────────────────────────────

function usePageContext(pathname: string) {
  const workspaceId = useWorkspaceId();
  const stats     = useAuthenticatedQuery(api.tasks.getStats,  { workspaceId });
  const agents    = useAuthenticatedQuery(api.agents.list,      { workspaceId });
  const escalated = useAuthenticatedQuery(api.tasks.listEscalated, { workspaceId });

  if (pathname === ROUTES.dashboardActivity || pathname === ROUTES.dashboardEvals) {
    return [
      { label: "Tasks today",  value: stats?.tasksToday  ?? "—" },
      { label: "Escalated",    value: stats?.escalated   ?? "—" },
      { label: "Total agents", value: agents?.length     ?? "—" },
    ];
  }
  if (pathname === ROUTES.dashboardInvoices) {
    const finance = agents?.filter((a) => a.crewTag === "finance").length ?? 0;
    return [
      { label: "Finance agents", value: finance },
      { label: "Tasks today",    value: stats?.tasksToday ?? "—" },
      { label: "Escalated",      value: stats?.escalated  ?? "—" },
    ];
  }
  if (pathname === ROUTES.dashboardTickets) {
    const support = agents?.filter((a) => a.crewTag === "support" || a.crewTag === "community").length ?? 0;
    return [
      { label: "Support agents", value: support },
      { label: "Tasks today",    value: stats?.tasksToday ?? "—" },
      { label: "Escalated",      value: stats?.escalated  ?? "—" },
    ];
  }
  if (pathname === ROUTES.dashboardEscalations) {
    return [
      { label: "Open escalations", value: escalated?.length ?? "—" },
      { label: "Tasks today",      value: stats?.tasksToday ?? "—" },
      { label: "Total agents",     value: agents?.length    ?? "—" },
    ];
  }
  if (pathname === ROUTES.dashboardIntegrations) {
    return [
      { label: "Total agents",  value: agents?.length    ?? "—" },
      { label: "Tasks today",   value: stats?.tasksToday ?? "—" },
      { label: "Escalated",     value: stats?.escalated  ?? "—" },
    ];
  }
  if (pathname === ROUTES.dashboardPrompts) {
    return [
      { label: "Total agents",  value: agents?.length    ?? "—" },
      { label: "Tasks today",   value: stats?.tasksToday ?? "—" },
      { label: "Escalated",     value: stats?.escalated  ?? "—" },
    ];
  }
  // profile / settings / fallback
  return [
    { label: "Total agents", value: agents?.length    ?? "—" },
    { label: "Tasks today",  value: stats?.tasksToday ?? "—" },
    { label: "Escalated",    value: stats?.escalated  ?? "—" },
  ];
}

// ─── Typing indicator ─────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div className="self-start flex items-center gap-1 rounded-[18px] bg-[var(--color-bg-secondary)] px-3 py-2">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="block h-1.5 w-1.5 rounded-full bg-[var(--color-t3)]"
          style={{ animation: "pulseDot 1.2s ease-in-out infinite", animationDelay: `${i * 0.2}s` }}
        />
      ))}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

type Msg = { id: number; role: "founder" | "executive"; text: string };

export function ExecutivePanel() {
  const workspaceId = useWorkspaceId();
  const pathname    = usePathname();
  const sendChat    = useAction(api.chat.send);
  const rawMessages = useAuthenticatedQuery(api.chat.list, { workspaceId });

  const [input,    setInput]    = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const messages: Msg[] = (rawMessages ?? []).map(
    (m: { role: string; text: string }, i: number) => ({
      id: i,
      role: m.role === "founder" ? "founder" : "executive",
      text: m.text,
    }),
  );

  const quickPrompts  = PAGE_PROMPTS[pathname] ?? DEFAULT_PROMPTS;
  const contextStats  = usePageContext(pathname);

  function getPageContext() {
    return {
      page: pathname,
      snapshot: JSON.stringify(contextStats),
    };
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isTyping]);

  async function send(text: string) {
    if (!text.trim() || isTyping) return;
    setInput("");
    setIsTyping(true);
    try {
      await sendChat({
        workspaceId,
        text,
        pageContext: getPageContext(),
      });
    } catch (err) {
      console.error("Executive chat error:", err);
    } finally {
      setIsTyping(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  return (
    <div className="flex h-full w-[300px] shrink-0 flex-col overflow-hidden border-l border-[var(--color-border)] bg-[#fbfaf7]">

      {/* ── Header ── */}
      <div className="border-b border-[var(--color-border)] px-5 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[var(--color-t3)]">
              Executive
            </p>
            <h2
              className="mt-2 text-[22px] font-semibold tracking-[-0.05em] text-[var(--color-t1)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Decision desk
            </h2>
          </div>
          <span className="rounded-full bg-white px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-accent-green)] shadow-[0_8px_20px_rgba(28,39,49,0.05)]">
            Live
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => send("Clarify the data on this page")}
            disabled={isTyping}
            className="rounded-[22px] border border-[rgba(249,115,22,0.24)] bg-[rgba(249,115,22,0.08)] px-4 py-3 text-left text-[13px] font-semibold text-[var(--color-accent-orange)] transition-transform hover:-translate-y-0.5"
          >
            Clarify
          </button>
          <button
            type="button"
            onClick={() => send("What should I watch for here?")}
            disabled={isTyping}
            className="rounded-[22px] border border-[var(--color-border)] bg-white px-4 py-3 text-left text-[13px] font-semibold text-[var(--color-t1)] transition-transform hover:-translate-y-0.5"
          >
            Notify
          </button>
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div className="thin-scroll flex-1 space-y-4 overflow-y-auto px-5 py-5">

        {/* Page context card */}
        <section className="rounded-[24px] border border-[var(--color-border)] bg-white p-4 shadow-[0_8px_24px_rgba(28,39,49,0.05)]">
          <p className="mb-3 font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--color-t3)]">
            Page context
          </p>
          <div className="grid grid-cols-3 overflow-hidden rounded-[18px] border border-[var(--color-border)]">
            {contextStats.map((s, i) => (
              <div
                key={s.label}
                className="px-2 py-3 text-center"
                style={{ borderRight: i < 2 ? "1px solid var(--color-border)" : undefined }}
              >
                <p className="text-[15px] font-semibold tabular-nums text-[var(--color-t1)]">
                  {s.value}
                </p>
                <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.12em] text-[var(--color-t3)]">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Quick prompts */}
        <section className="space-y-2">
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--color-t3)]">
            Quick actions
          </p>
          {quickPrompts.map((prompt, i) => (
            <button
              key={prompt}
              type="button"
              onClick={() => send(prompt)}
              disabled={isTyping}
              className="flex w-full items-center gap-3 rounded-[22px] border border-[var(--color-border)] bg-white px-4 py-3 text-left transition-colors hover:bg-[var(--color-bg-secondary)]"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-bg-secondary)] font-mono text-[10px] text-[var(--color-t2)]">
                {i + 1}
              </span>
              <span className="text-[13px] font-medium text-[var(--color-t1)]">{prompt}</span>
            </button>
          ))}
        </section>

        {/* Chat thread */}
        <section className="flex flex-col gap-2">
          {messages.length === 0 && !isTyping && (
            <div className="rounded-[24px] bg-white px-4 py-4 text-[13px] leading-6 text-[var(--color-t2)] shadow-[0_12px_30px_rgba(28,39,49,0.04)]">
              Ask Executive to clarify, notify, or route an issue from this page.
            </div>
          )}
          {messages.slice(-8).map((msg) => (
            <div
              key={msg.id}
              className={`max-w-[92%] rounded-[20px] px-3 py-2 text-[12.5px] leading-5 ${
                msg.role === "executive"
                  ? "self-start bg-white text-[var(--color-t1)]"
                  : "self-end border border-[rgba(249,115,22,0.20)] bg-[rgba(249,115,22,0.10)] text-[var(--color-accent-orange)]"
              }`}
            >
              {msg.text}
            </div>
          ))}
          {isTyping && <TypingDots />}
          <div ref={messagesEndRef} />
        </section>
      </div>

      {/* ── Input ── */}
      <div className="border-t border-[var(--color-border)] p-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Executive anything…"
            disabled={isTyping}
            className="h-11 min-w-0 flex-1 rounded-full border border-[var(--color-border)] bg-white px-4 text-[13px] text-[var(--color-t1)] outline-none transition-colors placeholder:text-[var(--color-t3)] focus:border-[rgba(249,115,22,0.35)]"
          />
          <button
            type="button"
            onClick={() => send(input)}
            disabled={!input.trim() || isTyping}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-orange)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Send"
          >
            <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
              <path d="M12.5 7L2 2L4.5 7L2 12L12.5 7Z" fill="white" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
