type AgentTag = "executive" | "finance" | "support" | "community" | "system";

const TAG_STYLES: Record<AgentTag, { bg: string; color: string; label: string }> = {
  executive: { bg: "rgba(200,151,42,0.15)",  color: "#C8972A", label: "Executive" },
  finance:   { bg: "rgba(16,185,129,0.15)",  color: "#34D399", label: "Finance"   },
  support:   { bg: "rgba(59,130,246,0.15)",  color: "#60A5FA", label: "Support"   },
  community: { bg: "rgba(139,92,246,0.15)",  color: "#A78BFA", label: "Community" },
  system:    { bg: "rgba(90,90,106,0.25)",   color: "#9898A6", label: "System"    },
};

export function AgentTagChip({ tag, live }: { tag: AgentTag; live?: boolean }) {
  const s = TAG_STYLES[tag] ?? TAG_STYLES.system;
  return (
    <span
      className="inline-flex shrink-0 items-center rounded-[4px] px-[7px] py-[3px] font-mono text-[10px] font-semibold"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
      {live && <span className="ml-1 opacity-75">· LIVE</span>}
    </span>
  );
}
