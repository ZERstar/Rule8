"use client";

import { useMemo, useRef, useState } from "react";

import { CREW_META, EXEC_RESPONSES } from "@/lib/constants";
import type { CrewTag } from "@/lib/dashboard";

type DiscussionMessage = {
  id: number;
  role: "agent" | "executive" | "founder";
  text: string;
};

const LABEL_STYLES: Record<
  DiscussionMessage["role"],
  { bg: string; color: string; label: string }
> = {
  agent: { bg: "rgba(59,130,246,0.10)", color: "var(--color-blue)", label: "Agent" },
  executive: { bg: "rgba(200,151,42,0.08)", color: "var(--color-gold)", label: "Executive" },
  founder: { bg: "var(--color-s3)", color: "var(--color-t2)", label: "Founder" },
};

export function ExecutivePanelColumn({
  crewTag,
}: {
  crewTag: CrewTag;
}) {
  const meta = CREW_META[crewTag];
  const [messages, setMessages] = useState<DiscussionMessage[]>([
    {
      id: 1,
      role: "agent",
      text: `${meta.label} has one active workflow and one pending handoff for policy review.`,
    },
    {
      id: 2,
      role: "executive",
      text: `Monitoring ${meta.label}. Current path is within operating bounds. Founder guidance can be injected at any checkpoint.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const nextIdRef = useRef(3);

  const placeholder = useMemo(
    () => `Direct ${meta.label} or ask for a synthesis...`,
    [meta.label],
  );

  const submit = () => {
    const text = input.trim();
    if (!text) {
      return;
    }

    setMessages((current) => [
      ...current,
      {
        id: nextIdRef.current++,
        role: "founder",
        text,
      },
    ]);
    setInput("");
    setIsTyping(true);

    window.setTimeout(() => {
      setMessages((current) => [
        ...current,
        {
          id: nextIdRef.current++,
          role: "executive",
          text: EXEC_RESPONSES[Math.floor(Math.random() * EXEC_RESPONSES.length)],
        },
      ]);
      setIsTyping(false);
    }, 900);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b px-4 py-3" style={{ borderColor: "var(--color-b1)" }}>
        <p className="font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: "var(--color-t3)" }}>
          Executive Panel
        </p>
        <h2 className="mt-1 text-[16px] font-semibold" style={{ color: "var(--color-t1)" }}>
          Live discussion
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="flex flex-col gap-3">
          {messages.map((message) => {
            const label = LABEL_STYLES[message.role];
            return (
              <div key={message.id} className="rounded-[8px] border p-3" style={{ borderColor: "var(--color-b1)", background: "var(--color-s2)" }}>
                <span
                  className="inline-flex rounded-[4px] px-2 py-0.5 font-mono text-[10px]"
                  style={{ background: label.bg, color: label.color }}
                >
                  {label.label}
                </span>
                <p className="mt-2 text-[12px] leading-[1.65]" style={{ color: "var(--color-t1)" }}>
                  {message.text}
                </p>
              </div>
            );
          })}

          {isTyping ? (
            <div className="rounded-[8px] border p-3" style={{ borderColor: "var(--color-b1)", background: "var(--color-s2)" }}>
              <span
                className="inline-flex rounded-[4px] px-2 py-0.5 font-mono text-[10px]"
                style={{ background: "rgba(200,151,42,0.08)", color: "var(--color-gold)" }}
              >
                Executive
              </span>
              <p className="mt-2 font-mono text-[10px]" style={{ color: "var(--color-t3)" }}>
                Synthesising response...
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="border-t p-3" style={{ borderColor: "var(--color-b1)" }}>
        <div className="rounded-[8px] border bg-[var(--color-s2)] p-3" style={{ borderColor: "var(--color-b2)" }}>
          <textarea
            className="min-h-[55px] w-full resize-y bg-transparent text-[12px] outline-none"
            placeholder={placeholder}
            style={{ color: "var(--color-t1)" }}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                submit();
              }
            }}
          />
          <div className="mt-3 flex justify-end">
            <button
              className="rounded-[6px] px-3 py-1.5 font-mono text-[11px] font-semibold text-black transition"
              style={{ background: "var(--color-gold)" }}
              onClick={submit}
              type="button"
            >
              Send →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
