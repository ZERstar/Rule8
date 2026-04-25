"use client";

import type { ExecutiveChatMessage } from "@/lib/dashboard";

export function ChatBubble({ message }: { message: ExecutiveChatMessage }) {
  const isExecutive = message.role === "executive";

  return (
    <div className={`flex items-end gap-2 ${isExecutive ? "" : "flex-row-reverse"}`}>
      {/* Avatar */}
      <div
        className="flex size-8 shrink-0 items-center justify-center rounded-lg font-mono text-[11px] font-bold"
        style={
          isExecutive
            ? {
                background: "linear-gradient(135deg, #0052FF 0%, #4D7CFF 100%)",
                color: "#FFFFFF",
                boxShadow: "0 4px 12px rgba(0, 82, 255, 0.30)",
              }
            : {
                background: "var(--color-surface-2)",
                color: "var(--color-t2)",
                border: "1px solid var(--color-b1)",
              }
        }
      >
        {isExecutive ? "E" : "TX"}
      </div>

      {/* Bubble */}
      <div
        className="max-w-[280px] rounded-2xl px-4 py-2.5 text-[13px] leading-[1.55]"
        style={
          isExecutive
            ? {
                background: "var(--color-surface-2)",
                color: "var(--color-t1)",
                border: "1px solid var(--color-b1)",
                borderBottomLeftRadius: "0.375rem",
              }
            : {
                background: "linear-gradient(135deg, #0052FF 0%, #4D7CFF 100%)",
                color: "#FFFFFF",
                borderBottomRightRadius: "0.375rem",
                boxShadow: "0 4px 12px rgba(0, 82, 255, 0.18)",
              }
        }
      >
        {message.text}
      </div>
    </div>
  );
}
