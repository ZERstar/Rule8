export function SidebarLogo() {
  return (
    <div className="flex items-center gap-2.5 border-b border-[var(--color-b1)] px-4 py-5">
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-mono text-[13px] font-bold text-white"
        style={{
          background: "linear-gradient(135deg, #3D6EFF 0%, #6B8FFF 100%)",
          boxShadow: "0 0 16px rgba(61,110,255,0.30)",
        }}
      >
        8
      </div>
      <div>
        <p className="text-[14px] font-semibold leading-none tracking-[-0.01em] text-[var(--color-t1)]">
          Rule8
        </p>
        <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--color-t3)]">
          Agent OS
        </p>
      </div>
    </div>
  );
}
