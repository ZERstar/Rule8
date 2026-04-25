"use client";

import { useEffect, useRef, useState } from "react";
import type { ExecutiveChatMessage } from "@/lib/dashboard";
import { ChatBubble } from "./ChatBubble";
import { ModeTabs, type ExecutiveChatMode } from "./ModeTabs";
import { QuickReplyChips } from "./QuickReplyChips";

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
  const [mode, setMode] = useState<ExecutiveChatMode>("General");
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
      <ModeTabs active={mode} onChange={setMode} />

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3">
        <div className="flex flex-col gap-3">
          {messages.map((msg, i) => {
            const isExec = msg.role === "executive";
            return (
              <div key={msg.id}>
                <ChatBubble message={msg} />

                {isExec && i === 0 && showQuickReplies && (
                  <QuickReplyChips onSelect={send} />
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
