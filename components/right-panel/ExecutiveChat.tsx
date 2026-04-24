"use client";

import { useEffect, useRef, useState } from "react";
import type { ExecutiveChatMessage } from "@/lib/dashboard";

const QUICK_REPLIES = [
  "What's the Finance crew working on?",
  "Any escalations I should review?",
  "Summarise today's activity",
];

const MODES = ["General", "Create Agent", "Review"] as const;
type Mode = (typeof MODES)[number];

export function ExecutiveChat({
  isTyping,
  messages,
  onSend,
  showQuickReplies,
}: {
  isTyping: boolean;
  messages: ExecutiveChatMessage[];
  onSend: (text: string) => void;
  showQuickReplies: boolean;
}) {
  const [mode, setMode] = useState<Mode>("General");
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isTyping]);

  function send(text: string) {
    const nextText = text.trim();
    if (!nextText) return;

    onSend(nextText);
    setInput("");
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Mode tabs */}
      <div className="flex border-b px-3 pt-2" style={{ borderColor: "var(--color-b1)" }}>
        {MODES.map((m) => (
          <button
            key={m}
            className="relative mr-3 pb-2 font-mono text-[10px] uppercase tracking-[0.12em] transition"
            style={{ color: mode === m ? "var(--color-gold)" : "var(--color-t3)" }}
            onClick={() => setMode(m)}
          >
            {m}
            {mode === m && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: "var(--color-gold)" }} />
            )}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3">
        <div className="flex flex-col gap-3">
          {messages.map((msg, i) => {
            const isExec = msg.role === "executive";
            return (
              <div key={msg.id}>
                <div className={`flex items-end gap-2 ${isExec ? "" : "flex-row-reverse"}`}>
                  {/* Avatar */}
                  <div
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[4px] font-mono text-[10px] font-semibold"
                    style={
                      isExec
                        ? { background: "var(--color-gold)", color: "#000" }
                        : { background: "var(--color-s3)", color: "var(--color-t2)" }
                    }
                  >
                    {isExec ? "E" : "T"}
                  </div>
                  {/* Bubble */}
                  <div
                    className="max-w-[200px] rounded-[6px] px-3 py-2 text-[12px] leading-[1.6]"
                    style={
                      isExec
                        ? { background: "var(--color-s2)", color: "var(--color-t1)" }
                        : {
                            background: "rgba(200,151,42,0.08)",
                            border: "1px solid rgba(200,151,42,0.24)",
                            color: "var(--color-t1)",
                          }
                    }
                  >
                    {msg.text}
                  </div>
                </div>

                {/* Quick replies after first Executive message */}
                {isExec && i === 0 && showQuickReplies && (
                  <div className="mt-2 flex flex-col gap-1.5 pl-8">
                    {QUICK_REPLIES.map((qr) => (
                      <button
                        key={qr}
                        className="rounded-[4px] px-2.5 py-1.5 text-left font-mono text-[10px] transition"
                        style={{ background: "rgba(200,151,42,0.08)", color: "var(--color-gold)" }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "rgba(200,151,42,0.14)")}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "rgba(200,151,42,0.08)")}
                        onClick={() => send(qr)}
                      >
                        {qr}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {isTyping && (
            <div className="flex items-end gap-2">
              <div
                className="flex h-6 w-6 items-center justify-center rounded-[4px] font-mono text-[10px] font-semibold"
                style={{ background: "var(--color-gold)", color: "#000" }}
              >
                E
              </div>
              <div className="rounded-[6px] px-3 py-2" style={{ background: "var(--color-s2)" }}>
                <span className="font-mono text-[11px]" style={{ color: "var(--color-t3)" }}>
                  Thinking...
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="border-t p-3" style={{ borderColor: "var(--color-b1)" }}>
        <div
          className="flex items-end gap-2 rounded-[6px] border px-3 py-2 transition-colors"
          style={{ borderColor: "var(--color-b2)", background: "var(--color-s2)" }}
          onFocusCapture={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = "rgba(200,151,42,0.40)")}
          onBlurCapture={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = "var(--color-b2)")}
        >
          <textarea
            className="flex-1 resize-none bg-transparent text-[12px] outline-none"
            style={{ color: "var(--color-t1)", minHeight: 20, maxHeight: 80 }}
            placeholder={mode === "Create Agent" ? "Describe the agent role..." : mode === "Review" ? "What should I review?" : "Ask Executive anything..."}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
            }}
          />
          <button
            className="shrink-0 rounded-[4px] px-2.5 py-1 font-mono text-[10px] font-semibold text-black transition"
            style={{ background: "var(--color-gold)", height: 28 }}
            onClick={() => send(input)}
            type="button"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
