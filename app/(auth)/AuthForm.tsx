"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { ROUTES, normalizeRedirectTarget } from "@/lib/routes";

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type: string;
  placeholder: string;
  autoComplete: string;
}

function Field({ label, value, onChange, type, placeholder, autoComplete }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-t2)]">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
        className="h-10 w-full rounded-lg border border-[var(--color-b2)] bg-[var(--color-surface-2)] px-3 text-[13px] text-[var(--color-t1)] placeholder:text-[var(--color-t4)] outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[rgba(61,110,255,0.15)]"
      />
    </label>
  );
}

interface AuthFormProps {
  mode: "sign-in" | "sign-up";
}

export function AuthForm({ mode }: AuthFormProps) {
  const isSignUp = mode === "sign-up";
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectTo = normalizeRedirectTarget(searchParams.get("redirectTo"));

  const alternateLabel = isSignUp ? "Already have an account?" : "Don't have an account?";
  const alternatePath = isSignUp ? ROUTES.signIn : ROUTES.signUp;
  const alternateHref =
    redirectTo === ROUTES.dashboardOverview
      ? alternatePath
      : `${alternatePath}?redirectTo=${encodeURIComponent(redirectTo)}`;
  const alternateCta = isSignUp ? "Sign in" : "Create one";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (isSignUp) {
        const signUpResult = await authClient.signUp.email({
          email,
          password,
          name,
        });
        if (signUpResult.error) {
          setError(signUpResult.error.message ?? "Sign up failed. Please try again.");
          return;
        }
        // After sign-up, sign in automatically
        const signInResult = await authClient.signIn.email({ email, password });
        if (signInResult.error) {
          setError(signInResult.error.message ?? "Sign in failed. Please try again.");
          return;
        }
      } else {
        const result = await authClient.signIn.email({ email, password });
        if (result.error) {
          setError(result.error.message ?? "Sign in failed. Check your credentials.");
          return;
        }
      }

      startTransition(() => {
        router.replace(redirectTo);
        router.refresh();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-[360px]">
      {/* Header */}
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#c2410c]">
        {isSignUp ? "Create access" : "Founder login"}
      </p>
      <h2
        className="mt-2 text-[28px] font-semibold tracking-[-0.03em] text-foreground"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {isSignUp ? "Create your account" : "Sign in to Rule8"}
      </h2>
      <p className="mt-2 text-[13px] text-[var(--color-t2)]">
        {isSignUp ? "Set up your founder credentials." : "Enter your credentials to continue."}
      </p>

      {/* Form */}
      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        {isSignUp && (
          <Field
            label="Name"
            value={name}
            onChange={setName}
            type="text"
            placeholder="Your name"
            autoComplete="name"
          />
        )}
        <Field
          label="Email"
          value={email}
          onChange={setEmail}
          type="email"
          placeholder="you@company.com"
          autoComplete="email"
        />
        <Field
          label="Password"
          value={password}
          onChange={setPassword}
          type="password"
          placeholder="Min. 8 characters"
          autoComplete={isSignUp ? "new-password" : "current-password"}
        />

        {error && (
          <p className="rounded-lg border border-[rgba(248,113,113,0.25)] bg-[rgba(248,113,113,0.08)] px-3 py-2.5 text-[13px] text-[var(--color-red)]">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting || isPending}
          className="mt-1 h-12 w-full rounded-lg bg-[#ea580c] font-mono text-[12px] font-bold uppercase tracking-[0.14em] text-white shadow-[0_14px_30px_rgba(234,88,12,0.24)] transition hover:bg-[#c2410c] focus:outline-none focus:ring-2 focus:ring-[#fed7aa] focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[#d6d3d1] disabled:text-[#57534e] disabled:shadow-none"
        >
          {isSubmitting || isPending
            ? "..."
            : isSignUp
              ? "Create account"
              : "Sign in"}
        </button>
      </form>

      <p className="mt-5 text-[13px] text-[#57534e]">
        {alternateLabel}{" "}
        <Link
          href={alternateHref}
          className="font-semibold text-[#c2410c] underline underline-offset-4 hover:text-[#9a3412]"
        >
          {alternateCta}
        </Link>
      </p>
    </div>
  );
}
