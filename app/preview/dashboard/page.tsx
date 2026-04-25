import { DashboardShell } from "@/components/dashboard/DashboardShell";

export default function DashboardPreviewPage() {
  return (
    <div className="h-screen overflow-hidden bg-[var(--color-bg)] text-[var(--color-t1)]">
      <DashboardShell />
    </div>
  );
}
