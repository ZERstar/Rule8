# Rule8 — Feature Document
**Multi-agent AI team for indie hackers**
*Customer support · Billing · Community — so you can stay focused on building.*

---

## 1. Product Overview

Rule8 is a MaaS (Multi-Agent-as-a-Service) platform that replaces the support/ops layer for indie hackers and solo founders. You connect your tools once, define your product context once, and a team of AI agents handles the rest — autonomously, on real surfaces, with full observability.

**Target user:** Indie hackers running live products — solo or 2-person teams — who are losing 2–4 hours/day to support tickets, billing queries, and community moderation instead of building.

**Core pain:** Every hour spent copy-pasting Stripe receipts or answering "how do I cancel?" is an hour not spent shipping. Rule8 makes that entire layer disappear.

---

## 2. Agent Org Structure

### Overseer Agent (Manager)
- Receives all inbound tasks across channels
- Classifies intent: `SUPPORT` / `BILLING` / `COMMUNITY` / `ESCALATE`
- Delegates to the right specialist with full context packet
- Monitors specialist output before it's sent; blocks if quality check fails
- Spawns a second specialist instance if response latency exceeds threshold
- Sends escalation alert to founder if confidence < threshold or if flagged keywords hit

### Support Agent (Specialist 1)
- Handles tickets from Intercom / Crisp / email
- Pulls product context (what the product does, known issues, FAQ bank) from memory
- Drafts response, tags ticket, marks resolved
- Escalates: refund requests > $X, abuse, legal language, account deletion

### Billing Agent (Specialist 2)
- Handles billing queries routed from any channel
- Connects to Stripe: pulls invoice, subscription status, payment history for the user
- Responds: confirms payments, explains charges, initiates Stripe refunds (within founder-defined rules)
- Never processes refunds outside defined policy — escalates instead

### Community Agent (Specialist 3)
- Monitors Discord / Slack / forum channels defined by founder
- Responds to product questions, onboarding confusion, feature requests
- Moderates: flags spam, removes defined violation patterns, DMs warnings
- Tags feature requests and bug reports → writes them to a structured backlog in Convex

---

## 3. User Journeys

### Journey 1: Onboarding (one-time)
1. Sign up with email / GitHub
2. Connect tools: Intercom or Crisp → Stripe → Discord or Slack
3. Fill product context form:
   - What your product does (2–3 sentences)
   - Pricing tiers and what each includes
   - Refund policy (yes/no, conditions, $ limit)
   - Escalation rules (what the agent must never handle alone)
   - Tone (friendly / professional / casual)
4. Agents activate. First task handled within minutes of connection.

### Journey 2: Inbound Support Ticket
1. User submits ticket on Intercom
2. Webhook fires → Overseer receives payload
3. Overseer classifies: `SUPPORT`
4. Support Agent pulls product context + ticket history for this user
5. Drafts response → quality check → sends reply on Intercom
6. Logs trace: ticket_id, agent_id, tokens, cost, latency, confidence score

### Journey 3: Billing Query in Discord
1. User posts "I was charged twice this month" in #support channel
2. Community Agent flags as billing intent → hands off to Overseer with context
3. Overseer re-delegates to Billing Agent
4. Billing Agent pulls Stripe charges for user's email → confirms duplicate → initiates refund (if within policy)
5. Community Agent posts resolution back in Discord thread
6. Full trace logged across 3 agents

### Journey 4: Founder Reviews Activity
1. Opens Rule8 dashboard
2. Sees agent activity feed: all tasks in last 24h, status, cost, outcome
3. Filters by: escalated / resolved / billing / community
4. Clicks any task → full trace tree (agent-by-agent, step-by-step, tokens + cost per step)
5. Reviews escalated items → approves or overrides

### Journey 5: Adding a New Agent Role (Management UI)
1. Founder clicks "New Agent"
2. Fills: role name, responsibility description, connected tool, output format
3. Uploads 2–3 example tasks + ideal responses as reference
4. Agent goes live — no code

---

## 4. Management UI (Non-eng operable)

| Screen | What it does |
|--------|-------------|
| **Dashboard** | Live feed: tasks in progress, resolved today, escalated, total cost today |
| **Agent Roster** | All active agents, their role, tool connections, status (active/paused) |
| **New Agent** | Form: role, tools, policy rules, tone, examples → agent goes live |
| **Trace Explorer** | Every run: filter by agent, date, status → click → full trace tree |
| **Escalation Queue** | Items the agents flagged for founder review → approve / override / reassign |
| **Backlog** | Feature requests + bugs tagged by Community Agent — exportable |
| **Settings** | Product context, refund policy, escalation rules, tone, API keys |

---

## 5. Observability (Rubric: 7x weight)

Every agent step writes a structured trace record to Convex:

```
trace {
  run_id
  task_id
  agent_id (overseer / support / billing / community)
  step_number
  input_tokens
  output_tokens
  cost_usd
  latency_ms
  confidence_score
  action_taken
  output_preview
  status (success / escalated / failed)
  timestamp
}
```

**Dashboard capabilities:**
- Trace tree per run (who called whom, in order)
- Token + cost per step
- Filter by agent, date, status, channel
- Side-by-side run diff (pick two run_ids → compare outputs)
- Failure alert → Slack DM to founder
- Cost spike alert if daily spend > founder-defined threshold

---

## 6. Eval & Iteration Pipeline (Rubric: 5x weight)

**Eval set:** Founder curates 20–30 real past tasks + ideal responses → stored in Convex as `eval_cases`

**Automated eval:** On every prompt/agent version change:
- Eval runner replays all cases against new version
- Scores: response accuracy, tone match, policy compliance, escalation correctness
- If score drops > 5% → version blocked, founder notified

**Versioning:** Every agent config (system prompt, tools, policy) is version-controlled in Convex with timestamp + diff

**Closed loop:** Failed live runs → auto-added to eval set with founder's correction as the ground truth

---

## 7. Agent Handoffs & Memory (Rubric: 2x weight)

**Working memory (current task):** Full context packet passed between agents — user identity, channel, prior messages, product context

**Episodic memory (per user):** Convex stores prior interactions per `user_email` — Support Agent knows if this user filed 3 tickets last month

**Semantic memory (product + policy):** Shared knowledge base — product context, pricing, policies, FAQ bank — all agents read from same source

**Handoff protocol:** When Overseer delegates, it passes: `{task, user_context, prior_history, policy_rules, output_format_expected}` — next agent never starts from zero

---

## 8. Third-party Integrations

| Tool | What agents use it for |
|------|----------------------|
| **Intercom / Crisp** | Support Agent reads + replies to tickets |
| **Stripe** | Billing Agent pulls charges, subscriptions, initiates refunds |
| **Discord** | Community Agent reads channels, posts replies, moderates |
| **Slack** | Community Agent (alternative to Discord) |
| **Resend** | Email fallback for support replies |
| **NVIDIA API** | All agents run on claude-sonnet-4-20250514 |
| **Convex** | Database, backend functions, trace storage, memory, eval storage |
| **Vercel** | Deployment |
| **GitHub** | Version control, eval CI pipeline trigger |

---

## 9. Scoring Strategy (MaaS Rubric)

| Parameter | Target | How |
|-----------|--------|-----|
| Real output (20x) | L5 | Agents reply on real Intercom tickets, Discord posts, Stripe refunds — with timestamps + screenshots |
| Agent org (5x) | L4–L5 | Overseer spawns second specialist on latency breach; classifies dynamically |
| Observability (7x) | L4–L5 | Custom Convex-backed trace UI, side-by-side diffs, cost per step, Slack alerts |
| Eval & iteration (5x) | L4 | Automated eval pipeline on version change, version-controlled prompts |
| Handoffs & memory (2x) | L4–L5 | Episodic memory per user + semantic shared knowledge base |
| Cost/latency (1x) | L4 | Target: < 5 min per task, < $0.50 |
| Management UI (1x) | L5 | New agent role live in < 10 min with no code |

---

## 10. Stack

```
Frontend:   Next.js (React) — Vercel
Backend:    Convex (DB + server functions + real-time)
Agents:     NVIDIA API (qwen)
Auth:       Convex Auth
Webhooks:   Intercom / Stripe / Discord webhooks → Convex HTTP actions
Eval CI:    GitHub Actions → Convex eval runner
```

---

## 11. POC Prompt (validate the brain before building)

Test this in Claude chat before touching Claude Code:

```
You are the Support Agent for [product name]. 

Product: [2-3 sentence description]
Pricing: [tiers]
Refund policy: [policy]
Tone: [friendly / professional]

Here is a support ticket:
User: [email]
Message: "I've been charged twice this month, can you fix this?"

Your job: classify this ticket (support / billing / escalate), 
draft a response, and state what action you'd take in Stripe.
```

If the draft is accurate, specific, and on-tone → build. If not → refine prompt first.

---

*Rule8 — Eight rules the agents follow. Zero tickets for you.*