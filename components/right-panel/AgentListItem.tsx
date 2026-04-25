import { StatusTag } from "@/components/tokens/StatusTag";

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
  name, description, status, lastAction, integrationNames, isExecutive, workflowId,
}: AgentListItemProps) {
  if (isExecutive) {
    return (
      <div
        className="rounded-[6px] p-3"
        style={{ background: "rgba(200,151,42,0.07)", border: "1px solid rgba(200,151,42,0.20)" }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <div
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[4px] font-mono text-[11px] font-bold text-black"
              style={{ background: "var(--color-gold)" }}
            >
              E
            </div>
            <span className="truncate text-[12px] font-semibold" style={{ color: "var(--color-gold)" }}>
              Executive
            </span>
          </div>
          <div className="shrink-0">
            <StatusTag status="orchestrating" />
          </div>
        </div>
        <p className="mt-1.5 truncate font-mono text-[10px]" style={{ color: "var(--color-t3)" }}>
          {workflowId ? `Orchestrating ${workflowId}` : "Monitoring all crews"}
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-[6px] p-2.5"
      style={{ background: "var(--color-s2)", border: "1px solid var(--color-b1)" }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 flex-1 truncate text-[12px] font-semibold" style={{ color: "var(--color-t1)" }}>
          {name}
        </span>
        <div className="shrink-0">
          <StatusTag status={status} />
        </div>
      </div>
      <p className="mt-0.5 truncate font-mono text-[10px]" style={{ color: "var(--color-t3)" }}>
        {description}
      </p>
      <p className="mt-1 line-clamp-1 text-[11px] leading-snug" style={{ color: "var(--color-t2)" }}>
        {lastAction}
      </p>
      {integrationNames.length > 0 && (
        <div className="mt-1.5 flex gap-1">
          {integrationNames.slice(0, 3).map((n) => (
            <span
              key={n}
              className="rounded-[3px] px-1.5 py-0.5 font-mono text-[9px]"
              style={{ background: "var(--color-s3)", color: "var(--color-t3)" }}
            >
              {n}
            </span>
          ))}
          {integrationNames.length > 3 && (
            <span className="font-mono text-[9px]" style={{ color: "var(--color-t3)" }}>
              +{integrationNames.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
