"use client";

import { useState } from "react";
import { SecondaryPageShell } from "@/components/dashboard/SecondaryPageShell";

type Provider = {
  key:         string;
  name:        string;
  category:    string;
  description: string;
  color:       string;
  usedBy:      string;
  inputLabel:  string;
  placeholder: string;
};

const PROVIDERS: Provider[] = [
  {
    key: "stripe",
    name: "Stripe",
    category: "Billing",
    description: "Finance Crew looks up charges, verifies subscriptions, and initiates refunds within your policy.",
    color: "#635BFF",
    usedBy: "Finance Crew",
    inputLabel: "Restricted API Key",
    placeholder: "rk_live_...",
  },
  {
    key: "intercom",
    name: "Intercom",
    category: "Support",
    description: "Support Crew reads incoming tickets and posts replies directly in the Intercom thread.",
    color: "#1F8EED",
    usedBy: "Support Crew",
    inputLabel: "Access Token",
    placeholder: "dG9rOm...",
  },
  {
    key: "discord",
    name: "Discord",
    category: "Community",
    description: "Community Crew monitors channels, answers questions, and moderates violations in your server.",
    color: "#5865F2",
    usedBy: "Community Crew",
    inputLabel: "Bot Token",
    placeholder: "MTk4NjIyNDgz...",
  },
  {
    key: "slack",
    name: "Slack",
    category: "Community",
    description: "Alternative to Discord. Community Crew monitors Slack channels and posts replies in threads.",
    color: "#4A154B",
    usedBy: "Community Crew",
    inputLabel: "Bot OAuth Token",
    placeholder: "xoxb-...",
  },
  {
    key: "resend",
    name: "Resend",
    category: "Email",
    description: "Email fallback for support replies when Intercom is unavailable or for direct founder comms.",
    color: "#000000",
    usedBy: "Support Crew",
    inputLabel: "API Key",
    placeholder: "re_...",
  },
];

function ProviderCard({ p }: { p: Provider }) {
  const [connected,  setConnected]  = useState(false);
  const [showForm,   setShowForm]   = useState(false);
  const [value,      setValue]      = useState("");
  const [error,      setError]      = useState("");

  const save = () => {
    if (!value.trim()) { setError("Key cannot be empty."); return; }
    setError("");
    setConnected(true);
    setShowForm(false);
    setValue("");
  };

  return (
    <div
      className="rounded-[12px] border p-5 transition-all"
      style={{
        borderColor: connected ? "rgba(34,197,94,0.20)" : "var(--color-b1)",
        background: "var(--color-s1)",
      }}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] text-[15px] font-bold text-white"
          style={{ background: p.color }}
        >
          {p.name[0]}
        </div>

        <div className="flex min-w-0 flex-1 items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[14px] font-semibold" style={{ color: "var(--color-t1)" }}>
                {p.name}
              </span>
              <span className="rounded-[4px] px-1.5 py-0.5 font-mono text-[9px]"
                style={{ background: "var(--color-s2)", color: "var(--color-t3)" }}>
                {p.category}
              </span>
              {connected && (
                <span className="rounded-full px-2 py-0.5 font-mono text-[9px]"
                  style={{ background: "rgba(34,197,94,0.12)", color: "var(--color-green)" }}>
                  ● Connected
                </span>
              )}
            </div>
            <p className="mt-1 text-[12px] leading-[1.65]" style={{ color: "var(--color-t2)" }}>
              {p.description}
            </p>
            <p className="mt-2 font-mono text-[10px]" style={{ color: "var(--color-t3)" }}>
              Used by {p.usedBy}
            </p>
          </div>

          {/* Action button */}
          {connected ? (
            <button
              className="shrink-0 rounded-[6px] border px-3 py-1.5 font-mono text-[10px] transition"
              style={{ borderColor: "var(--color-b2)", color: "var(--color-t3)" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--color-red)"; e.currentTarget.style.color = "var(--color-red)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--color-b2)"; e.currentTarget.style.color = "var(--color-t3)"; }}
              onClick={() => { setConnected(false); setShowForm(false); }}
            >
              Disconnect
            </button>
          ) : (
            <button
              className="shrink-0 rounded-[6px] px-3 py-1.5 font-mono text-[10px] font-semibold text-black transition"
              style={{ background: showForm ? "var(--color-s3)" : "var(--color-gold)", color: showForm ? "var(--color-t2)" : "#000" }}
              onClick={() => setShowForm(v => !v)}
            >
              {showForm ? "Cancel" : "Connect"}
            </button>
          )}
        </div>
      </div>

      {/* Inline form */}
      {showForm && !connected && (
        <div className="mt-4 rounded-[8px] border p-4"
          style={{ borderColor: "var(--color-b1)", background: "var(--color-s2)" }}>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--color-t3)" }}>
            {p.inputLabel}
          </p>
          <div className="flex gap-2">
            <input
              className="h-10 flex-1 rounded-[6px] border bg-transparent px-3 font-mono text-[12px] outline-none transition"
              style={{ borderColor: "var(--color-b2)", color: "var(--color-t1)" }}
              placeholder={p.placeholder}
              type="password"
              value={value}
              onChange={e => { setValue(e.target.value); setError(""); }}
              onFocus={e  => (e.currentTarget.style.borderColor = "rgba(200,151,42,0.40)")}
              onBlur={e   => (e.currentTarget.style.borderColor = "var(--color-b2)")}
              onKeyDown={e => { if (e.key === "Enter") save(); }}
            />
            <button
              className="h-10 rounded-[6px] px-4 font-mono text-[11px] font-semibold text-black"
              style={{ background: "var(--color-gold)" }}
              onClick={save}
            >
              Save
            </button>
          </div>
          {error && (
            <p className="mt-1.5 font-mono text-[10px]" style={{ color: "var(--color-red)" }}>{error}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function IntegrationsPage() {
  return (
    <SecondaryPageShell>
      <div className="mx-auto max-w-3xl space-y-8">

        {/* Header */}
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: "var(--color-t3)" }}>
            Integrations
          </p>
          <h1 className="mt-2 text-[26px] font-semibold tracking-[-0.02em]" style={{ color: "var(--color-t1)" }}>
            Connect your tools
          </h1>
          <p className="mt-1.5 max-w-xl text-[13px] leading-[1.7]" style={{ color: "var(--color-t2)" }}>
            Connect once. Your agents read from and write to these platforms on every task — no code required.
          </p>
        </div>

        {/* Crew legend */}
        <div className="flex flex-wrap gap-3">
          {[
            { label: "Finance Crew",   color: "#34D399" },
            { label: "Support Crew",   color: "#60A5FA" },
            { label: "Community Crew", color: "#A78BFA" },
          ].map(({ label, color }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
              <span className="font-mono text-[10px]" style={{ color: "var(--color-t3)" }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Cards */}
        <div className="space-y-3">
          {PROVIDERS.map(p => <ProviderCard key={p.key} p={p} />)}
        </div>
      </div>
    </SecondaryPageShell>
  );
}
