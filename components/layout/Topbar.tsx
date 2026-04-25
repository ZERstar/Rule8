"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard",     label: "Overview"      },
  { href: "/escalations",   label: "Escalations"   },
  { href: "/integrations",  label: "Integrations"  },
  { href: "/prompts",       label: "Prompts"        },
];

export function Topbar() {
  const pathname = usePathname();

  return (
    <header
      className="flex h-[50px] items-center justify-between border-b px-5"
      style={{ background: "var(--color-s1)", borderColor: "var(--color-b1)" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-[6px] font-mono text-[13px] font-semibold text-black"
          style={{ background: "var(--color-gold)" }}
        >
          8
        </div>
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--color-gold)" }}>
          Rule8
        </span>
        <span className="font-mono text-[10px]" style={{ color: "var(--color-t3)" }}>Agent OS</span>
      </div>

      {/* Nav */}
      <nav className="hidden items-center gap-1 md:flex">
        {NAV.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
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
          style={{ background: "var(--color-green)", animation: "pulse-gold 2.5s ease-in-out infinite" }}
        />
        <span className="hidden font-mono text-[10px] lg:block" style={{ color: "var(--color-t3)" }}>
          All systems operational
        </span>
      </div>
    </header>
  );
}
