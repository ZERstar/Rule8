"use client";

export type TraceFilter = "all" | "executive" | "finance" | "support" | "community";

const TABS: { key: TraceFilter; label: string }[] = [
  { key: "all",       label: "All"       },
  { key: "executive", label: "Executive" },
  { key: "finance",   label: "Finance"   },
  { key: "support",   label: "Support"   },
  { key: "community", label: "Community" },
];

export function FilterTabs({ active, onChange }: { active: TraceFilter; onChange: (f: TraceFilter) => void; }) {
  return (
    <div
      className="flex items-center gap-0 border-b"
      style={{ borderColor: "rgba(255,255,255,0.07)", height: 40, paddingLeft: 16 }}
    >
      {TABS.map(({ key, label }) => {
        const isActive = active === key;
        return (
          <button
            key={key}
            className="relative h-full px-3 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors"
            style={{ color: isActive ? "var(--color-gold)" : "var(--color-t3)" }}
            onClick={() => onChange(key)}
          >
            {label}
            {isActive && (
              <span
                className="absolute bottom-0 left-0 right-0 h-[2px]"
                style={{ background: "var(--color-gold)" }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
