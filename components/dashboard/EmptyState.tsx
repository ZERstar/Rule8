import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  cta?: {
    label: string;
    href: string;
  };
};

export function EmptyState({ icon: Icon, title, description, cta }: EmptyStateProps) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-[var(--color-b1)] bg-white px-8 py-12 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-surface-2)]">
        <Icon className="h-6 w-6 text-[var(--color-t3)]" />
      </div>
      <p className="text-[18px] font-semibold tracking-[-0.02em] text-foreground">{title}</p>
      <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-[var(--color-t3)]">{description}</p>
      {cta && (
        <Button asChild className="mt-6 h-10 px-6 font-mono text-[10px] uppercase tracking-[0.14em]">
          <Link href={cta.href}>{cta.label}</Link>
        </Button>
      )}
    </div>
  );
}
