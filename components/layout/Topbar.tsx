"use client";

export function Topbar() {
  return (
    <header
      className="flex items-center justify-between border-b px-5"
      style={{
        gridColumn: "1 / -1",
        background: "var(--color-s1)",
        borderColor: "var(--color-b1)",
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-[6px] font-mono text-sm font-semibold text-black"
          style={{ background: "var(--color-gold)" }}
        >
          8
        </div>
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--color-gold)" }}>
          Rule8
        </span>
        <span className="ml-1 font-mono text-[10px]" style={{ color: "var(--color-t3)" }}>
          Agent OS
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--color-green)" }} />
          <span className="font-mono text-[10px]" style={{ color: "var(--color-t3)" }}>
            All systems operational
          </span>
        </div>
      </div>
    </header>
  );
}
