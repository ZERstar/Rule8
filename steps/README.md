# Rule8 — Implementation Steps

> Each file in this directory is a self-contained implementation spec.
> An agent (or developer) can pick up any step, read it top to bottom, and ship it without needing to read any other step file.
>
> Steps are ordered. Always check the **Depends on** field before starting.
> Each step has acceptance criteria — verify every bullet before marking done.

---

## Step Index

| File | Title | Phase | Depends on |
|---|---|---|---|
| [STEP_01](STEP_01_cleanup.md) | Codebase Cleanup | 1 | nothing |
| [STEP_02](STEP_02_workspaces_auth.md) | Workspaces & Auth Foundation | 1 | STEP_01 |
| [STEP_03](STEP_03_notifications_prefs.md) | Notifications & User Preferences | 1 | STEP_02 |
| [STEP_04](STEP_04_product_context_ui.md) | Product Context Editor | 2 | STEP_02 |
| [STEP_05](STEP_05_agent_intelligence.md) | Agent Intelligence (prompts + tool executor) | 2 | STEP_04 |
| [STEP_06](STEP_06_executive_context.md) | Executive AI — Real Context | 2 | STEP_05 |
| [STEP_07](STEP_07_task_detail.md) | Task Detail & Trace Timeline | 3 | STEP_02 |
| [STEP_08](STEP_08_ux_polish.md) | UX Polish (empty states, topbar, filters) | 3 | STEP_07 |
| [STEP_09](STEP_09_outbound_integrations.md) | Outbound Integrations | 4 | STEP_05 |
| [STEP_10](STEP_10_reliability.md) | Reliability (retry, idempotency, health) | 4 | STEP_09 |
| [STEP_11](STEP_11_onboarding.md) | Onboarding — Executive-Assisted Hybrid | 5 | STEP_02, STEP_04, STEP_06 |
| [STEP_12](STEP_12_value_engine.md) | Value Engine (digest, signals, ROI, anomalies) | 6 | STEP_06, STEP_09 |

---

## Fast-track to first happy flow

The business doc (`business_product_plan.md` §10.1) is explicit:
> *"Nothing else until the tool executor runs real API calls and one complete task resolves end-to-end on a live surface."*

If you want the shortest path to that proof point:

```
STEP_04 → STEP_05 → STEP_09
```

That's: product context in prompts → tool executor loop → real outbound Intercom/Stripe calls.
Everything else (auth, notifications, UX, onboarding) can follow.

---

## Rules for agents executing these steps

1. **Read this README first**, then read the specific step file completely before writing any code.
2. **Read `convex/_generated/ai/guidelines.md`** before touching any file in `convex/`.
3. **One step at a time.** Do not start STEP_03 while STEP_02 is incomplete.
4. **Run the acceptance criteria** at the end. If any bullet fails, fix it before marking done.
5. **Do not modify `SYSTEM_FLOW.md`, `ONBOARDING_PLAN.md`, `PRODUCT_PLAN.md`, or `business_product_plan.md`** — those are reference docs, not working files.
6. When done, add a `## Completion Notes` section at the bottom of the step file with: date, deviations from spec, and any new files created that weren't listed.

---

## Key architectural principles (from business_product_plan.md)

Read these before implementing any step. They override intuition.

**Executive is the harness, not an agent.**
Executive routes, assembles context, activates specialists, checks output, and escalates. It does not handle tasks directly. It is not configurable by the founder. Its system prompt is a Rule8 engineering decision.

**Crews are generalist containers. Specialists are on-demand expertise units.**
A crew owns a surface area. When a task arrives, Executive activates the right specialist(s) inside that crew based on what the task needs — not which crew it arrived in. Multiple specialists can run in parallel for complex tasks.

**Every inbound signal is a task. Source is metadata.**
Whether it comes from Intercom, Discord, Stripe, email, or manual input — it normalises to a standard task structure before Executive sees it. Specialist logic never branches on source.

**The aha moment is the first task that completes without them.**
Everything before that is setup. Everything after is retention. Build toward that moment first.

**Discovering unknown problems is Rule8. Confirming known problems is a dashboard.**
Signal clustering, cross-surface correlation, and anomaly detection (STEP_12) are what separate the product from a pretty activity log.

---

## What we're building

Rule8 is the operational co-founder for solo builders — it runs your business while you build your product.

AI crews handle support, billing, and community autonomously. Executive routes every signal, assembles context, and surfaces what needs a human decision — with everything already assembled. The founder manages Executive. Specialists are invisible infrastructure.

Stack: Next.js 15 App Router · Convex · Better Auth · Anthropic/NVIDIA · Tailwind · shadcn/ui
