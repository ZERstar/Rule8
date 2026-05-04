import { v } from "convex/values";

import { internal } from "./_generated/api";
import { internalAction, internalMutation, internalQuery, query } from "./_generated/server";
import { runAgentModel } from "../lib/anthropic";

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;

type SignalCandidate = {
  pattern: string;
  count: number;
  insight: string;
  crew: string;
};

function parseSignals(text: string): SignalCandidate[] {
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return [];

  try {
    const parsed = JSON.parse(match[0]) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item): SignalCandidate[] => {
      if (typeof item !== "object" || item === null) return [];
      const row = item as Partial<SignalCandidate>;
      if (
        typeof row.pattern !== "string" ||
        typeof row.count !== "number" ||
        typeof row.insight !== "string" ||
        typeof row.crew !== "string"
      ) {
        return [];
      }
      return [{
        pattern: row.pattern.slice(0, 160),
        count: row.count,
        insight: row.insight.slice(0, 300),
        crew: row.crew.slice(0, 40),
      }];
    });
  } catch {
    return [];
  }
}

export const clusterSignalsAllWorkspaces = internalAction({
  args: {},
  handler: async (ctx) => {
    const workspaces = await ctx.runQuery(internal.workspaces.listAll, {});
    for (const workspace of workspaces) {
      try {
        await ctx.runAction(internal.signals.clusterSignals, {
          workspaceId: workspace._id,
        });
      } catch (error) {
        console.error("Signal clustering failed", workspace._id, error);
      }
    }
  },
});

export const clusterSignals = internalAction({
  args: { workspaceId: v.string() },
  handler: async (ctx, args) => {
    const tasks = await ctx.runQuery(internal.tasks.listSince, {
      workspaceId: args.workspaceId,
      since: Date.now() - THREE_DAYS_MS,
      limit: 300,
    });

    const resolved = tasks
      .filter((task) => task.status === "resolved")
      .map((task) => ({
        summary: task.summary,
        crew: task.crewTag,
        resolution: task.resolution,
      }));

    if (resolved.length < 5) return;

    const result = await runAgentModel({
      systemPrompt: "You cluster resolved Rule8 tasks into repeated operating signals.",
      userPrompt: [
        "Read these resolved tasks and return only JSON.",
        "Return an array of objects with pattern, count, insight, and crew.",
        "Only include patterns with 5 or more similar tasks.",
        JSON.stringify(resolved).slice(0, 24000),
      ].join("\n"),
      maxTokens: 700,
      mockText: "[]",
      allowMock: true,
    });

    const signals = parseSignals(result.text).filter((signal) => signal.count >= 5);
    for (const signal of signals) {
      await ctx.runMutation(internal.signals.upsertPattern, {
        workspaceId: args.workspaceId,
        ...signal,
      });
    }
  },
});

export const upsertPattern = internalMutation({
  args: {
    workspaceId: v.string(),
    pattern: v.string(),
    count: v.number(),
    insight: v.string(),
    crew: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("signals")
      .withIndex("by_workspace_detected", (q) => q.eq("workspaceId", args.workspaceId))
      .filter((q) => q.eq(q.field("pattern"), args.pattern))
      .first();

    const payload = {
      count: args.count,
      insight: args.insight,
      crew: args.crew,
      detectedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, payload);
      return existing._id;
    }

    const signalId = await ctx.db.insert("signals", {
      workspaceId: args.workspaceId,
      pattern: args.pattern,
      ...payload,
    });

    await ctx.runMutation(internal.notifications.create, {
      workspaceId: args.workspaceId,
      type: "signal_cluster",
      title: "New operating signal",
      body: `${args.pattern}: ${args.insight}`.slice(0, 180),
      linkTo: "/dashboard/activity",
    });

    return signalId;
  },
});

export const listRecent = query({
  args: {
    workspaceId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.runQuery(internal.workspaces.assertOwned, { workspaceId: args.workspaceId });

    return await ctx.db
      .query("signals")
      .withIndex("by_workspace_detected", (q) => q.eq("workspaceId", args.workspaceId))
      .order("desc")
      .take(args.limit ?? 6);
  },
});

export const listRecentInternal = internalQuery({
  args: {
    workspaceId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("signals")
      .withIndex("by_workspace_detected", (q) => q.eq("workspaceId", args.workspaceId))
      .order("desc")
      .take(args.limit ?? 6);
  },
});

export const checkAnomaliesAllWorkspaces = internalAction({
  args: {},
  handler: async (ctx) => {
    const workspaces = await ctx.runQuery(internal.workspaces.listAll, {});
    for (const workspace of workspaces) {
      try {
        await ctx.runAction(internal.signals.checkAnomalies, {
          workspaceId: workspace._id,
        });
      } catch (error) {
        console.error("Anomaly check failed", workspace._id, error);
      }
    }
  },
});

export const checkAnomalies = internalAction({
  args: { workspaceId: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();
    const tasks = await ctx.runQuery(internal.tasks.listSince, {
      workspaceId: args.workspaceId,
      since: now - ONE_DAY_MS,
      limit: 1000,
    });

    const hourly = tasks.filter((task) => task.createdAt >= now - ONE_HOUR_MS).length;
    const dailyAveragePerHour = tasks.length / 24;
    if (hourly < 3 || dailyAveragePerHour === 0 || hourly < dailyAveragePerHour * 3) {
      return;
    }

    await ctx.runMutation(internal.notifications.create, {
      workspaceId: args.workspaceId,
      type: "anomaly",
      title: "Task volume anomaly",
      body: `${hourly} tasks arrived in the last hour, above the daily baseline.`,
      linkTo: "/dashboard/activity",
    });

    await ctx.runMutation(internal.chat.insertMessage, {
      workspaceId: args.workspaceId,
      role: "executive",
      text: `Task volume anomaly: ${hourly} tasks arrived in the last hour. Inspect Activity for source spikes, repeated summaries, and unresolved escalations.`,
    });
  },
});
