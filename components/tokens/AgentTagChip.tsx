export function AgentTagChip({ tag, className }: { tag: string; className?: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    support:   { bg: "var(--color-tag-support-bg)",   color: "var(--color-tag-support-text)" },
    billing:   { bg: "var(--color-tag-finance-bg)",   color: "var(--color-tag-finance-text)" },
    finance:   { bg: "var(--color-tag-finance-bg)",   color: "var(--color-tag-finance-text)" },
    community: { bg: "var(--color-tag-community-bg)", color: "var(--color-tag-community-text)" },
    executive: { bg: "var(--color-tag-executive-bg)", color: "var(--color-tag-executive-text)" },
    overseer:  { bg: "var(--color-tag-executive-bg)", color: "var(--color-tag-executive-text)" },
    system:    { bg: "#f3f4f6",                        color: "#6b7280" },
    outreach:  { bg: "var(--color-tag-support-bg)",   color: "var(--color-tag-support-text)" },
  };
  const s = styles[tag] ?? styles.executive;
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] ${className ?? ""}`}
      style={{ background: s.bg, color: s.color }}
    >
      {tag}
    </span>
  );
}
