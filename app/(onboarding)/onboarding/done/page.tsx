"use client";

import { useEffect } from "react";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ROUTES } from "@/lib/routes";
import { useAuthenticatedQuery } from "@/lib/use-authenticated-query";
import { useWorkspaceId } from "@/lib/workspace-context";

export default function OnboardingDonePage() {
  const router = useRouter();
  const workspaceId = useWorkspaceId();
  const complete = useMutation(api.workspaces.markOnboardingComplete);
  const onboardingState = useAuthenticatedQuery(api.workspaces.getOnboardingState, {
    workspaceId: workspaceId as Id<"workspaces">,
  });

  useEffect(() => {
    if (!onboardingState) return;
    const state = onboardingState;

    async function finish() {
      const industryTemplate =
        state.industryTemplate ?? sessionStorage.getItem("ob_template") ?? undefined;
      const crewConfig =
        state.onboardingCrewConfig ?? sessionStorage.getItem("ob_crews") ?? undefined;
      await complete({
        workspaceId: workspaceId as Id<"workspaces">,
        industryTemplate,
        crewConfig,
      });
      sessionStorage.removeItem("ob_config");
      sessionStorage.removeItem("ob_crews");
      sessionStorage.removeItem("ob_template");
      setTimeout(() => router.push(ROUTES.dashboardOverview), 900);
    }

    void finish();
  }, [complete, onboardingState, router, workspaceId]);

  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[rgba(34,197,94,0.12)]">
        <span className="text-[34px] font-semibold text-[var(--color-accent-green)]">OK</span>
      </div>
      <h1 className="text-[32px] font-semibold tracking-[-0.04em] text-foreground">You are all set</h1>
      <p className="mt-3 max-w-sm text-[14px] leading-relaxed text-[var(--color-t2)]">
        Your crews are ready. Taking you to the dashboard now.
      </p>
    </div>
  );
}
