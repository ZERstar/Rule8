import { Topbar } from "@/components/layout/Topbar";

export function SecondaryPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen flex-col overflow-hidden" style={{ background: "var(--color-bg)", color: "var(--color-t1)" }}>
      <Topbar />
      <main className="flex-1 overflow-y-auto px-6 py-6 lg:px-10 lg:py-8">
        {children}
      </main>
    </div>
  );
}
