# STEP 05 — Agent Intelligence (prompts + tool executor)

**Phase:** 2 — Agent Intelligence
**Depends on:** STEP_04
**Estimated time:** 6–8 hours

---

## Why

Agents currently use 3-line generic prompts and declare tools they never execute. This step injects productContext into every prompt and builds the tool execution loop. After this step, agents know what the product is, what the policies are, and can actually call Stripe/Intercom/Discord.

---

## Part A — Inject productContext into all prompts

### 1. Fetch context in agent runners

**Modify: `convex/agent_runner/billing.ts`, `support.ts`, `community.ts`**

At the start of `handleTask`, fetch the relevant context rows:

```ts
// Add to each handleTask action, after fetching the task:
const contextRows = await ctx.runQuery(api.productContext.listAll, {
  workspaceId: args.workspaceId,
});
const contextMap = Object.fromEntries(contextRows.map((r) => [r.key, r.value]));
```

### 2. Extend prompt builders

**Modify: `lib/agents/prompts.ts`**

Update `buildWorkerSystemPrompt` to accept and inject context:

```ts
type WorkerPromptArgs = {
  agentName:    string;
  crewName:     string;
  description:  string;
  // NEW:
  productDescription?: string;
  refundPolicy?:       string;
  escalationRules?:    string;
  agentTone?:          string;
  connectedProviders?: string[];  // e.g. ["stripe", "intercom"]
};

export function buildWorkerSystemPrompt(args: WorkerPromptArgs): string {
  const lines = [
    `You are ${args.agentName}, part of the ${args.crewName}.`,
    `Role: ${args.description}.`,
    "",
  ];

  if (args.productDescription) {
    lines.push(`PRODUCT: ${args.productDescription}`);
  }
  if (args.refundPolicy) {
    lines.push(`REFUND POLICY: ${args.refundPolicy}`);
  }
  if (args.escalationRules) {
    lines.push(`ESCALATION RULES (must follow exactly): ${args.escalationRules}`);
  }
  if (args.agentTone) {
    lines.push(`TONE: ${args.agentTone}`);
  }
  if (args.connectedProviders?.length) {
    lines.push(`AVAILABLE TOOLS: ${args.connectedProviders.join(", ")}.`);
  }

  lines.push(
    "",
    "Respond with a concise, founder-grade resolution.",
    "If the task cannot be resolved safely or violates any rule above, escalate immediately.",
    "Avoid filler. Prefer direct action and specific next steps.",
  );

  return lines.join("\n");
}
```

Update `buildOverseerSystemPrompt` similarly:

```ts
type OverseerPromptArgs = {
  workspaceId:        string;
  productDescription?: string;
  escalationRules?:   string;
};

export function buildOverseerSystemPrompt(args: OverseerPromptArgs): string {
  const lines = [
    "You are Overseer Prime, the Executive routing layer for Rule8 Agent OS.",
    `Workspace: ${args.workspaceId}.`,
  ];
  if (args.productDescription) {
    lines.push(`PRODUCT CONTEXT: ${args.productDescription}`);
  }
  if (args.escalationRules) {
    lines.push(`ALWAYS ESCALATE IF: ${args.escalationRules}`);
  }
  lines.push(
    'Classify inbound tasks into exactly one route: support, finance, community, or escalate.',
    'Return strict JSON: { "crewTag": "...", "confidence": 0.0–1.0, "reason": "..." }',
  );
  return lines.join(" ");
}
```

### 3. Pass context into each runner call

**Modify each runner's `handleTask`** to pass `contextMap` into the prompt builder:

```ts
// billing.ts:
const systemPrompt = buildWorkerSystemPrompt({
  agentName:           agent.name,
  crewName:            agent.crewName,
  description:         agent.description,
  productDescription:  contextMap.product_description,
  refundPolicy:        contextMap.refund_policy,
  escalationRules:     contextMap.escalation_rules,
  agentTone:           contextMap.agent_tone,
  connectedProviders:  agent.integrationNames,
});
```

---

## Part B — Tool execution loop

### 1. Update `runAgentModel` to return tool calls

**Modify: `lib/anthropic.ts`**

The function currently returns `{ text, model, tokensIn, tokensOut, ... }`. Extend the return type to include tool calls:

```ts
export type ToolCall = {
  id:    string;
  name:  string;
  input: Record<string, unknown>;
};

export type AgentModelResult = {
  text:        string;
  toolCalls:   ToolCall[];
  stopReason:  "end_turn" | "tool_use" | "max_tokens" | "error";
  model:       string;
  tokensIn:    number;
  tokensOut:   number;
  costCents:   number;
  latencyMs:   number;
  cacheHit:    boolean;
  cacheTokens: number;
};
```

In the Anthropic response handler, parse `stop_reason` and `content` blocks for `tool_use` type. For NVIDIA responses (which use OpenAI format), parse `finish_reason === "tool_calls"`.

### 2. Create tool executor

**New file: `lib/agents/tool-executor.ts`**

```ts
import type { ActionCtx } from "@/convex/_generated/server";
import {
  executeStripeLookup,
  executeStripeRefund,
} from "@/lib/providers/stripe";

// Each executor: receives the tool input, returns a plain-text result string
type ToolExecutor = (input: Record<string, unknown>, ctx: ActionCtx) => Promise<string>;

const EXECUTORS: Record<string, ToolExecutor> = {
  stripe_lookup:  (input, _ctx) => executeStripeLookup(input as { userEmail: string }),
  stripe_refund:  (input, _ctx) => executeStripeRefund(input as { chargeId: string; amountCents: number }),
  intercom_reply: async (input) => {
    // TODO STEP_09: implement real Intercom reply
    return `[intercom_reply stub] Would reply to conversation ${(input as { conversationId: string }).conversationId}`;
  },
  discord_reply: async (input) => {
    // TODO STEP_09: implement real Discord reply
    return `[discord_reply stub] Would reply in channel ${(input as { channelId: string }).channelId}`;
  },
  discord_dm: async (input) => {
    return `[discord_dm stub] Would DM user ${(input as { userId: string }).userId}`;
  },
};

export async function executeToolCall(
  name: string,
  input: Record<string, unknown>,
  ctx: ActionCtx,
): Promise<string> {
  const executor = EXECUTORS[name];
  if (!executor) {
    return `Tool "${name}" is not registered. Check tool-executor.ts.`;
  }
  try {
    return await executor(input, ctx);
  } catch (err) {
    return `Tool "${name}" failed: ${err instanceof Error ? err.message : String(err)}`;
  }
}
```

### 3. Agentic loop in runners

**Modify: `convex/agent_runner/support.ts`** (same pattern for `billing.ts` and `community.ts`)

Replace the single `runAgentModel` call with a loop:

```ts
import { executeToolCall } from "../../lib/agents/tool-executor";
import type { ToolCall } from "../../lib/anthropic";

// Constants
const MAX_TOOL_ROUNDS = 5; // prevent infinite loops

// Inside handleTask, replace the single model call with:
const conversationHistory: Array<{ role: "user" | "tool_result"; content: string; toolCallId?: string }> = [
  { role: "user", content: task.summary },
];

let finalText = "";
let totalTokensIn  = 0;
let totalTokensOut = 0;
let totalCostCents = 0;

for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
  const result = await runAgentModel({
    systemPrompt,
    userPrompt:  conversationHistory.map((m) => m.content).join("\n"),
    tools:       agentTools,   // same tools array as before
    maxTokens:   1024,
    mockText:    "Task handled. Customer notified.",
  });

  totalTokensIn  += result.tokensIn;
  totalTokensOut += result.tokensOut;
  totalCostCents += result.costCents;

  // Record the LLM call trace
  await ctx.runMutation(internal.traces.recordInternal, {
    ...traceBase,
    stepType: "llm_call",
    action: round === 0 ? "Agent reasoning" : `Agent tool round ${round}`,
    tokensIn:  result.tokensIn,
    tokensOut: result.tokensOut,
    costCents: result.costCents,
    latencyMs: result.latencyMs,
    cacheHit:  result.cacheHit,
    cacheTokens: result.cacheTokens,
  });

  if (result.stopReason === "end_turn" || result.toolCalls.length === 0) {
    finalText = result.text;
    break;
  }

  // Execute each tool call
  for (const toolCall of result.toolCalls) {
    const toolResult = await executeToolCall(toolCall.name, toolCall.input, ctx);

    // Record tool_call + tool_result traces
    await ctx.runMutation(internal.traces.recordInternal, {
      ...traceBase,
      stepType:        "tool_call",
      action:          `${toolCall.name}(${JSON.stringify(toolCall.input).slice(0, 80)})`,
      toolName:        toolCall.name,
      toolOutputPreview: toolResult.slice(0, 200),
      tokensIn: 0, tokensOut: 0, costCents: 0, latencyMs: 0,
      cacheHit: false, cacheTokens: 0,
    });

    conversationHistory.push({
      role:       "tool_result",
      content:    toolResult,
      toolCallId: toolCall.id,
    });
  }
}
```

---

## Part C — Update agent status during execution

**Modify: `convex/agents.ts`** — add a mutation:

```ts
export const setStatus = internalMutation({
  args: { agentId: v.id("agents"), status: agentStatus },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.agentId, { status: args.status, updatedAt: Date.now() });
  },
});
```

**In each runner's `handleTask`:**

```ts
// At start:
await ctx.runMutation(internal.agents.setStatus, { agentId: agent._id, status: "running" });

// At end (in finally block):
await ctx.runMutation(internal.agents.setStatus, { agentId: agent._id, status: "idle" });
```

---

## Acceptance Criteria

- [ ] A task routed to the billing crew includes the refund policy in the agent's system prompt (verify in trace `action` field)
- [ ] When a Finance task triggers `stripe_lookup`, a `tool_call` trace row appears in Activity
- [ ] Agent status changes to "running" in the Crew Detail panel during task execution and back to "idle" after
- [ ] If productContext has `product_description` set, the overseer's routing prompt includes it
- [ ] Loop exits after `MAX_TOOL_ROUNDS` (5) even if model keeps returning tool calls
- [ ] `npx tsc --noEmit` passes
- [ ] Manual task submission works end-to-end with the new loop

---

## Completion Notes

- Date completed: 2026-05-02
- Deviations from spec: Internal runners use `internal.productContext.listAllInternal` instead of public `api.productContext.listAll`, because the public query is authenticated for client use and scheduled/internal actions should not depend on client auth. The existing billing runner still keeps its deterministic Stripe lookup/refund policy checks before the LLM final-response loop, but now records a billing prompt-context trace before deterministic early resolve/escalate branches so refund policy context is visible for all billing executions. NVIDIA/OpenAI-format tool parsing was added in addition to Anthropic `tool_use` parsing.
- New files created not listed above: `lib/agents/tool-loop.ts`.
- Anything the next agent should know: Post-review fix on 2026-05-02 added separate `tool_result` trace rows after model-requested tool calls and expanded prompt trace text so long product descriptions do not hide refund policy context. Verified with workspace `step5-test-workspace`. Seeded product context rows remain there as test data. Manual billing task `k17e9b8rtv4qcmxf2y20f3fjrh85yen4` produced explicit `tool_call` and `tool_result` rows for model-requested `intercom_reply`; all agents returned to `idle`.
