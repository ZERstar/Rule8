import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth-server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authed = await isAuthenticated();
  if (!authed) {
    redirect("/sign-in");
  }

  return (
    <div
      className="h-screen overflow-hidden"
      style={{ background: "var(--color-bg)", color: "var(--color-t1)" }}
    >
      {children}
    </div>
  );
}
