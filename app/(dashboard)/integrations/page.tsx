"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { SecondaryPageShell } from "@/components/dashboard/SecondaryPageShell";
import { StatStrip } from "@/components/dashboard/StatStrip";
import { Button } from "@/components/ui/button";
import { WORKSPACE_ID } from "@/lib/constants";
import { CheckCircle2, Circle, Plug } from "lucide-react";
import { cn } from "@/lib/utils";

type ProviderKey = "stripe" | "intercom" | "discord" | "slack" | "resend";

type Provider = {
  key: ProviderKey;
  name: string;
  icon: string;
  category: string;
  color: string;
  description: string;
  usedBy: string;
  inputLabel: string;
  placeholder: string;
};

const PROVIDERS: Provider[] = [
  { key: "stripe",   name: "Stripe",   icon: "💳", category: "Billing",   color: "#14B8A6", description: "Finance Crew looks up charges, verifies subscriptions, and initiates refunds within your policy limits.", usedBy: "Finance Crew",   inputLabel: "Restricted API Key", placeholder: "rk_live_..." },
  { key: "intercom", name: "Intercom", icon: "💬", category: "Support",   color: "#4D7CFF", description: "Support Crew reads inbound tickets and posts replies directly in the Intercom conversation thread.",    usedBy: "Support Crew",   inputLabel: "Access Token",       placeholder: "dG9rOm..." },
  { key: "discord",  name: "Discord",  icon: "🎮", category: "Community", color: "#8B5CF6", description: "Community Crew monitors channels, answers questions, and moderates violations in your Discord server.",   usedBy: "Community Crew", inputLabel: "Bot Token",          placeholder: "MTk4NjIy..." },
  { key: "slack",    name: "Slack",    icon: "🔔", category: "Community", color: "#8B5CF6", description: "Alternative to Discord. Community Crew monitors channels and posts replies in threads.",                  usedBy: "Community Crew", inputLabel: "Bot OAuth Token",    placeholder: "xoxb-..." },
  { key: "resend",   name: "Resend",   icon: "✉️", category: "Email",     color: "#64748B", description: "Email fallback for support replies when Intercom is unavailable, or for direct founder notifications.",   usedBy: "Support Crew",   inputLabel: "API Key",            placeholder: "re_..." },
];

function ProviderCard({
  p,
  connection,
  onSave,
  onDisconnect,
  saving,
}: {
  p: Provider;
  connection: { status: string; hasToken: boolean } | null;
  onSave: (provider: ProviderKey, token: string) => Promise<void>;
  onDisconnect: (provider: ProviderKey) => Promise<void>;
  saving: boolean;
}) {
  const connected = connection?.status === "connected" && connection.hasToken;
  const [showForm, setShowForm] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  const save = async () => {
    if (!value.trim()) { setError("Key cannot be empty."); return; }
    setError("");
    try {
      await onSave(p.key, value.trim());
      setShowForm(false);
      setValue("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save key.");
    }
  };

  return (
    <div
      className={cn(
        "group/card relative flex flex-col overflow-hidden rounded-2xl border bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(15,23,42,0.06)]",
        connected
          ? "border-[rgba(16,185,129,0.30)]"
          : "border-[var(--color-b1)]",
      )}
    >
      {/* accent bar at top */}
      <div
        className="absolute inset-x-0 top-0 h-[2px]"
        style={{ background: connected ? "#10B981" : `${p.color}60` }}
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className="flex size-10 shrink-0 items-center justify-center rounded-xl text-[16px]"
            style={{ background: `${p.color}12`, border: `1px solid ${p.color}24` }}
          >
            {p.icon}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
                {p.name}
              </span>
              <span
                className="rounded-md border px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.12em]"
                style={{ background: `${p.color}10`, color: p.color, borderColor: `${p.color}28` }}
              >
                {p.category}
              </span>
            </div>
            <p className="mt-1 text-[12px] leading-[1.5] text-[var(--color-t3)]">
              {p.description}
            </p>
          </div>
        </div>
        <div className="shrink-0">
          {connected ? (
            <CheckCircle2 className="size-5 text-[var(--color-green)]" />
          ) : (
            <Circle className="size-5 text-[var(--color-t4)]" />
          )}
        </div>
      </div>

      {/* Meta row */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-[var(--color-b1)] bg-[var(--color-surface-2)]/50 px-3 py-2">
          <p className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-[var(--color-t3)]">Used by</p>
          <p className="mt-1 font-mono text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: p.color }}>
            {p.usedBy}
          </p>
        </div>
        <div className="rounded-lg border border-[var(--color-b1)] bg-[var(--color-surface-2)]/50 px-3 py-2">
          <p className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-[var(--color-t3)]">Credential</p>
          <p className="mt-1 text-[12px] font-semibold text-foreground">{p.inputLabel}</p>
        </div>
      </div>

      {/* Inline connect form */}
      {showForm && !connected && (
        <div className="mt-3 rounded-xl border border-[var(--color-b1)] bg-[var(--color-surface-2)]/50 p-3">
          <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-t3)]">
            {p.inputLabel}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              className="h-9 flex-1 rounded-lg border border-[var(--color-b1)] bg-white px-3 font-mono text-[12px] text-foreground outline-none transition focus:border-[var(--color-accent-a30)] focus:ring-2 focus:ring-[var(--color-accent-a20)]"
              placeholder={p.placeholder}
              type="password"
              value={value}
              onChange={(e) => { setValue(e.target.value); setError(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") void save(); }}
            />
            <Button size="sm" disabled={saving} onClick={() => void save()}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
          {error && <p className="mt-1.5 font-mono text-[10px] text-[var(--color-red)]">{error}</p>}
        </div>
      )}

      {/* CTA */}
      <div className="mt-4 flex items-center justify-between border-t border-[var(--color-b1)] pt-4">
        <span
          className="inline-flex items-center gap-1.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.12em]"
          style={{ color: connected ? "var(--color-green)" : "var(--color-t3)" }}
        >
          <span
            className="size-1.5 rounded-full"
            style={{ background: connected ? "var(--color-green)" : "var(--color-t4)" }}
          />
          {connected ? "Connected" : "Not connected"}
        </span>

        {connected ? (
          <Button
            size="xs"
            variant="ghost"
            onClick={() => { void onDisconnect(p.key); setShowForm(false); }}
            disabled={saving}
            className="text-[var(--color-t3)] hover:text-[var(--color-red)]"
          >
            {saving ? "Working…" : "Disconnect"}
          </Button>
        ) : (
          <Button
            size="xs"
            variant={showForm ? "outline" : "default"}
            disabled={saving}
            onClick={() => setShowForm((v) => !v)}
          >
            <Plug className="size-3" />
            {showForm ? "Cancel" : "Connect"}
          </Button>
        )}
      </div>
    </div>
  );
}

export default function IntegrationsPage() {
  const connections = useQuery(api.integrations.list, { workspaceId: WORKSPACE_ID });
  const upsertConnection = useMutation(api.integrations.upsertConnection);
  const [savingProvider, setSavingProvider] = useState<ProviderKey | null>(null);

  const connectionMap = useMemo(
    () =>
      new Map(
        (connections ?? []).flatMap((connection) =>
          connection ? [[connection.provider, connection] as const] : [],
        ),
      ),
    [connections],
  );

  const saveConnection = async (provider: ProviderKey, token: string) => {
    setSavingProvider(provider);
    try {
      await upsertConnection({ workspaceId: WORKSPACE_ID, provider, status: "connected", accessTokenRef: token });
    } finally { setSavingProvider(null); }
  };

  const disconnect = async (provider: ProviderKey) => {
    setSavingProvider(provider);
    try {
      await upsertConnection({ workspaceId: WORKSPACE_ID, provider, status: "disconnected", accessTokenRef: undefined });
    } finally { setSavingProvider(null); }
  };

  const connectedCount = PROVIDERS.filter((p) => {
    const c = connectionMap.get(p.key);
    return c?.status === "connected" && c.hasToken;
  }).length;

  return (
    <SecondaryPageShell>
      <PageHeader
        eyebrow="Integrations"
        title="Connect your tools"
        highlight="tools"
        description="Connect once. Agents read and write to these platforms on every task — no code required."
      />

      <StatStrip
        items={[
          { label: "Available providers", value: PROVIDERS.length, sub: "In this workspace" },
          { label: "Connected",           value: connectedCount,   sub: "Ready for live execution" },
          { label: "Coverage",            value: "3 crews",        sub: "Finance, support, community" },
        ]}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="grid gap-4 md:grid-cols-2">
          {PROVIDERS.map((p) => (
            <ProviderCard
              key={p.key}
              p={p}
              connection={connectionMap.get(p.key) ?? null}
              onSave={saveConnection}
              onDisconnect={disconnect}
              saving={savingProvider === p.key}
            />
          ))}
        </div>

        <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <div className="rounded-2xl border border-[var(--color-b1)] bg-white p-5">
            <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[var(--color-t3)]">Connection posture</p>
            <h3 className="mt-2 text-[18px] leading-[1.1] tracking-[-0.02em] text-foreground" style={{ fontFamily: "var(--font-display)" }}>
              Workspace status
            </h3>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                { label: "Connected",    value: connectedCount,                    color: "var(--color-green)" },
                { label: "Disconnected", value: PROVIDERS.length - connectedCount, color: "var(--color-t3)" },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-xl border border-[var(--color-b1)] bg-[var(--color-surface-2)]/50 p-3 text-center">
                  <p className="text-[22px] font-semibold tabular-nums tracking-[-0.02em]" style={{ color }}>
                    {value}
                  </p>
                  <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--color-t3)]">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--color-b1)] bg-white p-5">
            <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[var(--color-t3)]">Security rules</p>
            <h3 className="mt-2 text-[18px] leading-[1.1] tracking-[-0.02em] text-foreground" style={{ fontFamily: "var(--font-display)" }}>
              How credentials work
            </h3>
            <div className="mt-4 space-y-2">
              {[
                "Each token is scoped to this workspace and only exposed to the crew flows that require it.",
                "Disconnecting stops future tool calls immediately without removing page configuration.",
                "Use restricted or bot credentials wherever the platform supports them.",
              ].map((rule) => (
                <div key={rule} className="rounded-lg border border-[var(--color-b1)] bg-[var(--color-surface-2)]/50 px-3.5 py-2.5">
                  <p className="text-[12.5px] leading-[1.55] text-[var(--color-t3)]">{rule}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </SecondaryPageShell>
  );
}
