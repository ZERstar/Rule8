import { query } from "./_generated/server";
import { v } from "convex/values";

/** Returns eval cases enriched with the latest run result for each. */
export const listCasesWithResults = query({
  args: {
    workspaceId: v.string(),
    agentId: v.id("agents"),
  },
  handler: async (ctx, args) => {
    const cases = await ctx.db
      .query("evalCases")
      .withIndex("by_workspace_and_agent_id", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("agentId", args.agentId),
      )
      .collect();

    const recentRuns = await ctx.db
      .query("evalRuns")
      .withIndex("by_workspace_and_agent_id", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("agentId", args.agentId),
      )
      .order("desc")
      .take(200);

    // Latest run per evalCaseId
    const latestRunByCase = new Map(
      recentRuns.map((r) => [r.evalCaseId, r] as const).reverse(),
    );

    return cases.map((c) => {
      const run = latestRunByCase.get(c._id);
      return {
        _id: c._id,
        name: c.name,
        passingThreshold: c.passingThreshold,
        score: run?.score ?? null,
        pass: run ? run.status === "pass" : null,
      };
    });
  },
});

export const listRecentRuns = query({
  args: {
    workspaceId: v.string(),
    agentId: v.id("agents"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("evalRuns")
      .withIndex("by_workspace_and_agent_id", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("agentId", args.agentId),
      )
      .order("desc")
      .take(args.limit ?? 10);
  },
});
