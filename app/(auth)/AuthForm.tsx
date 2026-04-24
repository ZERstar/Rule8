"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { startTransition, useState } from "react";

import { authClient } from "@/lib/auth-client";

type AuthMode = "sign-in" | "sign-up";

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSignUp = mode === "sign-up";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const alternateHref = isSignUp ? "/sign-in" : "/sign-up";
  const alternateLabel = isSignUp ? "Already have credentials?" : "Need an account?";
  const alternateCta = isSignUp ? "Sign in" : "Create one";
  const redirectTo = searchParams.get("redirectTo") || "/dashboard";

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
          setError(signUpResult.error.message ?? "Unable to create account.");
          return;
        }

        const signInResult = await authClient.signIn.email({
          email,
          password,
        });

        if (signInResult.error) {
          setError(signInResult.error.message ?? "Account created, but sign-in failed.");
          return;
        }
      } else {
        const signInResult = await authClient.signIn.email({
          email,
          password,
        });

        if (signInResult.error) {
          setError(signInResult.error.message ?? "Invalid email or password.");
          return;
        }
      }

      startTransition(() => {
        router.replace(redirectTo);
        router.refresh();
      });
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Authentication request failed.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-8">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--color-t3)]">
          {isSignUp ? "Create Founder Access" : "Founder Login"}
        </p>
        <h2 className="text-2xl font-semibold tracking-[-0.02em] text-[var(--color-t1)]">
          {isSignUp ? "Create your Rule8 account" : "Sign in to Rule8"}
        </h2>
        <p className="mt-3 text-sm leading-7 text-[var(--color-t2)]">
          {isSignUp
            ? "Use a local email and password for the Sprint 1 dashboard build."
            : "Use the credentials you created during sign-up."}
        </p>
      </div>

      <form className="space-y-5" onSubmit={onSubmit}>
        {isSignUp ? (
          <Field
            autoComplete="name"
            label="Founder Name"
            onChange={setName}
            placeholder="Tejas"
            type="text"
            value={name}
          />
        ) : null}
        <Field
          autoComplete="email"
          label="Email"
          onChange={setEmail}
          placeholder="founder@rule8.dev"
          type="email"
          value={email}
        />
        <Field
          autoComplete={isSignUp ? "new-password" : "current-password"}
          label="Password"
          onChange={setPassword}
          placeholder="Minimum 8 characters"
          type="password"
          value={password}
        />

        {error ? (
          <p className="rounded-[10px] border border-[rgba(239,68,68,0.24)] bg-[rgba(239,68,68,0.08)] px-4 py-3 text-sm text-[var(--color-red)]">
            {error}
          </p>
        ) : null}

        <button
          className="inline-flex h-12 w-full items-center justify-center rounded-[10px] bg-[var(--color-gold)] px-4 font-mono text-[12px] font-semibold uppercase tracking-[0.12em] text-black transition hover:bg-[var(--color-gold-l)] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting
            ? isSignUp
              ? "Creating account..."
              : "Signing in..."
            : isSignUp
              ? "Create account"
              : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-sm text-[var(--color-t2)]">
        {alternateLabel}{" "}
        <Link
          className="font-medium text-[var(--color-gold)] transition hover:text-[var(--color-gold-l)]"
          href={alternateHref}
        >
          {alternateCta}
        </Link>
      </p>
    </div>
  );
}

function Field({
  autoComplete,
  label,
  onChange,
  placeholder,
  type,
  value,
}: {
  autoComplete: string;
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  type: string;
  value: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--color-t3)]">
        {label}
      </span>
      <input
        autoComplete={autoComplete}
        className="h-12 w-full rounded-[10px] border border-[var(--color-b2)] bg-[var(--color-s2)] px-4 text-sm text-[var(--color-t1)] outline-none transition placeholder:text-[var(--color-t3)] focus:border-[var(--color-gold)] focus:ring-2 focus:ring-[var(--color-gold-a12)]"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required
        type={type}
        value={value}
      />
    </label>
  );
}
