"use client";

import { useAction } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";
import { useWorkspaceId } from "@/lib/workspace-context";

type Message = { role: "executive" | "founder"; text: string };

const QUESTIONS = [
  "What does your product do, and who are your customers?",
  "What tools do customers use to reach you today?",
  "What operational work interrupts building most often?",
];

export function OnboardingChat() {
  const router = useRouter();
  const workspaceId = useWorkspaceId();
  const synthesizeConfig = useAction(api.workspaces.synthesizeOnboardingConfig);
  const [messages, setMessages] = useState<Message[]>([
    { role: "executive", text: `I will set up your workspace in three questions. ${QUESTIONS[0]}` },
  ]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;

    setInput("");
    setBusy(true);
    const nextAnswers = [...answers, text];
    setAnswers(nextAnswers);
    setMessages((prev) => [...prev, { role: "founder", text }]);

    if (nextAnswers.length < QUESTIONS.length) {
      setMessages((prev) => [...prev, { role: "executive", text: QUESTIONS[nextAnswers.length] }]);
      setBusy(false);
      return;
    }

    const config = await synthesizeConfig({
      workspaceId: workspaceId as Id<"workspaces">,
      answers: nextAnswers,
    });
    const configJson = JSON.stringify(config);
    sessionStorage.setItem("ob_config", configJson);
    sessionStorage.setItem("ob_template", config.industryTemplate);
    sessionStorage.setItem("ob_crews", JSON.stringify(config.crews));

    router.push(ROUTES.onboardingReview);
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-10">
      <div className="flex-1 space-y-3">
        <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[var(--color-t3)]">Executive setup</p>
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`max-w-[82%] rounded-[20px] border border-[var(--color-b1)] px-4 py-3 text-[14px] leading-6 ${
              message.role === "executive" ? "bg-white text-foreground" : "ml-auto bg-[#1f2937] text-white"
            }`}
          >
            {message.text}
          </div>
        ))}
      </div>
      <div className="mt-6 flex gap-2">
        <input
          className="h-11 min-w-0 flex-1 rounded-xl border border-[var(--color-b1)] bg-white px-4 text-[14px] outline-none"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void send();
          }}
          placeholder="Type your answer"
        />
        <Button disabled={busy} onClick={() => void send()}>Send</Button>
      </div>
      <button type="button" onClick={() => router.push(ROUTES.onboardingReview)} className="mt-4 text-left text-[13px] text-[var(--color-t3)]">
        Skip to manual
      </button>
    </div>
  );
}
