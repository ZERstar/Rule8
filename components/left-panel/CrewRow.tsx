"use client";

type CrewRowProps = {
  icon: string; label: string; color: string;
  agentCount: number; workflowCount: number;
  active: boolean; isSelected: boolean; onClick: () => void;
};

export function CrewRow({ icon, label, color, agentCount, workflowCount, active, isSelected, onClick }: CrewRowProps) {
  return (
    <button
      className="flex w-full items-center gap-3 rounded-[6px] px-3 py-2.5 text-left transition-all"
      style={{
        background: isSelected ? "var(--color-s2)" : "transparent",
        border: isSelected ? "1px solid rgba(255,255,255,0.08)" : "1px solid transparent",
      }}
      onClick={onClick}
    >
      {/* Icon */}
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] text-[15px]"
        style={{ background: `${color}18` }}
      >
        {icon}
      </div>

      {/* Name + meta */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-semibold" style={{ color: "var(--color-t1)" }}>
          {label}
        </p>
        <p className="font-mono text-[10px]" style={{ color: "var(--color-t3)" }}>
          {agentCount} agent{agentCount !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Right side */}
      <div className="flex shrink-0 items-center gap-2">
        {workflowCount > 0 && (
          <span
            className="rounded-[4px] px-1.5 py-0.5 font-mono text-[9px] font-bold"
            style={{ background: "rgba(200,151,42,0.14)", color: "var(--color-gold)" }}
          >
            {workflowCount}
          </span>
        )}
        <span
          className="h-[7px] w-[7px] rounded-full"
          style={{ background: active ? "var(--color-green)" : "var(--color-t3)" }}
        />
      </div>
    </button>
  );
}
