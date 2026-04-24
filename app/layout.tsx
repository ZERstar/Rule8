import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";

import "./globals.css";
import { getToken } from "@/lib/auth-server";
import { ConvexClientProvider } from "./providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "RULE8 — Agent Orchestration for Indie Hackers",
  description:
    "Deploy 8 autonomous AI agents that handle customer support, recover failed payments, and moderate your community — so you ship, not answer tickets.",
  keywords: ["AI agents", "autonomous agents", "indie hackers", "customer support automation", "Rule8"],
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    title: "RULE8 — Agent Orchestration for Indie Hackers",
    description: "Deploy 8 autonomous AI agents. Ship faster.",
    type: "website",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const initialToken = await getToken();

  return (
    <html lang="en">
      <body className={`${inter.variable} ${jetbrainsMono.variable}`}>
        <ConvexClientProvider initialToken={initialToken ?? null}>
          {children}
        </ConvexClientProvider>
      </body>
    </html>
  );
}
