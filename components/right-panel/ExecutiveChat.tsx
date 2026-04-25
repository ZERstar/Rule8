"use client";

import { useEffect, useRef, useState } from "react";
import type { ExecutiveChatMessage } from "@/lib/dashboard";
import { ChatBubble } from "./ChatBubble";
import { ModeTabs, type ExecutiveChatMode } from "./ModeTabs";
import { QuickReplyChips } from "./QuickReplyChips";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

export function ExecutiveChat({
  isTyping,
  messages,
  onSend,
  showQuickReplies,
}: {
  isTyping: boolean;
  messages: ExecutiveChatMessage[];
  onSend: (text: string, mode: ExecutiveChatMode) => void;
  showQuickReplies: boolean;
}) {
  const [mode, setMode] = useState<ExecutiveChatMode>("General");
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isTyping]);

  const placeholder =
    mode === "Create Agent"
      ? "Describe the agent role..."
      : mode === "Review"
      ? "What should I review?"
      : "Ask Executive anything...";

  function send(text: string) {
    const next = text.trim();
    if (!next) return;
    onSend(next, mode);
    setInput("");
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <ModeTabs active={mode} onChange={setMode} />

      {/* Messages */}
      <div ref={scrollRef} className="app-scroll flex-1 overflow-y-auto px-5 py-4">
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
                className="flex size-8 shrink-0 items-center justify-center rounded-lg font-mono text-[11px] font-bold text-white"
                style={{
                  background: "linear-gradient(135deg, #0052FF 0%, #4D7CFF 100%)",
                  boxShadow: "0 4px 12px rgba(0,82,255,0.30)",
                }}
              >
                E
              </div>
              <div className="rounded-2xl border border-[var(--color-b1)] bg-[var(--color-surface-2)] px-4 py-3" style={{ borderBottomLeftRadius: "0.375rem" }}>
                <div className="flex items-center gap-1">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="size-1.5 rounded-full bg-[var(--color-t3)]"
                      style={{ animation: `pulseDot 1.2s ease-in-out ${i * 0.15}s infinite` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-[var(--color-b1)] p-4">
        <div className="flex items-end gap-2 rounded-xl border border-[var(--color-b1)] bg-white p-2 transition-colors focus-within:border-[var(--color-accent-a30)] focus-within:ring-2 focus-within:ring-[var(--color-accent-a20)]">
          <textarea
            className="min-h-[36px] max-h-[88px] flex-1 resize-none border-none bg-transparent px-2 py-2 text-[13px] text-foreground placeholder:text-[var(--color-t4)] focus:outline-none"
            placeholder={placeholder}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
          />
          <Button
            size="icon-sm"
            onClick={() => send(input)}
            type="button"
            disabled={!input.trim()}
            aria-label="Send message"
          >
            <Send className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
