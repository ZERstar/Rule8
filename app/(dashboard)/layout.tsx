"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useConvexAuth } from "convex/react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/sign-in");
      router.refresh();
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] text-[var(--color-t2)]">
        Validating session...
      </main>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <div className="h-screen overflow-hidden bg-[var(--color-bg)] text-[var(--color-t1)]">{children}</div>;
}
