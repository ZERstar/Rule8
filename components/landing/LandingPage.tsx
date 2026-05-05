"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

/* ── tokens ─────────────────────────────────────────────────── */
const C = {
  bg:     "#FFFFFF",
  soft:   "#F5F5F7",   // Apple's signature near-white
  card:   "#FBFBFD",
  text:   "#1D1D1F",   // Apple's body text
  sub:    "#3D3D3F",
  muted:  "#86868B",   // Apple's secondary text
  accent: "#F97316",
  accentBg: "rgba(249,115,22,0.08)",
  border: "#D2D2D7",   // Apple's border tone
  borderLight: "#E8E8ED",
  green:  "#34C759",   // iOS green
  red:    "#FF3B30",   // iOS red
  dark:   "#1D1D1F",
} as const;

const f = "var(--font-inter), -apple-system, 'SF Pro Display', system-ui, sans-serif";

/* ── 1. NAV ─────────────────────────────────────────────────── */
function Nav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 backdrop-blur-xl"
      style={{ background: "rgba(255,255,255,0.72)", borderBottom: `1px solid ${C.borderLight}` }}>
      <div className="mx-auto flex h-[52px] max-w-[1100px] items-center justify-between px-8">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-[8px] text-[13px] font-black text-white"
            style={{ background: C.accent }}>8</span>
          <span style={{ fontFamily: f, fontWeight: 600, fontSize: 17, color: C.text, letterSpacing: "-0.01em" }}>
            Rule8
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {[["#how","How it works"],["#business","Your business"],["#integrations","Integrations"]].map(([h,l]) => (
            <a key={h} href={h} className="transition-opacity hover:opacity-50"
              style={{ fontFamily: f, fontSize: 14, color: C.muted, letterSpacing: "-0.01em" }}>{l}</a>
          ))}
        </nav>

        <Link href="/waitlist"
          className="rounded-full px-5 py-2 text-[14px] font-semibold text-white transition-opacity hover:opacity-85"
          style={{ background: C.accent, fontFamily: f, letterSpacing: "-0.01em" }}>
          Get early access
        </Link>
      </div>
    </header>
  );
}

/* ── 2. HERO ─────────────────────────────────────────────────── */
function Hero() {
  const count = useQuery(api.waitlist.getCount) ?? 0;
  const join = useMutation(api.waitlist.joinWaitlist);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle"|"ok"|"dup"|"err">("idle");
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      try {
        const r = await join({ email: email.trim().toLowerCase(), source: "hero" });
        setStatus(r.status === "already_registered" ? "dup" : "ok");
      } catch { setStatus("err"); }
    });
  }

  return (
    <section style={{ background: C.bg }} className="relative overflow-hidden pt-28 pb-24 px-6">
      {/* Subtle radial glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[600px]"
        style={{ background: "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(249,115,22,0.07) 0%, transparent 70%)" }} />

      <div className="relative mx-auto max-w-[1100px]">
        <div className="flex flex-col items-center text-center">

          {/* Eyebrow */}
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border px-4 py-1.5"
            style={{ borderColor: C.borderLight, background: "rgba(255,255,255,0.6)", backdropFilter: "blur(8px)" }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: C.accent }} />
            <span style={{ fontFamily: f, fontSize: 13, color: C.muted, letterSpacing: "-0.005em" }}>
              Early access — founding price locked for life
            </span>
          </div>

          {/* Headline */}
          <h1 style={{ fontFamily: f, fontWeight: 700, fontSize: "clamp(48px,6.5vw,88px)",
            lineHeight: 1.04, letterSpacing: "-0.04em", color: C.text,
            maxWidth: 860, marginBottom: 28 }}>
            Your business runs itself.{" "}
            <span style={{ color: C.accent }}>You just ship.</span>
          </h1>

          {/* Subtext */}
          <p style={{ fontFamily: f, fontSize: 19, lineHeight: 1.65, color: C.muted,
            maxWidth: 560, marginBottom: 44, letterSpacing: "-0.01em" }}>
            Rule8 handles support, billing, and community for you — automatically, overnight,
            on the tools your customers already use.
          </p>

          {/* CTA */}
          {status === "ok" ? (
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full text-2xl text-white"
                style={{ background: C.green }}>✓</div>
              <p style={{ fontFamily: f, fontWeight: 600, fontSize: 17, color: C.text, letterSpacing: "-0.015em" }}>
                You&apos;re on the list.
              </p>
              <p style={{ fontFamily: f, fontSize: 14, color: C.muted }}>We&apos;ll reach out within 24 hours.</p>
            </div>
          ) : (
            <form onSubmit={submit} className="flex flex-col items-center gap-3 sm:flex-row">
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="rounded-2xl border text-[15px] outline-none transition-all"
                style={{ fontFamily: f, height: 52, width: 264, paddingLeft: 20, paddingRight: 20,
                  background: C.soft, borderColor: C.borderLight, color: C.text, letterSpacing: "-0.01em" }}
                onFocus={e => { e.target.style.borderColor = C.accent; e.target.style.boxShadow = "0 0 0 3px rgba(249,115,22,0.12)"; }}
                onBlur={e => { e.target.style.borderColor = C.borderLight; e.target.style.boxShadow = "none"; }}
              />
              <button type="submit" disabled={pending}
                className="rounded-2xl text-[15px] font-semibold text-white transition-all hover:brightness-105 active:scale-[0.98] disabled:opacity-50"
                style={{ fontFamily: f, height: 52, paddingLeft: 28, paddingRight: 28,
                  background: "linear-gradient(180deg, #FA8232 0%, #F97316 100%)",
                  boxShadow: "0 1px 2px rgba(249,115,22,0.3), 0 4px 12px rgba(249,115,22,0.2)",
                  letterSpacing: "-0.01em", flexShrink: 0 }}>
                {pending ? "Joining…" : "Claim founding spot →"}
              </button>
            </form>
          )}
          {status === "dup" && <p className="mt-3 text-[13px]" style={{ fontFamily: f, color: C.muted }}>Already on the list.</p>}

          {count > 0 && status !== "ok" && (
            <p className="mt-5 text-[13px]" style={{ fontFamily: f, color: C.muted, letterSpacing: "-0.005em" }}>
              <span style={{ color: C.sub, fontWeight: 500 }}>{count.toLocaleString()}</span> founders already waiting
            </p>
          )}

          {/* Stats */}
          <div className="mt-20 grid w-full grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { n: "3 min",  l: "Average response", s: "vs hours without Rule8" },
              { n: "91%",   l: "Resolved on their own", s: "without your involvement" },
              { n: "$2.92", l: "All-in daily cost", s: "for all crews, all day" },
              { n: "0",     l: "Tickets in your inbox", s: "only decisions that need you" },
            ].map(({ n, l, s }) => (
              <div key={l} className="rounded-3xl border p-7 text-left"
                style={{ background: C.soft, borderColor: C.borderLight }}>
                <p style={{ fontFamily: f, fontWeight: 700, fontSize: 44,
                  color: C.accent, lineHeight: 1, letterSpacing: "-0.03em", marginBottom: 10 }}>{n}</p>
                <p style={{ fontFamily: f, fontWeight: 500, fontSize: 14, color: C.text, marginBottom: 4, letterSpacing: "-0.01em" }}>{l}</p>
                <p style={{ fontFamily: f, fontSize: 12, color: C.muted }}>{s}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── 3. PROBLEM ─────────────────────────────────────────────── */
function Problem() {
  return (
    <section style={{ background: C.soft }} className="py-32 px-6">
      <div className="mx-auto max-w-[1100px]">
        <p style={{ fontFamily: f, fontSize: 13, fontWeight: 500, textTransform: "uppercase",
          letterSpacing: "0.08em", color: C.accent, marginBottom: 20 }}>01 — The problem</p>
        <h2 style={{ fontFamily: f, fontWeight: 700, fontSize: "clamp(36px,4.5vw,60px)",
          lineHeight: 1.08, letterSpacing: "-0.03em", color: C.text, maxWidth: 720, marginBottom: 20 }}>
          You&apos;re doing two jobs.{" "}
          <span style={{ color: C.muted }}>You only signed up for one.</span>
        </h2>
        <p style={{ fontFamily: f, fontSize: 18, lineHeight: 1.7, color: C.muted,
          maxWidth: 560, marginBottom: 64, letterSpacing: "-0.01em" }}>
          Support tickets, billing disputes, community management — it all lands on your
          plate every day. Rule8 takes the second job off your hands.
        </p>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Without */}
          <div className="rounded-3xl border p-8" style={{ background: C.bg, borderColor: C.borderLight }}>
            <div className="mb-6 flex items-center justify-between">
              <span className="rounded-full px-3.5 py-1.5 text-[12px] font-semibold"
                style={{ background: "rgba(255,59,48,0.1)", color: C.red, fontFamily: f }}>
                Without Rule8
              </span>
              <span style={{ fontFamily: f, fontSize: 22, fontWeight: 700, color: C.muted }}>07:14 AM</span>
            </div>
            <ul className="space-y-5">
              {[
                "30 tickets, 4 billing disputes, 2 Discord fires — overnight.",
                "You context-switch 11 times before 11am clearing the queue.",
                "A customer waited 6 hours for a $49 refund that takes 90 seconds.",
                "Spam hit Discord at 3am. Nobody saw it until morning.",
                "Still triaging at midnight. Again.",
              ].map((t, i) => (
                <li key={i} className="flex items-start gap-3.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                    style={{ background: C.red }}>✕</span>
                  <span style={{ fontFamily: f, fontSize: 14, lineHeight: 1.6, color: C.sub, letterSpacing: "-0.005em" }}>{t}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* With */}
          <div className="relative rounded-3xl border p-8"
            style={{ background: C.bg, borderColor: "rgba(52,199,89,0.25)" }}>
            <div className="absolute -top-4 left-8 rounded-full px-4 py-1.5 text-[12px] font-semibold text-white"
              style={{ background: C.green, fontFamily: f }}>
              With Rule8
            </div>
            <div className="mb-6 flex items-center justify-end">
              <span className="flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[12px] font-medium"
                style={{ background: "rgba(52,199,89,0.1)", color: C.green, fontFamily: f }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: C.green }} />
                All crews running
              </span>
            </div>
            <ul className="space-y-5">
              {[
                "54 tasks handled overnight. 4 need your input — full context ready.",
                "That $49 refund? Issued in 2 min 47 sec. Customer already replied.",
                "Discord spam caught at 3:14am. User warned. Thread cleaned up.",
                "Morning is yours. For building.",
                "4 decisions in your queue. Everything else — done.",
              ].map((t, i) => (
                <li key={i} className="flex items-start gap-3.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                    style={{ background: C.green }}>✓</span>
                  <span style={{ fontFamily: f, fontSize: 14, lineHeight: 1.6, color: C.sub, letterSpacing: "-0.005em" }}>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── 4. HOW IT WORKS ─────────────────────────────────────────── */
function HowItWorks() {
  const steps = [
    { n:"01", title:"Something comes in", body:"A support ticket. A billing question. A message in Discord. Rule8 picks it up instantly — from any tool you've connected.", tag:"Automatic" },
    { n:"02", title:"It reads your context", body:"Your product description, refund policy, escalation rules, and the customer's full history. It knows exactly what it can handle on its own.", tag:"Smart" },
    { n:"03", title:"It takes real action", body:"Replies to the customer. Issues the refund. Moderates the message. On the actual platform. Not a note in a dashboard — real, sent actions.", tag:"Real outcomes" },
    { n:"04", title:"You see only what matters", body:"Anything that genuinely needs you arrives in your queue with the full picture already assembled. A 10-second decision, not a 20-minute investigation.", tag:"Your time protected" },
  ];

  return (
    <section id="how" style={{ background: C.bg }} className="py-32 px-6">
      <div className="mx-auto max-w-[1100px]">
        <p style={{ fontFamily: f, fontSize: 13, fontWeight: 500, textTransform: "uppercase",
          letterSpacing: "0.08em", color: C.accent, marginBottom: 20 }}>02 — How it works</p>
        <h2 style={{ fontFamily: f, fontWeight: 700, fontSize: "clamp(36px,4.5vw,60px)",
          lineHeight: 1.08, letterSpacing: "-0.03em", color: C.text, maxWidth: 680, marginBottom: 64 }}>
          A message comes in.{" "}
          <span style={{ color: C.muted }}>Here&apos;s what happens next.</span>
        </h2>

        <div className="grid gap-3 lg:grid-cols-2">
          {steps.map(({ n, title, body, tag }) => (
            <div key={n} className="rounded-3xl border p-8 transition-shadow hover:shadow-[0_4px_24px_rgba(0,0,0,0.06)]"
              style={{ background: C.soft, borderColor: C.borderLight }}>
              <div className="mb-5 flex items-start justify-between gap-4">
                <span style={{ fontFamily: f, fontWeight: 700, fontSize: 48,
                  color: C.accent, lineHeight: 1, letterSpacing: "-0.04em" }}>{n}</span>
                <span className="rounded-full px-3 py-1 text-[12px] font-medium"
                  style={{ background: C.accentBg, color: C.accent, fontFamily: f }}>{tag}</span>
              </div>
              <p style={{ fontFamily: f, fontWeight: 600, fontSize: 20,
                color: C.text, letterSpacing: "-0.02em", marginBottom: 10 }}>{title}</p>
              <p style={{ fontFamily: f, fontSize: 15, lineHeight: 1.7, color: C.muted, letterSpacing: "-0.005em" }}>{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── 5. FOR YOUR BUSINESS ────────────────────────────────────── */
function ForYourBusiness() {
  const verticals = [
    { icon:"💻", label:"SaaS / B2B",        crews:["Customer support & onboarding","Billing disputes & refunds","Product feedback"],   color:"#0071E3" },
    { icon:"📦", label:"E-commerce",         crews:["Order questions & shipping","Returns and refunds","Review management"],              color:"#34C759" },
    { icon:"🎨", label:"Creator / Community",crews:["Member support","Subscription & access issues","Community moderation"],             color:"#BF5AF2" },
    { icon:"💼", label:"Agency",             crews:["Client communications","Project billing","New business signals"],                   color:"#FF9F0A" },
    { icon:"🛒", label:"Marketplace",        crews:["Buyer & seller support","Payment disputes","Trust & safety"],                       color:"#FF2D55" },
    { icon:"⚡", label:"Your business",      crews:["You name your crews","We suggest based on your setup","Rename everything"],         color:C.accent  },
  ];

  return (
    <section id="business" style={{ background: C.soft }} className="py-32 px-6">
      <div className="mx-auto max-w-[1100px]">
        <p style={{ fontFamily: f, fontSize: 13, fontWeight: 500, textTransform: "uppercase",
          letterSpacing: "0.08em", color: C.accent, marginBottom: 20 }}>03 — For your business</p>
        <h2 style={{ fontFamily: f, fontWeight: 700, fontSize: "clamp(36px,4.5vw,60px)",
          lineHeight: 1.08, letterSpacing: "-0.03em", color: C.text, maxWidth: 680, marginBottom: 20 }}>
          Built around your business.{" "}
          <span style={{ color: C.muted }}>Not a generic template.</span>
        </h2>
        <p style={{ fontFamily: f, fontSize: 18, lineHeight: 1.7, color: C.muted,
          maxWidth: 540, marginBottom: 56, letterSpacing: "-0.01em" }}>
          You name your teams after your business. A real-estate founder has a &ldquo;Closing
          Coordinator,&rdquo; not a &ldquo;Finance Crew.&rdquo; Rule8 speaks your language.
        </p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {verticals.map(({ icon, label, crews, color }) => (
            <div key={label}
              className="rounded-3xl border p-6 transition-shadow hover:shadow-[0_4px_24px_rgba(0,0,0,0.06)]"
              style={{ background: C.bg, borderColor: C.borderLight }}>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl text-[22px]"
                  style={{ background: `${color}12` }}>{icon}</div>
                <p style={{ fontFamily: f, fontWeight: 600, fontSize: 15,
                  color: C.text, letterSpacing: "-0.01em" }}>{label}</p>
              </div>
              <ul className="space-y-2.5">
                {crews.map(c => (
                  <li key={c} className="flex items-center gap-2.5">
                    <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: color }} />
                    <span style={{ fontFamily: f, fontSize: 13, lineHeight: 1.5, color: C.muted,
                      letterSpacing: "-0.005em" }}>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── 6. INTEGRATIONS ─────────────────────────────────────────── */
function Integrations() {
  const tools = [
    { n:"Stripe",     c:"Billing",      i:"💳" },
    { n:"Intercom",   c:"Support",      i:"💬" },
    { n:"Discord",    c:"Community",    i:"🎮" },
    { n:"Slack",      c:"Community",    i:"⚡" },
    { n:"Help Scout", c:"Support",      i:"📮" },
    { n:"Zendesk",    c:"Support",      i:"🎧" },
    { n:"Linear",     c:"Engineering",  i:"🔧" },
    { n:"Notion",     c:"Knowledge",    i:"📝" },
    { n:"Resend",     c:"Email",        i:"📧" },
    { n:"GitHub",     c:"Engineering",  i:"🐙" },
    { n:"Twilio",     c:"SMS",          i:"📱" },
    { n:"PostHog",    c:"Analytics",    i:"📊" },
  ];

  return (
    <section id="integrations" style={{ background: C.bg }} className="py-32 px-6">
      <div className="mx-auto max-w-[1100px]">
        <p style={{ fontFamily: f, fontSize: 13, fontWeight: 500, textTransform: "uppercase",
          letterSpacing: "0.08em", color: C.accent, marginBottom: 20 }}>04 — Integrations</p>
        <h2 style={{ fontFamily: f, fontWeight: 700, fontSize: "clamp(36px,4.5vw,60px)",
          lineHeight: 1.08, letterSpacing: "-0.03em", color: C.text, maxWidth: 680, marginBottom: 20 }}>
          Your tools stay.{" "}
          <span style={{ color: C.muted }}>Rule8 works on top.</span>
        </h2>
        <p style={{ fontFamily: f, fontSize: 18, lineHeight: 1.7, color: C.muted,
          maxWidth: 520, marginBottom: 56, letterSpacing: "-0.01em" }}>
          Connect in minutes. No code, no rebuilding your stack. Rule8 reads from your tools,
          acts on them, and replies — on the platforms your customers are already on.
        </p>

        <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {tools.map(({ n, c, i }) => (
            <div key={n}
              className="flex items-center gap-3 rounded-2xl border px-4 py-3.5 transition-all cursor-default"
              style={{ background: C.soft, borderColor: C.borderLight }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.background = C.accentBg; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.borderLight; e.currentTarget.style.background = C.soft; }}>
              <span className="text-[22px]">{i}</span>
              <div>
                <p style={{ fontFamily: f, fontSize: 13, fontWeight: 600, color: C.text, letterSpacing: "-0.01em" }}>{n}</p>
                <p style={{ fontFamily: f, fontSize: 11, color: C.muted }}>{c}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center" style={{ fontFamily: f, fontSize: 14, color: C.muted }}>
          More added every week.{" "}
          <Link href="/waitlist"
            style={{ color: C.accent, textDecoration: "underline", textUnderlineOffset: 3, letterSpacing: "-0.005em" }}>
            Request yours →
          </Link>
        </p>
      </div>
    </section>
  );
}

/* ── 7. NOT A CHATBOT ────────────────────────────────────────── */
function NotAChatbot() {
  return (
    <section style={{ background: C.dark }} className="py-32 px-6">
      <div className="mx-auto max-w-[1100px]">
        <h2 style={{ fontFamily: f, fontWeight: 700, fontSize: "clamp(36px,4.5vw,60px)",
          lineHeight: 1.08, letterSpacing: "-0.03em", color: "#F5F5F7", marginBottom: 20 }}>
          Not a chatbot.{" "}
          <span style={{ color: C.accent }}>An operator.</span>
        </h2>
        <p style={{ fontFamily: f, fontSize: 18, lineHeight: 1.7,
          color: "rgba(245,245,247,0.5)", maxWidth: 560, marginBottom: 56, letterSpacing: "-0.01em" }}>
          Most AI tools tell you what happened. Rule8 handles it.
        </p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label:"Real actions taken", body:"Replies sent to Intercom. Refunds issued on Stripe. Discord posts moderated. Not suggestions — done.", emoji:"⚡" },
            { label:"Your tools stay", body:"Intercom stays. Stripe stays. Discord stays. Rule8 orchestrates on top of everything you already use.", emoji:"🔗" },
            { label:"Not seat-based", body:"You're one founder. You pay for tasks completed — not for seats, users, or team members.", emoji:"🎯" },
            { label:"Always on", body:"Your customers don't wait for business hours. Neither does Rule8. 3am Discord fire? Handled.", emoji:"🌙" },
          ].map(({ label, body, emoji }) => (
            <div key={label} className="rounded-3xl border p-6"
              style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.08)" }}>
              <span className="mb-4 block text-[28px]">{emoji}</span>
              <p style={{ fontFamily: f, fontWeight: 600, fontSize: 16,
                color: "#F5F5F7", marginBottom: 10, letterSpacing: "-0.015em" }}>{label}</p>
              <p style={{ fontFamily: f, fontSize: 13, lineHeight: 1.65,
                color: "rgba(245,245,247,0.45)", letterSpacing: "-0.005em" }}>{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── 8. FINAL CTA ────────────────────────────────────────────── */
function FinalCTA() {
  const join = useMutation(api.waitlist.joinWaitlist);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle"|"ok"|"dup"|"err">("idle");
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      try {
        const r = await join({ email: email.trim().toLowerCase(), source: "cta" });
        setStatus(r.status === "already_registered" ? "dup" : "ok");
      } catch { setStatus("err"); }
    });
  }

  return (
    <section style={{ background: C.soft }} className="py-36 px-6">
      <div className="relative mx-auto max-w-[760px] overflow-hidden rounded-[40px] border p-16 text-center"
        style={{ background: C.bg, borderColor: C.borderLight,
          boxShadow: "0 2px 0 rgba(255,255,255,0.8) inset, 0 24px 80px rgba(0,0,0,0.06)" }}>
        {/* Subtle glow */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-64"
          style={{ background: "radial-gradient(ellipse 60% 50% at 50% 120%, rgba(249,115,22,0.08) 0%, transparent 70%)" }} />

        <div className="relative">
          <p style={{ fontFamily: f, fontSize: 13, fontWeight: 500, textTransform: "uppercase",
            letterSpacing: "0.08em", color: C.accent, marginBottom: 20 }}>Early access</p>

          <h2 style={{ fontFamily: f, fontWeight: 700, fontSize: "clamp(38px,5vw,64px)",
            lineHeight: 1.06, letterSpacing: "-0.035em", color: C.text, marginBottom: 20 }}>
            Your ops team is ready.{" "}
            <span style={{ color: C.muted }}>Are you?</span>
          </h2>

          <p style={{ fontFamily: f, fontSize: 17, lineHeight: 1.7, color: C.muted,
            maxWidth: 480, margin: "0 auto 40px", letterSpacing: "-0.01em" }}>
            1-on-1 setup call. Crew configuration together. Pricing locked for life.
            Most founders see their first task resolved within 15 minutes of going live.
          </p>

          {status === "ok" ? (
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full text-2xl text-white"
                style={{ background: C.green }}>✓</div>
              <p style={{ fontFamily: f, fontWeight: 600, fontSize: 17, color: C.text }}>You&apos;re on the list.</p>
              <p style={{ fontFamily: f, fontSize: 14, color: C.muted }}>We&apos;ll reach out within 24 hours.</p>
            </div>
          ) : (
            <form onSubmit={submit} className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="rounded-2xl border text-[15px] outline-none transition-all"
                style={{ fontFamily: f, height: 52, width: 256, paddingLeft: 20, paddingRight: 20,
                  background: C.soft, borderColor: C.borderLight, color: C.text }}
                onFocus={e => { e.target.style.borderColor = C.accent; e.target.style.boxShadow = "0 0 0 3px rgba(249,115,22,0.12)"; }}
                onBlur={e => { e.target.style.borderColor = C.borderLight; e.target.style.boxShadow = "none"; }}
              />
              <button type="submit" disabled={pending}
                className="rounded-2xl text-[15px] font-semibold text-white transition-all hover:brightness-105 active:scale-[0.98] disabled:opacity-50"
                style={{ fontFamily: f, height: 52, paddingLeft: 28, paddingRight: 28,
                  background: "linear-gradient(180deg, #FA8232 0%, #F97316 100%)",
                  boxShadow: "0 1px 2px rgba(249,115,22,0.3), 0 4px 12px rgba(249,115,22,0.2)",
                  flexShrink: 0 }}>
                {pending ? "Joining…" : "Request access →"}
              </button>
            </form>
          )}
          {status === "dup" && <p className="mt-3 text-[13px]" style={{ fontFamily: f, color: C.muted }}>Already on the list — we&apos;ll be in touch.</p>}

          <p className="mt-8 text-[12px] uppercase tracking-widest"
            style={{ fontFamily: f, color: C.muted }}>
            No credit card · No commitment · Reply within 24h
          </p>
        </div>
      </div>
    </section>
  );
}

/* ── 9. FOOTER ───────────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="px-6 py-10" style={{ background: C.soft, borderTop: `1px solid ${C.borderLight}` }}>
      <div className="mx-auto flex max-w-[1100px] flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-[8px] text-[12px] font-black text-white"
            style={{ background: C.accent }}>8</span>
          <span style={{ fontFamily: f, fontWeight: 600, fontSize: 15, color: C.text, letterSpacing: "-0.01em" }}>Rule8</span>
          <span style={{ fontFamily: f, fontSize: 13, color: C.muted, marginLeft: 4 }}>Operational co-founder</span>
        </div>
        <div className="flex flex-wrap gap-6">
          {[["#how","How it works"],["#business","Your business"],["#integrations","Integrations"],["/waitlist","Waitlist"]].map(([h,l]) => (
            <a key={h} href={h} className="text-[13px] transition-opacity hover:opacity-50"
              style={{ fontFamily: f, color: C.muted, letterSpacing: "-0.005em" }}>{l}</a>
          ))}
        </div>
        <p style={{ fontFamily: f, fontSize: 12, color: C.muted }}>© 2026 Rule8</p>
      </div>
    </footer>
  );
}

/* ── PAGE ────────────────────────────────────────────────────── */
export function LandingPage() {
  return (
    <div style={{ background: C.bg, color: C.text }}>
      <Nav />
      <Hero />
      <Problem />
      <HowItWorks />
      <ForYourBusiness />
      <Integrations />
      <NotAChatbot />
      <FinalCTA />
      <Footer />
    </div>
  );
}
