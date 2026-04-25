"use client";

const QUICK_REPLIES = [
  "What's the Finance crew working on?",
  "Any escalations I should review?",
  "Summarise today's activity",
];

export function QuickReplyChips({
  onSelect,
}: {
  onSelect: (text: string) => void;
}) {
  return (
    <div className="mt-2 flex flex-col gap-1.5 pl-8">
      {QUICK_REPLIES.map((reply) => (
        <button
          key={reply}
          className="rounded-[4px] px-2.5 py-1.5 text-left font-mono text-[10px] transition"
          style={{ background: "rgba(200,151,42,0.08)", color: "var(--color-gold)" }}
          onMouseEnter={(event) => {
            event.currentTarget.style.background = "rgba(200,151,42,0.14)";
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.background = "rgba(200,151,42,0.08)";
          }}
          onClick={() => onSelect(reply)}
          type="button"
        >
          {reply}
        </button>
      ))}
    </div>
  );
}
