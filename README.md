# Rule8

**Agent OS for founders.** AI crews handle customer support, billing, and community autonomously — so you stay focused on building.

## Stack

- **Frontend:** Next.js 15 App Router + Tailwind CSS + shadcn/ui
- **Backend:** Convex (real-time queries, mutations, actions, webhooks)
- **Auth:** Better Auth (via `@convex-dev/better-auth`)
- **AI:** Anthropic Claude / NVIDIA via `lib/anthropic.ts`
- **Deployment:** Vercel (frontend) + Convex cloud (`tough-dog-533`)

## Docs

| File | What it covers |
|---|---|
| `SYSTEM_FLOW.md` | Page-by-page data flow, memory layers, auth lifecycle, known gaps |
| `ONBOARDING_PLAN.md` | Flexible verticals plan — industry templates, schema changes, onboarding wizard |
| `CLAUDE.md` / `AGENTS.md` | Convex coding guidelines (read before touching `convex/`) |

## Dev

```bash
npm run dev          # Next.js dev server (port 3000)
npx convex dev       # Convex dev backend (watches convex/)
```

Set `SITE_URL=http://localhost:3000` on the Convex dev deployment for local auth to work.
