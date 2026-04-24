"use client";

import { useState } from "react";

export function GlobalExecBar({
  onSend,
}: {
  onSend: (text: string) => void;
}) {
  const [input, setInput] = useState("");

  const submit = () => {
    const text = input.trim();
    if (!text) {
      return;
    }

    onSend(text);
    setInput("");
  };

  return (
    <div
      className="relative flex h-[54px] items-center gap-4 overflow-hidden border-t px-4"
      style={{ background: "var(--color-s1)", borderColor: "var(--color-b1)" }}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: "linear-gradient(90deg, #C8972A 0%, transparent 70%)" }}
      />

      <div className="flex shrink-0 items-center gap-2">
        <span className="font-mono text-[11px] uppercase tracking-[0.16em]" style={{ color: "var(--color-gold)" }}>
          Executive
        </span>
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--color-green)" }} />
      </div>

      <div
        className="flex min-w-0 flex-1 items-center gap-3 rounded-[6px] border px-3"
        style={{ borderColor: "var(--color-b1)", background: "var(--color-s2)", height: 36 }}
      >
        <input
          className="min-w-0 flex-1 bg-transparent text-[13px] outline-none"
          placeholder="Ask Executive anything..."
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
        <span className="hidden font-mono text-[10px] text-[var(--color-t3)] xl:block">
          or click Executive in the left panel
        </span>
      </div>

      <button
        className="h-7 shrink-0 rounded-[6px] px-3 font-mono text-[11px] font-semibold text-black transition"
        style={{ background: "var(--color-gold)" }}
        onClick={submit}
        onMouseEnter={(event) => {
          event.currentTarget.style.background = "var(--color-gold-l)";
        }}
        onMouseLeave={(event) => {
          event.currentTarget.style.background = "var(--color-gold)";
        }}
        type="button"
      >
        Ask →
      </button>
    </div>
  );
}
