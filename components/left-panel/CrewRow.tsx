"use client";

import { cn } from "@/lib/utils";

type CrewRowProps = {
  icon: string;
  label: string;
  color: string;
  agentCount: number;
  workflowCount: number;
  active: boolean;
  isSelected: boolean;
  onClick: () => void;
};

export function CrewRow({
  icon,
  label,
  color,
  agentCount,
  workflowCount,
  active,
  isSelected,
  onClick,
}: CrewRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group/row relative w-full overflow-hidden rounded-xl border px-4 py-3.5 text-left transition-all duration-200",
        isSelected
          ? "border-[var(--color-accent-a30)] bg-[var(--color-accent-a05)] shadow-[0_2px_8px_rgba(0,82,255,0.10)]"
          : "border-[var(--color-b1)] bg-white hover:-translate-y-0.5 hover:border-[var(--color-b2)] hover:shadow-[0_4px_12px_rgba(15,23,42,0.06)]",
      )}
    >
      {/* Color accent bar */}
      <span
        className="pointer-events-none absolute inset-y-0 left-0 w-[3px] transition-all"
        style={{ background: color, opacity: isSelected ? 1 : 0.5 }}
      />

      <div className="flex items-center gap-3">
        {/* Icon */}
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-xl text-[16px] transition-transform group-hover/row:scale-105"
          style={{
            background: `${color}14`,
            border: `1px solid ${color}24`,
          }}
        >
          {icon}
        </div>

        {/* Body */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-[13.5px] font-semibold tracking-[-0.01em] text-foreground">
              {label}
            </p>
            <span className="font-mono text-[14px] text-[var(--color-t4)] transition-transform group-hover/row:translate-x-0.5">
              →
            </span>
          </div>

          <div className="mt-1.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  active ? "bg-[var(--color-green)]" : "bg-[var(--color-t4)]",
                )}
                style={active ? { animation: "pulseDot 2.5s ease-in-out infinite" } : undefined}
              />
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-t3)]">
                {agentCount} agents
              </span>
            </div>
            <span
              className="rounded-md px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.12em]"
              style={{ background: `${color}12`, color }}
            >
              {workflowCount} wf
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}
