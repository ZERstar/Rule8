import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type StatStripItem = {
  label: string;
  value: ReactNode;
  sub: ReactNode;
};

export function StatStrip({
  items,
  className,
}: {
  items: StatStripItem[];
  className?: string;
}) {
  return (
    <div className={cn("mb-8 grid gap-4 md:grid-cols-3", className)}>
      {items.map(({ label, value, sub }) => (
        <div
          key={label}
          className="rounded-2xl border border-[var(--color-b1)] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)] transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(15,23,42,0.06),0_18px_36px_rgba(0,82,255,0.08)]"
        >
          <div className="h-1 w-12 rounded-full bg-gradient-to-r from-[#0052FF] to-[#4D7CFF]" />
          <p className="mt-4 font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--color-t3)]">
            {label}
          </p>
          <p className="mt-3 text-[30px] font-semibold leading-none tabular-nums tracking-[-0.025em] text-foreground">
            {value}
          </p>
          <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-t3)]">
            {sub}
          </p>
        </div>
      ))}
    </div>
  );
}
