// Simple scrollable shell for secondary pages (escalations, integrations, prompts)
export function SecondaryPageShell({
  children,
  contentClassName = "",
}: {
  children: React.ReactNode;
  contentClassName?: string;
}) {
  return (
    <div className="thin-scroll h-full overflow-y-auto">
      <div className={`mx-auto w-full max-w-7xl px-6 py-6 ${contentClassName}`}>
        {children}
      </div>
    </div>
  );
}
