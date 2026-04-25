import { Topbar } from "@/components/layout/Topbar";

export function SecondaryPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Topbar />
      <main className="app-scroll flex-1 overflow-y-auto px-5 pb-10 pt-6 md:px-6 md:pt-7 xl:px-8">
        <div className="page-frame">{children}</div>
      </main>
    </div>
  );
}
