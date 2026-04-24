"use client";

import { useRef, useState } from "react";

import { GlobalExecBar } from "@/components/GlobalExecBar";
import { TraceFeed } from "@/components/center/TraceFeed";
import { CrewRoomOverlay } from "@/components/crew-room/CrewRoomOverlay";
import { ExecutiveBlock } from "@/components/left-panel/ExecutiveBlock";
import { CrewsList } from "@/components/left-panel/CrewsList";
import { Topbar } from "@/components/layout/Topbar";
import { RightPanel } from "@/components/right-panel/RightPanel";
import { EXEC_RESPONSES } from "@/lib/constants";
import {
  INITIAL_EXECUTIVE_MESSAGE,
  type CrewTag,
  type ExecutiveChatMessage,
  type RightPanelTab,
} from "@/lib/dashboard";

export default function DashboardPage() {
  const [selectedCrew, setSelectedCrew] = useState<CrewTag>("finance");
  const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>("crew");
  const [isCrewRoomOpen, setIsCrewRoomOpen] = useState(false);
  const [executiveMessages, setExecutiveMessages] = useState<ExecutiveChatMessage[]>([
    { id: 1, role: "executive", text: INITIAL_EXECUTIVE_MESSAGE },
  ]);
  const [executiveIsTyping, setExecutiveIsTyping] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const nextMessageIdRef = useRef(2);

  const openExecutive = () => {
    setIsCrewRoomOpen(false);
    setRightPanelTab("executive");
  };

  const openCrewRoom = (crewTag?: CrewTag) => {
    if (crewTag) {
      setSelectedCrew(crewTag);
    }

    setIsCrewRoomOpen(true);
  };

  const sendExecutiveMessage = (value: string) => {
    const text = value.trim();
    if (!text) {
      return;
    }

    const founderMessage: ExecutiveChatMessage = {
      id: nextMessageIdRef.current++,
      role: "founder",
      text,
    };

    setRightPanelTab("executive");
    setShowQuickReplies(false);
    setExecutiveMessages((current) => [...current, founderMessage]);
    setExecutiveIsTyping(true);

    window.setTimeout(() => {
      setExecutiveMessages((current) => [
        ...current,
        {
          id: nextMessageIdRef.current++,
          role: "executive",
          text: EXEC_RESPONSES[Math.floor(Math.random() * EXEC_RESPONSES.length)],
        },
      ]);
      setExecutiveIsTyping(false);
    }, 800);
  };

  return (
    <>
      <main className="grid h-full grid-cols-[280px_minmax(0,1fr)_300px] grid-rows-[50px_minmax(0,1fr)_54px] overflow-hidden bg-[var(--color-bg)]">
        <Topbar />

        <aside
          className="row-start-2 flex min-h-0 flex-col border-r"
          style={{ borderColor: "var(--color-b1)", background: "var(--color-s1)" }}
        >
          <div className="min-h-0 basis-[55%] border-b" style={{ borderColor: "var(--color-gold-a24)" }}>
            <ExecutiveBlock onOpen={openExecutive} />
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            <CrewsList
              onOpenCrewRoom={openCrewRoom}
              selectedCrew={selectedCrew}
              onSelectCrew={setSelectedCrew}
            />
          </div>
        </aside>

        <section className="row-start-2 min-h-0 overflow-hidden bg-[var(--color-bg)]">
          <TraceFeed />
        </section>

        <aside
          className="row-start-2 min-h-0 overflow-hidden border-l"
          style={{ borderColor: "var(--color-b1)", background: "var(--color-s1)" }}
        >
          <RightPanel
            executiveIsTyping={executiveIsTyping}
            executiveMessages={executiveMessages}
            executiveShowQuickReplies={showQuickReplies}
            onExecutiveSend={sendExecutiveMessage}
            onOpenCrewRoom={() => openCrewRoom()}
            onTabChange={setRightPanelTab}
            selectedCrew={selectedCrew}
            tab={rightPanelTab}
          />
        </aside>

        <div className="col-span-3 row-start-3">
          <GlobalExecBar onSend={sendExecutiveMessage} />
        </div>
      </main>

      {isCrewRoomOpen ? (
        <CrewRoomOverlay
          crewTag={selectedCrew}
          onBack={() => setIsCrewRoomOpen(false)}
          onOpenExecutive={openExecutive}
        />
      ) : null}
    </>
  );
}
