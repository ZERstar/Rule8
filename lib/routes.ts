export const ROUTES = {
  home: "/",
  dashboardOverview: "/dashboard",
  dashboardActivity: "/dashboard/activity",
  dashboardEvals: "/dashboard/evals",
  dashboardEscalations: "/dashboard/escalations",
  dashboardIntegrations: "/dashboard/integrations",
  dashboardInvoices: "/dashboard/invoices",
  dashboardProfile: "/dashboard/profile",
  dashboardPrompts: "/dashboard/prompts",
  dashboardSettings: "/dashboard/settings",
  dashboardTickets: "/dashboard/tickets",
  legacyEscalations: "/escalations",
  legacyIntegrations: "/integrations",
  legacyPrompts: "/prompts",
  signIn: "/sign-in",
  signUp: "/sign-up",
} as const;

export const DASHBOARD_NAV: ReadonlyArray<{
  href: string;
  label: string;
  exact?: boolean;
}> = [
  { href: ROUTES.dashboardOverview, label: "Overview", exact: true },
  { href: ROUTES.dashboardEscalations, label: "Escalations" },
  { href: ROUTES.dashboardIntegrations, label: "Integrations" },
  { href: ROUTES.dashboardPrompts, label: "Prompts" },
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
