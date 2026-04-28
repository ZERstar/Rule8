"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  AlertTriangle,
  Plug,
  FileText,
} from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { DASHBOARD_NAV, isActiveNavPath } from "@/lib/routes";
import { WORKSPACE_ID, CREW_META } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { SidebarLogo } from "./SidebarLogo";

const ICONS: Record<string, React.ElementType> = {
  Overview:     LayoutDashboard,
  Escalations:  AlertTriangle,
  Integrations: Plug,
  Prompts:      FileText,
};

const NAV_SECTION_1 = ["Overview", "Escalations"];
const NAV_SECTION_2 = ["Integrations", "Prompts"];

type CrewKey = keyof typeof CREW_META;
const CREW_KEYS: CrewKey[] = ["finance", "support", "community"];

const CREW_DOT_COLOR: Record<CrewKey, string> = {
  finance:   "var(--color-crew-finance)",
  support:   "var(--color-crew-support)",
  community: "var(--color-crew-community)",
};

export function Sidebar() {
  const pathname = usePathname();
  const agents = useQuery(api.agents.list, { workspaceId: WORKSPACE_ID });

  const section1 = DASHBOARD_NAV.filter((item) =>
    NAV_SECTION_1.includes(item.label)
  );
  const section2 = DASHBOARD_NAV.filter((item) =>
    NAV_SECTION_2.includes(item.label)
  );

  function agentCount(tag: CrewKey) {
    return agents?.filter((a) => a.crewTag === tag).length ?? 0;
  }

  return (
    <aside className="hidden h-full w-[240px] shrink-0 flex-col overflow-hidden border-r border-[var(--color-b1)] bg-[var(--color-surface)] lg:flex">
      <SidebarLogo />

      <nav className="flex flex-1 flex-col overflow-y-auto py-3">
        {/* Section: NAVIGATION */}
        <p className="px-4 pb-1.5 pt-2 font-mono text-[9px] font-medium uppercase tracking-[0.18em] text-[var(--color-t3)]">
          Navigation
        </p>

        {section1.map((item) => {
          const Icon = ICONS[item.label] ?? LayoutDashboard;
          const active = isActiveNavPath(pathname, item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md mx-2 px-2.5 h-8 text-[13px] transition-colors",
                active
                  ? "bg-[var(--color-accent-a12)] text-[var(--color-accent-2)] font-medium border border-[var(--color-accent-a20)]"
                  : "text-[var(--color-t2)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-t1)]"
              )}
            >
              <Icon className="size-3.5 shrink-0 opacity-80" />
              {item.label}
            </Link>
          );
        })}

        {/* Section: OPERATIONS */}
        <p className="px-4 pb-1.5 pt-4 font-mono text-[9px] font-medium uppercase tracking-[0.18em] text-[var(--color-t3)]">
          Operations
        </p>

        {section2.map((item) => {
          const Icon = ICONS[item.label] ?? LayoutDashboard;
          const active = isActiveNavPath(pathname, item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md mx-2 px-2.5 h-8 text-[13px] transition-colors",
                active
                  ? "bg-[var(--color-accent-a12)] text-[var(--color-accent-2)] font-medium border border-[var(--color-accent-a20)]"
                  : "text-[var(--color-t2)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-t1)]"
              )}
            >
              <Icon className="size-3.5 shrink-0 opacity-80" />
              {item.label}
            </Link>
          );
        })}

        {/* Section: CREWS */}
        <p className="px-4 pb-1.5 pt-4 font-mono text-[9px] font-medium uppercase tracking-[0.18em] text-[var(--color-t3)]">
          Crews
        </p>

        {CREW_KEYS.map((key) => {
          const meta = CREW_META[key];
          const count = agentCount(key);
          return (
            <div
              key={key}
              className="flex items-center gap-2.5 mx-2 px-2.5 h-8 rounded-md"
            >
              <span
                className="shrink-0 rounded-full"
                style={{ width: 6, height: 6, background: CREW_DOT_COLOR[key] }}
              />
              <span className="flex-1 truncate text-[12.5px] text-[var(--color-t2)]">
                {meta.label}
              </span>
              <span className="font-mono text-[9px] text-[var(--color-t3)]">
                {count}
              </span>
            </div>
          );
        })}
      </nav>

      {/* Bottom: user block */}
      <div className="border-t border-[var(--color-b1)] px-3 py-3">
        {/* TODO: open profile/settings panel */}
        <button type="button" className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 cursor-pointer hover:bg-[var(--color-surface-2)] transition-colors">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full border border-[var(--color-b2)] bg-[var(--color-surface-2)] font-mono text-[10px] font-semibold text-[var(--color-t1)]">
            TX
          </div>
          <div>
            <p className="text-[13px] font-semibold leading-none tracking-tight text-[var(--color-t1)]">
              Rule8
            </p>
            <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--color-t3)]">
              Agent OS
            </p>
          </div>
        </button>
      </div>
    </aside>
  );
}
