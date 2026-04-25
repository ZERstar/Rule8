export const ROUTES = {
  home: "/",
  dashboardOverview: "/dashboard",
  dashboardEscalations: "/dashboard/escalations",
  dashboardIntegrations: "/dashboard/integrations",
  dashboardPrompts: "/dashboard/prompts",
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
