"use client";

import { KeyboardEvent, useEffect, useRef } from "react";
import { useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import { CREW_META, WORKSPACE_ID } from "@/lib/constants";
import type { CrewKey, ExecutiveChatMessage } from "@/lib/dashboard";

const STATUS_COLOR: Record<string, string> = {
  active: "var(--color-accent-green)",
  running: "var(--color-accent-green)",
  orchestrating: "var(--color-accent-orange)",
  idle: "var(--color-t3)",
  pending: "var(--color-t3)",
  escalated: "var(--color-accent-orange)",
};

const ISSUE_PROMPTS = [
  "Clarify the latest escalation",
  "Notify me if eval score drops",
  "Summarize tickets by crew",
];

function statusLabel(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function TypingDots() {
  return (
    <div className="self-start flex items-center gap-1 rounded-[18px] bg-[var(--color-bg-secondary)] px-3 py-2">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="block h-1.5 w-1.5 rounded-full bg-[var(--color-t3)]"
          style={{
            animation: "pulseDot 1.2s ease-in-out infinite",
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
    </div>
  );
}

interface CrewDetailProps {
  selectedCrew: CrewKey;
  executiveMessages: ExecutiveChatMessage[];
  executiveIsTyping: boolean;
  execInput: string;
  onExecInputChange: (v: string) => void;
  onExecSend: (text: string) => void;
}

export function CrewDetail({
  selectedCrew,
  executiveMessages,
  executiveIsTyping,
  execInput,
  onExecInputChange,
  onExecSend,
}: CrewDetailProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const agents = useQuery(api.agents.list, { workspaceId: WORKSPACE_ID });
  const crewStats = useQuery(api.tasks.getCrewStats, {
    workspaceId: WORKSPACE_ID,
    crewTag: selectedCrew,
  });

  const meta = CREW_META[selectedCrew];
  const crewAgents = agents?.filter((a) => a.crewTag === selectedCrew) ?? [];
  const activeWorkflows = crewAgents.reduce((sum, a) => sum + (a.workflowCount ?? 0), 0);
  const crewTasksToday = crewStats?.tasksToday ?? 0;
  const crewCostDisplay = crewStats
    ? `$${(crewStats.costTodayCents / 100).toFixed(2)}`
    : "—";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [executiveMessages.length, executiveIsTyping]);

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (executiveIsTyping) return;
      onExecSend(execInput);
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#fbfaf7]">
      <div className="border-b border-[var(--color-border)] px-5 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[var(--color-t3)]">
              Executive
            </p>
            <h2
              className="mt-2 text-[25px] font-semibold tracking-[-0.05em] text-[var(--color-t1)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Decision desk
            </h2>
          </div>
          <span className="rounded-full bg-white px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-accent-green)] shadow-[0_8px_20px_rgba(28,39,49,0.05)]">
            Live
          </span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onExecSend(`Clarify status for ${meta.label}`)}
            disabled={executiveIsTyping}
            className="rounded-[22px] border border-[rgba(249,115,22,0.24)] bg-[rgba(249,115,22,0.08)] px-4 py-3 text-left text-[13px] font-semibold text-[var(--color-accent-orange)] transition-transform hover:-translate-y-0.5"
          >
            Clarify
          </button>
          <button
            type="button"
            onClick={() => onExecSend(`Notify me about critical changes in ${meta.label}`)}
            disabled={executiveIsTyping}
            className="rounded-[22px] border border-[var(--color-border)] bg-white px-4 py-3 text-left text-[13px] font-semibold text-[var(--color-t1)] transition-transform hover:-translate-y-0.5"
          >
            Notify
          </button>
        </div>
      </div>

      <div className="thin-scroll flex-1 space-y-4 overflow-y-auto px-5 py-5">
        <section className="rounded-[28px] border border-[var(--color-border)] bg-white p-4 shadow-[0_16px_40px_rgba(28,39,49,0.06)]">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-bg-secondary)] text-[22px]">
              {meta.icon}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[16px] font-semibold tracking-[-0.03em] text-[var(--color-t1)]">
                {meta.label}
              </p>
              <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--color-t3)]">
                selected chamber
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 overflow-hidden rounded-[20px] border border-[var(--color-border)]">
            {[
              { value: crewTasksToday, label: "Tasks" },
              { value: crewCostDisplay, label: "Cost" },
              { value: activeWorkflows, label: "Flows" },
            ].map((s, i) => (
              <div
                key={s.label}
                className="px-2 py-3 text-center"
                style={{ borderRight: i < 2 ? "1px solid var(--color-border)" : undefined }}
              >
                <p className="text-[16px] font-semibold tabular-nums text-[var(--color-t1)]">
                  {s.value}
                </p>
                <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.14em] text-[var(--color-t3)]">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--color-t3)]">
            What issue?
          </p>
          {ISSUE_PROMPTS.map((prompt, index) => (
            <button
              key={prompt}
              type="button"
              onClick={() => onExecSend(prompt)}
              disabled={executiveIsTyping}
              className="flex w-full items-center gap-3 rounded-[22px] border border-[var(--color-border)] bg-white px-4 py-3 text-left transition-colors hover:bg-[var(--color-bg-secondary)]"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-bg-secondary)] font-mono text-[10px] text-[var(--color-t2)]">
                {index + 1}
              </span>
              <span className="text-[13px] font-medium text-[var(--color-t1)]">{prompt}</span>
            </button>
          ))}
        </section>

        <section className="rounded-[28px] border border-[var(--color-border)] bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--color-t3)]">
              Agent status
            </p>
            <span className="text-[11px] text-[var(--color-t3)]">{crewAgents.length} agents</span>
          </div>
          <div className="space-y-2">
            {crewAgents.slice(0, 4).map((agent) => {
              const statusColor = STATUS_COLOR[agent.status] ?? "var(--color-t3)";
              return (
                <div key={agent._id} className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate text-[12px] font-medium text-[var(--color-t2)]">
                    {agent.name}
                  </span>
                  <span className="shrink-0 text-[10px] font-semibold" style={{ color: statusColor }}>
                    ● {statusLabel(agent.status)}
                  </span>
                </div>
              );
            })}
            {crewAgents.length === 0 && (
              <p className="py-2 text-[12px] text-[var(--color-t3)]">No agents in this crew yet.</p>
            )}
          </div>
        </section>

        <section className="flex flex-col gap-2">
          {executiveMessages.length === 0 && !executiveIsTyping && (
            <div className="rounded-[24px] bg-white px-4 py-4 text-[13px] leading-6 text-[var(--color-t2)] shadow-[0_12px_30px_rgba(28,39,49,0.04)]">
              Ask Executive to clarify, notify, or route an issue from the selected chamber.
            </div>
          )}

          {executiveMessages.slice(-6).map((msg) => (
            <div
              key={msg.id}
              className={`max-w-[90%] rounded-[20px] px-3 py-2 text-[12.5px] leading-5 ${
                msg.role === "executive" ? "self-start bg-white text-[var(--color-t1)]" : "self-end border border-[rgba(249,115,22,0.20)] bg-[rgba(249,115,22,0.10)] text-[var(--color-accent-orange)]"
              }`}
            >
              {msg.text}
            </div>
          ))}

          {executiveIsTyping && <TypingDots />}
          <div ref={messagesEndRef} />
        </section>
      </div>

      <div className="border-t border-[var(--color-border)] p-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={execInput}
            onChange={(e) => onExecInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What issue should Executive handle?"
            disabled={executiveIsTyping}
            className="h-11 min-w-0 flex-1 rounded-full border border-[var(--color-border)] bg-white px-4 text-[13px] text-[var(--color-t1)] outline-none transition-colors placeholder:text-[var(--color-t3)] focus:border-[rgba(249,115,22,0.35)]"
          />
          <button
            type="button"
            onClick={() => onExecSend(execInput)}
            disabled={!execInput.trim() || executiveIsTyping}
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
