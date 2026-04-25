"use client";

export const EXECUTIVE_CHAT_MODES = ["General", "Create Agent", "Review"] as const;

export type ExecutiveChatMode = (typeof EXECUTIVE_CHAT_MODES)[number];

export function ModeTabs({
  active,
  onChange,
}: {
  active: ExecutiveChatMode;
  onChange: (mode: ExecutiveChatMode) => void;
}) {
  return (
    <div className="flex border-b px-3 pt-2" style={{ borderColor: "var(--color-b1)" }}>
      {EXECUTIVE_CHAT_MODES.map((mode) => (
        <button
          key={mode}
          className="relative mr-3 pb-2 font-mono text-[10px] uppercase tracking-[0.12em] transition"
          style={{ color: active === mode ? "var(--color-gold)" : "var(--color-t3)" }}
          onClick={() => onChange(mode)}
          type="button"
        >
          {mode}
          {active === mode ? (
            <span className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: "var(--color-gold)" }} />
          ) : null}
        </button>
      ))}
    </div>
  );
}
