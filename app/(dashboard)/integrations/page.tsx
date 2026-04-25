"use client";

import { useState } from "react";
import { SecondaryPageShell } from "@/components/dashboard/SecondaryPageShell";

type Provider = { key: string; name: string; category: string; categoryColor: string; description: string; usedBy: string; usedByColor: string; inputLabel: string; placeholder: string; };

const PROVIDERS: Provider[] = [
  { key: "stripe",    name: "Stripe",    category: "BILLING",   categoryColor: "#34D399", description: "Finance Crew looks up charges, verifies subscriptions, and initiates refunds within your policy limits.", usedBy: "Finance Crew",   usedByColor: "#34D399", inputLabel: "Restricted API Key",  placeholder: "rk_live_..." },
  { key: "intercom",  name: "Intercom",  category: "SUPPORT",   categoryColor: "#60A5FA", description: "Support Crew reads inbound tickets and posts replies directly in the Intercom conversation thread.",    usedBy: "Support Crew",   usedByColor: "#60A5FA", inputLabel: "Access Token",         placeholder: "dG9rOm..." },
  { key: "discord",   name: "Discord",   category: "COMMUNITY", categoryColor: "#A78BFA", description: "Community Crew monitors channels, answers questions, and moderates violations in your Discord server.",   usedBy: "Community Crew", usedByColor: "#A78BFA", inputLabel: "Bot Token",            placeholder: "MTk4NjIy..." },
  { key: "slack",     name: "Slack",     category: "COMMUNITY", categoryColor: "#A78BFA", description: "Alternative to Discord. Community Crew monitors channels and posts replies in threads.",                  usedBy: "Community Crew", usedByColor: "#A78BFA", inputLabel: "Bot OAuth Token",      placeholder: "xoxb-..." },
  { key: "resend",    name: "Resend",    category: "EMAIL",     categoryColor: "#9898A6", description: "Email fallback for support replies when Intercom is unavailable, or for direct founder notifications.",   usedBy: "Support Crew",   usedByColor: "#60A5FA", inputLabel: "API Key",              placeholder: "re_..." },
];

function ProviderCard({ p }: { p: Provider }) {
  const [connected, setConnected] = useState(false);
  const [showForm,  setShowForm]  = useState(false);
  const [value,     setValue]     = useState("");
  const [error,     setError]     = useState("");

  const save = () => {
    if (!value.trim()) { setError("Key cannot be empty."); return; }
    setError(""); setConnected(true); setShowForm(false); setValue("");
  };

  return (
    <div
      className="rounded-[8px] border transition-all"
      style={{
        borderColor: connected ? "rgba(34,197,94,0.24)" : "var(--color-b2)",
        background: "var(--color-s1)",
      }}
    >
      <div className="flex items-start gap-4 p-5">
        {/* Color bar */}
        <div
          className="mt-0.5 h-10 w-1 shrink-0 rounded-full"
          style={{ background: p.categoryColor }}
        />

        <div className="flex min-w-0 flex-1 items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[14px] font-semibold" style={{ color: "var(--color-t1)" }}>
                {p.name}
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.14em]"
                style={{ color: p.categoryColor }}>
                {p.category}
              </span>
              {connected && (
                <span className="rounded-full px-2 py-0.5 font-mono text-[9px]"
                  style={{ background: "rgba(34,197,94,0.12)", color: "var(--color-green)" }}>
                  ● Connected
                </span>
              )}
            </div>
            <p className="mt-1 text-[12px] leading-[1.6]" style={{ color: "var(--color-t2)" }}>
              {p.description}
            </p>
            <p className="mt-2 font-mono text-[10px]" style={{ color: p.usedByColor, opacity: 0.8 }}>
              {p.usedBy}
            </p>
          </div>

          {/* Button */}
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
        <div className="border-t px-5 py-4" style={{ borderColor: "var(--color-b1)", background: "var(--color-s2)" }}>
          <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.16em]" style={{ color: "var(--color-t3)" }}>
            {p.inputLabel}
          </p>
          <div className="flex gap-2">
            <input
              className="h-9 flex-1 rounded-[6px] border bg-transparent px-3 font-mono text-[12px] outline-none transition"
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
              className="h-9 rounded-[6px] px-4 font-mono text-[10px] font-semibold text-black"
              style={{ background: "var(--color-gold)" }}
              onClick={save}
            >
              Save
            </button>
          </div>
          {error && <p className="mt-1.5 font-mono text-[10px]" style={{ color: "var(--color-red)" }}>{error}</p>}
        </div>
      )}
    </div>
  );
}

export default function IntegrationsPage() {
  return (
    <SecondaryPageShell>
      {/* Header */}
      <div className="mb-8 border-b pb-6" style={{ borderColor: "var(--color-b1)" }}>
        <p className="font-mono text-[10px] uppercase tracking-[0.20em]" style={{ color: "var(--color-t3)" }}>
          · Integrations
        </p>
        <h1 className="mt-2 text-[28px] font-semibold tracking-[-0.02em]" style={{ color: "var(--color-t1)" }}>
          Connect your tools
        </h1>
        <p className="mt-1 text-[13px] leading-[1.65]" style={{ color: "var(--color-t2)" }}>
          Connect once. Agents read and write to these platforms on every task — no code required.
        </p>
        {/* Crew legend */}
        <div className="mt-4 flex flex-wrap gap-4">
          {[
            { label: "Finance Crew",   color: "#34D399" },
            { label: "Support Crew",   color: "#60A5FA" },
            { label: "Community Crew", color: "#A78BFA" },
          ].map(({ label, color }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className="h-[5px] w-[5px] rounded-full" style={{ background: color }} />
              <span className="font-mono text-[10px]" style={{ color: "var(--color-t3)" }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Provider list */}
      <div className="space-y-2">
        {PROVIDERS.map(p => <ProviderCard key={p.key} p={p} />)}
      </div>
    </SecondaryPageShell>
  );
}
