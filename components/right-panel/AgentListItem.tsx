import { StatusTag } from "@/components/tokens/StatusTag";
import { cn } from "@/lib/utils";

type AgentListItemProps = {
  name: string;
  description: string;
  status: "active" | "idle" | "done" | "orchestrating" | "critical" | "paused";
  lastAction: string;
  integrationNames: string[];
  isExecutive?: boolean;
  workflowId?: string;
};

export function AgentListItem({
  name,
  description,
  status,
  lastAction,
  integrationNames,
  isExecutive,
  workflowId,
}: AgentListItemProps) {
  if (isExecutive) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-[var(--color-accent-a30)] bg-gradient-to-br from-[var(--color-accent-a08)] to-white p-4">
        {/* gradient strip */}
        <div className="absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-[#0052FF] to-[#4D7CFF]" />

        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#0052FF] to-[#4D7CFF] font-mono text-[11px] font-bold text-white shadow-[0_4px_12px_rgba(0,82,255,0.30)]">
              E
            </div>
            <span className="text-[13.5px] font-semibold tracking-[-0.01em] text-foreground">
              Executive
            </span>
          </div>
          <StatusTag status="orchestrating" />
        </div>
        <p className="mt-2.5 pl-[42px] font-mono text-[9.5px] uppercase tracking-[0.14em] text-[var(--color-t3)]">
          {workflowId ? `Orchestrating ${workflowId}` : "Monitoring all crews"}
        </p>
      </div>
    );
  }

  const initials = name.slice(0, 1).toUpperCase();

  return (
    <div className="rounded-xl border border-[var(--color-b1)] bg-white p-4 transition-all hover:border-[var(--color-b2)] hover:shadow-[0_4px_12px_rgba(15,23,42,0.05)]">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface-2)] font-mono text-[11px] font-semibold text-[var(--color-t2)]">
            {initials}
          </div>
          <span className="min-w-0 truncate text-[13.5px] font-semibold tracking-[-0.01em] text-foreground">
            {name}
          </span>
        </div>
        <StatusTag status={status} />
      </div>

      <p className="mt-2 pl-[42px] truncate font-mono text-[9.5px] uppercase tracking-[0.14em] text-[var(--color-t3)]">
        {description}
      </p>

      <p className="mt-1.5 pl-[42px] line-clamp-2 text-[12.5px] leading-[1.55] text-[var(--color-t3)]">
        {lastAction}
      </p>

      {integrationNames.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1 pl-[42px]">
          {integrationNames.slice(0, 3).map((n) => (
            <span
              key={n}
              className="rounded-md border border-[var(--color-b1)] bg-[var(--color-surface-2)] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--color-t3)]"
            >
              {n}
            </span>
          ))}
          {integrationNames.length > 3 && (
            <span className="font-mono text-[9px] text-[var(--color-t4)]">
              +{integrationNames.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
