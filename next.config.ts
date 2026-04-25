import type { NextConfig } from 'next'
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants'
import { ROUTES } from './lib/routes'

export default function nextConfig(phase: string): NextConfig {
  return {
    // Isolate dev artifacts from production build output to avoid chunk mismatch issues.
    distDir: phase === PHASE_DEVELOPMENT_SERVER ? '.next-dev' : '.next',
    devIndicators: {
      appIsrStatus: false,
      buildActivity: false,
    },
    async redirects() {
      return [
        {
          source: ROUTES.legacyEscalations,
          destination: ROUTES.dashboardEscalations,
          permanent: true,
        },
        {
          source: ROUTES.legacyIntegrations,
          destination: ROUTES.dashboardIntegrations,
          permanent: true,
        },
        {
          source: ROUTES.legacyPrompts,
          destination: ROUTES.dashboardPrompts,
          permanent: true,
        },
      ]
    },
  }
}
