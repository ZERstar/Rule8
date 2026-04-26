"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActiveNavPath } from "@/lib/routes";

const NAV_ITEMS = [
  { href: "/dashboard",              label: "OVERVIEW",     exact: true },
  { href: "/dashboard/escalations",  label: "ESCALATIONS",  exact: false },
  { href: "/dashboard/integrations", label: "INTEGRATIONS", exact: false },
  { href: "/dashboard/prompts",      label: "PROMPTS",      exact: false },
];

export function Topbar() {
  const pathname = usePathname();

  return (
    <header
      className="flex h-14 shrink-0 items-center border-b px-5"
      style={{ borderColor: "var(--color-border)", background: "var(--color-bg)" }}
    >
      {/* Left: logo + title + subtitle */}
      <div className="flex items-center gap-3 w-[260px] shrink-0">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold text-white text-[18px]"
          style={{ background: "var(--color-accent-orange)" }}
        >
          8
        </div>
        <div>
          <p className="text-[14px] font-bold leading-none" style={{ color: "var(--color-t1)" }}>
            Rule8 Control Room
          </p>
          <p
            className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] leading-none"
            style={{ color: "var(--color-t3)" }}
          >
            Founder-Facing Agent Operations
          </p>
        </div>
      </div>

      {/* Center: pill nav tabs */}
      <div className="flex flex-1 items-center justify-center gap-1">
        {NAV_ITEMS.map((item) => {
          const active = isActiveNavPath(pathname, item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full border px-4 py-1.5 text-[12px] font-medium transition-colors"
              style={{
                borderColor: active ? "#1a1a1a" : "var(--color-border)",
                background: active ? "#1a1a1a" : "var(--color-bg)",
                color: active ? "#ffffff" : "var(--color-t2)",
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* Right: health status + mode label + avatar */}
      <div className="flex items-center gap-3 w-[260px] shrink-0 justify-end">
        <div className="hidden sm:flex items-center gap-1.5">
          <span className="live-dot" />
          <span className="text-[11px]" style={{ color: "var(--color-t2)" }}>
            All crews healthy
          </span>
        </div>
        <span
          className="hidden xl:block text-[9px] font-semibold uppercase tracking-[0.10em]"
          style={{ color: "var(--color-t3)" }}
        >
          FOUNDER MODE / Executive supervision on
        </span>
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full border font-mono text-[11px] font-semibold"
          style={{
            borderColor: "var(--color-border)",
            background: "var(--color-bg-secondary)",
            color: "var(--color-t1)",
          }}
        >
          TX
        </div>
      </div>
    </header>
  );
}
