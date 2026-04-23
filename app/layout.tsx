import type { Metadata } from 'next'
import './globals.css'
import { ConvexClientProvider } from './providers'

export const metadata: Metadata = {
  title: 'RULE8 — Agent Orchestration for Indie Hackers',
  description:
    'Deploy 8 autonomous AI agents that handle customer support, recover failed payments, and moderate your community — so you ship, not answer tickets.',
  keywords: ['AI agents', 'autonomous agents', 'indie hackers', 'customer support automation', 'Rule8'],
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
  openGraph: {
    title: 'RULE8 — Agent Orchestration for Indie Hackers',
    description: 'Deploy 8 autonomous AI agents. Ship faster.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <ConvexClientProvider>
          {children}
        </ConvexClientProvider>
      </body>
    </html>
  )
}
