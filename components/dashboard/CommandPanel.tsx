"use client";

import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { WORKSPACE_ID, CREW_META } from "@/lib/constants";
import { ROUTES, isActiveNavPath } from "@/lib/routes";

type CrewKey = "finance" | "support" | "community";

const CHAMBERS = [
  { label: "Activity", value: "Live", tone: "#1f2937", href: ROUTES.dashboardActivity },
  { label: "Eval Score", value: "84%", tone: "#f97316", href: ROUTES.dashboardEvals },
  { label: "Invoices", value: "12", tone: "#10b981", href: ROUTES.dashboardInvoices },
  { label: "Tickets", value: "27", tone: "#3b82f6", href: ROUTES.dashboardTickets },
];

interface CommandPanelProps {
  selectedCrew: string;
  onSelectCrew: (crew: CrewKey) => void;
}

export function CommandPanel({
  selectedCrew,
  onSelectCrew,
}: CommandPanelProps) {
  const agents = useQuery(api.agents.list, { workspaceId: WORKSPACE_ID });
  const pathname = usePathname();
  const router = useRouter();

  const agentCountByCrewTag = (tag: string) =>
    agents?.filter((a) => a.crewTag === tag).length ?? 0;

  const totalAgents = agents?.length ?? 0;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#fbfaf7]">
      <div className="border-b border-[var(--color-border)] px-4 py-5">
        <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[var(--color-t3)]">
          Founder OS
        </p>
        <h2
          className="mt-2 text-[24px] font-semibold tracking-[-0.05em] text-[var(--color-t1)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Chambers
        </h2>
      </div>

      <div className="border-b border-[var(--color-border)] px-3 py-3">
        <div className="mb-2 flex items-center justify-between px-1">
          <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--color-t3)]">
            Workspace
          </span>
          <span className="h-2 w-2 rounded-full bg-[var(--color-accent-green)]" />
        </div>

        <div className="space-y-1">
          {CHAMBERS.map((chamber) => {
            const active =
              isActiveNavPath(pathname, chamber.href, false) ||
              (pathname === ROUTES.dashboardOverview && chamber.href === ROUTES.dashboardActivity);
            return (
            <button
              key={chamber.label}
              type="button"
              onClick={() => router.push(chamber.href)}
              aria-current={active ? "page" : undefined}
              className={`group flex w-full cursor-pointer items-center gap-3 rounded-[18px] px-3 py-3 text-left transition-colors ${
                active
                  ? "bg-[#1f2937] text-white shadow-[0_12px_30px_rgba(28,39,49,0.12)]"
                  : "hover:bg-white/70"
              }`}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: chamber.tone }} />
              <span className={`min-w-0 flex-1 text-[13px] font-medium ${active ? "text-white" : "text-[var(--color-t2)] group-hover:text-[var(--color-t1)]"}`}>
                {chamber.label}
              </span>
              <span className={`rounded-full px-2 py-1 font-mono text-[9px] ${active ? "bg-white/12 text-white/70" : "bg-[var(--color-bg-secondary)] text-[var(--color-t3)]"}`}>
                {chamber.value}
              </span>
            </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto border-b border-[var(--color-border)] px-3 py-4">
        <div className="mb-3 flex items-center justify-between px-1">
          <span
            className="text-[15px] font-semibold text-[var(--color-t1)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Crew Rooms
          </span>
          <span className="rounded-full bg-white px-3 py-1 font-mono text-[9px] text-[var(--color-t3)] shadow-[0_8px_20px_rgba(28,39,49,0.04)]">
            {totalAgents} agents
          </span>
        </div>

        <div className="space-y-1.5">
        {(["finance", "support", "community"] as CrewKey[]).map((key) => {
          const meta = CREW_META[key];
          const isSelected = selectedCrew === key;
          const count = agentCountByCrewTag(key);

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectCrew(key)}
              className={`
                relative flex w-full items-center gap-3 rounded-[20px] px-3 py-3 text-left transition-all
                ${isSelected
                  ? "bg-white text-[var(--color-t1)] shadow-[0_14px_34px_rgba(28,39,49,0.08)]"
                  : "text-[var(--color-t2)] hover:bg-white/70"
                }
              `}
            >
              <span
                className="shrink-0 rounded-full"
                style={{
                  width: 8,
                  height: 8,
                  background: meta.color,
                }}
              />

              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-bg-secondary)] text-[18px] leading-none">
                {meta.icon}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-medium">{meta.label}</span>
                <span className="mt-0.5 block font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-t3)]">
                  status live
                </span>
              </span>

              <span className="font-mono text-[9px] text-[var(--color-t3)]">
                {count}
              </span>

              {isSelected && (
                <span className="text-[10px] text-[var(--color-accent-orange)] font-mono">
                  →
                </span>
              )}
            </button>
          );
        })}
        </div>
      </div>

      <div className="px-4 py-4">
        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--color-t3)]">
          Executive
        </p>
        <p className="mt-2 text-[12px] leading-5 text-[var(--color-t2)]">
          Select a crew room to inspect traces, agent status, and escalation context.
        </p>
      </div>
    </div>
  );
}
