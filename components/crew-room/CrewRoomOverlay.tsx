"use client";

import { X } from "lucide-react";
import type { CrewTag } from "@/lib/dashboard";
import { CREW_META } from "@/lib/constants";

export function CrewRoomOverlay({
  crewTag,
  onBack,
}: {
  crewTag: CrewTag;
  onBack: () => void;
  onOpenExecutive?: () => void;
  onSendExecutive?: (text: string, mode?: string) => void;
}) {
  const meta = CREW_META[crewTag];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex h-[52px] shrink-0 items-center justify-between border-b border-[var(--color-border)] px-5">
        <div className="flex items-center gap-2">
          <span className="text-[18px]">{meta?.icon}</span>
          <span className="font-semibold text-[var(--color-t1)]">
            {meta?.label ?? crewTag} Room
          </span>
        </div>
        <button
          onClick={onBack}
          className="rounded-lg p-1.5 text-[var(--color-t2)] hover:bg-[var(--color-bg-secondary)]"
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="flex flex-1 items-center justify-center">
        <p className="text-[var(--color-t3)]">Crew room — coming soon</p>
      </div>
    </div>
  );
}
