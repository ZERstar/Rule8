"use client";

import { useRef, useState } from "react";

import { TraceFeed } from "@/components/center/TraceFeed";
import { GlobalExecBar } from "@/components/GlobalExecBar";
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

export function DashboardShell() {
  const [selectedCrew, setSelectedCrew] = useState<CrewTag>("finance");
  const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>("crew");
  const [isCrewRoomOpen, setIsCrewRoomOpen] = useState(false);
  const [executiveMessages, setExecutiveMessages] = useState<ExecutiveChatMessage[]>([
    { id: 1, role: "executive", text: INITIAL_EXECUTIVE_MESSAGE },
  ]);
  const [executiveIsTyping, setExecutiveIsTyping] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const nextIdRef = useRef(2);

  const openExecutive = () => {
    setIsCrewRoomOpen(false);
    setRightPanelTab("executive");
  };

  const openCrewRoom = (tag?: CrewTag) => {
    if (tag) setSelectedCrew(tag);
    setIsCrewRoomOpen(true);
  };

  const sendExecutiveMessage = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const founder: ExecutiveChatMessage = { id: nextIdRef.current++, role: "founder", text: trimmed };
    setRightPanelTab("executive");
    setShowQuickReplies(false);
    setExecutiveMessages((m) => [...m, founder]);
    setExecutiveIsTyping(true);
    window.setTimeout(() => {
      setExecutiveMessages((m) => [
        ...m,
        {
          id: nextIdRef.current++,
          role: "executive",
          text: EXEC_RESPONSES[Math.floor(Math.random() * EXEC_RESPONSES.length)],
        },
      ]);
      setExecutiveIsTyping(false);
    }, 800);
  };

  return (
    <>
      {/* ── Desktop 3×3 grid ── */}
      <div
        className="hidden h-screen overflow-hidden lg:grid"
        style={{
          gridTemplateRows: "50px 1fr 54px",
          gridTemplateColumns: "280px 1fr 300px",
          background: "var(--color-bg)",
          color: "var(--color-t1)",
        }}
      >
        {/* Row 1 — Topbar full width */}
        <div style={{ gridColumn: "1 / -1", gridRow: 1 }}>
          <Topbar />
        </div>

        {/* Row 2, Col 1 — Left panel */}
        <aside
          className="flex flex-col overflow-hidden border-r"
          style={{
            gridRow: 2,
            gridColumn: 1,
            background: "var(--color-s1)",
            borderColor: "var(--color-b1)",
          }}
        >
          {/* Executive block — 55% height */}
          <div
            className="shrink-0 overflow-hidden border-b"
            style={{ flex: "0 0 55%", borderColor: "rgba(200,151,42,0.20)" }}
          >
            <ExecutiveBlock onOpen={openExecutive} />
          </div>
          {/* Crews list — remaining */}
          <div className="min-h-0 flex-1 overflow-hidden">
            <CrewsList
              selectedCrew={selectedCrew}
              onSelectCrew={setSelectedCrew}
              onOpenCrewRoom={openCrewRoom}
            />
          </div>
        </aside>

        {/* Row 2, Col 2 — Center (trace feed) */}
        <section
          className="overflow-hidden border-r"
          style={{ gridRow: 2, gridColumn: 2, borderColor: "var(--color-b1)", background: "var(--color-bg)" }}
        >
          <TraceFeed />
        </section>

        {/* Row 2, Col 3 — Right panel */}
        <aside
          className="overflow-hidden"
          style={{ gridRow: 2, gridColumn: 3, background: "var(--color-s1)" }}
        >
          <RightPanel
            tab={rightPanelTab}
            selectedCrew={selectedCrew}
            executiveMessages={executiveMessages}
            executiveIsTyping={executiveIsTyping}
            executiveShowQuickReplies={showQuickReplies}
            onTabChange={setRightPanelTab}
            onOpenCrewRoom={() => openCrewRoom()}
            onExecutiveSend={sendExecutiveMessage}
          />
        </aside>

        {/* Row 3 — Global Executive Bar full width */}
        <div style={{ gridColumn: "1 / -1", gridRow: 3 }}>
          <GlobalExecBar onSend={sendExecutiveMessage} />
        </div>
      </div>

      {/* ── Mobile stacked ── */}
      <div className="flex h-screen flex-col overflow-hidden lg:hidden" style={{ background: "var(--color-bg)", color: "var(--color-t1)" }}>
        <Topbar />
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <div className="rounded-[8px] border overflow-hidden" style={{ borderColor: "var(--color-b1)", background: "var(--color-s1)" }}>
            <ExecutiveBlock onOpen={openExecutive} />
          </div>
          <div className="rounded-[8px] border overflow-hidden" style={{ borderColor: "var(--color-b1)", background: "var(--color-s1)" }}>
            <CrewsList selectedCrew={selectedCrew} onSelectCrew={setSelectedCrew} onOpenCrewRoom={openCrewRoom} />
          </div>
          <div className="h-[500px] overflow-hidden rounded-[8px] border" style={{ borderColor: "var(--color-b1)", background: "var(--color-bg)" }}>
            <TraceFeed />
          </div>
          <div className="h-[420px] overflow-hidden rounded-[8px] border" style={{ borderColor: "var(--color-b1)", background: "var(--color-s1)" }}>
            <RightPanel
              tab={rightPanelTab}
              selectedCrew={selectedCrew}
              executiveMessages={executiveMessages}
              executiveIsTyping={executiveIsTyping}
              executiveShowQuickReplies={showQuickReplies}
              onTabChange={setRightPanelTab}
              onOpenCrewRoom={() => openCrewRoom()}
              onExecutiveSend={sendExecutiveMessage}
            />
          </div>
        </div>
        <GlobalExecBar onSend={sendExecutiveMessage} />
      </div>

      {/* Crew Room overlay */}
      {isCrewRoomOpen && (
        <CrewRoomOverlay
          crewTag={selectedCrew}
          onBack={() => setIsCrewRoomOpen(false)}
          onOpenExecutive={openExecutive}
          onSendExecutive={sendExecutiveMessage}
        />
      )}
    </>
  );
}
