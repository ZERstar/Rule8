"use client";

import type { ExecutiveChatMessage, RightPanelTab, CrewTag } from "@/lib/dashboard";
import { CrewDetail } from "./CrewDetail";
import { ExecutiveChat } from "./ExecutiveChat";
import type { ExecutiveChatMode } from "./ModeTabs";
import { cn } from "@/lib/utils";

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
  onExecutiveSend: (text: string, mode: ExecutiveChatMode) => void;
  tab: RightPanelTab;
  selectedCrew: CrewTag;
  onTabChange: (t: RightPanelTab) => void;
  onOpenCrewRoom: () => void;
}) {
  const tabs: { key: RightPanelTab; label: string }[] = [
    { key: "crew", label: "Crew Detail" },
    { key: "executive", label: "Executive" },
  ];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Tab bar with gradient underline on active */}
      <div className="flex border-b border-[var(--color-b1)]">
        {tabs.map(({ key, label }) => {
          const isActive = tab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onTabChange(key)}
              className={cn(
                "relative flex-1 px-4 py-4 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] transition-colors",
                isActive ? "text-foreground" : "text-[var(--color-t3)] hover:text-foreground",
              )}
            >
              {label}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#0052FF] to-[#4D7CFF]" />
              )}
            </button>
          );
        })}
      </div>

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
