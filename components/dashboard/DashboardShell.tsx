"use client";

import { useRef, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import { WORKSPACE_ID } from "@/lib/constants";
import type { CrewKey, ExecutiveChatMessage } from "@/lib/dashboard";
import { CommandPanel } from "./CommandPanel";
import { TraceFeed } from "./TraceFeed";
import { CrewDetail } from "./CrewDetail";

export function DashboardShell() {
  const [selectedCrew, setSelectedCrew] = useState<CrewKey>("finance");
  const [executiveIsTyping, setExecutiveIsTyping] = useState(false);
  const [execInput, setExecInput] = useState("");
  const executiveSendInFlight = useRef(false);

  const createFromBrief = useMutation(api.agents.createFromBrief);
  const sendChat = useAction(api.chat.send);
  const chatMessages = useQuery(api.chat.list, { workspaceId: WORKSPACE_ID });

  const executiveMessages: ExecutiveChatMessage[] = (chatMessages ?? []).map((m: { role: string; text: string }, i: number) => ({
    id: i,
    role: m.role === "founder" ? "founder" : "executive",
    text: m.text,
  }));

  async function handleExecSend(text: string, _mode?: string) {
    if (!text.trim() || executiveSendInFlight.current) return;
    executiveSendInFlight.current = true;
    setExecInput("");
    setExecutiveIsTyping(true);
    const isAgentCreation =
      /\b(create|build|forge|launch|deploy|make)\b.{0,30}\bagent\b|\bnew agent\b/i.test(text);
    try {
      if (isAgentCreation) {
        await createFromBrief({ workspaceId: WORKSPACE_ID, brief: text });
      }
      await sendChat({ workspaceId: WORKSPACE_ID, text });
    } catch (error) {
      console.error("Executive chat failed:", error);
    } finally {
      executiveSendInFlight.current = false;
      setExecutiveIsTyping(false);
    }
  }

  return (
    <div
      className="flex h-full w-full flex-col overflow-y-auto xl:flex-row xl:overflow-hidden"
      style={{ background: "var(--color-bg)" }}
    >
      <aside
        className="flex w-full shrink-0 flex-col overflow-visible border-b xl:w-[280px] xl:overflow-y-auto xl:border-b-0 xl:border-r"
        style={{ borderColor: "var(--color-border)", background: "var(--color-bg)" }}
      >
        <CommandPanel
          selectedCrew={selectedCrew}
          onSelectCrew={setSelectedCrew}
        />
      </aside>

      <div
        className="flex h-[760px] min-w-0 shrink-0 flex-col overflow-hidden border-b xl:h-auto xl:flex-1 xl:shrink xl:border-b-0 xl:border-r"
        style={{ borderColor: "var(--color-border)" }}
      >
        <TraceFeed selectedCrew={selectedCrew} onSelectCrew={setSelectedCrew} />
      </div>

      <aside
        className="flex h-[760px] w-full shrink-0 flex-col overflow-hidden xl:h-auto xl:w-[320px]"
        style={{ background: "var(--color-bg)" }}
      >
        <CrewDetail
          selectedCrew={selectedCrew}
          executiveMessages={executiveMessages}
          executiveIsTyping={executiveIsTyping}
          execInput={execInput}
          onExecInputChange={setExecInput}
          onExecSend={handleExecSend}
        />
      </aside>
    </div>
  );
}
