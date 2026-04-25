"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { path: "/dashboard",    label: "Overview"     },
  { path: "/escalations",  label: "Escalations"  },
  { path: "/integrations", label: "Integrations" },
  { path: "/prompts",      label: "Prompts"       },
];

export function Topbar() {
  const pathname = usePathname();
  const isPreview = pathname.startsWith("/preview");
  const prefix = isPreview ? "/preview" : "";

  return (
    <header
      className="flex h-[50px] items-center justify-between border-b px-5"
      style={{ background: "var(--color-s1)", borderColor: "var(--color-b1)" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3">
        <Link href={`${prefix}/dashboard`} className="flex items-center gap-2.5">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-[6px] font-mono text-[13px] font-semibold text-black"
            style={{ background: "var(--color-gold)" }}
          >
            8
          </div>
          <span
            className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: "var(--color-gold)" }}
          >
            Rule8
          </span>
        </Link>
        <span className="font-mono text-[10px]" style={{ color: "var(--color-t3)" }}>
          Agent OS
        </span>
        {isPreview && (
          <span
            className="rounded-[4px] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em]"
            style={{ background: "rgba(200,151,42,0.10)", color: "var(--color-gold)" }}
          >
            Preview
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="hidden items-center gap-1 md:flex">
        {NAV_ITEMS.map(({ path, label }) => {
          const href = `${prefix}${path}`;
          const active = pathname === href;
          return (
            <Link
              key={path}
              href={href}
              className="relative px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] transition"
              style={{ color: active ? "var(--color-gold)" : "var(--color-t3)" }}
            >
              {label}
              {active && (
                <span
                  className="absolute -bottom-[1px] left-0 right-0 h-[2px]"
                  style={{ background: "var(--color-gold)" }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Status */}
      <div className="flex items-center gap-2">
        <span
          className="h-[5px] w-[5px] rounded-full"
          style={{
            background: "var(--color-green)",
            animation: "pulse-gold 2.5s ease-in-out infinite",
          }}
        />
        <span
          className="hidden font-mono text-[10px] lg:block"
          style={{ color: "var(--color-t3)" }}
        >
          All systems operational
        </span>
      </div>
    </header>
  );
}
