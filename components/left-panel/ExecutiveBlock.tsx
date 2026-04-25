"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { WORKSPACE_ID } from "@/lib/constants";

import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/section-label";
import { GradientText } from "@/components/ui/gradient-text";

const POWER_TAGS = ["creates agents", "reviews escalations", "routes work"];

export function ExecutiveBlock({ onOpen }: { onOpen: () => void }) {
  const stats = useQuery(api.tasks.getStats, { workspaceId: WORKSPACE_ID });
  const statData = stats ?? { agentsManaged: 0, tasksToday: 0, costTodayCents: 0 };

  return (
    <div
      className="group/exec relative flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-[var(--color-b1)] bg-white text-left shadow-[0_1px_3px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_4px_8px_rgba(15,23,42,0.06),0_18px_36px_rgba(0,82,255,0.10)]"
      onClick={onOpen}
    >
      {/* Subtle gradient glow in corner */}
      <div
        className="pointer-events-none absolute -right-12 -top-12 size-48 rounded-full opacity-60 blur-3xl transition-opacity duration-500 group-hover/exec:opacity-100"
        style={{ background: "radial-gradient(circle, rgba(0,82,255,0.15), transparent 70%)" }}
        aria-hidden
      />

      <div className="relative z-10 flex h-full flex-col justify-between p-6">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between">
            <SectionLabel>Executive Prime</SectionLabel>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-green)]/20 bg-[var(--color-green-bg)] px-2.5 py-1">
              <span
                className="size-1.5 rounded-full bg-[var(--color-green)]"
                style={{ animation: "pulseDot 2s ease-in-out infinite" }}
              />
              <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--color-green)]">
                Live
              </span>
            </span>
          </div>

          {/* Heading */}
          <h2 className="mt-5 text-[28px] font-normal leading-[1.1] tracking-[-0.025em] text-foreground" style={{ fontFamily: "var(--font-display)" }}>
            Strategic orchestration for{" "}
            <GradientText>every crew</GradientText>.
          </h2>
          <p className="mt-3 text-[13.5px] leading-[1.6] text-[var(--color-t3)]">
            Launch agents, review escalations, and redirect work from one control surface built for founders.
          </p>

          {/* Stats — three-column with vertical dividers */}
          <div className="mt-6 grid grid-cols-3 divide-x divide-[var(--color-b1)] rounded-xl border border-[var(--color-b1)] bg-[var(--color-surface-2)]/50">
            {[
              { label: "Agents", value: statData.agentsManaged },
              { label: "Tasks", value: statData.tasksToday },
              { label: "Spend", value: `$${(statData.costTodayCents / 100).toFixed(2)}` },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col items-center justify-center px-3 py-4">
                <p className="text-[24px] font-semibold leading-none tracking-[-0.02em] text-foreground">
                  {value}
                </p>
                <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-t3)]">
                  {label}
                </p>
              </div>
            ))}
          </div>

          {/* Power tags */}
          <div className="mt-5 flex flex-wrap gap-1.5">
            {POWER_TAGS.map(tag => (
              <span
                key={tag}
                className="rounded-full border border-[var(--color-b1)] bg-white px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--color-t3)]"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* CTA */}
        <Button
          className="mt-6 w-full font-mono text-[10px] uppercase tracking-[0.16em]"
          size="lg"
          onClick={e => { e.stopPropagation(); onOpen(); }}
        >
          Open Executive Conversation
          <span className="transition-transform group-hover/exec:translate-x-0.5">→</span>
        </Button>
      </div>
    </div>
  );
}
