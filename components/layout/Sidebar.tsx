"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  BookOpen,
  FileText,
  LayoutDashboard,
  ListChecks,
  Plug,
  Receipt,
  Settings,
  Ticket,
  UserRound,
} from "lucide-react";

import { api } from "@/convex/_generated/api";
import { DASHBOARD_NAV, isActiveNavPath } from "@/lib/routes";
import { CREW_META } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useAuthenticatedQuery } from "@/lib/use-authenticated-query";
import { useWorkspaceId } from "@/lib/workspace-context";

const ICONS: Record<string, React.ElementType> = {
  Overview:     LayoutDashboard,
  Escalations:  AlertTriangle,
  Integrations: Plug,
  Prompts:      FileText,
  "Product Context": BookOpen,
  Activity:     Activity,
  Evals:        ListChecks,
  Invoices:     Receipt,
  Tickets:      Ticket,
  Profile:      UserRound,
  Settings:     Settings,
};

type CrewKey = keyof typeof CREW_META;
const CREW_KEYS: CrewKey[] = ["finance", "support", "community"];
const CREW_DOT_COLOR: Record<CrewKey, string> = {
  finance:   "var(--color-crew-finance)",
  support:   "var(--color-crew-support)",
  community: "var(--color-crew-community)",
};

const SECTIONS = [
  { key: "main",    label: "Navigation" },
  { key: "ops",     label: "Operations" },
  { key: "data",    label: "Chamber" },
  { key: "account", label: "Account" },
] as const;

function NavLink({ href, label, exact }: { href: string; label: string; exact?: boolean }) {
  const pathname = usePathname();
  const active = isActiveNavPath(pathname, href, exact);
  const Icon = ICONS[label] ?? LayoutDashboard;
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 rounded-md mx-2 px-2.5 h-8 text-[13px] transition-colors",
        active
          ? "bg-[var(--color-accent-a12)] text-[var(--color-accent-2)] font-medium border border-[var(--color-accent-a20)]"
          : "text-[var(--color-t2)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-t1)]",
      )}
    >
      <Icon className="size-3.5 shrink-0 opacity-80" />
      {label}
    </Link>
  );
}

export function Sidebar() {
  const workspaceId = useWorkspaceId();
  const agents = useAuthenticatedQuery(api.agents.list, { workspaceId });

  function agentCount(tag: CrewKey) {
    return agents?.filter((a) => a.crewTag === tag).length ?? 0;
  }

  function crewLabel(tag: CrewKey) {
    const lead = agents?.find((agent) => agent.crewTag === tag && agent.isCrewLead);
    return lead?.crewName ?? CREW_META[tag].label;
  }

  function crewColor(tag: CrewKey) {
    const lead = agents?.find((agent) => agent.crewTag === tag && agent.isCrewLead);
    return lead?.crewColor ?? CREW_DOT_COLOR[tag];
  }

  return (
    <aside className="hidden h-full w-[220px] shrink-0 flex-col overflow-hidden border-r border-[var(--color-b1)] bg-[var(--color-surface)] lg:flex">
      <nav className="flex flex-1 flex-col overflow-y-auto py-4">
        {SECTIONS.map((section) => {
          const items = DASHBOARD_NAV.filter((i) => i.section === section.key);
          return (
            <div key={section.key}>
              <p className="px-4 pb-1.5 pt-3 font-mono text-[9px] font-medium uppercase tracking-[0.18em] text-[var(--color-t3)]">
                {section.label}
              </p>
              {items.map((item) => (
                <NavLink key={item.href} href={item.href} label={item.label} exact={item.exact} />
              ))}
            </div>
          );
        })}

        {/* Crews */}
        <p className="px-4 pb-1.5 pt-3 font-mono text-[9px] font-medium uppercase tracking-[0.18em] text-[var(--color-t3)]">
          Crews
        </p>
        {CREW_KEYS.map((key) => {
          const count = agentCount(key);
          return (
            <div key={key} className="flex items-center gap-2.5 mx-2 px-2.5 h-8 rounded-md">
              <span
                className="shrink-0 rounded-full"
                style={{ width: 6, height: 6, background: crewColor(key) }}
              />
              <span className="flex-1 truncate text-[12.5px] text-[var(--color-t2)]">
                {crewLabel(key)}
              </span>
              <span className="font-mono text-[9px] text-[var(--color-t3)]">{count}</span>
            </div>
          );
        })}
      </nav>

      {/* Bottom: account entry */}
      <div className="border-t border-[var(--color-b1)] px-3 py-3">
        <Link
          href="/dashboard/profile"
          className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 cursor-pointer hover:bg-[var(--color-surface-2)] transition-colors"
        >
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full border border-[var(--color-b2)] bg-[var(--color-surface-2)] font-mono text-[10px] font-semibold text-[var(--color-t1)]">
            TX
          </div>
          <div>
            <p className="text-[13px] font-semibold leading-none tracking-tight text-[var(--color-t1)]">
              Founder
            </p>
            <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--color-t3)]">
              Profile
            </p>
          </div>
        </Link>
      </div>
    </aside>
  );
}
