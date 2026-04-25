"use client";

import type { ExecutiveChatMessage } from "@/lib/dashboard";

export function ChatBubble({
  message,
}: {
  message: ExecutiveChatMessage;
}) {
  const isExecutive = message.role === "executive";

  return (
    <div className={`flex items-end gap-2 ${isExecutive ? "" : "flex-row-reverse"}`}>
      <div
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[4px] font-mono text-[10px] font-semibold"
        style={
          isExecutive
            ? { background: "var(--color-gold)", color: "#000" }
            : { background: "var(--color-s3)", color: "var(--color-t2)" }
        }
      >
        {isExecutive ? "E" : "T"}
      </div>
      <div
        className="max-w-[200px] rounded-[6px] px-3 py-2 text-[12px] leading-[1.6]"
        style={
          isExecutive
            ? { background: "var(--color-s2)", color: "var(--color-t1)" }
            : {
                background: "rgba(200,151,42,0.08)",
                border: "1px solid rgba(200,151,42,0.24)",
                color: "var(--color-t1)",
              }
        }
      >
        {message.text}
      </div>
    </div>
  );
}
