import type { PropsWithChildren } from "react";

import { isAuthenticated } from "@/lib/auth-server";
import { redirect } from "next/navigation";

export default async function AuthLayout({ children }: PropsWithChildren) {
  if (await isAuthenticated()) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-[var(--color-bg)] px-6 py-10 text-[var(--color-t1)]">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-5xl items-center justify-center">
        <div className="grid w-full max-w-4xl overflow-hidden rounded-[20px] border border-[var(--color-b1)] bg-[var(--color-s1)] shadow-[0_30px_90px_rgba(0,0,0,0.35)] lg:grid-cols-[1.1fr_0.9fr]">
          <section className="border-b border-[var(--color-b1)] bg-[linear-gradient(160deg,rgba(200,151,42,0.14),rgba(200,151,42,0.03)_48%,transparent_100%)] p-8 lg:border-b-0 lg:border-r lg:p-10">
            <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-[12px] bg-[var(--color-gold)] font-mono text-lg font-semibold text-black">
              8
            </div>
            <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-gold)]">
              Rule8 Access
            </p>
            <h1 className="mb-4 max-w-sm text-4xl font-semibold leading-tight tracking-[-0.03em] text-[var(--color-t1)]">
              Sign in to the command layer.
            </h1>
            <p className="max-w-md text-sm leading-7 text-[var(--color-t2)]">
              Founders connect support, billing, and community workflows here. Authentication is local-first for now and uses Convex-backed email and password credentials.
            </p>
          </section>
          <section className="p-6 sm:p-8 lg:p-10">{children}</section>
        </div>
      </div>
    </main>
  );
}
