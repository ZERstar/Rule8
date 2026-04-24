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
        style={{
          background: "rgba(200,151,42,0.06)",
          border: "1px solid rgba(200,151,42,0.18)",
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="flex h-6 w-6 items-center justify-center rounded-[4px] font-mono text-xs font-semibold text-black"
              style={{ background: "var(--color-gold)" }}
            >
              E
            </div>
            <span className="text-[12px] font-semibold" style={{ color: "var(--color-gold)" }}>
              Executive
            </span>
          </div>
          <StatusTag status="orchestrating" />
        </div>
        <p className="mt-1.5 font-mono text-[10px]" style={{ color: "var(--color-t3)" }}>
          {workflowId ? `Orchestrating ${workflowId}` : "Monitoring all crews"}
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-[6px] p-3"
      style={{ background: "var(--color-s2)", border: "1px solid var(--color-b1)" }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-semibold" style={{ color: "var(--color-t1)" }}>
          {name}
        </span>
        <StatusTag status={status} />
      </div>
      <p className="mt-0.5 font-mono text-[10px]" style={{ color: "var(--color-t3)" }}>
        {description}
      </p>
      <p className="mt-1.5 text-[11px] leading-snug" style={{ color: "var(--color-t2)" }}>
        {lastAction}
      </p>
      {integrationNames.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {integrationNames.map((n) => (
            <span
              key={n}
              className="rounded-[3px] px-1.5 py-0.5 font-mono text-[9px]"
              style={{ background: "var(--color-s3)", color: "var(--color-t3)" }}
            >
              {n}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
