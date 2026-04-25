"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { startTransition, useState } from "react";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ROUTES, normalizeRedirectTarget } from "@/lib/routes";

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

  const alternateHref = isSignUp ? ROUTES.signIn : ROUTES.signUp;
  const alternateLabel = isSignUp ? "Already have credentials?" : "Need an account?";
  const alternateCta = isSignUp ? "Sign in" : "Create one";
  const redirectTo = normalizeRedirectTarget(searchParams.get("redirectTo"));

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
        <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          {isSignUp ? "Create Founder Access" : "Founder Login"}
        </p>
        <h2 className="text-[34px] font-semibold tracking-[-0.05em] text-foreground">
          {isSignUp ? "Create your Rule8 account" : "Sign in to Rule8"}
        </h2>
        <p className="mt-4 text-[15px] leading-8 text-muted-foreground">
          {isSignUp
            ? "Use a local email and password for the Sprint 1 dashboard build."
            : "Use the credentials you created during sign-up."}
        </p>
      </div>

      <form className="space-y-5" onSubmit={onSubmit}>
        {isSignUp && (
          <Field
            autoComplete="name"
            label="Founder Name"
            onChange={setName}
            placeholder="Tejas"
            type="text"
            value={name}
          />
        )}
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

        {error && (
          <p className="rounded-[20px] border border-[rgba(216,95,75,0.24)] bg-[rgba(216,95,75,0.08)] px-4 py-3 text-sm text-red">
            {error}
          </p>
        )}

        <Button
          className="h-12 w-full rounded-full px-4 font-mono text-[12px] font-semibold uppercase tracking-[0.16em] text-black disabled:cursor-not-allowed disabled:opacity-60"
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
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted-foreground">
        {alternateLabel}{" "}
        <Link
          className="font-medium text-gold transition hover:text-gold-l"
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
      <span className="mb-2.5 block font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </span>
      <Input
        autoComplete={autoComplete}
        className="h-12 w-full rounded-[20px] border-b2 bg-popover px-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-gold-a12 focus-visible:border-gold"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required
        type={type}
        value={value}
      />
    </label>
  );
}
