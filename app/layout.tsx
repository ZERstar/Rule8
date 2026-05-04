import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import { getToken } from "@/lib/auth-server";
import "./globals.css";
import { ConvexClientProvider } from "./providers";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Rule8 — Build more. Run less.",
  description: "Rule8 is the operational co-founder for solo builders. AI crews handle your support, billing, and community autonomously — so you stay focused on building the product.",
  icons: { icon: [{ url: "/icon.svg", type: "image/svg+xml" }] },
  openGraph: {
    title: "Rule8 — Build more. Run less.",
    description: "AI crews that handle your support, billing, and community. You see outcomes, not tickets.",
    url: "https://rule8.vercel.app",
    siteName: "Rule8",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Rule8 — Build more. Run less.",
    description: "AI crews that handle your support, billing, and community. You see outcomes, not tickets.",
    creator: "@rule8ai",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const token = await getToken();
  return (
    <html lang="en" className={`${playfair.variable} ${inter.variable}`}>
      <body>
        <ConvexClientProvider initialToken={token}>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
