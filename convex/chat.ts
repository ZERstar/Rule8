import { action, internalMutation, internalQuery, query } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { runAgentModel } from "../lib/anthropic";
import { buildExecutiveChatPrompt } from "../lib/agents/prompts";

function extractDispatchSummary(founderText: string, modelText: string) {
  const dispatchMatch = modelText.match(/\[DISPATCH:([^\]]+)\]/);
  if (dispatchMatch) return dispatchMatch[1].trim();

  const commandMatch = founderText.match(/\b(?:dispatch|create|route|send)\s+(?:a\s+)?(?:support|finance|billing|community)?\s*(?:task|ticket|issue)?\s*:?\s*(.+)$/i);
  return commandMatch?.[1]?.trim();
}

/** Public reactive query — frontend subscribes to this */
export const list = query({
  args: { workspaceId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const workspace = await ctx.db
      .query("workspaces")
      .withIndex("by_owner", (q) => q.eq("ownerUserId", identity.tokenIdentifier))
      .unique();

    if (!workspace || workspace._id !== args.workspaceId) {
      throw new Error("Unauthorized");
    }

    return await ctx.db
      .query("chatMessages")
      .withIndex("by_workspace_and_created_at", (q) =>
        q.eq("workspaceId", args.workspaceId),
      )
      .order("asc")
      .take(60);
  },
});

/** Internal query — called by send action to fetch conversation history */
export const listRecent = internalQuery({
  args: { workspaceId: v.string(), limit: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("chatMessages")
      .withIndex("by_workspace_and_created_at", (q) =>
        q.eq("workspaceId", args.workspaceId),
      )
      .order("desc")
      .take(args.limit);
  },
});

/** Internal mutation — inserts a single chat message */
export const insertMessage = internalMutation({
  args: {
    workspaceId: v.string(),
    role: v.union(v.literal("founder"), v.literal("executive")),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("chatMessages", {
      workspaceId: args.workspaceId,
      role: args.role,
      text: args.text,
      createdAt: Date.now(),
    });
  },
});

/** Public action — frontend calls this to send a message and get an AI reply */
export const send = action({
  args: {
    workspaceId: v.string(),
    text: v.string(),
    pageContext: v.optional(v.object({
      page: v.string(),
      snapshot: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args): Promise<string> => {
    await ctx.runQuery(internal.workspaces.assertOwned, {
      workspaceId: args.workspaceId,
    });

    // 1. Persist founder message immediately so the UI shows it without waiting
    await ctx.runMutation(internal.chat.insertMessage, {
      workspaceId: args.workspaceId,
      role: "founder",
      text: args.text,
    });

    // 2. Fetch workspace context and recent history in parallel
    const [stats, recentDesc, contextRows, recentTraces, recentSignals] = await Promise.all([
      ctx.runQuery(api.tasks.getStats, { workspaceId: args.workspaceId }),
      ctx.runQuery(internal.chat.listRecent, {
        workspaceId: args.workspaceId,
        limit: 12,
      }),
      ctx.runQuery(internal.productContext.listAllInternal, { workspaceId: args.workspaceId }),
      ctx.runQuery(internal.traces.listForContext, { workspaceId: args.workspaceId, limit: 12 }),
      ctx.runQuery(internal.signals.listRecentInternal, { workspaceId: args.workspaceId, limit: 5 }),
    ]);

    const contextMap = Object.fromEntries(contextRows.map((row) => [row.key, row.value]));

    // 3. Build system prompt with live workspace and page context
    const systemPrompt = buildExecutiveChatPrompt({
      workspaceId: args.workspaceId,
      agentCount: stats.agentsManaged,
      tasksToday: stats.tasksToday,
      costTodayCents: stats.costTodayCents,
      escalatedCount: stats.escalated,
      productDescription: contextMap.product_description,
      refundPolicy: contextMap.refund_policy,
      escalationRules: contextMap.escalation_rules,
      agentTone: contextMap.agent_tone,
      currentPage: args.pageContext?.page,
      pageSnapshot: args.pageContext?.snapshot,
      recentTraces: recentTraces.map(
        (trace) =>
          `[${trace.agentTag}] ${trace.action} -> ${trace.status} (${trace.latencyMs}ms)`,
      ),
      signals: recentSignals.map(
        (signal) => `${signal.pattern} (${signal.count} tasks): ${signal.insight}`,
      ),
    });

    // 4. Build conversation history for context.
    //    recentDesc is newest-first; reverse to get chronological order,
    //    then drop the last element (the founder message we just inserted).
    const history = [...recentDesc].reverse().slice(0, -1);
    const historyLines = history
      .map((m) => `${m.role === "founder" ? "Founder" : "Executive"}: ${m.text}`)
      .join("\n");

    const userPrompt = historyLines
      ? `${historyLines}\nFounder: ${args.text}`
      : args.text;

    // 5. Call the Nvidia model
    const result = await runAgentModel({
      systemPrompt,
      userPrompt,
      maxTokens: 512,
      mockText:
        "I'm reviewing the workspace now. Everything looks operational. What would you like to focus on?",
    });

    const dispatchSummary = extractDispatchSummary(args.text, result.text);
    if (dispatchSummary) {
      await ctx.runAction(api.tasks.submitManualTask, {
        workspaceId: args.workspaceId,
        summary: dispatchSummary,
      });
    }

    const cleanText = result.text.replace(/\[DISPATCH:[^\]]+\]/, "").trim();

    // 6. Persist executive reply — frontend sees it reactively via useQuery
    await ctx.runMutation(internal.chat.insertMessage, {
      workspaceId: args.workspaceId,
      role: "executive",
      text: cleanText || "I've dispatched that task.",
    });

    return cleanText || "I've dispatched that task.";
  },
});
