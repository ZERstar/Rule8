"use client";

import { useAction, useMutation } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";
import { useAuthenticatedQuery } from "@/lib/use-authenticated-query";
import { useWorkspaceId } from "@/lib/workspace-context";

type Provider = "intercom" | "stripe" | "discord";

const SUPPORTED_PROVIDERS: Provider[] = ["intercom", "stripe", "discord"];

export function OnboardingConnect() {
  const router = useRouter();
  const workspaceId = useWorkspaceId();
  const upsertConnection = useMutation(api.integrations.upsertConnection);
  const testConnection = useAction(api.integrations.testConnection);
  const onboardingState = useAuthenticatedQuery(api.workspaces.getOnboardingState, {
    workspaceId: workspaceId as Id<"workspaces">,
  });
  const [suggested, setSuggested] = useState<Provider[]>(["intercom"]);
  const [selectedProvider, setSelectedProvider] = useState<Provider>("intercom");
  const [token, setToken] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const raw = onboardingState?.onboardingCrewConfig ?? sessionStorage.getItem("ob_config");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as { suggestedIntegrations?: string[] };
      const providers = (parsed.suggestedIntegrations ?? [])
        .filter((provider): provider is Provider =>
          SUPPORTED_PROVIDERS.includes(provider as Provider),
        );
      if (providers.length) {
        setSuggested(providers);
        setSelectedProvider(providers[0]);
      }
    } catch {}
  }, [onboardingState]);

  const tokenPlaceholder = useMemo(() => {
    if (selectedProvider === "stripe") return "sk_test_...";
    if (selectedProvider === "discord") return "Bot token";
    return "Access token";
  }, [selectedProvider]);

  async function connect() {
    if (!token.trim()) return;
    setConnecting(true);
    setError("");
    await upsertConnection({
      workspaceId,
      provider: selectedProvider,
      status: "pending",
      accessTokenRef: token.trim(),
    });
    const result = await testConnection({ workspaceId, provider: selectedProvider });
    setConnecting(false);
    if (!result.ok) {
      setError(result.error ?? "Connection test failed.");
      return;
    }
    router.push(ROUTES.onboardingRun);
  }

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-10">
      <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[var(--color-t3)]">Connect one source</p>
      <h1 className="mt-3 text-[32px] font-semibold tracking-[-0.04em]">Give one crew a live input</h1>
      <p className="mt-3 text-[14px] leading-6 text-[var(--color-t2)]">
        Connect one integration now, or continue with a manual first task. Either path gets you to a visible run.
      </p>
      <div className="mt-6 rounded-[20px] border border-[var(--color-b1)] bg-white p-5">
        <p className="text-[15px] font-semibold">Recommended next action</p>
        <p className="mt-2 text-[13px] leading-5 text-[var(--color-t3)]">
          Open Integrations, add one token, then return here to run a first task.
        </p>
        <div className="mt-4 grid gap-3">
          <div className="flex flex-wrap gap-2">
            {suggested.map((provider) => (
              <button
                key={provider}
                type="button"
                onClick={() => setSelectedProvider(provider)}
                className={`rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] ${
                  selectedProvider === provider
                    ? "border-foreground bg-foreground text-background"
                    : "border-[var(--color-b1)] text-[var(--color-t3)]"
                }`}
              >
                {provider}
              </button>
            ))}
          </div>
          <input
            className="h-11 rounded-xl border border-[var(--color-b1)] bg-white px-4 text-[14px] outline-none"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder={tokenPlaceholder}
          />
          {error && <p className="text-[12px] leading-5 text-red-600">{error}</p>}
          <div className="flex flex-wrap gap-3">
            <Button disabled={!token.trim() || connecting} onClick={() => void connect()}>
              {connecting ? "Connecting" : "Connect and continue"}
            </Button>
            <Button asChild variant="outline">
              <Link href={ROUTES.dashboardIntegrations} target="_blank" rel="noreferrer">Open integrations</Link>
            </Button>
          </div>
        </div>
      </div>
      <div className="mt-8 flex justify-between">
        <button type="button" onClick={() => router.push(ROUTES.onboardingReview)} className="text-[13px] text-[var(--color-t3)]">Back</button>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.push(ROUTES.onboardingRun)}>Skip to manual</Button>
          <Button onClick={() => router.push(ROUTES.onboardingRun)}>Continue</Button>
        </div>
      </div>
    </div>
  );
}
