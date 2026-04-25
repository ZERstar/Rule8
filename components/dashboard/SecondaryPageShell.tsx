import { Topbar } from "@/components/layout/Topbar";

export function SecondaryPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex h-screen flex-col overflow-hidden"
      style={{ background: "var(--color-bg)", color: "var(--color-t1)" }}
    >
      <Topbar />
      <main className="flex-1 overflow-y-auto">
        <div
          className="mx-auto"
          style={{ maxWidth: 960, padding: "36px 40px 60px" }}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
