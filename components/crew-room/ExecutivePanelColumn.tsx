"use client";

import { useMemo, useRef, useState } from "react";

import { CREW_META } from "@/lib/constants";
import type { CrewTag } from "@/lib/dashboard";
import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/section-label";
import { Send } from "lucide-react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { WORKSPACE_ID } from "@/lib/constants";

type DiscussionMessage = {
  id: number;
  role: "agent" | "executive" | "founder";
  text: string;
};

const ROLE_STYLES: Record<DiscussionMessage["role"], { bg: string; color: string; border: string; label: string }> = {
  agent:     { bg: "rgba(20,184,166,0.10)", color: "#0F766E", border: "rgba(20,184,166,0.20)", label: "Agent" },
  executive: { bg: "rgba(0,82,255,0.08)",   color: "#0052FF", border: "rgba(0,82,255,0.20)",   label: "Executive" },
  founder:   { bg: "var(--color-surface-2)",color: "var(--color-t2)", border: "var(--color-b1)", label: "Founder" },
};

export function ExecutivePanelColumn({ crewTag }: { crewTag: CrewTag }) {
  const meta = CREW_META[crewTag];
  const [messages, setMessages] = useState<DiscussionMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const nextIdRef = useRef(1);
  const submitTask = useAction(api.tasks.submitManualTask);

  const placeholder = useMemo(
    () => `Direct ${meta.label} or ask for a synthesis…`,
    [meta.label],
  );

  const submit = () => {
    const text = input.trim();
    if (!text || isTyping) return;

    setMessages((c) => [...c, { id: nextIdRef.current++, role: "founder", text }]);
    setInput("");
    setIsTyping(true);

    void submitTask({ workspaceId: WORKSPACE_ID, summary: text })
      .catch((error: unknown) => {
        const msg = error instanceof Error ? error.message : "Dispatch failed";
        setMessages((c) => [
          ...c,
          { id: nextIdRef.current++, role: "executive", text: `Failed to dispatch task: ${msg}` },
        ]);
      })
      .finally(() => setIsTyping(false));
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-[var(--color-b1)] px-5 py-5">
        <SectionLabel>Executive Panel</SectionLabel>
        <h3
          className="mt-2 text-[18px] leading-[1.1] tracking-[-0.02em] text-foreground"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Live discussion
        </h3>
      </div>

      <div className="app-scroll flex-1 overflow-y-auto px-4 py-4">
        <div className="flex flex-col gap-2.5">
          {messages.map((m) => {
            const cfg = ROLE_STYLES[m.role];
            return (
              <div
                key={m.id}
                className="rounded-xl border bg-white p-3"
                style={{ borderColor: "var(--color-b1)" }}
              >
                <span
                  className="inline-flex rounded-md border px-1.5 py-0.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.12em]"
                  style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border }}
                >
                  {cfg.label}
                </span>
                <p className="mt-2 text-[12.5px] leading-[1.55] text-foreground">{m.text}</p>
              </div>
            );
          })}

          {isTyping && (
            <div className="rounded-xl border border-[var(--color-b1)] bg-white p-3">
              <span
                className="inline-flex rounded-md border px-1.5 py-0.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.12em]"
                style={{
                  background: "rgba(0,82,255,0.08)",
                  color: "#0052FF",
                  borderColor: "rgba(0,82,255,0.20)",
                }}
              >
                Executive
              </span>
              <div className="mt-2 flex items-center gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="size-1.5 rounded-full bg-[var(--color-t3)]"
                    style={{ animation: `pulseDot 1.2s ease-in-out ${i * 0.15}s infinite` }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-[var(--color-b1)] p-4">
        <div className="flex items-end gap-2 rounded-xl border border-[var(--color-b1)] bg-white p-2 transition-colors focus-within:border-[var(--color-accent-a30)] focus-within:ring-2 focus-within:ring-[var(--color-accent-a20)]">
          <textarea
            className="min-h-[40px] max-h-[120px] flex-1 resize-none border-none bg-transparent px-2 py-2 text-[12.5px] text-foreground placeholder:text-[var(--color-t4)] focus:outline-none"
            placeholder={placeholder}
            rows={2}
            value={input}
            disabled={isTyping}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
          />
          <Button
            size="icon-sm"
            onClick={submit}
            type="button"
            disabled={!input.trim() || isTyping}
            aria-label="Send"
          >
            <Send className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
