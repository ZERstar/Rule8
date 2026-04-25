export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="h-screen overflow-hidden"
      style={{ background: "var(--color-bg)", color: "var(--color-t1)" }}
    >
      {children}
    </div>
  );
}
