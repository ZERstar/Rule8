"use client";

import { useRef, useState } from "react";
import { useMutation, useAction } from "convex/react";

import { api } from "@/convex/_generated/api";
import { TraceFeed } from "@/components/center/TraceFeed";
import { CrewRoomOverlay } from "@/components/crew-room/CrewRoomOverlay";
import { ExecutiveBlock } from "@/components/left-panel/ExecutiveBlock";
import { CrewsList } from "@/components/left-panel/CrewsList";
import { Topbar } from "@/components/layout/Topbar";
import { GlobalExecBar } from "@/components/GlobalExecBar";
import type { ExecutiveChatMode } from "@/components/right-panel/ModeTabs";
import { RightPanel } from "@/components/right-panel/RightPanel";
import { EXEC_RESPONSES, WORKSPACE_ID } from "@/lib/constants";
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
  const createAgent = useMutation(api.agents.createFromBrief);
  const submitManualTask = useAction(api.tasks.submitManualTask);

  const openExecutive = () => {
    setIsCrewRoomOpen(false);
    setRightPanelTab("executive");
  };

  const openCrewRoom = (tag?: CrewTag) => {
    if (tag) setSelectedCrew(tag);
    setIsCrewRoomOpen(true);
  };

  const sendExecutiveMessage = (text: string, mode: ExecutiveChatMode = "General") => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const founder: ExecutiveChatMessage = { id: nextIdRef.current++, role: "founder", text: trimmed };
    setRightPanelTab("executive");
    setShowQuickReplies(false);
    setExecutiveMessages((m) => [...m, founder]);
    setExecutiveIsTyping(true);
    if (mode === "Create Agent") {
      void createAgent({ workspaceId: WORKSPACE_ID, brief: trimmed })
        .then((result) => {
          setSelectedCrew(result.crewTag);
          setExecutiveMessages((m) => [
            ...m,
            {
              id: nextIdRef.current++,
              role: "executive",
              text: `Created ${result.name} in ${result.crewTag} as chamber ${result.chamberId}. It is now available in the crew lists.`,
            },
          ]);
        })
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : "Agent creation failed.";
          setExecutiveMessages((m) => [
            ...m,
            {
              id: nextIdRef.current++,
              role: "executive",
              text: `Agent creation failed: ${message}`,
            },
          ]);
        })
        .finally(() => {
          setExecutiveIsTyping(false);
        });
      return;
    }

    void submitManualTask({ workspaceId: WORKSPACE_ID, summary: trimmed })
      .then(() => {
        setExecutiveMessages((m) => [
          ...m,
          {
            id: nextIdRef.current++,
            role: "executive",
            text: mode === "Review"
              ? "Review mode active. Task dispatched to overseer. Check the live trace feed."
              : "Task routed to overseer. Agents will pick it up shortly.",
          },
        ]);
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : "Dispatch failed.";
        setExecutiveMessages((m) => [
          ...m,
          {
            id: nextIdRef.current++,
            role: "executive",
            text: `Task dispatch failed: ${message}`,
          },
        ]);
      })
      .finally(() => {
        setExecutiveIsTyping(false);
      });
  };

  return (
    <>
      <div className="hidden min-h-screen flex-col overflow-hidden bg-background text-foreground lg:flex">
        <Topbar />
        <div className="min-h-0 flex flex-1 justify-center px-4 pb-32 pt-3 md:px-5 md:pb-36 xl:px-6 xl:pb-36">
          <div className="page-frame h-full w-full min-h-0">
            <div className="control-room-grid grid h-full min-h-0 gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.12fr)_minmax(0,0.92fr)] xl:gap-5">
              <aside className="control-room-left grid min-h-0 min-w-0 gap-4 xl:gap-5">
                <div className="surface-panel flex min-h-0 flex-col overflow-hidden">
                  <ExecutiveBlock onOpen={openExecutive} />
                </div>
                <div className="surface-panel flex min-h-0 flex-col overflow-hidden">
                  <CrewsList
                    selectedCrew={selectedCrew}
                    onSelectCrew={setSelectedCrew}
                    onOpenCrewRoom={openCrewRoom}
                  />
                </div>
              </aside>

              <section className="surface-panel flex min-h-0 min-w-0 flex-col overflow-hidden">
                <TraceFeed enableDemoTraces />
              </section>

              <aside className="control-room-right surface-panel flex min-h-0 min-w-0 flex-col overflow-hidden">
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
            </div>
          </div>
        </div>
      </div>

      <div className="flex min-h-screen flex-col overflow-hidden bg-background text-foreground lg:hidden">
        <Topbar />
        <div className="app-scroll flex-1 overflow-y-auto px-4 pb-24 pt-4">
          <div className="page-frame max-w-[820px] space-y-4">
            <div className="surface-panel flex flex-col overflow-hidden">
              <ExecutiveBlock onOpen={openExecutive} />
            </div>
            <div className="surface-panel flex flex-col overflow-hidden">
              <CrewsList selectedCrew={selectedCrew} onSelectCrew={setSelectedCrew} onOpenCrewRoom={openCrewRoom} />
            </div>
            <div className="surface-panel flex h-[560px] flex-col overflow-hidden">
              <TraceFeed enableDemoTraces />
            </div>
            <div className="surface-panel flex min-h-[480px] flex-col overflow-hidden">
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
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 hidden lg:block">
        <div className="px-4 pb-4 md:px-5 xl:px-6">
          <div className="page-frame">
            <GlobalExecBar onSend={sendExecutiveMessage} />
          </div>
        </div>
      </div>

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
