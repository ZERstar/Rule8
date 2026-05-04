"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

/* ── Design tokens ─────────────────────────────────────────── */
const C = {
  cream:   "#F5F0E8",
  card:    "#EDE8DF",
  primary: "#1C1C1C",
  muted:   "#6B6256",
  accent:  "#C8522A",
  border:  "#D9D3C8",
  dark:    "#111110",
} as const;

const serif  = "var(--font-playfair), 'Georgia', serif";
const sans   = "var(--font-inter), system-ui, sans-serif";
const mono   = "'SFMono-Regular', Consolas, monospace";

/* ── Shared primitives ─────────────────────────────────────── */
function SectionLabel({ index, text }: { index: string; text: string }) {
  return (
    <div className="mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-2"
      style={{ borderColor: C.border, background: "white" }}>
      <span style={{ fontFamily: mono, fontSize: 11, letterSpacing: "0.12em", color: C.muted, textTransform: "uppercase" }}>
        {index} — {text}
      </span>
    </div>
  );
}

function Heading({ children, size = 56 }: { children: React.ReactNode; size?: number }) {
  return (
    <h2 style={{ fontFamily: serif, fontSize: size, fontWeight: 700, lineHeight: 1.08, letterSpacing: "-0.025em", color: C.primary }}>
      {children}
    </h2>
  );
}

function AccentItalic({ children }: { children: React.ReactNode }) {
  return <em style={{ fontStyle: "italic", color: C.accent }}>{children}</em>;
}

function Body({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={className}
      style={{ fontFamily: sans, fontSize: 18, lineHeight: 1.75, color: C.muted, maxWidth: 650 }}>
      {children}
    </p>
  );
}

function CTAPrimary({ children, href = "/waitlist" }: { children: React.ReactNode; href?: string }) {
  return (
    <Link href={href}
      className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 font-semibold text-white transition-opacity hover:opacity-88"
      style={{ background: C.accent, fontFamily: sans, fontSize: 15 }}>
      {children}
    </Link>
  );
}

function CTASecondary({ children, href = "#how-it-works" }: { children: React.ReactNode; href?: string }) {
  return (
    <a href={href}
      className="inline-flex items-center gap-2 rounded-full border px-7 py-3.5 font-medium transition-colors hover:opacity-70"
      style={{ borderColor: C.border, color: C.primary, fontFamily: sans, fontSize: 15 }}>
      {children}
    </a>
  );
}

/* ── 1. NAVBAR ─────────────────────────────────────────────── */
function Navbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 backdrop-blur-md"
      style={{ background: "rgba(245,240,232,0.95)", borderBottom: `1px solid ${C.border}` }}>
      <div className="mx-auto flex h-16 max-w-[1100px] items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-bold text-white"
            style={{ background: C.accent }}>8</span>
          <span style={{ fontFamily: serif, fontWeight: 700, fontSize: 20, color: C.primary }}>Rule8</span>
        </Link>

        {/* Nav links */}
        <nav className="hidden items-center gap-7 md:flex">
          {[["#how-it-works","How it works"],["#crews","Crews"],["#integrations","Integrations"],["#pricing","Pricing"]].map(([href,label])=>(
            <a key={href} href={href}
              className="transition-opacity hover:opacity-60"
              style={{ fontFamily: sans, fontSize: 14, color: C.muted }}>
              {label}
            </a>
          ))}
        </nav>

        {/* CTA */}
        <Link href="/waitlist"
          className="hidden rounded-full px-5 py-2.5 text-[14px] font-semibold text-white transition-opacity hover:opacity-80 md:inline-flex items-center gap-1.5"
          style={{ background: C.dark, fontFamily: sans }}>
          Get early access <span>→</span>
        </Link>
      </div>
    </header>
  );
}

/* ── 2. HERO ───────────────────────────────────────────────── */
function Hero() {
  const count = useQuery(api.waitlist.getCount) ?? 0;
  const joinWaitlist = useMutation(api.waitlist.joinWaitlist);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle"|"success"|"dup"|"err">("idle");
  const [isPending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    start(async () => {
      try {
        const r = await joinWaitlist({ email: email.trim().toLowerCase(), source: "hero" });
        setStatus(r.status === "already_registered" ? "dup" : "success");
      } catch { setStatus("err"); }
    });
  }

  return (
    <section className="pt-32 pb-20 px-6" style={{ background: C.cream }}>
      <div className="mx-auto max-w-[1100px]">
        {/* Badge */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border px-4 py-2"
          style={{ borderColor: C.border, background: "white" }}>
          <span style={{ color: C.accent, fontSize: 13 }}>⚡</span>
          <span style={{ fontFamily: mono, fontSize: 10, letterSpacing: "0.14em", color: C.muted, textTransform: "uppercase" }}>
            Now in early access — founding price locked for life
          </span>
        </div>

        {/* H1 */}
        <h1 style={{ fontFamily: serif, fontWeight: 700, fontSize: "clamp(52px,7vw,82px)", lineHeight: 1.04, letterSpacing: "-0.03em", color: C.primary, maxWidth: 820, marginBottom: 28 }}>
          Ship more.{" "}
          <AccentItalic>Ops handled.</AccentItalic>
        </h1>

        {/* Subtext */}
        <p style={{ fontFamily: sans, fontSize: 19, lineHeight: 1.75, color: C.muted, maxWidth: 580, marginBottom: 40 }}>
          Rule8 is the operational co-founder for solo builders. AI crews handle your support, billing,
          and community — so you wake up to{" "}
          <span style={{ textDecoration: "underline", textDecorationColor: C.accent, textUnderlineOffset: 4 }}>
            outcomes, not a backlog
          </span>.
        </p>

        {/* CTAs */}
        <div className="flex flex-wrap items-center gap-4 mb-20">
          <CTAPrimary href="/waitlist">Claim your founding spot →</CTAPrimary>
          <CTASecondary href="#how-it-works">See a task run end-to-end</CTASecondary>
        </div>

        {/* Stat bar */}
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border lg:grid-cols-4"
          style={{ borderColor: C.border }}>
          {[
            { num: "3 min", label: "Median response", sub: "24 / 7" },
            { num: "91%", label: "Resolved without", sub: "escalation" },
            { num: "$2.92", label: "All-in daily cost", sub: "all crews" },
            { num: "0", label: "Tickets in your", sub: "inbox" },
          ].map((s, i) => (
            <div key={i} className="px-8 py-8" style={{ background: i % 2 === 0 ? "white" : C.cream }}>
              <div style={{ fontFamily: serif, fontWeight: 700, fontSize: 44, lineHeight: 1, color: C.primary, marginBottom: 10 }}>
                {s.num}
              </div>
              <p style={{ fontFamily: mono, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: C.muted, lineHeight: 1.6 }}>
                {s.label}<br />{s.sub}
              </p>
            </div>
          ))}
        </div>

        {count > 0 && (
          <p className="mt-6 text-center" style={{ fontFamily: sans, fontSize: 13, color: C.muted }}>
            <span style={{ color: C.primary, fontWeight: 600 }}>{count.toLocaleString()}</span> founders already on the list
          </p>
        )}
      </div>
    </section>
  );
}

/* ── 3. PROBLEM ────────────────────────────────────────────── */
function Problem() {
  return (
    <section id="problem" className="py-28 px-6" style={{ background: C.card }}>
      <div className="mx-auto max-w-[1100px]">
        <SectionLabel index="01" text="The Founder Tax" />
        <Heading size={56}>
          You&apos;re running two jobs.{" "}
          <AccentItalic>You only signed up for one.</AccentItalic>
        </Heading>
        <Body className="mt-6 mb-16">
          Building the product and running the business around it — support tickets, billing disputes,
          community fires. It all demands your attention every day. The operational layer is a full-time
          job nobody hired for. Rule8 fills that role.
        </Body>

        <div className="grid gap-5 md:grid-cols-3">
          {[
            {
              icon: "⏱",
              label: "The hidden hours",
              desc: "Founders spend 3.2 hours per day on operational work. That&apos;s 22 hours a week not shipping, closing deals, or talking to the customers who matter.",
            },
            {
              icon: "🌙",
              label: "Always on",
              desc: "Support tickets don&apos;t respect your timezone. A Discord fire at 3am goes unnoticed until morning. By then the damage is done. Rule8 never clocks out.",
            },
            {
              icon: "☕",
              label: "Cheaper than coffee",
              desc: "Three full crews — Finance, Support, Community — operating round the clock for $2.92 per day. Less than your morning flat white. More than any hire you&apos;ve made.",
            },
          ].map(({ icon, label, desc }) => (
            <div key={label} className="rounded-2xl border p-8"
              style={{ background: C.cream, borderColor: `${C.border}80` }}>
              <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl text-[20px]"
                style={{ background: `${C.accent}14` }}>
                {icon}
              </div>
              <p style={{ fontFamily: mono, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.14em", color: C.accent, marginBottom: 10 }}>
                {label}
              </p>
              <p style={{ fontFamily: sans, fontSize: 15, lineHeight: 1.7, color: C.muted }}
                dangerouslySetInnerHTML={{ __html: desc }} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── 4. BEFORE / AFTER ─────────────────────────────────────── */
function BeforeAfter() {
  const withoutItems = [
    "Wake up to 30 support tickets, 4 billing disputes, 2 Discord fires",
    "Context-switching 11× before 11am just clearing the queue",
    "Customer waited 6 hours for a refund that takes 90 seconds",
    "Spam wave hits Discord at 3am — nobody sees it until morning",
    "Still triaging at midnight because the backlog never ends",
  ];
  const withItems = [
    "Trace log: 54 tasks resolved overnight, 4 escalated for your review",
    "Finance crew issued $49 refund in 2m47s — customer already replied saying thanks",
    "Discord spam detected at 3:14am, user warned, thread archived automatically",
    "Morning is for building. Ops is handled.",
    "4 escalations waiting — every one with full context pre-assembled",
  ];

  return (
    <section id="before-after" className="py-28 px-6" style={{ background: C.cream }}>
      <div className="mx-auto max-w-[1100px]">
        <SectionLabel index="02" text="Before / After" />
        <Heading size={52}>
          Two mornings.{" "}
          <AccentItalic>One choice.</AccentItalic>
        </Heading>

        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          {/* Without */}
          <div className="relative rounded-2xl border p-8" style={{ background: C.card, borderColor: `${C.border}80` }}>
            <div className="absolute right-6 top-6"
              style={{ fontFamily: mono, fontSize: 18, fontWeight: 700, color: C.accent }}>
              07:14 AM
            </div>
            <p style={{ fontFamily: mono, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.14em", color: "#B04040", marginBottom: 20 }}>
              Without Rule8
            </p>
            <ul className="space-y-3.5">
              {withoutItems.map((t) => (
                <li key={t} className="flex items-start gap-3">
                  <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-white text-[10px] font-bold"
                    style={{ background: "#C84040" }}>✕</span>
                  <span style={{ fontFamily: sans, fontSize: 14, lineHeight: 1.6, color: C.muted }}>{t}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* With */}
          <div className="relative rounded-2xl border p-8" style={{ background: "white", borderColor: `${C.accent}40` }}>
            <div className="absolute -top-3.5 left-7 rounded-full px-3 py-1 text-[11px] font-semibold text-white"
              style={{ background: C.accent, fontFamily: mono, letterSpacing: "0.1em" }}>
              WITH RULE8
            </div>
            <p style={{ fontFamily: mono, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.14em", color: "#2A7A48", marginBottom: 20 }}>
              Your morning
            </p>
            <ul className="space-y-3.5">
              {withItems.map((t) => (
                <li key={t} className="flex items-start gap-3">
                  <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-white text-[10px] font-bold"
                    style={{ background: "#2A7A48" }}>✓</span>
                  <span style={{ fontFamily: sans, fontSize: 14, lineHeight: 1.6, color: C.muted }}>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── 5. HOW IT WORKS ───────────────────────────────────────── */
function HowItWorks() {
  const steps = [
    { n: "01", title: "Signal arrives", body: "A webhook fires from Intercom, Stripe, Discord, or email. Rule8 receives it in under 200ms and normalises it into a standard task — regardless of source." },
    { n: "02", title: "Executive classifies", body: "The Executive AI reads the task, scores intent with a confidence threshold, and routes it to the right crew. Below threshold it escalates immediately rather than guessing." },
    { n: "03", title: "Context assembled", body: "Before any specialist acts, Executive pulls user history, product context, refund policies, and escalation rules into a single context packet. Specialists never start from zero." },
    { n: "04", title: "Specialist executes", body: "The right specialist runs a tool loop — LLM call, tool execution, result ingestion — up to 5 rounds. Every step writes a trace record. Every tool call is real." },
    { n: "05", title: "Resolved or escalated", body: "Task marked resolved with resolution text, total cost, and latency. Or escalated with full context pre-assembled — what was tried, why it escalated, recommended action. Your decision takes 10 seconds, not 20 minutes." },
  ];

  return (
    <section id="how-it-works" className="py-28 px-6" style={{ background: C.card }}>
      <div className="mx-auto max-w-[1100px]">
        <SectionLabel index="03" text="How It Works" />
        <Heading size={52}>
          One request. Handled end-to-end.{" "}
          <AccentItalic>Here&apos;s the proof.</AccentItalic>
        </Heading>
        <Body className="mt-5 mb-16">
          Here&apos;s exactly what happens when a billing dispute lands in your Intercom — from webhook to
          resolved, in under 15 seconds.
        </Body>

        {/* Steps */}
        <div className="mb-14 rounded-2xl border overflow-hidden" style={{ borderColor: `${C.border}80` }}>
          {steps.map((step, i) => (
            <div key={step.n}>
              <div className="flex items-start gap-8 px-8 py-7"
                style={{ background: i % 2 === 0 ? "white" : C.cream }}>
                <span style={{ fontFamily: serif, fontWeight: 700, fontSize: 28, color: C.accent, minWidth: 40, lineHeight: 1 }}>
                  {step.n}
                </span>
                <div>
                  <p style={{ fontFamily: serif, fontWeight: 700, fontSize: 19, color: C.primary, marginBottom: 6 }}>
                    {step.title}
                  </p>
                  <p style={{ fontFamily: sans, fontSize: 15, lineHeight: 1.7, color: C.muted, maxWidth: 680 }}>
                    {step.body}
                  </p>
                </div>
              </div>
              {i < steps.length - 1 && <div style={{ height: 1, background: C.border }} />}
            </div>
          ))}
        </div>

        {/* Terminal block */}
        <div className="rounded-2xl overflow-hidden" style={{ background: "#1A1714" }}>
          <div className="flex items-center gap-1.5 px-5 py-3.5 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            {["#EF4444","#F59E0B","#22C55E"].map(c => (
              <div key={c} className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />
            ))}
            <span className="ml-3" style={{ fontFamily: mono, fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
              rule8 trace — task-2847
            </span>
          </div>
          <div className="px-6 py-6 space-y-1.5 overflow-x-auto">
            {[
              { t: "00:00.000", tag: "INBOUND  ", col: "rgba(255,255,255,0.4)", msg: "webhook received · intercom · conv_4921" },
              { t: "00:00.021", tag: "EXECUTIVE", col: "#F59E0B",               msg: "classifying intent · confidence 0.94" },
              { t: "00:00.048", tag: "ROUTE    ", col: "#60A5FA",               msg: "→ finance_crew · reason: billing dispute detected" },
              { t: "00:00.054", tag: "CONTEXT  ", col: "rgba(255,255,255,0.4)", msg: "assembling context packet · user history loaded (7 prior tasks)" },
              { t: "00:00.071", tag: "TOOL     ", col: "#A78BFA",               msg: 'stripe.lookupCustomer(email="sarah@acme.io")' },
              { t: "00:00.298", tag: "RESULT   ", col: "#34D399",               msg: "charge_9xK2: $49.00 duplicate confirmed ✓" },
              { t: "00:00.312", tag: "TOOL     ", col: "#A78BFA",               msg: "stripe.issueRefund(charge_9xK2, $49.00)" },
              { t: "00:00.687", tag: "RESULT   ", col: "#34D399",               msg: 'refund_rf_aB8x created · status: succeeded ✓' },
              { t: "00:00.694", tag: "TOOL     ", col: "#A78BFA",               msg: 'intercom.reply(conv_4921, "Hi Sarah, confirmed refund…")' },
              { t: "00:00.891", tag: "RESULT   ", col: "#34D399",               msg: "message_3921 delivered ✓" },
              { t: "00:00.899", tag: "RESOLVED ", col: "#F97316",               msg: "task-2847 · 3 tool calls · 891ms · $0.18 · cache hit" },
            ].map(({ t, tag, col, msg }) => (
              <div key={t} className="flex items-start gap-4 whitespace-nowrap">
                <span style={{ fontFamily: mono, fontSize: 12, color: "rgba(255,255,255,0.22)", minWidth: 78 }}>{t}</span>
                <span style={{ fontFamily: mono, fontSize: 12, color: col, minWidth: 72 }}>{tag}</span>
                <span style={{ fontFamily: mono, fontSize: 12, color: "rgba(255,255,255,0.62)" }}>{msg}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── 6. CREWS ──────────────────────────────────────────────── */
function Crews() {
  const verticals = [
    {
      label: "SaaS / B2B",
      crews: ["Customer Operations", "Billing & Subscriptions", "Product Feedback"],
      specialists: ["Support", "Payment", "Engineering Signal"],
      color: "#4D7CFF",
    },
    {
      label: "E-commerce / DTC",
      crews: ["Customer Support", "Returns & Refunds", "Community"],
      specialists: ["Support", "Payment", "Community"],
      color: "#14B8A6",
    },
    {
      label: "Creator Economy",
      crews: ["Audience Operations", "Membership & Billing", "Community"],
      specialists: ["Support", "Payment", "Email", "Community"],
      color: "#8B5CF6",
    },
    {
      label: "Agency",
      crews: ["Client Operations", "Project Billing", "New Business Signals"],
      specialists: ["Support", "Payment", "Sales Signal"],
      color: "#F59E0B",
    },
    {
      label: "Marketplace",
      crews: ["Buyer Support", "Seller Support", "Trust & Safety"],
      specialists: ["Support", "Payment", "Community"],
      color: "#EC4899",
    },
    {
      label: "Developer Tool",
      crews: ["Technical Support", "Billing", "Community & Docs"],
      specialists: ["Engineering Signal", "Support", "Payment"],
      color: "#10B981",
    },
  ];

  const specialists = [
    { icon: "💳", label: "Payment Specialist", via: "Stripe · Paddle · Lemon Squeezy", desc: "Charge lookup, refunds, subscription status, failure recovery" },
    { icon: "🎧", label: "Support Specialist",  via: "Intercom · Crisp · Help Scout",    desc: "Read tickets, post replies, resolve conversations, triage by priority" },
    { icon: "🌐", label: "Community Specialist",via: "Discord · Slack",                  desc: "Channel monitoring, moderation, feature extraction, sentiment" },
    { icon: "📧", label: "Email Specialist",    via: "Gmail · Postmark · Resend",         desc: "Inbound thread parsing, quote stripping, reply drafting" },
    { icon: "📚", label: "Knowledge Specialist",via: "Notion · Confluence",              desc: "Pull product docs into agent context, answer from structured KB" },
    { icon: "🔧", label: "Engineering Signal",  via: "GitHub · Linear",                  desc: "Correlate support tickets with open issues, surface product patterns" },
    { icon: "📈", label: "Sales Signal",        via: "HubSpot · Pipedrive",              desc: "Flag upgrade candidates, identify expansion revenue from ops data" },
    { icon: "⚡", label: "Custom Specialist",   via: "Any webhook",                      desc: "Any tool you use — defined by you, built by Executive in conversation" },
  ];

  return (
    <section id="crews" className="py-28 px-6" style={{ background: C.cream }}>
      <div className="mx-auto max-w-[1100px]">
        <SectionLabel index="04" text="Crews" />
        <Heading size={52}>
          Your crews. Named after{" "}
          <AccentItalic>your business, not ours.</AccentItalic>
        </Heading>
        <Body className="mt-5 mb-6">
          Crews are surface-area containers. You name them. Executive AI activates the right specialists
          inside them when a task arrives — without you defining it in advance. A real-estate founder
          doesn&apos;t have a &ldquo;Finance Crew&rdquo;. They have &ldquo;Closing Coordinator&rdquo;.
          Rule8 speaks your language.
        </Body>

        {/* Architecture callout */}
        <div className="mb-14 grid gap-4 lg:grid-cols-3">
          {[
            { label: "Executive", role: "The harness. Always present. Routes every signal, assembles context, enforces confidence thresholds, escalates, surfaces patterns.", badge: "Rule8 — not configurable", color: C.accent },
            { label: "Generalist Crews", role: "Surface-area containers. Named by the founder. Owns a domain of work. Does not prescribe which specialist handles it — that&apos;s Executive&apos;s job.", badge: "Founder-defined", color: "#4D7CFF" },
            { label: "Specialist Agents", role: "Expertise units activated on demand by Executive. Can run in parallel for complex tasks. Invisible to the customer. One coherent response always goes out.", badge: "Rule8 defaults + custom", color: "#10B981" },
          ].map(({ label, role, badge, color }) => (
            <div key={label} className="rounded-2xl border p-6"
              style={{ background: C.card, borderColor: `${C.border}80` }}>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1"
                style={{ background: "white", borderColor: C.border }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
                <span style={{ fontFamily: mono, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.12em", color: C.muted }}>{badge}</span>
              </div>
              <p style={{ fontFamily: serif, fontWeight: 700, fontSize: 18, color: C.primary, marginBottom: 8 }}>{label}</p>
              <p style={{ fontFamily: sans, fontSize: 13, lineHeight: 1.65, color: C.muted }}
                dangerouslySetInnerHTML={{ __html: role }} />
            </div>
          ))}
        </div>

        {/* Vertical examples */}
        <p style={{ fontFamily: mono, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.14em", color: C.muted, marginBottom: 16 }}>
          Example crew configurations — shaped by your vertical
        </p>
        <div className="mb-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {verticals.map(({ label, crews, specialists: specs, color }) => (
            <div key={label} className="rounded-2xl border p-5"
              style={{ background: "white", borderColor: C.border }}>
              <div className="mb-4 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: color }} />
                <span style={{ fontFamily: mono, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: C.muted }}>{label}</span>
              </div>
              <div className="mb-4 space-y-1.5">
                {crews.map((c) => (
                  <div key={c} className="flex items-center gap-2.5 rounded-lg border px-3 py-2"
                    style={{ borderColor: `${color}25`, background: `${color}06` }}>
                    <span style={{ fontFamily: sans, fontSize: 12, color: C.primary, fontWeight: 500 }}>{c}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {specs.map((s) => (
                  <span key={s} className="rounded-full border px-2.5 py-1"
                    style={{ fontFamily: mono, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: C.muted, borderColor: C.border, background: C.cream }}>
                    {s}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Specialist pool */}
        <div className="rounded-2xl border overflow-hidden" style={{ borderColor: `${C.border}80` }}>
          <div className="border-b px-8 py-5" style={{ background: C.card, borderColor: `${C.border}80` }}>
            <p style={{ fontFamily: serif, fontWeight: 700, fontSize: 22, color: C.primary }}>
              The specialist pool — unlocked by your integrations
            </p>
            <p style={{ fontFamily: sans, fontSize: 14, color: C.muted, marginTop: 4 }}>
              Executive only activates specialists that have the tools to do the job. Connect Stripe → Payment Specialist activates. No guessing.
            </p>
          </div>
          <div className="grid gap-px sm:grid-cols-2" style={{ background: C.border }}>
            {specialists.map(({ icon, label, via, desc }, i) => (
              <div key={label} className="flex items-start gap-4 px-6 py-5"
                style={{ background: i % 2 === 0 ? "white" : C.cream }}>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[18px]"
                  style={{ background: `${C.accent}10` }}>
                  {icon}
                </span>
                <div>
                  <p style={{ fontFamily: sans, fontSize: 14, fontWeight: 600, color: C.primary, marginBottom: 2 }}>{label}</p>
                  <p style={{ fontFamily: mono, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: C.accent, marginBottom: 4 }}>via {via}</p>
                  <p style={{ fontFamily: sans, fontSize: 12, lineHeight: 1.6, color: C.muted }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── 7. INTEGRATIONS ───────────────────────────────────────── */
function Integrations() {
  const integrations = [
    "Stripe","Intercom","Discord","Slack",
    "Linear","Notion","Help Scout","Zendesk",
    "PostHog","Resend","Twilio","GitHub",
  ];

  return (
    <section id="integrations" className="py-28 px-6" style={{ background: C.card }}>
      <div className="mx-auto max-w-[1100px]">
        <SectionLabel index="05" text="Integrations" />
        <Heading size={52}>
          Your tools stay.{" "}
          <AccentItalic>Rule8 orchestrates on top.</AccentItalic>
        </Heading>
        <Body className="mt-5 mb-16">
          One-click connections. Rule8 starts listening the moment you connect — no custom code, no
          rebuilding your stack. Every integration unlocks a new specialist for your crews.
        </Body>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {integrations.map((name) => (
            <div key={name} className="flex items-center justify-between rounded-xl border px-5 py-4"
              style={{ background: "white", borderColor: C.border }}>
              <span style={{ fontFamily: sans, fontSize: 14, fontWeight: 500, color: C.primary }}>{name}</span>
              <span className="flex items-center gap-1.5"
                style={{ fontFamily: mono, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: C.accent }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: C.accent }} />
                LIVE
              </span>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center" style={{ fontFamily: sans, fontSize: 13, color: C.muted }}>
          More integrations shipping every sprint.{" "}
          <Link href="/waitlist" className="underline underline-offset-4 transition-opacity hover:opacity-70"
            style={{ color: C.accent }}>
            Request yours →
          </Link>
        </p>
      </div>
    </section>
  );
}

/* ── 8. FINAL CTA ──────────────────────────────────────────── */
function FinalCTA() {
  const joinWaitlist = useMutation(api.waitlist.joinWaitlist);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle"|"success"|"dup"|"err">("idle");
  const [isPending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    start(async () => {
      try {
        const r = await joinWaitlist({ email: email.trim().toLowerCase(), source: "final_cta" });
        setStatus(r.status === "already_registered" ? "dup" : "success");
      } catch { setStatus("err"); }
    });
  }

  return (
    <section id="final-cta" className="py-32 px-6" style={{ background: C.cream }}>
      <div className="mx-auto max-w-[1100px]">
        <SectionLabel index="08" text="Final Call" />
        <Heading size={58}>
          Your ops team is ready.{" "}
          <AccentItalic>Are you?</AccentItalic>
        </Heading>
        <Body className="mt-6 mb-10">
          Early access founders get a 1-on-1 onboarding call, crew configuration with us, and pricing
          locked in for life. The <em style={{ fontStyle: "italic" }}>aha moment</em> is the first task
          that completes without you. Most founders see it within 15 minutes of going live.
        </Body>

        {status === "success" ? (
          <div className="flex flex-col gap-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full text-white text-xl font-bold"
              style={{ background: "#2A7A48" }}>✓</div>
            <p style={{ fontFamily: serif, fontWeight: 700, fontSize: 22, color: C.primary }}>You&apos;re on the list.</p>
            <p style={{ fontFamily: sans, fontSize: 15, color: C.muted }}>We&apos;ll reach out within 24 hours.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="h-13 rounded-xl border px-5 text-[15px] outline-none transition focus:ring-2"
              style={{
                fontFamily: sans,
                width: 300,
                height: 52,
                borderColor: C.border,
                background: "white",
                color: C.primary,
              }}
            />
            <button type="submit" disabled={isPending}
              className="inline-flex h-[52px] items-center gap-2 rounded-full px-7 font-semibold text-white transition-opacity hover:opacity-80 disabled:opacity-50"
              style={{ background: C.dark, fontFamily: sans, fontSize: 15 }}>
              {isPending ? "Submitting…" : "Request access →"}
            </button>
          </form>
        )}

        {status === "dup" && <p className="mt-3 text-[13px]" style={{ fontFamily: sans, color: C.muted }}>You&apos;re already on the list — we&apos;ll reach out soon.</p>}
        {status === "err" && <p className="mt-3 text-[13px]" style={{ fontFamily: sans, color: "#C84040" }}>Something went wrong. Try again.</p>}

        <p className="mt-8" style={{ fontFamily: mono, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: C.muted }}>
          Limited founding spots · No credit card · Reply within 24h
        </p>
      </div>
    </section>
  );
}

/* ── 9. FOOTER ─────────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="px-6 py-10" style={{ background: C.cream, borderTop: `1px solid ${C.border}` }}>
      <div className="mx-auto flex max-w-[1100px] flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-white"
            style={{ background: C.accent }}>8</span>
          <span style={{ fontFamily: serif, fontWeight: 700, fontSize: 16, color: C.primary }}>Rule8</span>
          <span style={{ fontFamily: mono, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.14em", color: C.muted, marginLeft: 4 }}>
            Operational co-founder
          </span>
        </div>

        {/* Nav */}
        <div className="flex flex-wrap items-center gap-6">
          {[["#how-it-works","How it works"],["#crews","Crews"],["#pricing","Pricing"],["/waitlist","Waitlist"],["/sign-in","Sign in"]].map(([href,label])=>(
            <a key={href} href={href} className="transition-opacity hover:opacity-60"
              style={{ fontFamily: sans, fontSize: 13, color: C.muted }}>{label}</a>
          ))}
        </div>

        {/* Copy */}
        <p style={{ fontFamily: sans, fontSize: 12, color: `${C.muted}99` }}>© 2026 Rule8</p>
      </div>
    </footer>
  );
}

/* ── PAGE ──────────────────────────────────────────────────── */
export function LandingPage() {
  return (
    <div style={{ background: C.cream, color: C.primary }}>
      <Navbar />
      <Hero />
      <Problem />
      <BeforeAfter />
      <HowItWorks />
      <Crews />
      <Integrations />
      <FinalCTA />
      <Footer />
    </div>
  );
}
