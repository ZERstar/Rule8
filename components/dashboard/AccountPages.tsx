"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Bell, Check, MonitorCog, ShieldCheck, SlidersHorizontal, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { SecondaryPageShell } from "@/components/dashboard/SecondaryPageShell";
import { authClient } from "@/lib/auth-client";
import { ROUTES } from "@/lib/routes";

function initialsFor(name?: string | null) {
  return (
    name
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "TX"
  );
}

function SettingRow({
  description,
  enabled = true,
  icon,
  label,
}: {
  description: string;
  enabled?: boolean;
  icon: ReactNode;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[24px] border border-border/70 bg-white/74 px-4 py-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-bg-secondary)] text-[var(--color-t2)]">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-foreground">{label}</p>
          <p className="mt-1 text-[12px] leading-5 text-muted-foreground">{description}</p>
        </div>
      </div>
      <span
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
          enabled ? "bg-[var(--color-accent-orange)]" : "bg-[var(--color-bg-secondary)]"
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
            enabled ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </span>
    </div>
  );
}

export function ProfilePage() {
  const { data: session } = authClient.useSession();
  const userName = session?.user?.name || "Founder";
  const userEmail = session?.user?.email || "Signed in";
  const initials = initialsFor(userName);

  return (
    <SecondaryPageShell contentClassName="max-w-[1180px]">
      <PageHeader
        eyebrow="· Profile"
        title="Founder profile"
        description="Identity, access posture, and workspace context for the operator account."
        action={
          <Link className="rounded-full border border-border bg-white px-4 py-2 text-[12px] font-semibold" href={ROUTES.dashboardSettings}>
            Open settings
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.78fr)_minmax(360px,0.42fr)]">
        <Card className="bg-card">
          <CardContent className="p-6">
            <div className="relative overflow-hidden rounded-[32px] border border-border/70 bg-[#fff8ef] px-6 py-8">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[linear-gradient(135deg,rgba(249,115,22,0.18),rgba(20,184,166,0.12),transparent)]" />
              <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                <div className="flex items-center gap-4">
                  <span className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--color-accent-orange)] font-mono text-[20px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.34)]">
                    {initials}
                  </span>
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Operator</p>
                    <h2 className="mt-2 text-[34px] font-semibold tracking-[-0.06em] text-foreground">{userName}</h2>
                    <p className="mt-2 text-[13px] text-muted-foreground">{userEmail}</p>
                  </div>
                </div>
                <Badge variant="outline" className="w-fit rounded-full border-transparent bg-white/78 px-4 py-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--color-accent-green)]">
                  Founder mode active
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="border-b border-border/70">
            <CardTitle>Access status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              ["Session", "Authenticated"],
              ["Role", "Founder"],
              ["Workspace", "Rule8 Control Room"],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between rounded-[20px] bg-white/70 px-4 py-3">
                <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
                <span className="text-[13px] font-semibold text-foreground">{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </SecondaryPageShell>
  );
}

export function SettingsPage() {
  return (
    <SecondaryPageShell contentClassName="max-w-[1180px]">
      <PageHeader
        eyebrow="· Settings"
        title="Workspace settings"
        description="Profile-adjacent controls for notifications, command behavior, and dashboard visibility."
        action={
          <Link className="rounded-full border border-border bg-white px-4 py-2 text-[12px] font-semibold" href={ROUTES.dashboardProfile}>
            View profile
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.72fr)_minmax(360px,0.42fr)]">
        <Card className="bg-card">
          <CardHeader className="border-b border-border/70">
            <CardTitle>Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <SettingRow
              icon={<Bell className="h-4 w-4" />}
              label="Escalation notifications"
              description="Surface urgent agent escalations in the executive panel."
            />
            <SettingRow
              icon={<MonitorCog className="h-4 w-4" />}
              label="Compact dashboard mode"
              description="Keep chamber controls dense for high-frequency operations."
              enabled={false}
            />
            <SettingRow
              icon={<SlidersHorizontal className="h-4 w-4" />}
              label="Command suggestions"
              description="Show clarify, notify, and route shortcuts in the profile workflow."
            />
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="border-b border-border/70">
            <CardTitle>System posture</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { icon: <ShieldCheck className="h-4 w-4" />, label: "Auth guard active" },
              { icon: <UserRound className="h-4 w-4" />, label: "Founder account scoped" },
              { icon: <Check className="h-4 w-4" />, label: "Dashboard routes healthy" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 rounded-[22px] border border-border/70 bg-white/74 px-4 py-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(34,197,94,0.10)] text-[var(--color-accent-green)]">
                  {item.icon}
                </span>
                <span className="text-[13px] font-semibold text-foreground">{item.label}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </SecondaryPageShell>
  );
}
