"use client";

import type { ExecutiveChatMessage, RightPanelTab, CrewTag } from "@/lib/dashboard";
import { CrewDetail } from "./CrewDetail";
import { ExecutiveChat } from "./ExecutiveChat";

export function RightPanel({
  executiveIsTyping,
  executiveMessages,
  executiveShowQuickReplies,
  onExecutiveSend,
  tab,
  selectedCrew,
  onTabChange,
  onOpenCrewRoom,
}: {
  executiveIsTyping: boolean;
  executiveMessages: ExecutiveChatMessage[];
  executiveShowQuickReplies: boolean;
  onExecutiveSend: (text: string) => void;
  tab: RightPanelTab;
  selectedCrew: CrewTag;
  onTabChange: (t: RightPanelTab) => void;
  onOpenCrewRoom: () => void;
}) {
  return (
    <div className="flex h-full flex-col overflow-hidden" style={{ background: "var(--color-s1)" }}>
      {/* Tab bar */}
      <div
        className="flex shrink-0 border-b"
        style={{ borderColor: "var(--color-b1)", height: 40 }}
      >
        {(["crew", "executive"] as RightPanelTab[]).map((t) => {
          const isActive = tab === t;
          const label = t === "crew" ? "Crew Detail" : "Executive";
          return (
            <button
              key={t}
              className="relative flex h-full items-center px-4 font-mono text-[10px] uppercase tracking-[0.12em] transition"
              style={{ color: isActive ? "var(--color-gold)" : "var(--color-t3)" }}
              onClick={() => onTabChange(t)}
            >
              {label}
              {isActive && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ background: "var(--color-gold)" }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="min-h-0 flex-1 overflow-hidden">
        {tab === "crew" ? (
          <CrewDetail crewTag={selectedCrew} onOpenCrewRoom={onOpenCrewRoom} />
        ) : (
          <ExecutiveChat
            isTyping={executiveIsTyping}
            messages={executiveMessages}
            onSend={onExecutiveSend}
            showQuickReplies={executiveShowQuickReplies}
          />
        )}
      </div>
    </div>
  );
}
