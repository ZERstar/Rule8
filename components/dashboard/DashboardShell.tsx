"use client";

import { useRef, useState } from "react";
import { useAction, useMutation } from "convex/react";
import { usePathname } from "next/navigation";

import { api } from "@/convex/_generated/api";
import { useAuthenticatedQuery } from "@/lib/use-authenticated-query";
import { useWorkspaceId } from "@/lib/workspace-context";
import type { CrewKey, ExecutiveChatMessage } from "@/lib/dashboard";
import { TraceFeed } from "./TraceFeed";
import { CrewDetail } from "./CrewDetail";

export function DashboardShell() {
  const workspaceId = useWorkspaceId();
  const pathname = usePathname();
  const [selectedCrew, setSelectedCrew] = useState<CrewKey>("finance");
  const [executiveIsTyping, setExecutiveIsTyping] = useState(false);
  const [execInput, setExecInput] = useState("");
  const executiveSendInFlight = useRef(false);

  const createFromBrief = useMutation(api.agents.createFromBrief);
  const sendChat = useAction(api.chat.send);
  const chatMessages = useAuthenticatedQuery(api.chat.list, { workspaceId });

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
        await createFromBrief({ workspaceId, brief: text });
      }
      await sendChat({
        workspaceId,
        text,
        pageContext: {
          page: pathname,
          snapshot: JSON.stringify({
            selectedCrew,
            visiblePanel: "dashboard-overview",
            visibleMessages: executiveMessages.slice(-4).map((message) => ({
              role: message.role,
              text: message.text.slice(0, 120),
            })),
          }),
        },
      });
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
