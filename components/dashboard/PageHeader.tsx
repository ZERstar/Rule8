import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { SectionLabel } from "@/components/ui/section-label";
import { GradientText } from "@/components/ui/gradient-text";

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  /** Phrase inside `title` to render with the gradient highlight. Optional. */
  highlight?: string;
  className?: string;
  contentClassName?: string;
  children?: ReactNode;
};

function renderTitle(title: string, highlight?: string) {
  if (!highlight) return title;
  const idx = title.toLowerCase().indexOf(highlight.toLowerCase());
  if (idx === -1) return title;
  const before = title.slice(0, idx);
  const match = title.slice(idx, idx + highlight.length);
  const after = title.slice(idx + highlight.length);
  return (
    <>
      {before}
      <GradientText>{match}</GradientText>
      {after}
    </>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  highlight,
  className,
  contentClassName,
  children,
}: PageHeaderProps) {
  return (
    <div className={cn("mb-8", className)}>
      <SectionLabel>{eyebrow}</SectionLabel>
      <h1
        className="mt-3 max-w-4xl text-[36px] leading-[1.05] tracking-[-0.025em] text-foreground md:text-[44px] xl:text-[48px]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {renderTitle(title, highlight)}
      </h1>
      <p className="mt-4 max-w-3xl text-[15px] leading-[1.65] text-[var(--color-t3)]">
        {description}
      </p>
      {children && <div className={cn("mt-6 w-full", contentClassName)}>{children}</div>}
    </div>
  );
}
