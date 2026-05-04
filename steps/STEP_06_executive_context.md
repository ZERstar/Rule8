# STEP 06 — Executive AI: Real Context

**Phase:** 2 — Agent Intelligence
**Depends on:** STEP_05
**Estimated time:** 3–4 hours

---

## Why

Executive currently receives 4 aggregate numbers. The founder asks "what happened with the support ticket an hour ago?" and Executive has no idea. This step injects page data, productContext, and recent traces into every Executive message so the AI answers from real workspace knowledge instead of generic platitudes.

---

## Part A — Extend `chat.send` to accept page context

**Modify: `convex/chat.ts`**

Add optional context args to the `send` action:

```ts
export const send = action({
  args: {
    workspaceId: v.string(),
    text:        v.string(),
    // NEW — page context sent from ExecutivePanel
    pageContext: v.optional(v.object({
      page:     v.string(),                        // pathname e.g. "/dashboard/escalations"
      snapshot: v.optional(v.string()),            // JSON string of top rows visible
    })),
  },
  handler: async (ctx, args): Promise<string> => {
    // 1. Persist founder message
    await ctx.runMutation(internal.chat.insertMessage, {
      workspaceId: args.workspaceId,
      role: "founder",
      text: args.text,
    });

    // 2. Fetch workspace context in parallel
    const [stats, recentHistory, contextRows, recentTraces] = await Promise.all([
      ctx.runQuery(api.tasks.getStats,           { workspaceId: args.workspaceId }),
      ctx.runQuery(internal.chat.listRecent,      { workspaceId: args.workspaceId, limit: 12 }),
      ctx.runQuery(api.productContext.listAll,    { workspaceId: args.workspaceId }),
      ctx.runQuery(internal.traces.listForContext,{ workspaceId: args.workspaceId, limit: 12 }),
    ]);

    // 3. Build context map from productContext rows
    const ctxMap = Object.fromEntries((contextRows ?? []).map((r) => [r.key, r.value]));

    // 4. Build system prompt
    const systemPrompt = buildExecutiveChatPrompt({
      workspaceId:        args.workspaceId,
      agentCount:         stats.agentsManaged,
      tasksToday:         stats.tasksToday,
      costTodayCents:     stats.costTodayCents,
      escalatedCount:     stats.escalated,
      // NEW fields:
      productDescription: ctxMap.product_description,
      refundPolicy:       ctxMap.refund_policy,
      escalationRules:    ctxMap.escalation_rules,
      agentTone:          ctxMap.agent_tone,
      currentPage:        args.pageContext?.page,
      pageSnapshot:       args.pageContext?.snapshot,
      recentTraces:       (recentTraces ?? []).map(
        (t) => `[${t.agentTag}] ${t.action} → ${t.status} (${t.latencyMs}ms)`,
      ),
    });

    // 5. Build conversation history
    const history = [...recentHistory].reverse().slice(0, -1);
    const historyLines = history
      .map((m) => `${m.role === "founder" ? "Founder" : "Executive"}: ${m.text}`)
      .join("\n");
    const userPrompt = historyLines
      ? `${historyLines}\nFounder: ${args.text}`
      : args.text;

    // 6. Call model
    const result = await runAgentModel({
      systemPrompt,
      userPrompt,
      maxTokens: 600,
      mockText: "I'm reviewing the workspace now. What would you like to focus on?",
    });

    // 7. Persist executive reply
    await ctx.runMutation(internal.chat.insertMessage, {
      workspaceId: args.workspaceId,
      role: "executive",
      text: result.text,
    });

    return result.text;
  },
});
```

---

## Part B — Extend `buildExecutiveChatPrompt`

**Modify: `lib/agents/prompts.ts`**

```ts
type ExecutiveChatPromptArgs = {
  workspaceId:         string;
  agentCount:          number;
  tasksToday:          number;
  costTodayCents:      number;
  escalatedCount:      number;
  // NEW:
  productDescription?: string;
  refundPolicy?:       string;
  escalationRules?:    string;
  agentTone?:          string;
  currentPage?:        string;
  pageSnapshot?:       string;
  recentTraces?:       string[];
};

export function buildExecutiveChatPrompt(args: ExecutiveChatPromptArgs): string {
  const costDisplay = `$${(args.costTodayCents / 100).toFixed(2)}`;

  const lines = [
    "You are the Rule8 Executive AI — a strategic operations assistant for an AI-native startup.",
    `Workspace: ${args.workspaceId}.`,
    `Workspace state: ${args.agentCount} agents, ${args.tasksToday} tasks today, ${costDisplay} spent, ${args.escalatedCount} escalations pending.`,
    "",
  ];

  if (args.productDescription) {
    lines.push(`PRODUCT: ${args.productDescription}`);
  }
  if (args.refundPolicy) {
    lines.push(`REFUND POLICY: ${args.refundPolicy}`);
  }
  if (args.escalationRules) {
    lines.push(`ESCALATION RULES: ${args.escalationRules}`);
  }

  if (args.currentPage) {
    lines.push(``, `FOUNDER IS CURRENTLY VIEWING: ${args.currentPage}`);
  }
  if (args.pageSnapshot) {
    lines.push(`PAGE DATA SNAPSHOT: ${args.pageSnapshot}`);
  }

  if (args.recentTraces?.length) {
    lines.push(``, `RECENT AGENT ACTIVITY (last 12 steps):`);
    args.recentTraces.forEach((t) => lines.push(`  ${t}`));
  }

  lines.push(
    ``,
    "Answer concisely and directly. Reference workspace numbers and product context when relevant.",
    "Keep responses under 4 sentences unless the founder asks for detail.",
    "When you can take an action (dispatch task, route escalation), say what you are doing.",
  );

  return lines.join("\n");
}
```

---

## Part C — Add `listForContext` internal query to traces

**Modify: `convex/traces.ts`**

```ts
export const listForContext = internalQuery({
  args: { workspaceId: v.string(), limit: v.number() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("traces")
      .withIndex("by_workspace_and_created_at", (q) =>
        q.eq("workspaceId", args.workspaceId)
      )
      .order("desc")
      .take(args.limit);
  },
});
```

---

## Part D — Pass page context from `ExecutivePanel`

**Modify: `components/dashboard/ExecutivePanel.tsx`**

The `send` function already calls `api.chat.send`. Extend it to pass the current page and a snapshot of the context stats:

```ts
async function send(text: string) {
  if (!text.trim() || isTyping) return;
  setInput("");
  setIsTyping(true);
  try {
    await sendChat({
      workspaceId,
      text,
      // Pass current page + context stats as a snapshot
      pageContext: {
        page:     pathname,
        snapshot: JSON.stringify(contextStats),
      },
    });
  } catch (err) {
    console.error("Executive chat error:", err);
  } finally {
    setIsTyping(false);
  }
}
```

Also update the two header shortcut buttons (`Clarify`, `Notify`) to pass pageContext the same way.

---

## Part E — Executive can dispatch tasks

If the founder types a command like "dispatch a support task: customer can't log in", Executive should route it.

**Modify: `convex/chat.ts`** — after getting the model response, check for a structured action:

```ts
// After result = await runAgentModel(...)
// Look for a dispatch instruction in the response text
const dispatchMatch = result.text.match(/\[DISPATCH:([^\]]+)\]/);
if (dispatchMatch) {
  const summary = dispatchMatch[1].trim();
  await ctx.runAction(api.tasks.submitManualTask, {
    workspaceId: args.workspaceId,
    summary,
  });
}
// Strip the dispatch tag from the visible response
const cleanText = result.text.replace(/\[DISPATCH:[^\]]+\]/, "").trim();
```

Add to the Executive system prompt:
```
When the founder asks you to dispatch or create a task, include exactly this in your response:
[DISPATCH: <one sentence task summary>]
```

---

## Acceptance Criteria

- [ ] `convex/chat.ts` `send` action accepts `pageContext` arg
- [ ] `buildExecutiveChatPrompt` includes productDescription, refundPolicy, escalationRules when set
- [ ] `buildExecutiveChatPrompt` includes current page and snapshot when provided
- [ ] `buildExecutiveChatPrompt` includes last 12 trace lines
- [ ] `convex/traces.ts` exports `listForContext` as an internalQuery
- [ ] `ExecutivePanel` passes `pageContext` on every send
- [ ] When asked "what happened recently?", Executive response references actual trace actions
- [ ] When productContext is populated, Executive answers questions about the product correctly
- [ ] `npx tsc --noEmit` passes

---

## Completion Notes

- Date completed: 2026-05-02
- Deviations from spec: `chat.send` uses `internal.productContext.listAllInternal` instead of public `api.productContext.listAll` so the server-side action does not depend on client query auth. Dispatch is handled from either the model's `[DISPATCH: ...]` tag or a deterministic founder-command fallback, because live model responses may comply with the intent without emitting the tag. Post-review fix on 2026-05-02: `chat.list`, `chat.send`, and `tasks.submitManualTask` now validate workspace ownership before reading or writing workspace data, and the dashboard overview chat path now passes page context.
- New files created not listed above: None.
- Anything the next agent should know: Verified with `step5-test-workspace`, which now also has Step 6 chat/task test data. Executive answered "What happened recently?" using actual trace activity, and a dispatch command created a new support task that routed and resolved through Support Lead. Ownership checks were verified with unauthorized `chat:list`/`chat:send` failures and an owned workspace success path. All agents returned to `idle`.
