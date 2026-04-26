import type { Metadata } from "next";
import { getToken } from "@/lib/auth-server";
import "./globals.css";
import { ConvexClientProvider } from "./providers";

export const metadata: Metadata = {
  title: "Rule8 — Agent OS",
  description: "Autonomous AI crews for founders. Handle support, billing, and community.",
  icons: { icon: [{ url: "/icon.svg", type: "image/svg+xml" }] },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const token = await getToken();
  return (
    <html lang="en">
      <body>
        <ConvexClientProvider initialToken={token}>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
