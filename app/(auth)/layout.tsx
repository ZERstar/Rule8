import type { PropsWithChildren } from "react";

import { isAuthenticated } from "@/lib/auth-server";
import { ROUTES } from "@/lib/routes";
import { redirect } from "next/navigation";

export default async function AuthLayout({ children }: PropsWithChildren) {
  if (await isAuthenticated()) {
    redirect(ROUTES.dashboardOverview);
  }

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground md:px-8">
      <div className="page-frame flex min-h-[calc(100vh-5rem)] items-center justify-center">
        <div className="grid w-full max-w-5xl overflow-hidden rounded-[36px] border border-border/80 bg-[rgba(255,250,243,0.72)] shadow-[0_28px_90px_rgba(28,39,49,0.14)] backdrop-blur-[18px] lg:grid-cols-[1.08fr_0.92fr]">
          <section className="relative overflow-hidden border-b border-border/70 bg-[linear-gradient(160deg,rgba(242,118,61,0.16),rgba(77,124,240,0.08)_52%,rgba(255,255,255,0.16)_100%)] p-8 lg:border-b-0 lg:border-r lg:p-12">
            <div className="pointer-events-none absolute right-0 top-0 h-40 w-40 rounded-full bg-[rgba(255,178,122,0.28)] blur-3xl" />
            <div className="pointer-events-none absolute bottom-0 left-0 h-40 w-40 rounded-full bg-[rgba(77,124,240,0.16)] blur-3xl" />
            <div className="relative">
              <div className="mb-10 flex h-14 w-14 items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,#ffbf91_0%,#f2763d_100%)] font-mono text-lg font-semibold text-black shadow-[0_16px_28px_rgba(242,118,61,0.22)]">
                8
              </div>
              <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--color-gold)]">
                Rule8 access
              </p>
              <h1 className="mb-5 max-w-md text-[48px] font-semibold leading-[0.98] tracking-[-0.06em] text-[var(--color-t1)]">
                Enter the founder command layer.
              </h1>
              <p className="max-w-md text-[15px] leading-8 text-[var(--color-t2)]">
                Sign in to manage crews, adjust prompts, inspect traces, and supervise automations from a single operational surface.
              </p>
              <div className="mt-10 grid gap-3 sm:grid-cols-3">
                {[
                  { label: "Crews", value: "3" },
                  { label: "Core pages", value: "4" },
                  { label: "Command mode", value: "Live" },
                ].map((item) => (
                  <div key={item.label} className="rounded-[24px] border border-white/70 bg-white/68 px-4 py-4 shadow-[0_14px_30px_rgba(28,39,49,0.06)]">
                    <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">{item.label}</p>
                    <p className="mt-3 text-[26px] font-semibold leading-none tracking-[-0.05em] text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
          <section className="bg-white/52 p-6 sm:p-8 lg:p-12">
            {children}
          </section>
        </div>
      </div>
    </main>
  );
}
