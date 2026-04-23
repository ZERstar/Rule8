'use client'

import { useState, useEffect, useRef } from 'react'
import { api } from '../convex/_generated/api'
import { convexClient } from './providers'

const convexEnabled = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL)

/* ─── CSS vars injected via <style> ─── */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

  :root {
    --accent:   #FF5500;
    --accent-d: #CC4400;
    --accent-a: rgba(255,85,0,0.12);
    --bg:     #080808;
    --bg-1:   #0D0D0D;
    --bg-2:   #111111;
    --bg-3:   #181818;
    --border: rgba(255,255,255,0.08);
    --border-md: rgba(255,255,255,0.12);
    --border-lg: rgba(255,255,255,0.18);
    --text-1: #FFFFFF;
    --text-2: #888888;
    --text-3: #444444;
    --font-display: 'Space Grotesk', sans-serif;
    --font-mono: 'JetBrains Mono', monospace;
  }

  html { scroll-behavior: smooth; }

  body {
    background: var(--bg);
    color: var(--text-1);
    font-family: var(--font-mono);
    font-size: 13px;
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
    overflow-x: hidden;
  }

  ::-webkit-scrollbar { width: 3px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); }

  @keyframes pulse-ring { 0%, 100% { opacity: .8; } 50% { opacity: .3; } }

  .scan-overlay {
    pointer-events: none;
    position: fixed; inset: 0; z-index: 9998;
    background: repeating-linear-gradient(
      0deg,
      transparent, transparent 2px,
      rgba(0,0,0,.03) 2px, rgba(0,0,0,.03) 4px
    );
    opacity: .4;
  }

  /* Nav */
  .r8-nav {
    position: sticky; top: 0; z-index: 100;
    display: flex; align-items: center;
    height: 48px; padding: 0 24px;
    background: var(--bg);
    border-bottom: 1px solid var(--border);
  }
  .r8-nav-logo {
    display: flex; align-items: center; gap: 10px;
    margin-right: 40px; flex-shrink: 0; text-decoration: none;
    cursor: pointer;
  }
  .r8-nav-badge { display: flex; align-items: center; flex-shrink: 0; }
  .r8-nav-text {
    font-family: var(--font-mono); font-size: 13px; font-weight: 600;
    color: var(--text-1); letter-spacing: .04em;
  }
  .r8-nav-links {
    display: flex; align-items: center; gap: 28px; flex: 1;
  }
  .r8-nav-link {
    font-family: var(--font-mono); font-size: 11px; font-weight: 500;
    color: var(--text-3); letter-spacing: .08em; text-decoration: none;
    transition: color .15s; cursor: pointer; background: none; border: none;
  }
  .r8-nav-link:hover { color: var(--text-1); }
  .r8-nav-right { margin-left: auto; display: flex; align-items: center; gap: 12px; }
  .r8-nav-status {
    display: flex; align-items: center; gap: 6px;
    height: 28px; padding: 0 12px;
    border: 1px solid var(--border-md);
    font-family: var(--font-mono); font-size: 10px; font-weight: 500;
    color: var(--text-2); letter-spacing: .06em; cursor: default;
  }
  .r8-nav-status-dot {
    width: 5px; height: 5px; border-radius: 50%; background: var(--accent);
  }
  .r8-nav-cta {
    height: 28px; padding: 0 14px;
    background: var(--text-1); border: none;
    font-family: var(--font-mono); font-size: 11px; font-weight: 600;
    color: #000; letter-spacing: .08em; cursor: pointer;
    transition: background .15s;
  }
  .r8-nav-cta:hover { background: #ddd; }

  /* Hero */
  .r8-hero-outer {
    background: var(--bg-1); border: 1px solid var(--border);
    display: grid; grid-template-columns: 1fr 1fr;
    min-height: 380px;
  }
  .r8-hero-left {
    padding: 40px 48px 40px 40px;
    display: flex; flex-direction: column; justify-content: space-between;
    border-right: 1px solid var(--border);
  }
  .r8-hero-tag {
    display: inline-flex; align-items: center; gap: 6px;
    border: 1px solid var(--accent); padding: 3px 8px;
    font-family: var(--font-mono); font-size: 10px; font-weight: 500;
    color: var(--accent); letter-spacing: .08em; margin-bottom: 28px;
    width: fit-content;
  }
  .r8-hero-title {
    font-family: var(--font-display); font-size: 80px; font-weight: 700;
    line-height: .92; letter-spacing: -.04em;
    margin-bottom: 28px;
  }
  .r8-hero-title-dim { color: var(--text-2); }
  .r8-hero-sub {
    font-family: var(--font-mono); font-size: 13px; font-weight: 400;
    color: var(--text-2); line-height: 1.7; max-width: 380px;
    margin-bottom: 36px;
  }
  .r8-hero-actions { display: flex; align-items: center; gap: 16px; }

  /* Schematic */
  .r8-hero-right { position: relative; }
  .r8-schematic {
    position: absolute; inset: 0;
    display: grid; grid-template-columns: repeat(3,1fr); grid-template-rows: repeat(3,1fr);
  }
  .r8-sch-cell {
    border-right: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
    display: flex; align-items: center; justify-content: center;
    position: relative;
  }
  .r8-sch-cell:nth-child(3n) { border-right: none; }
  .r8-sch-cell:nth-child(n+7) { border-bottom: none; }
  .r8-sch-label {
    position: absolute; top: 8px; left: 10px;
    font-family: var(--font-mono); font-size: 9px;
    color: var(--text-3); letter-spacing: .06em;
  }
  .r8-sch-label-br {
    position: absolute; bottom: 8px; right: 10px;
    font-family: var(--font-mono); font-size: 9px;
    color: var(--text-3); letter-spacing: .06em;
  }
  .r8-sch-label-bl {
    position: absolute; bottom: 8px; left: 10px;
    font-family: var(--font-mono); font-size: 9px;
    color: var(--text-3); letter-spacing: .06em;
  }
  .r8-sch-target { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
  .r8-sch-target svg { width: 80%; height: 80%; }

  /* Buttons */
  .r8-btn-primary {
    display: inline-flex; align-items: center; gap: 10px;
    height: 40px; padding: 0 20px;
    background: var(--accent); border: none;
    font-family: var(--font-mono); font-size: 11px; font-weight: 600;
    color: #000; letter-spacing: .1em; cursor: pointer;
    transition: background .15s;
  }
  .r8-btn-primary:hover { background: var(--accent-d); }
  .r8-btn-primary .kbd {
    background: rgba(255,255,255,.2);
    padding: 1px 5px; font-size: 10px;
  }
  .r8-btn-secondary {
    font-family: var(--font-mono); font-size: 11px; font-weight: 500;
    color: var(--text-2); letter-spacing: .1em; cursor: pointer;
    background: none; border: none; transition: color .15s;
  }
  .r8-btn-secondary:hover { color: var(--text-1); }

  /* Section */
  .r8-section { padding: 80px 0; }
  .r8-section-wrap { max-width: 1040px; margin: 0 auto; padding: 0 24px; }
  .r8-section-comment {
    font-family: var(--font-mono); font-size: 11px; font-weight: 500;
    color: var(--accent); letter-spacing: .08em; margin-bottom: 16px;
  }
  .r8-section-header {
    display: flex; align-items: flex-start; justify-content: space-between;
    margin-bottom: 12px;
  }
  .r8-section-title {
    font-family: var(--font-display); font-size: 44px; font-weight: 700;
    letter-spacing: -.02em; line-height: 1;
  }
  .r8-section-roster {
    font-family: var(--font-mono); font-size: 10px;
    color: var(--text-3); letter-spacing: .06em; margin-top: 6px;
  }
  .r8-section-sub {
    font-family: var(--font-mono); font-size: 13px;
    color: var(--text-2); line-height: 1.7; margin-bottom: 48px;
  }

  /* Agent cards */
  .r8-agents-grid {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;
  }
  .r8-agent-card {
    background: var(--bg-1); border: 1px solid var(--border);
    overflow: hidden; transition: border-color .2s; cursor: pointer;
  }
  .r8-agent-card:hover { border-color: var(--border-md); }
  .r8-agent-card.featured { border-color: var(--border-md); }
  .r8-agent-preview {
    height: 180px; background: var(--bg);
    display: flex; align-items: center; justify-content: center;
    position: relative;
    border-bottom: 1px solid var(--border);
  }
  .r8-agent-status-dot {
    position: absolute; top: 12px; left: 12px;
    width: 7px; height: 7px; border-radius: 50%; background: var(--accent);
  }
  .r8-agent-preview-label {
    font-family: var(--font-mono); font-size: 10px;
    color: var(--text-3); letter-spacing: .08em;
  }
  .r8-agent-body { padding: 16px 16px 20px; }
  .r8-agent-meta {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 12px;
  }
  .r8-unit-badge {
    background: var(--accent); padding: 2px 7px;
    font-family: var(--font-mono); font-size: 9px; font-weight: 600;
    color: #000; letter-spacing: .08em;
  }
  .r8-agent-codename {
    font-family: var(--font-mono); font-size: 10px;
    color: var(--text-3); letter-spacing: .06em;
  }
  .r8-agent-name {
    font-family: var(--font-display); font-size: 20px; font-weight: 700;
    letter-spacing: -.01em; margin-bottom: 10px;
  }
  .r8-agent-desc {
    font-family: var(--font-mono); font-size: 11px;
    color: var(--text-2); line-height: 1.7; margin-bottom: 16px;
  }
  .r8-agent-integrations { display: flex; gap: 5px; flex-wrap: wrap; margin-bottom: 20px; }
  .r8-int-pill {
    padding: 3px 8px; border: 1px solid var(--border-md);
    font-family: var(--font-mono); font-size: 9px;
    color: var(--text-3); letter-spacing: .06em;
  }
  .r8-agent-footer {
    display: flex; align-items: center; justify-content: space-between;
    padding-top: 16px; border-top: 1px solid var(--border);
  }
  .r8-agent-state {
    font-family: var(--font-mono); font-size: 10px;
    color: var(--text-3); letter-spacing: .08em;
  }
  .r8-agent-state span { color: var(--accent); }
  .r8-agent-add {
    width: 24px; height: 24px;
    background: transparent; border: 1px solid var(--border-md);
    display: grid; place-items: center;
    font-size: 14px; color: var(--text-2); cursor: pointer;
    transition: border-color .15s, color .15s, background .15s;
  }
  .r8-agent-add:hover { border-color: var(--text-1); color: var(--text-1); background: rgba(255,255,255,.05); }

  /* Integrations */
  .r8-integrations-section {
    border-top: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
  }
  .r8-integrations-header {
    max-width: 1040px; margin: 0 auto; padding: 12px 24px;
    display: flex; justify-content: space-between; align-items: center;
    border-bottom: 1px solid var(--border);
  }
  .r8-integrations-grid {
    max-width: 1040px; margin: 0 auto;
    display: grid; grid-template-columns: repeat(8, 1fr);
  }
  .r8-int-cell {
    padding: 20px 0; text-align: center;
    border-right: 1px solid var(--border);
    font-family: var(--font-mono); font-size: 11px; font-weight: 500;
    color: var(--text-2); letter-spacing: .06em;
    transition: color .15s, background .15s;
    cursor: default;
  }
  .r8-int-cell:last-child { border-right: none; }
  .r8-int-cell:hover { color: var(--text-1); background: rgba(255,255,255,.03); }

  /* Final CTA */
  .r8-final-section { padding: 40px 24px; max-width: 1040px; margin: 60px auto; }
  .r8-final-card {
    background: var(--bg-1); border: 1px solid var(--border);
    padding: 60px;
    display: flex; align-items: center; justify-content: space-between;
    gap: 40px;
  }
  .r8-final-comment {
    font-family: var(--font-mono); font-size: 11px;
    color: var(--accent); letter-spacing: .08em; margin-bottom: 20px;
  }
  .r8-final-title {
    font-family: var(--font-display); font-size: 36px; font-weight: 700;
    letter-spacing: -.02em; line-height: 1.1; margin-bottom: 8px;
  }
  .r8-final-title .dim { color: var(--text-2); }
  .r8-final-sub {
    font-family: var(--font-mono); font-size: 12px;
    color: var(--text-3); margin-top: 12px;
  }

  /* Footer */
  .r8-footer {
    border-top: 1px solid var(--border);
    padding: 20px 24px;
    display: flex; align-items: center; justify-content: space-between;
    max-width: 1040px; margin: 0 auto;
  }
  .r8-footer-build, .r8-footer-copy {
    font-family: var(--font-mono); font-size: 10px;
    color: var(--text-3); letter-spacing: .06em;
  }

  /* Tweaks panel */
  #tweaks-panel {
    display: none; position: fixed; bottom: 24px; right: 24px;
    width: 272px; background: var(--bg-2); border: 1px solid var(--border-md);
    box-shadow: 0 16px 48px rgba(0,0,0,.8);
    z-index: 9999; overflow: hidden;
  }
  #tweaks-panel.open { display: block; }
  .tw-head {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 14px; border-bottom: 1px solid var(--border);
    background: var(--bg-3);
  }
  .tw-title {
    font-family: var(--font-mono); font-size: 10px; font-weight: 500;
    color: var(--text-3); letter-spacing: .12em; text-transform: uppercase;
  }
  .tw-close {
    width: 20px; height: 20px; background: none; border: none;
    cursor: pointer; color: var(--text-3); font-size: 16px;
    display: grid; place-items: center;
  }
  .tw-close:hover { color: var(--text-1); }
  .tw-body { padding: 16px; display: flex; flex-direction: column; gap: 16px; }
  .tw-lbl {
    font-family: var(--font-mono); font-size: 9px; font-weight: 500;
    color: var(--text-3); letter-spacing: .12em; text-transform: uppercase;
    margin-bottom: 10px;
  }
  .accent-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; }
  .accent-swatch {
    height: 28px; cursor: pointer;
    border: 2px solid transparent; transition: border-color .15s;
  }
  .accent-swatch.active { border-color: #fff; }
  .tw-row { display: flex; align-items: center; justify-content: space-between; padding: 3px 0; }
  .tw-tog {
    width: 34px; height: 18px; border-radius: 99px;
    border: 1px solid rgba(255,255,255,.15); background: rgba(255,255,255,.05);
    cursor: pointer; position: relative; transition: all .2s;
  }
  .tw-tog.on { background: var(--accent-a); border-color: rgba(255,85,0,.4); }
  .tw-tog::after {
    content: ''; position: absolute; top: 2px; left: 2px;
    width: 12px; height: 12px; border-radius: 50%;
    background: var(--text-3); transition: transform .2s, background .2s;
  }
  .tw-tog.on::after { transform: translateX(16px); background: var(--accent); }
  .tw-tog-lbl { font-family: var(--font-mono); font-size: 10px; color: var(--text-2); }

  /* Responsive */
  @media (max-width: 768px) {
    .r8-hero-outer { grid-template-columns: 1fr; }
    .r8-hero-right { display: none; }
    .r8-agents-grid { grid-template-columns: 1fr; }
    .r8-integrations-grid { grid-template-columns: repeat(4,1fr); }
    .r8-final-card { flex-direction: column; }
    .r8-hero-title { font-size: 52px; }
    .r8-section-title { font-size: 32px; }
  }
`

/* ─── Rule8 SVG Logo Mark ─── */
function Rule8Logo({ size = 28, accent = '#E8192C' }: { size?: number; accent?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={accent}
      strokeWidth="1.5"
      style={{ display: 'block' }}
    >
      {/* Outer cylinder casing */}
      <circle cx="12" cy="12" r="10" />
      
      {/* Central axis */}
      <circle cx="12" cy="12" r="2" fill={accent} />
      
      {/* 8 bullet / agent slots */}
      <circle cx="12" cy="6" r="1.5" />
      <circle cx="16.24" cy="7.76" r="1.5" />
      <circle cx="18" cy="12" r="1.5" />
      <circle cx="16.24" cy="16.24" r="1.5" />
      <circle cx="12" cy="18" r="1.5" />
      <circle cx="7.76" cy="16.24" r="1.5" />
      <circle cx="6" cy="12" r="1.5" />
      <circle cx="7.76" cy="7.76" r="1.5" />
    </svg>
  )
}



/* ─── Tweaks panel ─── */
const ACCENT_OPTIONS = [
  { color: '#E8192C', dark: '#BF1020', label: 'Red'     },
  { color: '#C8972A', dark: '#A67A1C', label: 'Gold'    },
  { color: '#A78BFA', dark: '#8B5CF6', label: 'Violet'  },
  { color: '#22D3EE', dark: '#06B6D4', label: 'Cyan'    },
  { color: '#34D399', dark: '#10B981', label: 'Emerald' },
]

function hexToAlpha(hex: string, a: number) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${a})`
}

interface TweaksPanelProps {
  open: boolean
  onClose: () => void
  accent: string
  onAccent: (col: string, dark: string) => void
  scanlines: boolean
  onScanlines: (v: boolean) => void
}

function TweaksPanel({ open, onClose, accent, onAccent, scanlines, onScanlines }: TweaksPanelProps) {
  return (
    <div id="tweaks-panel" className={open ? 'open' : ''}>
      <div className="tw-head">
        <span className="tw-title">Tweaks</span>
        <button className="tw-close" onClick={onClose}>×</button>
      </div>
      <div className="tw-body">
        <div>
          <div className="tw-lbl">Accent Color</div>
          <div className="accent-grid">
            {ACCENT_OPTIONS.map(opt => (
              <div
                key={opt.color}
                className={`accent-swatch${accent === opt.color ? ' active' : ''}`}
                style={{ background: opt.color }}
                title={opt.label}
                onClick={() => onAccent(opt.color, opt.dark)}
              />
            ))}
          </div>
        </div>
        <div>
          <div className="tw-lbl">Options</div>
          <div className="tw-row">
            <span className="tw-tog-lbl">Scanlines</span>
            <div className={`tw-tog${scanlines ? ' on' : ''}`} onClick={() => onScanlines(!scanlines)} />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Main Page ─── */
function ConfiguredWaitlistSignup() {
  const [email, setEmail] = useState('')
  const [wlStatus, setWlStatus] = useState<'idle' | 'loading' | 'success' | 'duplicate' | 'error'>('idle')
  const [waitlistCount, setWaitlistCount] = useState<number | undefined>(undefined)
  const [waitlistAvailable, setWaitlistAvailable] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadWaitlistCount() {
      if (!convexClient) {
        if (!cancelled) {
          setWaitlistAvailable(false)
        }
        return
      }

      try {
        const count = await convexClient.query(api.waitlist.getCount, {})
        if (!cancelled) {
          setWaitlistCount(count)
          setWaitlistAvailable(true)
        }
      } catch {
        if (!cancelled) {
          setWaitlistAvailable(false)
        }
      }
    }

    void loadWaitlistCount()

    return () => {
      cancelled = true
    }
  }, [])

  async function handleJoin(e: React.FormEvent, source = 'hero') {
    e.preventDefault()
    if (!email || !email.includes('@') || !convexClient) return
    setWlStatus('loading')

    try {
      const res = await convexClient.mutation(api.waitlist.joinWaitlist, {
        email: email.trim().toLowerCase(),
        source,
      })
      setWlStatus(res.status === 'already_registered' ? 'duplicate' : 'success')
      if (res.status !== 'already_registered') {
        setWaitlistCount(prev => (prev ?? 0) + 1)
      }
      setWaitlistAvailable(true)
    } catch {
      setWaitlistAvailable(false)
      setWlStatus('error')
    }
  }

  if (wlStatus === 'success') {
    return (
      <div style={{
        padding: '20px 24px', background: 'rgba(255,85,0,0.08)', border: '1px solid var(--accent)',
        borderRadius: '6px', fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-1)',
        display: 'flex', alignItems: 'center', gap: '12px'
      }}>
        <span style={{ color: 'var(--accent)', fontSize: '18px' }}>✓</span>
        You&apos;re in. We&apos;ll reach out when your slot opens.
      </div>
    )
  }

  return (
    <>
      <form onSubmit={e => handleJoin(e, 'hero')} style={{ display: 'flex', gap: '0', maxWidth: '460px' }}>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          disabled={wlStatus === 'loading'}
          style={{
            flex: 1, height: '50px', padding: '0 18px',
            background: 'var(--bg-1)', border: '1px solid var(--border-md)', borderRight: 'none',
            borderRadius: '6px 0 0 6px', fontFamily: 'var(--font-mono)', fontSize: '13px',
            color: 'var(--text-1)', outline: 'none', transition: 'border-color 0.2s'
          }}
          onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
          onBlur={e => (e.currentTarget.style.borderColor = 'var(--border-md)')}
        />
        <button
          type="submit"
          disabled={wlStatus === 'loading'}
          style={{
            height: '50px', padding: '0 24px',
            background: wlStatus === 'loading' ? 'var(--accent-d)' : 'var(--accent)',
            border: 'none', borderRadius: '0 6px 6px 0',
            fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 700,
            color: '#000', letterSpacing: '0.08em', cursor: wlStatus === 'loading' ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap', transition: 'background 0.2s'
          }}
        >
          {wlStatus === 'loading' ? 'JOINING...' : 'JOIN WAITLIST →'}
        </button>
      </form>

      {!waitlistAvailable && (
        <p style={{ marginTop: '10px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#ff9a5c' }}>
          Convex is connected, but the waitlist functions are not deployed on this backend yet.
        </p>
      )}
      {wlStatus === 'duplicate' && (
        <p style={{ marginTop: '10px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-2)' }}>
          Already registered — we&apos;ll be in touch.
        </p>
      )}
      {wlStatus === 'error' && (
        <p style={{ marginTop: '10px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#ff4444' }}>
          Something went wrong. Try again.
        </p>
      )}

      <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)' }}>
          {waitlistAvailable && waitlistCount !== undefined ? (
            <><span style={{ color: 'var(--accent)', fontWeight: 700 }}>{waitlistCount.toLocaleString()}</span> developers ahead of you</>
          ) : waitlistAvailable ? 'counting developers...' : 'waitlist backend not deployed'}
        </div>
        <div style={{ height: '1px', flex: 1, background: 'var(--border)' }} />
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-3)', letterSpacing: '0.1em' }}>NO SPAM. EVER.</div>
      </div>
    </>
  )
}

function OfflineWaitlistSignup() {
  return (
    <>
      <form style={{ display: 'flex', gap: '0', maxWidth: '460px' }}>
        <input
          type="email"
          placeholder="your@email.com"
          disabled
          style={{
            flex: 1, height: '50px', padding: '0 18px',
            background: 'var(--bg-1)', border: '1px solid var(--border-md)', borderRight: 'none',
            borderRadius: '6px 0 0 6px', fontFamily: 'var(--font-mono)', fontSize: '13px',
            color: 'var(--text-2)', outline: 'none'
          }}
        />
        <button
          type="button"
          disabled
          style={{
            height: '50px', padding: '0 24px',
            background: 'var(--bg-3)',
            border: '1px solid var(--border-md)', borderLeft: 'none', borderRadius: '0 6px 6px 0',
            fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 700,
            color: 'var(--text-2)', letterSpacing: '0.08em', cursor: 'not-allowed',
            whiteSpace: 'nowrap'
          }}
        >
          DB OFFLINE
        </button>
      </form>

      <p style={{ marginTop: '10px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#ff9a5c' }}>
        Waitlist capture is disabled until `NEXT_PUBLIC_CONVEX_URL` is set and `npx convex dev` has generated the real client files.
      </p>

      <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)' }}>
          Convex not connected yet
        </div>
        <div style={{ height: '1px', flex: 1, background: 'var(--border)' }} />
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-3)', letterSpacing: '0.1em' }}>NO SPAM. EVER.</div>
      </div>
    </>
  )
}

function WaitlistSignup() {
  return convexEnabled ? <ConfiguredWaitlistSignup /> : <OfflineWaitlistSignup />
}

export default function Home() {
  const [accent, setAccent] = useState('#FF5500')
  const [accentDark, setAccentDark] = useState('#CC4400')
  const [scanlines, setScanlines] = useState(false)
  const [tweaksOpen, setTweaksOpen] = useState(false)
  const waitlistRef = useRef<HTMLDivElement>(null)

  /* Apply CSS variables reactively */
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--accent', accent)
    root.style.setProperty('--accent-d', accentDark)
    root.style.setProperty('--accent-a', hexToAlpha(accent, 0.12))
  }, [accent, accentDark])

  function handleAccent(col: string, dark: string) {
    setAccent(col)
    setAccentDark(dark)
  }

  function scrollToWaitlist() {
    waitlistRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <>
      {/* Inject styles globally */}
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />

      {/* Scanlines overlay */}
      {scanlines && <div className="scan-overlay" />}

      {/* Tweaks panel */}
      <TweaksPanel
        open={tweaksOpen}
        onClose={() => setTweaksOpen(false)}
        accent={accent}
        onAccent={handleAccent}
        scanlines={scanlines}
        onScanlines={setScanlines}
      />

      {/* ── NAV ─────────────────────────────────── */}
      <nav className="r8-nav">
        <a className="r8-nav-logo" href="#waitlist">
          <div className="r8-nav-badge"><Rule8Logo size={28} accent={accent} /></div>
          <span className="r8-nav-text">RULE8</span>
        </a>
        <div className="r8-nav-links">
          <a className="r8-nav-link" href="#agents">AGENT_ROSTER</a>
        </div>
      </nav>

      {/* ── WAITLIST HERO ─────────────────────────────────── */}
      <div id="waitlist" ref={waitlistRef} style={{ maxWidth: '1040px', margin: '80px auto 60px', padding: '0 24px', display: 'flex', gap: '60px', alignItems: 'center', flexWrap: 'wrap' }}>
        
        {/* Left: Copy + Form */}
        <div style={{ flex: '1 1 460px' }}>
          <div style={{ 
            fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent)', textTransform: 'uppercase', 
            letterSpacing: '0.15em', marginBottom: '28px', display: 'flex', alignItems: 'center', gap: '10px' 
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', animation: 'pulse-ring 2s infinite' }} />
            EARLY ACCESS · LIMITED SEATS
          </div>

          <h1 style={{ 
            fontFamily: 'var(--font-display)', fontSize: 'clamp(44px, 6vw, 80px)', fontWeight: 700, 
            lineHeight: 0.92, letterSpacing: '-0.04em', textTransform: 'uppercase', margin: '0 0 28px 0', color: 'var(--text-1)' 
          }}>
            AUTOMATE THE <br/>
            <span style={{ color: 'var(--accent)' }}>GRUNT WORK.</span>
          </h1>

          <p style={{ 
            fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--text-2)', 
            maxWidth: '440px', lineHeight: 1.7, marginTop: '0', marginBottom: '36px' 
          }}>
            Rule8 connects to your tools, monitors support, billing, and community activity, and handles the grunt work — so you can stay focused on building.
          </p>

          <WaitlistSignup />
        </div>

        {/* Right: Terminal Preview */}
        <div style={{ flex: '0 0 360px', width: '100%' }}>
          <div style={{ 
            background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: '8px',
            overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.8)'
          }}>
            <div style={{ 
              background: 'var(--bg-2)', borderBottom: '1px solid var(--border)', padding: '10px 16px', 
              display: 'flex', alignItems: 'center', gap: '8px'
            }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--border)' }} />
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--border)' }} />
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--border)' }} />
              <div style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-3)' }}>live_stream.log</div>
            </div>
            <div style={{ padding: '20px 24px', height: '320px', display: 'flex', flexDirection: 'column', gap: '12px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-2)' }}>
              <div><span style={{ color: 'var(--accent)' }}>[14:52]</span> <span style={{ color: 'var(--text-1)' }}>_NODE_01</span> booted.</div>
              <div><span style={{ color: 'var(--accent)' }}>[14:52]</span> Scanning Zendesk queue...</div>
              <div><span style={{ color: 'var(--accent)' }}>[14:52]</span> 842 tickets ingested.</div>
              <div style={{ color: 'var(--text-3)' }}>[████████████████] 100%</div>
              <div style={{ color: 'var(--accent)' }}>&gt; 801 tickets neutralized.</div>
              <div style={{ borderBottom: '1px solid var(--border)', margin: '2px 0' }} />
              <div><span style={{ color: 'var(--accent)' }}>[14:53]</span> <span style={{ color: 'var(--text-1)' }}>_NODE_02</span> hunting churn...</div>
              <div><span style={{ color: 'var(--accent)' }}>[14:53]</span> Analyzing Stripe webhooks.</div>
              <div style={{ color: 'var(--accent)' }}>&gt; 3 invoices recovered ($1,290)</div>
              <div style={{ borderBottom: '1px solid var(--border)', margin: '2px 0' }} />
              <div><span style={{ color: 'var(--accent)' }}>[14:54]</span> <span style={{ color: 'var(--text-1)' }}>_NODE_03</span> scanning Discord...</div>
              <div><span style={{ color: 'var(--accent)' }}>[14:54]</span> 3 toxic threads suppressed.</div>
              <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-1)' }}>
                &gt; AWAITING ORDERS <span style={{ display: 'inline-block', width: '7px', height: '13px', background: 'var(--accent)', animation: 'pulse-ring 1s infinite' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── AGENTS ───────────────────────────────── */}
      <section className="r8-section" id="agents">
        <div className="r8-section-wrap">
          <div className="r8-section-comment">// THE_CORE_SQUAD</div>
          <div className="r8-section-header">
            <div>
              <h2 className="r8-section-title">8 AGENTS. ZERO OVERHEAD.</h2>
            </div>
            <div className="r8-section-roster">[ROSTER_V4.2]</div>
          </div>
          <p className="r8-section-sub">Hardened, specialized agents that integrate into your stack within minutes.</p>

          <div className="r8-agents-grid">

            {/* UNIT 01 */}
            <div className="r8-agent-card">
              <div className="r8-agent-preview">
                <div className="r8-agent-status-dot" />
                <span className="r8-agent-preview-label">AUTORESOLVE_NODE</span>
              </div>
              <div className="r8-agent-body">
                <div className="r8-agent-meta">
                  <span className="r8-unit-badge" style={{ background: accent }}>UNIT_01</span>
                  <span className="r8-agent-codename">AUTORESOLVE_NODE</span>
                </div>
                <div className="r8-agent-name" style={{ color: 'var(--accent)' }}>SUPPORT_CORE</div>
                <p className="r8-agent-desc">Handles L1 and L2 customer inquiries with autonomous resolution rates exceeding 88%. Plugs directly into Intercom, Crisp, and your help docs.</p>
                <div className="r8-agent-integrations">
                  <span className="r8-int-pill">INTERCOM</span>
                  <span className="r8-int-pill">CRISP</span>
                  <span className="r8-int-pill">DOCS</span>
                </div>
                <div className="r8-agent-footer">
                  <div className="r8-agent-state">STATE: <span>READY+</span></div>
                  <button className="r8-agent-add" type="button" onClick={scrollToWaitlist}>+</button>
                </div>
              </div>
            </div>

            {/* UNIT 02 */}
            <div className="r8-agent-card">
              <div className="r8-agent-preview">
                <div className="r8-agent-status-dot" />
                <span className="r8-agent-preview-label">RECOVERY_PROTOCOL</span>
              </div>
              <div className="r8-agent-body">
                <div className="r8-agent-meta">
                  <span className="r8-unit-badge" style={{ background: accent }}>UNIT_02</span>
                  <span className="r8-agent-codename">RECOVERY_PROTOCOL</span>
                </div>
                <div className="r8-agent-name" style={{ color: 'var(--accent)' }}>BILLING_AUDIT</div>
                <p className="r8-agent-desc">Monitors Stripe events, recovers failed payments, and runs churn-mitigation playbooks. Stripped-back financial enforcement that pays for itself.</p>
                <div className="r8-agent-integrations">
                  <span className="r8-int-pill">STRIPE</span>
                  <span className="r8-int-pill">PADDLE</span>
                  <span className="r8-int-pill">DUNNING</span>
                </div>
                <div className="r8-agent-footer">
                  <div className="r8-agent-state">STATE: <span>READY+</span></div>
                  <button className="r8-agent-add" type="button" onClick={scrollToWaitlist}>+</button>
                </div>
              </div>
            </div>

            {/* UNIT 03 — featured */}
            <div className="r8-agent-card featured">
              <div className="r8-agent-preview">
                <div className="r8-agent-status-dot" />
                <span className="r8-agent-preview-label">COMMUNITY_SYNC</span>
              </div>
              <div className="r8-agent-body">
                <div className="r8-agent-meta">
                  <span className="r8-unit-badge" style={{ background: accent }}>UNIT_03</span>
                  <span className="r8-agent-codename">COMMUNITY_SYNC</span>
                </div>
                <div className="r8-agent-name" style={{ color: 'var(--accent)' }}>NEXUS_MODERATION</div>
                <p className="r8-agent-desc">Moderates Discord and Slack. Surfaces feature requests, identifies power users, and suppresses toxic noise before you ever see it.</p>
                <div className="r8-agent-integrations">
                  <span className="r8-int-pill">DISCORD</span>
                  <span className="r8-int-pill">SLACK</span>
                  <span className="r8-int-pill">X</span>
                </div>
                <div className="r8-agent-footer">
                  <div className="r8-agent-state">STATE: <span>READY+</span></div>
                  <button className="r8-agent-add" type="button" onClick={scrollToWaitlist}>+</button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── INTEGRATIONS ─────────────────────────── */}
      <div className="r8-integrations-section">
        <div className="r8-integrations-header">
          <span style={{ fontSize: '10px', color: '#444', letterSpacing: '.08em' }}>// NATIVE_INTEGRATIONS</span>
          <span style={{ fontSize: '10px', color: '#444', letterSpacing: '.08em' }}>8_NODES</span>
        </div>
        <div className="r8-integrations-grid">
          {['STRIPE', 'INTERCOM', 'DISCORD', 'SLACK', 'LINEAR', 'GITHUB', 'NOTION', 'POSTHOG'].map(name => (
            <div key={name} className="r8-int-cell">{name}</div>
          ))}
        </div>
      </div>

      {/* ── FINAL CTA ─────────────────────────────── */}
      <div className="r8-final-section">
        <div className="r8-final-card">
          <div>
            <div className="r8-final-comment">// FINAL_DIRECTIVE</div>
            <h2 className="r8-final-title">
              Stop answering tickets.<br />
              <span className="dim">Start shipping again.</span>
            </h2>
            <p className="r8-final-sub">Spin up your agent team in under five minutes. No contracts. Cancel any cycle.</p>
          </div>
          <button
            className="r8-btn-primary"
            type="button"
            style={{ background: 'var(--accent)', whiteSpace: 'nowrap', flexShrink: 0, color: '#000' }}
            onClick={scrollToWaitlist}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-d)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent)')}
          >
            DEPLOY AGENT CORE →
          </button>
        </div>
      </div>

      {/* ── FOOTER ───────────────────────────────── */}
      <footer className="r8-footer">
        <div className="r8-footer-build">BUILD: 1.0.4-STABLE · NODE: GLOBAL_EDGE · ENC: AES-256-GCM</div>
        <div className="r8-footer-copy">© 2026 RULE8 — BUILD EVERYTHING</div>
      </footer>
    </>
  )
}
