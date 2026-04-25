"use client";

import { useState } from "react";
import { SecondaryPageShell } from "@/components/dashboard/SecondaryPageShell";

type Provider = {
  key: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  inputLabel: string;
  inputPlaceholder: string;
};

const PROVIDERS: Provider[] = [
  {
    key: "stripe",
    name: "Stripe",
    description: "Finance Crew uses Stripe to look up charges, verify subscriptions, and initiate refunds within your policy.",
    icon: "⚡",
    color: "#635BFF",
    inputLabel: "Restricted API Key",
    inputPlaceholder: "rk_live_...",
  },
  {
    key: "intercom",
    name: "Intercom",
    description: "Support Crew reads and replies to Intercom tickets. Requires webhook registration.",
    icon: "💬",
    color: "#1F8EED",
    inputLabel: "Access Token",
    inputPlaceholder: "dG9rOm...",
  },
  {
    key: "discord",
    name: "Discord",
    description: "Community Crew monitors channels, posts replies, and moderates violations in your Discord server.",
    icon: "🎮",
    color: "#5865F2",
    inputLabel: "Bot Token",
    inputPlaceholder: "MTk4NjIyNDgzNDcxOTI1MjQ4.Cl2FDQ...",
  },
  {
    key: "slack",
    name: "Slack",
    description: "Alternative to Discord. Community Crew can monitor Slack channels instead.",
    icon: "#",
    color: "#E01E5A",
    inputLabel: "Bot OAuth Token",
    inputPlaceholder: "xoxb-...",
  },
  {
    key: "resend",
    name: "Resend",
    description: "Email fallback for support replies when Intercom is not available.",
    icon: "✉",
    color: "#000000",
    inputLabel: "API Key",
    inputPlaceholder: "re_...",
  },
];

function ProviderCard({ provider }: { provider: Provider }) {
  const [connected, setConnected] = useState(false);
  const [input, setInput] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [error, setError] = useState("");

  const handleConnect = () => {
    if (!input.trim()) {
      setError("API key cannot be empty.");
      return;
    }
    setError("");
    setConnected(true);
    setShowInput(false);
    setInput("");
  };

  const handleDisconnect = () => {
    setConnected(false);
    setShowInput(false);
    setInput("");
  };

  return (
    <div
      className="rounded-[10px] border p-5 transition"
      style={{
        borderColor: connected ? "rgba(34,197,94,0.20)" : "var(--color-b1)",
        background: "var(--color-s1)",
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] text-lg font-bold text-white"
            style={{ background: provider.color }}
          >
            {provider.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-[14px] font-semibold" style={{ color: "var(--color-t1)" }}>
                {provider.name}
              </p>
              {connected && (
                <span
                  className="rounded-full px-2 py-0.5 font-mono text-[9px] font-medium"
                  style={{ background: "rgba(34,197,94,0.12)", color: "var(--color-green)" }}
                >
                  Connected
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[12px] leading-snug" style={{ color: "var(--color-t2)" }}>
              {provider.description}
            </p>
          </div>
        </div>

        {/* Action */}
        <div className="shrink-0">
          {connected ? (
            <button
              className="rounded-[6px] border px-3 py-1.5 font-mono text-[10px] transition"
              style={{ borderColor: "var(--color-b2)", color: "var(--color-t3)" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-red)";
                (e.currentTarget as HTMLButtonElement).style.color = "var(--color-red)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-b2)";
                (e.currentTarget as HTMLButtonElement).style.color = "var(--color-t3)";
              }}
              onClick={handleDisconnect}
            >
              Disconnect
            </button>
          ) : (
            <button
              className="rounded-[6px] px-3 py-1.5 font-mono text-[10px] font-semibold text-black transition"
              style={{ background: showInput ? "var(--color-s2)" : "var(--color-gold)", color: showInput ? "var(--color-t2)" : "#000" }}
              onClick={() => setShowInput((v) => !v)}
            >
              {showInput ? "Cancel" : "Connect"}
            </button>
          )}
        </div>
      </div>

      {/* Inline connect form */}
      {showInput && !connected && (
        <div className="mt-4 rounded-[8px] border p-4" style={{ borderColor: "var(--color-b1)", background: "var(--color-s2)" }}>
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--color-t3)" }}>
              {provider.inputLabel}
            </span>
            <div className="mt-2 flex gap-2">
              <input
                className="h-10 flex-1 rounded-[6px] border bg-transparent px-3 text-[12px] outline-none transition"
                style={{ borderColor: "var(--color-b2)", color: "var(--color-t1)" }}
                onFocus={(e) => ((e.currentTarget as HTMLInputElement).style.borderColor = "rgba(200,151,42,0.40)")}
                onBlur={(e) => ((e.currentTarget as HTMLInputElement).style.borderColor = "var(--color-b2)")}
                placeholder={provider.inputPlaceholder}
                type="password"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleConnect(); }}
              />
              <button
                className="h-10 rounded-[6px] px-4 font-mono text-[11px] font-semibold text-black transition"
                style={{ background: "var(--color-gold)" }}
                onClick={handleConnect}
              >
                Save
              </button>
            </div>
            {error && (
              <p className="mt-1.5 font-mono text-[10px]" style={{ color: "var(--color-red)" }}>{error}</p>
            )}
          </label>
        </div>
      )}
    </div>
  );
}

export default function IntegrationsPage() {
  return (
    <SecondaryPageShell>
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: "var(--color-t3)" }}>
            Integrations
          </p>
          <h1 className="mt-2 text-[26px] font-semibold tracking-[-0.02em]" style={{ color: "var(--color-t1)" }}>
            Connect your tools
          </h1>
          <p className="mt-2 text-[13px] leading-[1.7]" style={{ color: "var(--color-t2)" }}>
            Connect once. Your agents read from and write to these platforms on every task.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {PROVIDERS.map((p) => <ProviderCard key={p.key} provider={p} />)}
        </div>
      </div>
    </SecondaryPageShell>
  );
}
