import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth-server";
import { ROUTES } from "@/lib/routes";
import { Topbar } from "@/components/layout/Topbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authed = await isAuthenticated();
  if (!authed) {
    const headersList = await headers();
    const pathname = headersList.get("x-pathname") ?? ROUTES.dashboardOverview;
    redirect(`${ROUTES.signIn}?redirectTo=${encodeURIComponent(pathname)}`);
  }

  return (
    <div
      className="flex h-screen flex-col overflow-hidden"
      style={{ background: "var(--color-bg)", color: "var(--color-t1)" }}
    >
      <Topbar />
      <main className="flex min-h-0 flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
