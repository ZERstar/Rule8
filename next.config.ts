import type { NextConfig } from 'next'
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants'

export default function nextConfig(phase: string): NextConfig {
  return {
    // Isolate dev artifacts from production build output to avoid chunk mismatch issues.
    distDir: phase === PHASE_DEVELOPMENT_SERVER ? '.next-dev' : '.next',
  }
}
