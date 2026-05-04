import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description?: string;
  highlight?: string;
  action?: ReactNode;
  children?: ReactNode;
};

export function PageHeader({ eyebrow, title, description, action, children }: PageHeaderProps) {
  return (
    <div className="mb-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="kicker mb-2">{eyebrow}</p>
          <h1
            className="text-[28px] font-semibold tracking-[-0.02em] text-foreground"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {title}
          </h1>
          {description && (
            <p className="mt-2 max-w-xl text-[13.5px] leading-relaxed text-[var(--color-t2)]">
              {description}
            </p>
          )}
        </div>
        {action && <div className="flex-none">{action}</div>}
      </div>
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}
