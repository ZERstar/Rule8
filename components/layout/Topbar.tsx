"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DASHBOARD_NAV, ROUTES, isActiveNavPath } from "@/lib/routes";
import { cn } from "@/lib/utils";

export function Topbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-b1)] bg-white/80 backdrop-blur-xl">
      <div className="px-5 md:px-6 xl:px-8">
        <div className="page-frame flex min-h-[60px] flex-wrap items-center gap-3 py-2.5 xl:flex-nowrap">
          {/* LEFT: Logo + wordmark */}
          <Link href={ROUTES.dashboardOverview} className="group/logo flex min-w-0 items-center gap-2.5">
            <span className="relative flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#0052FF] to-[#4D7CFF] font-mono text-[14px] font-bold text-white shadow-[0_4px_14px_rgba(0,82,255,0.30)] transition-transform group-hover/logo:scale-105">
              8
            </span>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold tracking-[-0.01em] text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                Rule8
              </p>
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--color-t3)]">
                Control Room
              </p>
            </div>
          </Link>

          {/* CENTER: Pill nav */}
          <nav className="order-3 hidden w-full min-w-0 items-center justify-start md:flex lg:order-none lg:w-auto lg:flex-1 lg:justify-center">
            <div className="flex items-center gap-1 rounded-full border border-[var(--color-b1)] bg-[var(--color-surface-2)] p-1">
              {DASHBOARD_NAV.map(({ href, label, exact }) => {
                const active = isActiveNavPath(pathname, href, exact);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "rounded-full px-4 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] transition-all",
                      active
                        ? "bg-foreground text-white shadow-[0_4px_12px_rgba(15,23,42,0.20)]"
                        : "text-[var(--color-t3)] hover:bg-white hover:text-foreground",
                    )}
                  >
                    {label}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* RIGHT: Status chips + avatar */}
          <div className="ml-auto flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-full border border-[var(--color-b1)] bg-white px-3 py-1.5 lg:flex">
              <span
                className="size-1.5 rounded-full bg-[var(--color-green)]"
                style={{ animation: "pulseDot 2.5s ease-in-out infinite" }}
              />
              <div className="leading-tight">
                <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-[var(--color-t3)]">
                  Live ops
                </p>
                <p className="text-[11px] font-semibold text-foreground">
                  All crews healthy
                </p>
              </div>
            </div>

            <div className="hidden rounded-full border border-[var(--color-b1)] bg-white px-3 py-1.5 xl:block">
              <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-[var(--color-t3)] leading-tight">
                Founder mode
              </p>
              <p className="text-[11px] font-semibold text-foreground">
                Supervision on
              </p>
            </div>

            <span className="flex size-9 items-center justify-center rounded-full border border-[var(--color-b1)] bg-white font-mono text-[11px] font-semibold text-foreground">
              TX
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
