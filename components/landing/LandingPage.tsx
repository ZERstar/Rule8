"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

/* ─── tokens ───────────────────────────────────────────────── */
const T = {
  bg:      "#0B0A09",
  surface: "#141210",
  raised:  "#1C1917",
  border:  "rgba(255,255,255,0.07)",
  borderHover: "rgba(255,255,255,0.14)",
  text:    "#F2EDE6",
  muted:   "#7A746C",
  faint:   "#3D3830",
  orange:  "#F97316",
  orangeDim: "rgba(249,115,22,0.12)",
  green:   "#22C55E",
  greenDim: "rgba(34,197,94,0.12)",
  red:     "#EF4444",
} as const;

const sans = "var(--font-inter), system-ui, -apple-system, sans-serif";
const mono = "'SFMono-Regular', 'Fira Code', Consolas, monospace";

/* ─── primitives ───────────────────────────────────────────── */
function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1"
      style={{ fontFamily: mono, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase",
        color: T.orange, borderColor: "rgba(249,115,22,0.25)", background: T.orangeDim }}>
      {children}
    </span>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontFamily: mono, fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase",
      color: T.muted, marginBottom: 16 }}>
      {children}
    </p>
  );
}

function H2({ children, size = 48 }: { children: React.ReactNode; size?: number }) {
  return (
    <h2 style={{ fontFamily: sans, fontWeight: 800, fontSize: size, lineHeight: 1.05,
      letterSpacing: "-0.035em", color: T.text }}>
      {children}
    </h2>
  );
}

function Accent({ children }: { children: React.ReactNode }) {
  return <span style={{ color: T.orange }}>{children}</span>;
}

function Divider() {
  return <div style={{ height: 1, background: T.border }} />;
}

/* ─── 1. NAV ───────────────────────────────────────────────── */
function Nav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50"
      style={{ background: "rgba(11,10,9,0.88)", backdropFilter: "blur(12px)",
        borderBottom: `1px solid ${T.border}` }}>
      <div className="mx-auto flex h-14 max-w-[1120px] items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded text-[13px] font-black text-white"
            style={{ background: T.orange }}>8</div>
          <span style={{ fontFamily: sans, fontWeight: 700, fontSize: 16, color: T.text }}>Rule8</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {[["#how","How it works"],["#crews","Crews"],["#integrations","Integrations"]].map(([href,l])=>(
            <a key={href} href={href} className="transition-opacity hover:opacity-50"
              style={{ fontFamily: sans, fontSize: 13, color: T.muted }}>{l}</a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/sign-in"
            className="hidden text-[13px] transition-opacity hover:opacity-50 md:block"
            style={{ fontFamily: sans, color: T.muted }}>Sign in</Link>
          <Link href="/waitlist"
            className="flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold text-black transition-opacity hover:opacity-85"
            style={{ background: T.orange, fontFamily: sans }}>
            Get access →
          </Link>
        </div>
      </div>
    </header>
  );
}

/* ─── 2. HERO ──────────────────────────────────────────────── */
function TickerLine({ text }: { text: string }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div ref={ref} className="overflow-hidden whitespace-nowrap" style={{ maskImage: "linear-gradient(to right, transparent, black 5%, black 95%, transparent)" }}>
      <div className="inline-flex animate-[ticker_22s_linear_infinite]" style={{ fontFamily: mono }}>
        {Array(3).fill(null).map((_, i) => (
          <span key={i} className="pr-16" style={{ fontSize: 11, color: T.faint, letterSpacing: "0.1em" }}>{text}</span>
        ))}
      </div>
    </div>
  );
}

const TRACE_LINES = [
  { t: "00:00.021", tag: "EXECUTIVE", col: T.orange,  msg: "classified: billing_dispute · confidence 0.96" },
  { t: "00:00.048", tag: "ROUTE    ", col: "#60A5FA",  msg: "→ payment_specialist · reason: duplicate charge" },
  { t: "00:00.071", tag: "TOOL     ", col: "#A78BFA",  msg: "stripe.lookup(email='sarah@acme.io')" },
  { t: "00:00.298", tag: "RESULT   ", col: T.green,    msg: "charge_9xK2 $49 — duplicate confirmed ✓" },
  { t: "00:00.312", tag: "TOOL     ", col: "#A78BFA",  msg: "stripe.refund(charge_9xK2, $49.00)" },
  { t: "00:00.687", tag: "RESULT   ", col: T.green,    msg: "refund_rf_aB8x · succeeded ✓" },
  { t: "00:00.694", tag: "TOOL     ", col: "#A78BFA",  msg: "intercom.reply(conv_4921, 'Hi Sarah…')" },
  { t: "00:00.891", tag: "RESULT   ", col: T.green,    msg: "message delivered ✓" },
  { t: "00:00.899", tag: "RESOLVED ", col: T.orange,   msg: "891ms · $0.18 · cache hit · escalation: none" },
];

function Hero() {
  const count = useQuery(api.waitlist.getCount) ?? 0;
  const joinWaitlist = useMutation(api.waitlist.joinWaitlist);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle"|"ok"|"dup"|"err">("idle");
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    start(async () => {
      try {
        const r = await joinWaitlist({ email: email.trim().toLowerCase(), source: "hero" });
        setStatus(r.status === "already_registered" ? "dup" : "ok");
      } catch { setStatus("err"); }
    });
  }

  return (
    <section style={{ background: T.bg, paddingTop: 100 }}>
      {/* Ticker */}
      <div className="py-2.5" style={{ borderBottom: `1px solid ${T.border}` }}>
        <TickerLine text="HANDLE SUPPORT · ISSUE REFUNDS · MODERATE DISCORD · TRIAGE TICKETS · DETECT ANOMALIES · ROUTE ESCALATIONS · LOG EVERY TRACE · PROTECT REVENUE · HANDLE SUPPORT · ISSUE REFUNDS · MODERATE DISCORD · TRIAGE TICKETS" />
      </div>

      <div className="mx-auto max-w-[1120px] px-6">
        <div className="grid items-start gap-16 py-24 lg:grid-cols-[1fr_480px]">
          {/* Left */}
          <div>
            <div className="mb-8">
              <Chip>⚡ Agent OS · Early access</Chip>
            </div>

            <h1 style={{ fontFamily: sans, fontWeight: 900, fontSize: "clamp(56px,7.5vw,96px)",
              lineHeight: 0.96, letterSpacing: "-0.04em", color: T.text, marginBottom: 28 }}>
              Build more.<br />
              <Accent>Run less.</Accent>
            </h1>

            <p style={{ fontFamily: sans, fontSize: 18, lineHeight: 1.7, color: T.muted,
              maxWidth: 480, marginBottom: 36 }}>
              Rule8 is the operational co-founder for solo builders. AI crews handle your support,
              billing, and community autonomously — so you see{" "}
              <span style={{ color: T.text, borderBottom: `1px solid ${T.orange}` }}>outcomes, not a backlog</span>.
            </p>

            {/* Email form */}
            {status === "ok" ? (
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold text-black"
                  style={{ background: T.green }}>✓</div>
                <div>
                  <p style={{ fontFamily: sans, fontSize: 15, fontWeight: 600, color: T.text }}>You&apos;re on the list.</p>
                  <p style={{ fontFamily: mono, fontSize: 11, color: T.muted }}>We&apos;ll reach out within 24h.</p>
                </div>
              </div>
            ) : (
              <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="flex-1 rounded-lg border px-4 py-3 text-[14px] outline-none transition"
                  style={{ fontFamily: sans, background: T.surface, borderColor: T.border,
                    color: T.text, maxWidth: 280 }}
                  onFocus={e => e.target.style.borderColor = T.orange}
                  onBlur={e => e.target.style.borderColor = T.border}
                />
                <button type="submit" disabled={pending}
                  className="rounded-lg px-6 py-3 text-[14px] font-semibold text-black transition-opacity hover:opacity-85 disabled:opacity-50"
                  style={{ background: T.orange, fontFamily: sans }}>
                  {pending ? "…" : "Claim founding spot →"}
                </button>
              </form>
            )}
            {status === "dup" && <p className="mt-2" style={{ fontFamily: mono, fontSize: 11, color: T.muted }}>Already on the list.</p>}

            {/* Stats row */}
            <div className="mt-12 flex flex-wrap gap-8">
              {[
                { n: "3 min", l: "median response" },
                { n: "91%",   l: "auto-resolved" },
                { n: "$2.92", l: "daily cost, all crews" },
                { n: count > 0 ? `${count}` : "—", l: "founders waiting" },
              ].map(({ n, l }) => (
                <div key={l}>
                  <p style={{ fontFamily: sans, fontWeight: 800, fontSize: 28,
                    color: T.text, lineHeight: 1, letterSpacing: "-0.03em" }}>{n}</p>
                  <p style={{ fontFamily: mono, fontSize: 10, color: T.muted,
                    textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 4 }}>{l}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right — terminal */}
          <div className="hidden lg:block">
            <div className="rounded-xl overflow-hidden border" style={{ borderColor: T.border }}>
              <div className="flex items-center justify-between px-4 py-3 border-b"
                style={{ background: T.surface, borderColor: T.border }}>
                <div className="flex gap-1.5">
                  {[T.red, "#F59E0B", T.green].map(c=>(
                    <div key={c} className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />
                  ))}
                </div>
                <span style={{ fontFamily: mono, fontSize: 11, color: T.muted }}>rule8 trace — live</span>
                <span className="flex items-center gap-1.5"
                  style={{ fontFamily: mono, fontSize: 10, color: T.green }}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: T.green }} />
                  RUNNING
                </span>
              </div>
              <div className="px-5 py-5 space-y-2" style={{ background: "#0D0C0B" }}>
                <div className="mb-4" style={{ fontFamily: mono, fontSize: 12, color: T.muted }}>
                  $ rule8 run --task task-2847 --source intercom
                </div>
                {TRACE_LINES.map(({ t, tag, col, msg }) => (
                  <div key={t} className="flex items-start gap-3">
                    <span style={{ fontFamily: mono, fontSize: 11, color: T.faint, minWidth: 72, flexShrink: 0 }}>{t}</span>
                    <span style={{ fontFamily: mono, fontSize: 11, color: col, minWidth: 68, flexShrink: 0 }}>{tag}</span>
                    <span style={{ fontFamily: mono, fontSize: 11, color: "rgba(242,237,230,0.55)" }}>{msg}</span>
                  </div>
                ))}
                <div className="mt-4 pt-4 border-t" style={{ borderColor: T.border }}>
                  <div className="flex items-center gap-3">
                    <span style={{ fontFamily: mono, fontSize: 11, color: T.muted }}>cost</span>
                    <span style={{ fontFamily: mono, fontSize: 11, color: T.text }}>$0.18</span>
                    <span style={{ fontFamily: mono, fontSize: 11, color: T.muted }}>latency</span>
                    <span style={{ fontFamily: mono, fontSize: 11, color: T.text }}>891ms</span>
                    <span style={{ fontFamily: mono, fontSize: 11, color: T.green, marginLeft: "auto" }}>● resolved</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Divider />
    </section>
  );
}

/* ─── 3. PROBLEM ───────────────────────────────────────────── */
function Problem() {
  return (
    <section style={{ background: T.surface }} className="py-28 px-6">
      <div className="mx-auto max-w-[1120px]">
        <div className="grid gap-16 lg:grid-cols-2">
          <div>
            <Label>01 — The problem</Label>
            <H2 size={44}>
              You&apos;re running two jobs.<br />
              <Accent>You signed up for one.</Accent>
            </H2>
            <p className="mt-6" style={{ fontFamily: sans, fontSize: 16, lineHeight: 1.75, color: T.muted, maxWidth: 440 }}>
              Support tickets, billing disputes, community fires — it all demands your attention
              every single day. The operational layer is a full-time job nobody hired for.
              Rule8 fills that role. Permanently.
            </p>

            <div className="mt-10 grid grid-cols-2 gap-4">
              {[
                { n: "3.2h", l: "lost per day to ops", c: T.red },
                { n: "11×", l: "context switches before noon", c: T.orange },
                { n: "6h", l: "avg wait for a refund decision", c: "#F59E0B" },
                { n: "$0", l: "value shipped during ops time", c: T.muted },
              ].map(({ n, l, c }) => (
                <div key={l} className="rounded-lg border p-4" style={{ background: T.raised, borderColor: T.border }}>
                  <p style={{ fontFamily: sans, fontWeight: 800, fontSize: 32,
                    color: c, lineHeight: 1, letterSpacing: "-0.03em" }}>{n}</p>
                  <p style={{ fontFamily: mono, fontSize: 10, color: T.muted,
                    textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 6 }}>{l}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Before / After */}
          <div className="space-y-3">
            <div className="rounded-xl border p-6" style={{ background: T.raised, borderColor: T.border }}>
              <div className="mb-4 flex items-center justify-between">
                <p style={{ fontFamily: mono, fontSize: 10, textTransform: "uppercase",
                  letterSpacing: "0.14em", color: T.red }}>Without Rule8</p>
                <p style={{ fontFamily: mono, fontSize: 18, fontWeight: 700, color: T.orange }}>07:14 AM</p>
              </div>
              <ul className="space-y-3">
                {[
                  "30 support tickets, 4 billing disputes, 2 Discord fires overnight",
                  "Context-switching 11× before 11am just clearing the queue",
                  "Customer waited 6h for a $49 refund. 90 seconds of actual work.",
                  "Spam wave hit Discord at 3am. Saw it at 8am. Too late.",
                  "Still triaging at midnight. Again.",
                ].map(t => (
                  <li key={t} className="flex items-start gap-3">
                    <span style={{ color: T.red, fontWeight: 700, marginTop: 1, flexShrink: 0 }}>×</span>
                    <span style={{ fontFamily: sans, fontSize: 13, lineHeight: 1.6, color: T.muted }}>{t}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border p-6" style={{ background: T.raised, borderColor: "rgba(34,197,94,0.2)" }}>
              <div className="mb-4 flex items-center justify-between">
                <p style={{ fontFamily: mono, fontSize: 10, textTransform: "uppercase",
                  letterSpacing: "0.14em", color: T.green }}>With Rule8</p>
                <span className="rounded-full px-2.5 py-0.5 text-[10px] font-mono font-semibold"
                  style={{ background: T.greenDim, color: T.green }}>● all crews running</span>
              </div>
              <ul className="space-y-3">
                {[
                  "54 tasks resolved overnight. 4 escalated with full context assembled.",
                  "$49 refund issued in 2m47s. Customer already replied saying thanks.",
                  "Discord spam caught at 3:14am. User warned. Thread archived.",
                  "Morning is for building. Ops is handled.",
                  "4 decisions waiting in your queue. Everything else done.",
                ].map(t => (
                  <li key={t} className="flex items-start gap-3">
                    <span style={{ color: T.green, fontWeight: 700, marginTop: 1, flexShrink: 0 }}>✓</span>
                    <span style={{ fontFamily: sans, fontSize: 13, lineHeight: 1.6, color: T.muted }}>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── 4. HOW IT WORKS ──────────────────────────────────────── */
function HowItWorks() {
  const steps = [
    { tag: "INGEST",    title: "Signal arrives",          body: "Webhook fires from Intercom, Stripe, Discord, or any connected tool. Normalised into a standard task in <200ms regardless of source." },
    { tag: "CLASSIFY",  title: "Executive routes",         body: "The Executive AI reads the task, scores confidence, and routes to the right crew. Below threshold → immediate escalation. No guessing." },
    { tag: "CONTEXT",   title: "Context packet assembled", body: "User history, product policies, prior interactions, escalation rules — all pulled into one packet before any specialist acts." },
    { tag: "EXECUTE",   title: "Specialist runs the loop", body: "Tool calls, results, next calls — up to 5 rounds. Every step writes a trace. Every tool call is real. Stripe. Intercom. Discord." },
    { tag: "RESOLVE",   title: "Resolved or escalated",    body: "Task resolved with full trace, cost, latency. Or escalated with context pre-assembled so your decision takes 10 seconds, not 20 minutes." },
  ];

  return (
    <section id="how" className="py-28 px-6" style={{ background: T.bg }}>
      <div className="mx-auto max-w-[1120px]">
        <Label>03 — How it works</Label>
        <H2 size={44}>
          One task. Handled end-to-end.<br />
          <Accent>Here&apos;s what actually happens.</Accent>
        </H2>

        <div className="mt-14 rounded-xl overflow-hidden border" style={{ borderColor: T.border }}>
          {steps.map(({ tag, title, body }, i) => (
            <div key={tag}>
              <div className="grid items-start gap-6 px-8 py-7 lg:grid-cols-[100px_1fr_2fr]"
                style={{ background: i % 2 === 0 ? T.surface : T.raised }}>
                <span className="rounded border px-2.5 py-1 self-start"
                  style={{ fontFamily: mono, fontSize: 9, textTransform: "uppercase",
                    letterSpacing: "0.14em", color: T.orange, borderColor: "rgba(249,115,22,0.25)",
                    background: T.orangeDim }}>
                  {tag}
                </span>
                <p style={{ fontFamily: sans, fontWeight: 700, fontSize: 17, color: T.text, lineHeight: 1.3 }}>
                  {title}
                </p>
                <p style={{ fontFamily: sans, fontSize: 14, lineHeight: 1.7, color: T.muted }}>
                  {body}
                </p>
              </div>
              {i < steps.length - 1 && <Divider />}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── 5. CREWS ─────────────────────────────────────────────── */
function Crews() {
  const verticals = [
    { label: "SaaS / B2B",       crews: ["Customer Operations","Billing & Subscriptions","Product Feedback"],  color: "#60A5FA" },
    { label: "E-commerce / DTC", crews: ["Customer Support","Returns & Refunds","Community"],                  color: "#34D399" },
    { label: "Creator Economy",  crews: ["Audience Operations","Membership & Billing","Community"],             color: "#A78BFA" },
    { label: "Agency",           crews: ["Client Operations","Project Billing","New Business Signals"],         color: "#F59E0B" },
    { label: "Marketplace",      crews: ["Buyer Support","Seller Support","Trust & Safety"],                    color: "#F472B6" },
    { label: "Developer Tool",   crews: ["Technical Support","Billing","Community & Docs"],                     color: "#2DD4BF" },
    { label: "Custom",           crews: ["You define them","Executive suggests","Rename anything"],             color: T.orange },
  ];

  const specialists = [
    { icon: "💳", name: "Payment",     via: "Stripe · Paddle · Lemon Squeezy" },
    { icon: "🎧", name: "Support",     via: "Intercom · Crisp · Help Scout · Zendesk" },
    { icon: "🌐", name: "Community",   via: "Discord · Slack" },
    { icon: "📧", name: "Email",       via: "Gmail · Postmark · Resend" },
    { icon: "📚", name: "Knowledge",   via: "Notion · Confluence" },
    { icon: "🔧", name: "Engineering", via: "GitHub · Linear" },
    { icon: "📈", name: "Sales Signal",via: "HubSpot · Pipedrive" },
    { icon: "⚡", name: "Custom",      via: "Any webhook you connect" },
  ];

  return (
    <section id="crews" className="py-28 px-6" style={{ background: T.surface }}>
      <div className="mx-auto max-w-[1120px]">
        <Label>04 — Crews</Label>
        <H2 size={44}>
          Your crews. Your language.<br />
          <Accent>Not ours.</Accent>
        </H2>
        <p className="mt-5 mb-14" style={{ fontFamily: sans, fontSize: 16, lineHeight: 1.7, color: T.muted, maxWidth: 580 }}>
          Crews are surface-area containers named after your business. Executive activates the right
          specialists inside them automatically. A real-estate founder doesn&apos;t have a &ldquo;Finance
          Crew&rdquo; — they have &ldquo;Closing Coordinator&rdquo;.
        </p>

        {/* Architecture */}
        <div className="mb-12 grid gap-3 lg:grid-cols-3">
          {[
            { label: "Executive",         badge: "Rule8 · always present",   color: T.orange,  body: "Routes every signal, assembles context, enforces confidence, surfaces patterns. Not configurable — it's the harness." },
            { label: "Generalist Crews",  badge: "Founder-defined",           color: "#60A5FA", body: "Surface-area containers. You name them. They own a domain. Executive decides which specialist runs inside them." },
            { label: "Specialist Agents", badge: "On-demand · invisible",     color: T.green,   body: "Activated by Executive based on task requirements. Can run in parallel. Customer sees one coherent response." },
          ].map(({ label, badge, color, body }) => (
            <div key={label} className="rounded-xl border p-6" style={{ background: T.raised, borderColor: T.border }}>
              <div className="mb-3 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: color }} />
                <span style={{ fontFamily: mono, fontSize: 9, textTransform: "uppercase",
                  letterSpacing: "0.14em", color: T.muted }}>{badge}</span>
              </div>
              <p style={{ fontFamily: sans, fontWeight: 700, fontSize: 16, color: T.text, marginBottom: 8 }}>{label}</p>
              <p style={{ fontFamily: sans, fontSize: 13, lineHeight: 1.65, color: T.muted }}>{body}</p>
            </div>
          ))}
        </div>

        {/* Vertical examples */}
        <p className="mb-4" style={{ fontFamily: mono, fontSize: 10, textTransform: "uppercase",
          letterSpacing: "0.14em", color: T.muted }}>
          Crew configurations — by vertical
        </p>
        <div className="mb-12 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {verticals.map(({ label, crews, color }) => (
            <div key={label} className="rounded-lg border p-4" style={{ background: T.raised, borderColor: T.border }}>
              <div className="mb-3 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
                <span style={{ fontFamily: mono, fontSize: 9, textTransform: "uppercase",
                  letterSpacing: "0.1em", color: T.muted }}>{label}</span>
              </div>
              <ul className="space-y-1.5">
                {crews.map(c => (
                  <li key={c} style={{ fontFamily: sans, fontSize: 12, color: T.text, lineHeight: 1.4 }}>{c}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Specialist pool */}
        <p className="mb-4" style={{ fontFamily: mono, fontSize: 10, textTransform: "uppercase",
          letterSpacing: "0.14em", color: T.muted }}>
          Specialist pool — unlocked by your integrations
        </p>
        <div className="grid gap-px overflow-hidden rounded-xl border sm:grid-cols-2 lg:grid-cols-4"
          style={{ borderColor: T.border, background: T.border }}>
          {specialists.map(({ icon, name, via }) => (
            <div key={name} className="flex items-start gap-3 px-5 py-4"
              style={{ background: T.raised }}>
              <span className="text-[18px] mt-0.5">{icon}</span>
              <div>
                <p style={{ fontFamily: sans, fontWeight: 600, fontSize: 13, color: T.text }}>{name}</p>
                <p style={{ fontFamily: mono, fontSize: 9, color: T.muted,
                  textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 3 }}>{via}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── 6. INTEGRATIONS ──────────────────────────────────────── */
function Integrations() {
  const all = [
    ["Stripe","Billing"],["Intercom","Support"],["Discord","Community"],["Slack","Community"],
    ["Linear","Engineering"],["Notion","Knowledge"],["Help Scout","Support"],["Zendesk","Support"],
    ["PostHog","Analytics"],["Resend","Email"],["Twilio","SMS"],["GitHub","Engineering"],
  ];

  return (
    <section id="integrations" className="py-28 px-6" style={{ background: T.bg }}>
      <div className="mx-auto max-w-[1120px]">
        <Label>05 — Integrations</Label>
        <H2 size={44}>
          Your stack stays.<br />
          <Accent>Rule8 orchestrates on top.</Accent>
        </H2>
        <p className="mt-5 mb-14" style={{ fontFamily: sans, fontSize: 16, lineHeight: 1.7, color: T.muted, maxWidth: 480 }}>
          No rebuilding your stack. Connect once. Rule8 listens, acts, and replies on your existing
          surfaces. Every integration unlocks a new specialist.
        </p>

        <div className="grid gap-1 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {all.map(([name, cat]) => (
            <div key={name} className="flex items-center justify-between rounded-lg border px-4 py-3.5 transition"
              style={{ background: T.surface, borderColor: T.border }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = T.borderHover)}
              onMouseLeave={e => (e.currentTarget.style.borderColor = T.border)}>
              <span style={{ fontFamily: sans, fontSize: 13, fontWeight: 500, color: T.text }}>{name}</span>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: T.green }} />
                <span style={{ fontFamily: mono, fontSize: 9, color: T.muted,
                  textTransform: "uppercase", letterSpacing: "0.08em" }}>{cat}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-center gap-2">
          <span style={{ fontFamily: mono, fontSize: 11, color: T.muted }}>More shipping every sprint —</span>
          <Link href="/waitlist" className="transition-opacity hover:opacity-60"
            style={{ fontFamily: mono, fontSize: 11, color: T.orange, textDecoration: "underline", textUnderlineOffset: 3 }}>
            request yours →
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ─── 7. FINAL CTA ─────────────────────────────────────────── */
function FinalCTA() {
  const joinWaitlist = useMutation(api.waitlist.joinWaitlist);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle"|"ok"|"dup"|"err">("idle");
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    start(async () => {
      try {
        const r = await joinWaitlist({ email: email.trim().toLowerCase(), source: "cta" });
        setStatus(r.status === "already_registered" ? "dup" : "ok");
      } catch { setStatus("err"); }
    });
  }

  return (
    <section style={{ background: T.surface }} className="py-32 px-6">
      <div className="mx-auto max-w-[1120px]">
        <div className="rounded-2xl border p-16 text-center" style={{ background: T.raised, borderColor: T.border }}>
          <Label>08 — Final call</Label>
          <h2 style={{ fontFamily: sans, fontWeight: 900, fontSize: "clamp(40px,5vw,68px)",
            lineHeight: 1.04, letterSpacing: "-0.04em", color: T.text, marginBottom: 20 }}>
            Your ops team is ready.<br />
            <Accent>Are you?</Accent>
          </h2>
          <p style={{ fontFamily: sans, fontSize: 17, lineHeight: 1.7, color: T.muted,
            maxWidth: 520, margin: "0 auto 40px" }}>
            Early access founders get a 1-on-1 onboarding call, crew configuration with us,
            and pricing locked for life. The{" "}
            <em>aha moment</em> is the first task that completes without you.
          </p>

          {status === "ok" ? (
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full text-xl font-black text-black"
                style={{ background: T.green }}>✓</div>
              <p style={{ fontFamily: sans, fontWeight: 700, fontSize: 18, color: T.text }}>You&apos;re on the list.</p>
              <p style={{ fontFamily: mono, fontSize: 11, color: T.muted }}>We&apos;ll reach out within 24 hours.</p>
            </div>
          ) : (
            <form onSubmit={submit} className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="h-12 rounded-lg border px-5 text-[14px] outline-none"
                style={{ fontFamily: sans, width: 280, background: T.surface, borderColor: T.border, color: T.text }}
                onFocus={e => e.target.style.borderColor = T.orange}
                onBlur={e => e.target.style.borderColor = T.border}
              />
              <button type="submit" disabled={pending}
                className="h-12 rounded-lg px-7 text-[14px] font-semibold text-black transition-opacity hover:opacity-85 disabled:opacity-50"
                style={{ background: T.orange, fontFamily: sans }}>
                {pending ? "…" : "Request access →"}
              </button>
            </form>
          )}
          {status === "dup" && <p className="mt-3" style={{ fontFamily: mono, fontSize: 11, color: T.muted }}>Already on the list.</p>}

          <p className="mt-8" style={{ fontFamily: mono, fontSize: 10, letterSpacing: "0.14em",
            textTransform: "uppercase", color: T.faint }}>
            Limited founding spots · No credit card · Reply within 24h
          </p>
        </div>
      </div>
    </section>
  );
}

/* ─── 8. FOOTER ────────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="px-6 py-8" style={{ background: T.bg, borderTop: `1px solid ${T.border}` }}>
      <div className="mx-auto flex max-w-[1120px] flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-6 w-6 items-center justify-center rounded text-[11px] font-black text-black"
            style={{ background: T.orange }}>8</div>
          <span style={{ fontFamily: sans, fontWeight: 700, fontSize: 15, color: T.text }}>Rule8</span>
          <span style={{ fontFamily: mono, fontSize: 9, textTransform: "uppercase",
            letterSpacing: "0.14em", color: T.muted, marginLeft: 4 }}>Agent OS</span>
        </div>
        <div className="flex flex-wrap items-center gap-5">
          {[["#how","How it works"],["#crews","Crews"],["#integrations","Integrations"],["/waitlist","Waitlist"],["/sign-in","Sign in"]].map(([href,l])=>(
            <a key={href} href={href} className="transition-opacity hover:opacity-50"
              style={{ fontFamily: sans, fontSize: 12, color: T.muted }}>{l}</a>
          ))}
        </div>
        <p style={{ fontFamily: mono, fontSize: 11, color: T.faint }}>© 2026 Rule8</p>
      </div>
    </footer>
  );
}

/* ─── PAGE ─────────────────────────────────────────────────── */
export function LandingPage() {
  return (
    <div style={{ background: T.bg, color: T.text }}>
      <style>{`
        @keyframes ticker {
          from { transform: translateX(0); }
          to   { transform: translateX(-33.333%); }
        }
      `}</style>
      <Nav />
      <Hero />
      <Problem />
      <HowItWorks />
      <Crews />
      <Integrations />
      <FinalCTA />
      <Footer />
    </div>
  );
}
