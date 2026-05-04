import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth-server";
import { ROUTES } from "@/lib/routes";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authed = await isAuthenticated();
  if (authed) {
    redirect(ROUTES.dashboardOverview);
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-[var(--color-b1)] bg-[var(--color-surface)] shadow-[0_24px_80px_rgba(0,0,0,0.60)]">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
          {/* Left branding column */}
          <div className="relative overflow-hidden bg-[var(--color-surface-2)] p-10 flex flex-col justify-between min-h-[520px]">
            {/* Ambient glow */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse 60% 50% at 100% 0%, rgba(61,110,255,0.18) 0%, transparent 70%)",
              }}
            />

            {/* Grid pattern overlay */}
            <div
              className="absolute inset-0 pointer-events-none opacity-[0.05]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
                backgroundSize: "24px 24px",
              }}
            />

            {/* Top: Logo + wordmark */}
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-8">
                {/* Logo badge */}
                <div
                  className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                  style={{
                    background:
                      "linear-gradient(135deg, #3D6EFF 0%, #6B8FFF 100%)",
                  }}
                >
                  <span
                    className="text-white text-[13px] font-bold"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    8
                  </span>
                </div>
                <div>
                  <span
                    className="text-[var(--color-t1)] text-[15px] font-semibold tracking-[-0.02em] leading-none block"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    Rule8
                  </span>
                  <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-t3)] block mt-0.5">
                    Agent OS
                  </span>
                </div>
              </div>

              {/* Big headline */}
              <h1
                className="text-[40px] font-semibold leading-[1.0] tracking-tight text-[var(--color-t1)] max-w-[280px]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                The ops layer for AI-first founders.
              </h1>
            </div>

            {/* Bottom: Stat pills */}
            <div className="relative z-10 flex gap-2 flex-wrap">
              {[
                { label: "Agents", value: "9" },
                { label: "Core pages", value: "4" },
                { label: "Mode", value: "Live" },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="rounded-md border border-[var(--color-b1)] bg-[var(--color-bg)] px-3 py-2"
                >
                  <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--color-t3)] block leading-none">
                    {label}
                  </span>
                  <span className="font-mono text-[13px] font-semibold text-[var(--color-t1)] block mt-1 leading-none">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right form column */}
          <div className="bg-[var(--color-bg)] p-8 flex items-center justify-center">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
