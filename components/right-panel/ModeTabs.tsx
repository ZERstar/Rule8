"use client";

import { cn } from "@/lib/utils";

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
    <div className="border-b border-[var(--color-b1)] px-4 py-3">
      <div className="flex gap-1 rounded-full border border-[var(--color-b1)] bg-[var(--color-surface-2)] p-0.5">
        {EXECUTIVE_CHAT_MODES.map((mode) => {
          const isActive = active === mode;
          return (
            <button
              key={mode}
              type="button"
              onClick={() => onChange(mode)}
              className={cn(
                "flex-1 rounded-full px-3 py-1.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.12em] transition-all",
                isActive
                  ? "bg-foreground text-white shadow-[0_2px_8px_rgba(15,23,42,0.18)]"
                  : "text-[var(--color-t3)] hover:bg-white hover:text-foreground",
              )}
            >
              {mode}
            </button>
          );
        })}
      </div>
    </div>
  );
}
