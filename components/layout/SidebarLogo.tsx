export function SidebarLogo() {
  return (
    <div className="border-b border-[var(--color-b1)] px-4 py-4">
      <div className="flex items-center gap-3">
        <div
          className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] text-white shadow-[0_16px_34px_rgba(249,115,22,0.26)]"
          style={{ background: "linear-gradient(135deg, #ff7a1a 0%, #f04438 58%, #111827 140%)" }}
        >
          <span className="absolute left-2 top-2 h-2 w-2 rounded-full bg-white/65" />
          <span className="font-mono text-[16px] font-black tracking-[-0.08em]">R8</span>
        </div>
        <div className="min-w-0">
          <p className="text-[16px] font-black leading-none tracking-[-0.04em] text-[var(--color-t1)]">
            Rule8
          </p>
          <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--color-t3)]">
            Control Room
          </p>
        </div>
      </div>
      <p className="mt-3 font-mono text-[8px] uppercase tracking-[0.16em] text-[var(--color-t3)]">
        Founder-facing agent operations
      </p>
    </div>
  );
}
