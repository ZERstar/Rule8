"use client";

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

export function CrewRow({ icon, label, color, agentCount, workflowCount, active, isSelected, onClick }: CrewRowProps) {
  return (
    <button
      className="flex w-full items-center gap-2.5 rounded-[6px] px-2.5 py-2 text-left transition"
      style={{
        background: isSelected ? "var(--color-s2)" : "transparent",
        border: isSelected ? "1px solid var(--color-b1)" : "1px solid transparent",
      }}
      onClick={onClick}
    >
      {/* Icon */}
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] text-sm"
        style={{ background: `${color}1a` }}
      >
        {icon}
      </div>

      {/* Name + meta */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-medium" style={{ color: "var(--color-t1)" }}>
          {label}
        </p>
        <p className="font-mono text-[10px]" style={{ color: "var(--color-t2)" }}>
          {agentCount} agent{agentCount !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Right side */}
      <div className="flex shrink-0 items-center gap-2">
        {workflowCount > 0 && (
          <span
            className="rounded-[4px] px-1.5 py-0.5 font-mono text-[9px] font-semibold"
            style={{ background: "rgba(200,151,42,0.12)", color: "var(--color-gold)" }}
          >
            {workflowCount}
          </span>
        )}
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: active ? "var(--color-green)" : "var(--color-t3)" }}
        />
      </div>
    </button>
  );
}
