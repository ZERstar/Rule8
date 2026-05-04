import { ExecutivePanel } from "@/components/dashboard/ExecutivePanel";

export function SecondaryPageShell({
  children,
  contentClassName = "",
}: {
  children: React.ReactNode;
  contentClassName?: string;
}) {
  return (
    <div className="flex h-full w-full min-w-0 overflow-hidden">
      {/* Main content */}
      <div className="thin-scroll min-w-0 flex-1 overflow-y-auto">
        <div className={`mx-auto w-full max-w-5xl px-8 py-8 ${contentClassName}`}>
          {children}
        </div>
      </div>

      {/* Executive panel */}
      <ExecutivePanel />
    </div>
  );
}
