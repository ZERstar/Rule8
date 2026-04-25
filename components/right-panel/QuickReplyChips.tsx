"use client";

const QUICK_REPLIES = [
  "What's the Finance crew working on?",
  "Any escalations I should review?",
  "Summarise today's activity",
];

export function QuickReplyChips({ onSelect }: { onSelect: (text: string) => void }) {
  return (
    <div className="mt-3 flex flex-wrap gap-1.5 pl-10">
      {QUICK_REPLIES.map((reply) => (
        <button
          key={reply}
          type="button"
          onClick={() => onSelect(reply)}
          className="rounded-full border border-[var(--color-b1)] bg-white px-3 py-1.5 text-left text-[11px] text-[var(--color-t2)] transition-all hover:-translate-y-0.5 hover:border-[var(--color-accent-a30)] hover:bg-[var(--color-accent-a05)] hover:text-[var(--color-accent)]"
        >
          {reply}
        </button>
      ))}
    </div>
  );
}
