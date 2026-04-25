import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type InfoListCardProps<T> = {
  title: string;
  description?: string;
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  action?: ReactNode;
};

export function InfoListCard<T>({
  title,
  description,
  items,
  renderItem,
  className,
  headerClassName,
  contentClassName,
  action,
}: InfoListCardProps<T>) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-[var(--color-b1)] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)]",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-start justify-between gap-4 border-b border-[var(--color-b1)] px-5 py-4",
          headerClassName,
        )}
      >
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-t3)]">
            {title}
          </p>
          {description && (
            <p className="mt-2 max-w-[36rem] text-[13px] leading-[1.55] text-[var(--color-t3)]">
              {description}
            </p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className={cn("divide-y divide-[var(--color-b1)]", contentClassName)}>
        {items.map((item, index) => renderItem(item, index))}
      </div>
    </div>
  );
}
