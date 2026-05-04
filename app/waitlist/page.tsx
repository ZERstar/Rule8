"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, ArrowRight, CheckCircle, Zap, Shield, Users, Brain } from "lucide-react";
import { api } from "@/convex/_generated/api";

const PERKS = [
  { icon: Brain, label: "Executive AI included", sub: "Strategic routing & oversight out of the box" },
  { icon: Zap,   label: "White-glove setup",     sub: "We configure your crews with you, 1-on-1" },
  { icon: Shield, label: "Policy-safe by default", sub: "Every action stays within your limits" },
  { icon: Users,  label: "All three crews",        sub: "Finance, Support, and Community from day one" },
];

export default function WaitlistPage() {
  const joinWaitlist = useMutation(api.waitlist.joinWaitlist);
  const count = useQuery(api.waitlist.getCount) ?? 0;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "duplicate" | "error">("idle");
  const [isPending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    startTransition(async () => {
      try {
        const result = await joinWaitlist({
          email:    email.trim().toLowerCase(),
          name:     name.trim() || undefined,
          source:   "waitlist_page",
          referrer: company.trim() || undefined,
        });
        setStatus(result.status === "already_registered" ? "duplicate" : "success");
      } catch {
        setStatus("error");
      }
    });
  }

  return (
    <div
      className="flex min-h-screen"
      style={{ background: "var(--color-bg)", color: "var(--color-t1)" }}
    >
      {/* Left panel */}
      <div
        className="hidden w-[480px] shrink-0 flex-col justify-between p-12 lg:flex"
        style={{
          background: "var(--color-bg-secondary)",
          borderRight: "1px solid var(--color-b1)",
        }}
      >
        <div>
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full text-[16px] font-bold text-white transition-opacity group-hover:opacity-80"
              style={{ background: "var(--color-accent-orange)" }}
            >
              8
            </div>
            <span className="text-[15px] font-bold tracking-[-0.02em]" style={{ color: "var(--color-t1)" }}>
              Rule8
            </span>
          </Link>

          {/* Headline */}
          <div className="mt-14">
            <p
              className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.12em]"
              style={{ color: "var(--color-accent-orange)" }}
            >
              Early access
            </p>
            <h2
              className="text-[32px] font-bold leading-[1.1] tracking-[-0.025em]"
              style={{ color: "var(--color-t1)" }}
            >
              Your ops team,{" "}
              <span style={{ color: "var(--color-accent-orange)" }}>built with AI.</span>
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed" style={{ color: "var(--color-t2)" }}>
              Founders who join early get hands-on onboarding, priority crew configuration,
              and locked-in early pricing.
            </p>
          </div>

          {/* Perks */}
          <div className="mt-10 space-y-4">
            {PERKS.map((perk) => {
              const Icon = perk.icon;
              return (
                <div key={perk.label} className="flex items-start gap-3">
                  <div
                    className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: "rgba(249,115,22,0.10)" }}
                  >
                    <Icon className="h-4 w-4" style={{ color: "var(--color-accent-orange)" }} />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold" style={{ color: "var(--color-t1)" }}>
                      {perk.label}
                    </p>
                    <p className="text-[12px] leading-relaxed" style={{ color: "var(--color-t3)" }}>
                      {perk.sub}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer stat */}
        <div
          className="rounded-2xl border px-5 py-4"
          style={{ background: "var(--color-bg)", borderColor: "var(--color-b1)" }}
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.12em]" style={{ color: "var(--color-t3)" }}>
            Founders waiting
          </p>
          <p className="mt-1 text-[28px] font-bold tracking-[-0.025em]" style={{ color: "var(--color-t1)" }}>
            {count > 0 ? count.toLocaleString() : "—"}
          </p>
          <p className="mt-0.5 text-[12px]" style={{ color: "var(--color-t3)" }}>
            Spots open in batches. Early = priority.
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 flex-col">
        {/* Top bar */}
        <div
          className="flex h-14 items-center justify-between border-b px-6"
          style={{ borderColor: "var(--color-b1)" }}
        >
          <Link
            href="/"
            className="flex items-center gap-1.5 text-[13px] font-medium transition-opacity hover:opacity-70"
            style={{ color: "var(--color-t2)" }}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>

          {/* Mobile logo */}
          <div className="flex items-center gap-2 lg:hidden">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-bold text-white"
              style={{ background: "var(--color-accent-orange)" }}
            >
              8
            </div>
            <span className="text-[14px] font-bold" style={{ color: "var(--color-t1)" }}>Rule8</span>
          </div>

          <Link
            href="/sign-in"
            className="text-[13px] font-medium transition-opacity hover:opacity-70"
            style={{ color: "var(--color-t2)" }}
          >
            Sign in
          </Link>
        </div>

        {/* Form area */}
        <div className="flex flex-1 items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            {status === "success" ? (
              <SuccessState name={name} />
            ) : (
              <>
                <div className="mb-8">
                  <h1
                    className="text-[28px] font-bold tracking-[-0.025em]"
                    style={{ color: "var(--color-t1)" }}
                  >
                    Request early access
                  </h1>
                  <p className="mt-2 text-[14px] leading-relaxed" style={{ color: "var(--color-t2)" }}>
                    We review every request and reach out within 48 hours.
                  </p>
                </div>

                <form onSubmit={submit} className="space-y-4">
                  <Field
                    label="Your name"
                    value={name}
                    onChange={setName}
                    type="text"
                    placeholder="Alex Chen"
                    autoComplete="name"
                    required={false}
                  />
                  <Field
                    label="Work email"
                    value={email}
                    onChange={setEmail}
                    type="email"
                    placeholder="alex@company.com"
                    autoComplete="email"
                    required
                  />
                  <Field
                    label="Company (optional)"
                    value={company}
                    onChange={setCompany}
                    type="text"
                    placeholder="Acme Corp"
                    autoComplete="organization"
                    required={false}
                  />

                  {status === "error" && (
                    <p className="text-[12px]" style={{ color: "var(--color-red)" }}>
                      Something went wrong — please try again.
                    </p>
                  )}
                  {status === "duplicate" && (
                    <p className="text-[12px]" style={{ color: "var(--color-t3)" }}>
                      You&apos;re already on the list. We&apos;ll be in touch soon.
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={isPending || !email.trim()}
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-full py-3 text-[14px] font-semibold text-white shadow-[0_8px_24px_rgba(249,115,22,0.28)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(249,115,22,0.36)] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:translate-y-0"
                    style={{ background: "var(--color-accent-orange)" }}
                  >
                    {isPending ? "Submitting…" : "Request access"}
                    {!isPending && <ArrowRight className="h-4 w-4" />}
                  </button>
                </form>

                <p className="mt-6 text-center text-[12px]" style={{ color: "var(--color-t4)" }}>
                  Already have access?{" "}
                  <Link
                    href="/sign-in"
                    className="font-medium underline underline-offset-2 transition-opacity hover:opacity-70"
                    style={{ color: "var(--color-t3)" }}
                  >
                    Sign in
                  </Link>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SuccessState({ name }: { name: string }) {
  return (
    <div className="text-center">
      <div
        className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full"
        style={{ background: "var(--color-green-bg)" }}
      >
        <CheckCircle className="h-8 w-8" style={{ color: "var(--color-green)" }} />
      </div>
      <h2 className="text-[26px] font-bold tracking-[-0.02em]" style={{ color: "var(--color-t1)" }}>
        {name ? `You're in, ${name.split(" ")[0]}.` : "You're on the list."}
      </h2>
      <p className="mt-3 text-[15px] leading-relaxed" style={{ color: "var(--color-t2)" }}>
        We review requests in batches and will reach out within 48 hours with next steps.
      </p>

      <div
        className="mx-auto mt-8 max-w-xs rounded-2xl border p-5 text-left"
        style={{ background: "var(--color-bg-secondary)", borderColor: "var(--color-b1)" }}
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.12em]" style={{ color: "var(--color-t3)" }}>
          What happens next
        </p>
        <ul className="mt-3 space-y-2.5">
          {[
            "We review your request",
            "You get a personal onboarding call",
            "Your crews are configured together",
            "You go live — agents handle the rest",
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span
                className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full font-mono text-[9px] font-bold text-white"
                style={{ background: "var(--color-accent-orange)" }}
              >
                {i + 1}
              </span>
              <span className="text-[13px]" style={{ color: "var(--color-t2)" }}>{step}</span>
            </li>
          ))}
        </ul>
      </div>

      <Link
        href="/"
        className="mt-8 inline-flex items-center gap-1.5 text-[13px] font-medium transition-opacity hover:opacity-70"
        style={{ color: "var(--color-t3)" }}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to home
      </Link>
    </div>
  );
}

function Field({
  label, value, onChange, type, placeholder, autoComplete, required,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type: string; placeholder: string; autoComplete: string; required: boolean;
}) {
  return (
    <label className="block">
      <span
        className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-[0.12em]"
        style={{ color: "var(--color-t2)" }}
      >
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        className="h-11 w-full rounded-xl border px-4 text-[14px] outline-none transition focus:ring-2"
        style={{
          borderColor: "var(--color-b2)",
          background: "var(--color-bg-secondary)",
          color: "var(--color-t1)",
        }}
      />
    </label>
  );
}
