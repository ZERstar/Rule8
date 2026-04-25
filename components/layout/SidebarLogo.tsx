"use client";

export function SidebarLogo() {
  return (
    <div className="border-b px-4 py-[14px]" style={{ borderColor: "var(--color-b1)" }}>
      <div className="flex items-center gap-2.5">
        <div
          className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[6px] font-mono text-[13px] font-medium text-black"
          style={{ background: "var(--color-gold)" }}
        >
          8
        </div>
        <div>
          <p className="text-[14px] font-semibold tracking-[-0.01em]" style={{ color: "var(--color-t1)" }}>
            Rule8
          </p>
          <p className="font-mono text-[10px] tracking-[0.05em]" style={{ color: "var(--color-t3)" }}>
            Agent OS
          </p>
        </div>
      </div>
    </div>
  );
}
