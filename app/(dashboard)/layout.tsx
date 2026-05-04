import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentAuthUser, getOrCreateWorkspace } from "@/lib/auth-server";
import { ROUTES } from "@/lib/routes";
import { Topbar } from "@/components/layout/Topbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { WorkspaceProvider } from "@/lib/workspace-context";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentAuthUser();
  if (!user) {
    const headersList = await headers();
    const pathname = headersList.get("x-pathname") ?? ROUTES.dashboardOverview;
    redirect(`${ROUTES.signIn}?redirectTo=${encodeURIComponent(pathname)}`);
  }

  const workspace = await getOrCreateWorkspace(user.name ?? "My Workspace");
  const workspaceId = workspace?._id ?? "rule8-demo";

  // Onboarding gate re-enabled in STEP_11 once the flow is production-ready

  return (
    <div
      className="flex h-screen flex-col overflow-hidden"
      style={{ background: "var(--color-bg)", color: "var(--color-t1)" }}
    >
      <WorkspaceProvider workspaceId={workspaceId}>
        <Topbar />
        <main className="flex min-h-0 flex-1 overflow-hidden">
          <Sidebar />
          <div className="min-w-0 flex-1 overflow-hidden">
            {children}
          </div>
        </main>
      </WorkspaceProvider>
    </div>
  );
}
