import { cn } from "@/lib/utils";

type AgentTag = "executive" | "finance" | "support" | "community" | "system";

const TAG_CONFIG: Record<AgentTag, { bg: string; text: string; border: string; label: string }> = {
  executive: { bg: "rgba(15,23,42,0.92)",   text: "#FFFFFF", border: "transparent",          label: "Executive" },
  finance:   { bg: "rgba(20,184,166,0.10)", text: "#0F766E", border: "rgba(20,184,166,0.30)",label: "Finance"   },
  support:   { bg: "rgba(0,82,255,0.08)",   text: "#0052FF", border: "rgba(0,82,255,0.25)",  label: "Support"   },
  community: { bg: "rgba(139,92,246,0.10)", text: "#7C3AED", border: "rgba(139,92,246,0.25)",label: "Community" },
  system:    { bg: "rgba(15,23,42,0.04)",   text: "#475569", border: "rgba(15,23,42,0.10)",  label: "System"    },
};

export function AgentTagChip({ tag, live, className }: { tag: AgentTag; live?: boolean; className?: string }) {
  const config = TAG_CONFIG[tag] ?? TAG_CONFIG.system;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.12em] leading-none",
        className,
      )}
      style={{ background: config.bg, color: config.text, borderColor: config.border }}
    >
      <span className="py-1">{config.label}</span>
      {live && (
        <span className="ml-1.5 inline-flex items-center gap-1 py-1 opacity-90">
          <span
            className="size-1 rounded-full"
            style={{ background: config.text, animation: "pulseDot 1.5s ease-in-out infinite" }}
          />
          LIVE
        </span>
      )}
    </span>
  );
}
