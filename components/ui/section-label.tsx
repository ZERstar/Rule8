import * as React from "react";
import { cn } from "@/lib/utils";

type SectionLabelProps = {
  children: React.ReactNode;
  className?: string;
  /** Show the pulsing dot. Defaults to true. */
  dot?: boolean;
  /** Override dot color (defaults to accent blue) */
  dotColor?: string;
  /** Render the badge with an inverted (dark) background */
  inverted?: boolean;
};

export function SectionLabel({ children, className, dot = true, dotColor, inverted = false }: SectionLabelProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1 font-mono text-[10px] font-medium uppercase leading-none tracking-[0.15em]",
        inverted
          ? "border border-white/15 bg-white/5 text-white/70"
          : "border border-[var(--color-accent-a20)] bg-[var(--color-accent-a08)] text-[var(--color-accent)]",
        className,
      )}
    >
      {dot && (
        <span
          className="size-[6px] rounded-full"
          style={{
            backgroundColor: dotColor ?? (inverted ? "#FFFFFF" : "var(--color-accent)"),
            animation: "pulseDot 2s ease-in-out infinite",
          }}
        />
      )}
      <span>{children}</span>
    </span>
  );
}
