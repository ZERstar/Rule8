"use client";

import { cn } from "@/lib/utils";

export type TraceFilter = "all" | "executive" | "finance" | "support" | "community";

const TABS: { key: TraceFilter; label: string }[] = [
  { key: "all",       label: "All"       },
  { key: "executive", label: "Executive" },
  { key: "finance",   label: "Finance"   },
  { key: "support",   label: "Support"   },
  { key: "community", label: "Community" },
];

export function FilterTabs({ active, onChange }: { active: TraceFilter; onChange: (f: TraceFilter) => void }) {
  return (
    <div className="border-b border-[var(--color-b1)] px-5 py-3">
      <div className="flex flex-wrap gap-1">
        {TABS.map(({ key, label }) => {
          const isActive = active === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              className={cn(
                "rounded-lg px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] transition-all",
                isActive
                  ? "bg-foreground text-white shadow-[0_2px_8px_rgba(15,23,42,0.18)]"
                  : "text-[var(--color-t3)] hover:bg-[var(--color-surface-2)] hover:text-foreground",
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
