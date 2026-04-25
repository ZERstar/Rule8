"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function GlobalExecBar({ onSend }: { onSend: (text: string) => void }) {
  const [input, setInput] = useState("");

  const submit = () => {
    const text = input.trim();
    if (!text) return;
    onSend(text);
    setInput("");
  };

  return (
    <div className="relative flex h-full flex-col gap-4 overflow-hidden rounded-[28px] border border-[var(--color-b1)] bg-white/80 px-5 py-4 shadow-[0_-12px_40px_rgba(15,23,42,0.06)] backdrop-blur-xl md:flex-row md:items-center md:gap-5 md:px-6">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(0,82,255,0.05),rgba(77,124,255,0.03))]" />

      <div className="relative flex shrink-0 items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-gradient-to-br from-[#0052FF] to-[#4D7CFF] font-mono text-[14px] font-semibold text-white shadow-[0_16px_28px_rgba(0,82,255,0.22)]">
          E
        </div>
        <div>
          <p className="app-kicker">Executive command</p>
          <p className="text-[13px] font-semibold tracking-[-0.02em] text-foreground md:text-[14px]">
            Ask for new agents, reviews, or operational decisions
          </p>
        </div>
      </div>

      <div className="relative z-10 flex flex-1 items-center gap-3">
        <div className="relative flex-1">
          <Input
            className="h-12 min-w-0 rounded-[22px] border-border/90 bg-white/88 pr-36 text-[13px] shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
            placeholder="Ask Executive anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
          />
          <span className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground lg:block">
            ask or create
          </span>
          </div>
        <Button className="h-12 rounded-full px-5 font-mono text-[11px] font-semibold uppercase tracking-[0.16em]" onClick={submit}>
          Send
        </Button>
      </div>
    </div>
  );
}
