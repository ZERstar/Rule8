"use client";

import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { INDUSTRY_TEMPLATES, type CrewTemplate } from "@/lib/onboarding-templates";
import { ROUTES } from "@/lib/routes";
import { useAuthenticatedQuery } from "@/lib/use-authenticated-query";
import { useWorkspaceId } from "@/lib/workspace-context";

function fallbackCrews() {
  return INDUSTRY_TEMPLATES[0]?.crews ?? [];
}

export function OnboardingReview() {
  const router = useRouter();
  const workspaceId = useWorkspaceId();
  const saveConfig = useMutation(api.workspaces.saveOnboardingConfig);
  const onboardingState = useAuthenticatedQuery(api.workspaces.getOnboardingState, {
    workspaceId: workspaceId as Id<"workspaces">,
  });
  const [crews, setCrews] = useState<CrewTemplate[]>([]);
  const [industry, setIndustry] = useState("custom");

  useEffect(() => {
    const raw = onboardingState?.onboardingCrewConfig ?? sessionStorage.getItem("ob_config");
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { industryTemplate?: string; crews?: CrewTemplate[] } | CrewTemplate[];
        const nextIndustry = Array.isArray(parsed)
          ? onboardingState?.industryTemplate ?? "custom"
          : parsed.industryTemplate ?? onboardingState?.industryTemplate ?? "custom";
        const nextCrews = Array.isArray(parsed) ? parsed : parsed.crews;
        setIndustry(nextIndustry);
        setCrews(nextCrews?.length ? nextCrews : fallbackCrews());
        return;
      } catch {}
    }
    if (!onboardingState) return;
    setIndustry(onboardingState.industryTemplate ?? "custom");
    setCrews(fallbackCrews());
  }, [onboardingState]);

  function updateCrew(index: number, label: string) {
    setCrews((prev) => prev.map((crew, itemIndex) => itemIndex === index ? { ...crew, label } : crew));
  }

  function removeCrew(index: number) {
    setCrews((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  }

  function addCrew() {
    const nextIndex = crews.length + 1;
    setCrews((prev) => [
      ...prev,
      {
        key: `custom-${Date.now()}`,
        label: `Custom Crew ${nextIndex}`,
        icon: "CU",
        color: "#64748B",
        systemPrompt: "Handle a focused operating workflow and escalate risky edge cases.",
        toolKeys: [],
      },
    ]);
  }

  async function proceed() {
    let nextConfig: unknown = crews;
    const raw = onboardingState?.onboardingCrewConfig ?? sessionStorage.getItem("ob_config");
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        nextConfig = Array.isArray(parsed) ? crews : { ...parsed, crews, industryTemplate: industry };
      } catch {
        nextConfig = crews;
      }
    }

    const config = JSON.stringify(nextConfig);
    sessionStorage.setItem("ob_config", config);
    sessionStorage.setItem("ob_crews", JSON.stringify(crews));
    sessionStorage.setItem("ob_template", industry);
    await saveConfig({
      workspaceId: workspaceId as Id<"workspaces">,
      onboardingStep: "connect",
      onboardingCrewConfig: config,
      industryTemplate: industry,
    });
    router.push(ROUTES.onboardingConnect);
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[var(--color-t3)]">Review setup</p>
      <h1 className="mt-3 text-[32px] font-semibold tracking-[-0.04em]">Executive built this workspace</h1>
      <div className="mt-6 space-y-3">
        {crews.map((crew, index) => (
          <div key={crew.key} className="rounded-[20px] border border-[var(--color-b1)] bg-white p-4">
            <div className="flex items-center gap-3">
              <input
                className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold outline-none"
                value={crew.label}
                onChange={(event) => updateCrew(index, event.target.value)}
              />
              <button
                type="button"
                onClick={() => removeCrew(index)}
                className="rounded-full border border-[var(--color-b1)] px-3 py-1 text-[12px] text-[var(--color-t3)]"
              >
                Remove
              </button>
            </div>
            <p className="mt-2 text-[12px] leading-5 text-[var(--color-t3)]">{crew.systemPrompt}</p>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addCrew}
        className="mt-4 rounded-full border border-[var(--color-b1)] bg-white px-4 py-2 text-[13px] font-medium text-[var(--color-t2)]"
      >
        + Add a crew
      </button>
      <div className="mt-8 flex justify-between">
        <button type="button" onClick={() => router.push(ROUTES.onboardingChat)} className="text-[13px] text-[var(--color-t3)]">Back</button>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.push(ROUTES.onboardingConnect)}>Skip to manual</Button>
          <Button onClick={() => void proceed()}>Confirm</Button>
        </div>
      </div>
    </div>
  );
}
