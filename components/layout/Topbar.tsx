"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, LogOut, Settings, ShieldCheck, UserRound } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { isActiveNavPath, ROUTES } from "@/lib/routes";

const NAV_ITEMS = [
  { href: "/dashboard",              label: "OVERVIEW",     exact: true },
  { href: "/dashboard/escalations",  label: "ESCALATIONS",  exact: false },
  { href: "/dashboard/integrations", label: "INTEGRATIONS", exact: false },
  { href: "/dashboard/prompts",      label: "PROMPTS",      exact: false },
];

export function Topbar() {
  const pathname = usePathname();

  return (
    <header
      className="flex h-14 shrink-0 items-center border-b px-5"
      style={{ borderColor: "var(--color-border)", background: "var(--color-bg)" }}
    >
      {/* Left: logo + title + subtitle */}
      <div className="flex items-center gap-3 w-[260px] shrink-0">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold text-white text-[18px]"
          style={{ background: "var(--color-accent-orange)" }}
        >
          8
        </div>
        <div>
          <p className="text-[14px] font-bold leading-none" style={{ color: "var(--color-t1)" }}>
            Rule8 Control Room
          </p>
          <p
            className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] leading-none"
            style={{ color: "var(--color-t3)" }}
          >
            Founder-Facing Agent Operations
          </p>
        </div>
      </div>

      {/* Center: pill nav tabs */}
      <div className="flex flex-1 items-center justify-center gap-1">
        {NAV_ITEMS.map((item) => {
          const active = isActiveNavPath(pathname, item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full border px-4 py-1.5 text-[12px] font-medium transition-colors"
              style={{
                borderColor: active ? "#1a1a1a" : "var(--color-border)",
                background: active ? "#1a1a1a" : "var(--color-bg)",
                color: active ? "#ffffff" : "var(--color-t2)",
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* Right: health status + avatar */}
      <div className="flex items-center gap-3 w-[260px] shrink-0 justify-end overflow-hidden">
        <div className="hidden sm:flex items-center gap-1.5 shrink-0">
          <span className="live-dot" />
          <span className="whitespace-nowrap text-[11px]" style={{ color: "var(--color-t2)" }}>
            All crews healthy
          </span>
        </div>
        <span
          className="hidden lg:block whitespace-nowrap truncate text-[9px] font-semibold uppercase tracking-[0.10em]"
          style={{ color: "var(--color-t3)", maxWidth: "96px" }}
        >
          Founder Mode
        </span>
        <ProfileDropdown />
      </div>
    </header>
  );
}

function ProfileDropdown() {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { data: session } = authClient.useSession();

  const userName = session?.user?.name || "Founder";
  const userEmail = session?.user?.email || "Signed in";
  const initials = userName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "TX";

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  function signOut() {
    startTransition(async () => {
      await authClient.signOut();
      setOpen(false);
      router.replace(ROUTES.signIn);
      router.refresh();
    });
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="group flex h-10 items-center gap-2 rounded-full border bg-white/74 py-1 pl-1 pr-2 shadow-[0_10px_24px_rgba(28,39,49,0.05)] transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(28,39,49,0.09)]"
        style={{ borderColor: open ? "rgba(249,115,22,0.34)" : "var(--color-border)" }}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-accent-orange)] font-mono text-[10px] font-semibold text-white">
          {initials}
        </span>
        <span className="hidden min-w-0 text-left lg:block">
          <span className="block max-w-[84px] truncate text-[12px] font-semibold leading-none text-[var(--color-t1)]">
            {userName}
          </span>
          <span className="mt-1 block font-mono text-[8px] uppercase tracking-[0.12em] text-[var(--color-t3)]">
            Profile
          </span>
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-[var(--color-t3)] transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+10px)] z-50 w-[286px] overflow-hidden rounded-[28px] border border-border/70 bg-[#fffdf8] shadow-[0_24px_80px_rgba(28,39,49,0.18)]"
        >
          <div className="relative border-b border-border/70 px-4 py-4">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-[linear-gradient(135deg,rgba(249,115,22,0.16),rgba(20,184,166,0.10))]" />
            <div className="relative flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-orange)] font-mono text-[12px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.30)]">
                {initials}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold tracking-[-0.02em] text-[var(--color-t1)]">
                  {userName}
                </p>
                <p className="mt-1 truncate text-[12px] text-[var(--color-t3)]">{userEmail}</p>
              </div>
            </div>
          </div>

          <div className="space-y-1 p-2">
            <MenuItem
              icon={<UserRound className="h-4 w-4" />}
              label="Account profile"
              detail="Founder identity"
              onClick={() => setOpen(false)}
            />
            <MenuItem
              icon={<ShieldCheck className="h-4 w-4" />}
              label="Workspace health"
              detail="All crews healthy"
              onClick={() => setOpen(false)}
            />
            <MenuItem
              icon={<Settings className="h-4 w-4" />}
              label="Settings"
              detail="Coming soon"
              onClick={() => setOpen(false)}
            />
          </div>

          <div className="border-t border-border/70 p-2">
            <button
              type="button"
              role="menuitem"
              onClick={signOut}
              disabled={isPending}
              className="flex w-full items-center gap-3 rounded-[18px] px-3 py-3 text-left text-[13px] font-semibold text-[var(--color-accent-orange)] transition-colors hover:bg-[rgba(249,115,22,0.08)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(249,115,22,0.10)]">
                <LogOut className="h-4 w-4" />
              </span>
              {isPending ? "Signing out..." : "Sign out"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  detail,
  icon,
  label,
  onClick,
}: {
  detail: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-[18px] px-3 py-3 text-left transition-colors hover:bg-white hover:shadow-[0_10px_26px_rgba(28,39,49,0.05)]"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-bg-secondary)] text-[var(--color-t2)]">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-semibold text-[var(--color-t1)]">{label}</span>
        <span className="mt-0.5 block text-[11px] text-[var(--color-t3)]">{detail}</span>
      </span>
    </button>
  );
}
