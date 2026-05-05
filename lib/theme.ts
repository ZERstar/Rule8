/**
 * Rule8 Design System
 * Dark OS-terminal aesthetic — Agent OS for solo builders
 */

export const theme = {
  /* ── Backgrounds ── */
  bg:      "#0B0A09",   // page base — near-black warm
  surface: "#141210",   // primary surfaces, cards
  raised:  "#1C1917",   // elevated cards, modals
  overlay: "#242018",   // tooltips, dropdowns

  /* ── Borders ── */
  border:      "rgba(255,255,255,0.07)",
  borderHover: "rgba(255,255,255,0.14)",
  borderFocus: "rgba(249,115,22,0.40)",
  borderStrong:"rgba(255,255,255,0.20)",

  /* ── Text ── */
  text:     "#F2EDE6",  // primary — warm off-white
  textSub:  "#BDB5AB",  // secondary
  muted:    "#7A746C",  // tertiary / labels
  faint:    "#3D3830",  // very low contrast — dividers, placeholders

  /* ── Brand accent — orange ── */
  orange:      "#F97316",
  orangeHover: "#EA6B10",
  orangeDim:   "rgba(249,115,22,0.12)",
  orangeBorder:"rgba(249,115,22,0.25)",

  /* ── Status ── */
  green:    "#22C55E",
  greenDim: "rgba(34,197,94,0.12)",
  red:      "#EF4444",
  redDim:   "rgba(239,68,68,0.12)",
  amber:    "#F59E0B",
  amberDim: "rgba(245,158,11,0.12)",
  blue:     "#60A5FA",
  purple:   "#A78BFA",

  /* ── Crew colours ── */
  crew: {
    finance:   "#2DD4BF",
    support:   "#60A5FA",
    community: "#A78BFA",
    executive: "#F97316",
  },
} as const;

/* ── Typography ── */
export const font = {
  sans: "var(--font-inter), system-ui, -apple-system, sans-serif",
  mono: "'SFMono-Regular', 'Fira Code', Consolas, monospace",
} as const;

/* ── Spacing / radius ── */
export const radius = {
  sm:   "6px",
  md:   "10px",
  lg:   "16px",
  xl:   "20px",
  full: "9999px",
} as const;

/* ── Reusable CSS variable map — apply via globals.css ── */
export const cssVars = `
  --color-bg:           ${theme.bg};
  --color-surface:      ${theme.surface};
  --color-raised:       ${theme.raised};
  --color-border:       ${theme.border};
  --color-text:         ${theme.text};
  --color-muted:        ${theme.muted};
  --color-faint:        ${theme.faint};
  --color-orange:       ${theme.orange};
  --color-orange-dim:   ${theme.orangeDim};
  --color-green:        ${theme.green};
  --color-green-dim:    ${theme.greenDim};
  --color-red:          ${theme.red};
  --color-amber:        ${theme.amber};
  --color-blue:         ${theme.blue};
  --color-purple:       ${theme.purple};
`;
