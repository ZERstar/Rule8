import type { Metadata } from "next";
import { getToken } from "@/lib/auth-server";

import "./globals.css";
import { ConvexClientProvider } from "./providers";

export const metadata: Metadata = {
  title: "Rule8 — Agent Operations for Founders",
  description:
    "Deploy autonomous AI crews that handle support, billing, and community — so founders ship instead of answering tickets.",
  keywords: ["AI agents", "autonomous agents", "founders", "support automation", "Rule8"],
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    title: "Rule8 — Agent Operations for Founders",
    description: "Deploy autonomous AI crews. Ship faster.",
    type: "website",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const token = await getToken();
  return (
    <html lang="en">
      <body>
        <ConvexClientProvider initialToken={token}>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
