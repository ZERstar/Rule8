"use client";

import { useState } from "react";

export function GlobalExecBar({ onSend }: { onSend: (text: string) => void }) {
  const [input, setInput] = useState("");

  const submit = () => {
    const text = input.trim();
    if (!text) return;
    onSend(text);
    setInput("");
  };

  return (
    <div
      className="relative flex items-center gap-4 px-5"
      style={{
        height: 54,
        background: "var(--color-s1)",
        borderTop: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      {/* Gold gradient rule on top */}
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-[1px]"
        style={{ background: "linear-gradient(90deg, var(--color-gold) 0%, transparent 65%)" }}
      />

      {/* Label */}
      <div className="flex shrink-0 items-center gap-2">
        <span className="font-mono text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-gold)" }}>
          Executive
        </span>
        <span
          className="h-[6px] w-[6px] rounded-full"
          style={{ background: "var(--color-green)", animation: "pulse-gold 2s ease-in-out infinite" }}
        />
      </div>

      {/* Input */}
      <div
        className="flex flex-1 items-center rounded-[6px] px-3"
        style={{ background: "var(--color-s2)", border: "1px solid rgba(255,255,255,0.08)", height: 36 }}
        onFocusCapture={e => (e.currentTarget.style.borderColor = "rgba(200,151,42,0.40)")}
        onBlurCapture={e  => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
      >
        <input
          className="min-w-0 flex-1 bg-transparent text-[13px] outline-none"
          placeholder="Ask Executive anything..."
          style={{ color: "var(--color-t1)" }}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); submit(); } }}
        />
        <span className="ml-3 hidden font-mono text-[10px] lg:block" style={{ color: "var(--color-t3)" }}>
          or click Executive in the left panel
        </span>
      </div>

      {/* Send */}
      <button
        className="shrink-0 rounded-[6px] font-mono text-[11px] font-bold text-black transition"
        style={{ background: "var(--color-gold)", height: 32, paddingLeft: 14, paddingRight: 14 }}
        onMouseEnter={e => (e.currentTarget.style.background = "var(--color-gold-l)")}
        onMouseLeave={e => (e.currentTarget.style.background = "var(--color-gold)")}
        onClick={submit}
        type="button"
      >
        Ask →
      </button>
    </div>
  );
}
