export const ROUTES = {
  home: "/",
  onboarding: "/onboarding",
  onboardingChat: "/onboarding/chat",
  onboardingReview: "/onboarding/review",
  onboardingConnect: "/onboarding/connect",
  onboardingRun: "/onboarding/run",
  onboardingDone: "/onboarding/done",
  dashboardOverview: "/dashboard",
  dashboardActivity: "/dashboard/activity",
  dashboardEvals: "/dashboard/evals",
  dashboardEscalations: "/dashboard/escalations",
  dashboardIntegrations: "/dashboard/integrations",
  dashboardInvoices: "/dashboard/invoices",
  dashboardProductContext: "/dashboard/product-context",
  dashboardProfile: "/dashboard/profile",
  dashboardPrompts: "/dashboard/prompts",
  dashboardSettings: "/dashboard/settings",
  dashboardTask: (id: string) => `/dashboard/tasks/${id}` as const,
  dashboardTickets: "/dashboard/tickets",
  legacyEscalations: "/escalations",
  legacyIntegrations: "/integrations",
  legacyPrompts: "/prompts",
  signIn: "/sign-in",
  signUp: "/sign-up",
  waitlist: "/waitlist",
  landing: "/",
} as const;

export const DASHBOARD_NAV: ReadonlyArray<{
  href: string;
  label: string;
  exact?: boolean;
  section: "main" | "ops" | "data" | "account";
}> = [
  { href: ROUTES.dashboardOverview,     label: "Overview",      exact: true, section: "main" },
  { href: ROUTES.dashboardEscalations,  label: "Escalations",               section: "main" },
  { href: ROUTES.dashboardIntegrations, label: "Integrations",              section: "ops"  },
  { href: ROUTES.dashboardPrompts,      label: "Prompts",                   section: "ops"  },
  { href: ROUTES.dashboardProductContext, label: "Product Context",         section: "ops"  },
  { href: ROUTES.dashboardActivity,     label: "Activity",                  section: "data" },
  { href: ROUTES.dashboardEvals,        label: "Evals",                     section: "data" },
  { href: ROUTES.dashboardInvoices,     label: "Invoices",                  section: "data" },
  { href: ROUTES.dashboardTickets,      label: "Tickets",                   section: "data" },
  { href: ROUTES.dashboardProfile,      label: "Profile",                   section: "account" },
  { href: ROUTES.dashboardSettings,     label: "Settings",                  section: "account" },
] as const;

export function normalizeRedirectTarget(target: string | null | undefined) {
  if (!target || !target.startsWith("/") || target.startsWith("//")) {
    return ROUTES.dashboardOverview;
  }

  if (target === ROUTES.legacyEscalations) return ROUTES.dashboardEscalations;
  if (target === ROUTES.legacyIntegrations) return ROUTES.dashboardIntegrations;
  if (target === ROUTES.legacyPrompts) return ROUTES.dashboardPrompts;

  if (
    target.startsWith("/api") ||
    target === ROUTES.signIn ||
    target === ROUTES.signUp
  ) {
    return ROUTES.dashboardOverview;
  }

  return target;
}

export function isActiveNavPath(
  pathname: string,
  href: string,
  exact = false,
) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
