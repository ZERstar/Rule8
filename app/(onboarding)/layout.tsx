import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getCurrentAuthUser, getOrCreateWorkspace } from "@/lib/auth-server";
import { ROUTES } from "@/lib/routes";
import { WorkspaceProvider } from "@/lib/workspace-context";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentAuthUser();
  if (!user) {
    const headersList = await headers();
    const pathname = headersList.get("x-pathname") ?? ROUTES.onboarding;
    redirect(`${ROUTES.signIn}?redirectTo=${encodeURIComponent(pathname)}`);
  }

  const workspace = await getOrCreateWorkspace(user.name ?? "My Workspace");
  if (!workspace) redirect(ROUTES.signIn);

  if (workspace.onboardingComplete) {
    redirect(ROUTES.dashboardOverview);
  }

  return (
    <WorkspaceProvider workspaceId={workspace._id}>
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-bg)] px-4 py-12">
        {children}
      </div>
    </WorkspaceProvider>
  );
}
