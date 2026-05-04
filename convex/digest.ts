import { v } from "convex/values";

import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { runAgentModel } from "../lib/anthropic";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export const sendWeeklyDigest = internalAction({
  args: {},
  handler: async (ctx) => {
    const workspaces = await ctx.runQuery(internal.workspaces.listAll, {});
    for (const workspace of workspaces) {
      try {
        await ctx.runAction(internal.digest.sendForWorkspace, {
          workspaceId: workspace._id,
        });
      } catch (error) {
        console.error("Weekly digest failed", workspace._id, error);
      }
    }
  },
});

export const sendForWorkspace = internalAction({
  args: { workspaceId: v.string() },
  handler: async (ctx, args) => {
    const since = Date.now() - WEEK_MS;
    const [tasks, traces] = await Promise.all([
      ctx.runQuery(internal.tasks.listSince, {
        workspaceId: args.workspaceId,
        since,
        limit: 500,
      }),
      ctx.runQuery(internal.traces.listSince, {
        workspaceId: args.workspaceId,
        since,
        limit: 80,
      }),
    ]);

    const resolved = tasks.filter((task) => task.status === "resolved");
    const escalated = tasks.filter((task) => task.status === "escalated");
    const costCents = tasks.reduce((total, task) => total + task.totalCostCents, 0);
    const crewCounts = tasks.reduce<Record<string, number>>((counts, task) => {
      counts[task.crewTag] = (counts[task.crewTag] ?? 0) + 1;
      return counts;
    }, {});

    const prompt = [
      "Write a concise weekly operational digest for a solo founder.",
      `Tasks handled: ${tasks.length}.`,
      `Resolved: ${resolved.length}. Escalated: ${escalated.length}.`,
      `Agent cost: $${(costCents / 100).toFixed(2)}.`,
      `Crew mix: ${JSON.stringify(crewCounts)}.`,
      "Recent trace highlights:",
      ...traces.slice(0, 12).map((trace) => `${trace.agentTag}: ${trace.action} (${trace.status})`),
      "Include: wins, risks, repeated patterns, and one recommended operating decision.",
      "Keep it under 180 words.",
    ].join("\n");

    const result = await runAgentModel({
      systemPrompt: "You are the Rule8 Executive AI writing a weekly digest for a founder.",
      userPrompt: prompt,
      maxTokens: 420,
      mockText: `This week Rule8 handled ${tasks.length} tasks, resolved ${resolved.length}, and escalated ${escalated.length}. Agent spend was $${(costCents / 100).toFixed(2)}. Review recurring issues and tighten context where escalations repeat.`,
      allowMock: true,
    });

    await ctx.runMutation(internal.chat.insertMessage, {
      workspaceId: args.workspaceId,
      role: "executive",
      text: `Weekly digest:\n\n${result.text}`,
    });

    await ctx.runMutation(internal.notifications.create, {
      workspaceId: args.workspaceId,
      type: "weekly_digest",
      title: "Weekly digest ready",
      body: result.text.slice(0, 180),
      linkTo: "/dashboard",
    });
  },
});
