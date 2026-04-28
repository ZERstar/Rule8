import { v } from "convex/values";

import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import { internalAction } from "../_generated/server";
import { runAgentModel } from "../../lib/anthropic";
import { buildOverseerSystemPrompt } from "../../lib/agents/prompts";

type RouteDecision = {
  crewTag: "finance" | "support" | "community" | "escalate";
  confidence: number;
  reason: string;
};

type RouteTaskArgs = {
  taskId: Id<"tasks">;
  workspaceId: string;
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function heuristicRoute(summary: string) {
  const normalized = summary.toLowerCase();
  const shouldEscalate =
    /(compliance|legal|policy|partner|accounting|security|edge case|weird|unusual|exception|approval)/.test(
      normalized,
    );

  if (shouldEscalate) {
    return {
      crewTag: "escalate",
      confidence: 0.42,
      reason: "Detected policy-sensitive or ambiguous language that requires executive review.",
    } satisfies RouteDecision;
  }

  if (/(refund|charged|charge|billing|invoice|payment|card)/.test(normalized)) {
    return {
      crewTag: "finance",
      confidence: 0.92,
      reason: "Detected billing-oriented language around charges, invoices, or refunds.",
    } satisfies RouteDecision;
  }

  if (/(onboard|setup|help|question|docs|documentation|api|login|support|how do)/.test(normalized)) {
    return {
      crewTag: "support",
      confidence: 0.88,
      reason: "Detected product-support or onboarding language suitable for Support Crew.",
    } satisfies RouteDecision;
  }

  if (/(discord|slack|community|moderation|spam|ban|feature request|social|channel|member|post|thread)/.test(normalized)) {
    return {
      crewTag: "community",
      confidence: 0.87,
      reason: "Detected community or moderation language suitable for Community Crew.",
    } satisfies RouteDecision;
  }

  return {
    crewTag: "escalate",
    confidence: 0.46,
    reason: "Request was ambiguous or outside supported routing confidence thresholds.",
  } satisfies RouteDecision;
}

function parseRouteDecision(text: string, fallback: RouteDecision): RouteDecision {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(match[0]) as Partial<RouteDecision>;
    if (
      (parsed.crewTag === "finance" || parsed.crewTag === "support" || parsed.crewTag === "community" || parsed.crewTag === "escalate") &&
      typeof parsed.confidence === "number" &&
      typeof parsed.reason === "string"
    ) {
      return parsed as RouteDecision;
    }
  } catch {
    return fallback;
  }

  return fallback;
}

type RouteResult =
  | { status: "escalated"; reason: string }
  | { status: "failed"; reason: string }
  | { status: "running"; assignedAgentId: Id<"agents">; crewTag: "finance" | "support" | "community" };

async function routeTaskHandler(
  ctx: ActionCtx,
  args: RouteTaskArgs,
): Promise<RouteResult> {
    const task = await ctx.runQuery(internal.tasks.getById, { taskId: args.taskId });
    const overseer = await ctx.runQuery(internal.agents.getOverseer, {
      workspaceId: args.workspaceId,
    });

    if (!task || !overseer) {
      throw new Error("Unable to route task without task and overseer records.");
    }

    const fallbackRoute = heuristicRoute(task.summary);
    const runId = `run-${task.externalId ?? task._id}-${Date.now()}`;
    const routeModel = await runAgentModel({
      systemPrompt: buildOverseerSystemPrompt({ workspaceId: args.workspaceId }),
      userPrompt: `Classify this inbound task:\n${task.summary}\n\nPayload:\n${task.rawPayload}`,
      maxTokens: 240,
      mockText: JSON.stringify(fallbackRoute),
    }).catch(async (error: unknown) => {
      const reason = `AI model failed while routing task: ${errorMessage(error)}`;

      await ctx.runMutation(internal.traces.recordInternal, {
        runId,
        taskId: task._id,
        agentId: overseer._id,
        agentTag: "executive",
        crewTag: "executive",
        crewName: "Executive",
        action: reason,
        stepType: "error",
        model: overseer.modelId,
        status: "error",
        toolName: undefined,
        toolOutputPreview: undefined,
        tokensIn: 0,
        tokensOut: 0,
        costCents: 0,
        latencyMs: 0,
        cacheHit: false,
        cacheTokens: 0,
        confidence: 0,
        workspaceId: args.workspaceId,
      });

      await ctx.runMutation(internal.tasks.failTaskInternal, {
        taskId: task._id,
        reason,
      });

      throw new Error(reason);
    });

    const decision = parseRouteDecision(routeModel.text, fallbackRoute);

    await ctx.runMutation(internal.traces.recordInternal, {
      runId,
      taskId: task._id,
      agentId: overseer._id,
      agentTag: "executive",
      crewTag: "executive",
      crewName: "Executive",
      action: `Classified task for ${decision.crewTag === "escalate" ? "Executive review" : `${decision.crewTag} crew`} — ${decision.reason}`,
      stepType: "overseer_route",
      model: routeModel.model,
      status: decision.confidence >= 0.7 ? "ok" : "warn",
      toolName: undefined,
      toolOutputPreview: undefined,
      tokensIn: routeModel.tokensIn,
      tokensOut: routeModel.tokensOut,
      costCents: routeModel.costCents,
      latencyMs: routeModel.latencyMs,
      cacheHit: routeModel.cacheHit,
      cacheTokens: routeModel.cacheTokens,
      confidence: decision.confidence,
      workspaceId: args.workspaceId,
    });

    if (decision.crewTag === "escalate" || decision.confidence < 0.7) {
      await ctx.runMutation(internal.tasks.escalateTaskInternal, {
        taskId: task._id,
        reason: decision.reason,
        totalTokens: routeModel.tokensIn + routeModel.tokensOut,
        totalCostCents: routeModel.costCents,
        latencyMs: routeModel.latencyMs,
      });

      return {
        status: "escalated" as const,
        reason: decision.reason,
      };
    }

    const assignedAgent = await ctx.runQuery(internal.agents.getCrewLead, {
      workspaceId: args.workspaceId,
      crewTag: decision.crewTag,
    });

    if (!assignedAgent) {
      const reason = `No active crew lead found for ${decision.crewTag}.`;
      await ctx.runMutation(internal.tasks.failTaskInternal, {
        taskId: task._id,
        reason,
      });

      return {
        status: "failed" as const,
        reason,
      };
    }

    await ctx.runMutation(internal.tasks.assignTask, {
      taskId: task._id,
      crewTag: decision.crewTag,
      assignedAgentId: assignedAgent._id,
    });

  if (decision.crewTag === "finance") {
    await ctx.runAction(internal.agent_runner.billing.handleTask, {
      taskId: task._id,
      runId,
      workspaceId: args.workspaceId,
    });
  } else if (decision.crewTag === "community") {
    await ctx.runAction(internal.agent_runner.community.handleTask, {
      taskId: task._id,
      runId,
      workspaceId: args.workspaceId,
    });
  } else {
    await ctx.runAction(internal.agent_runner.support.handleTask, {
      taskId: task._id,
      runId,
      workspaceId: args.workspaceId,
    });
  }

    return {
      status: "running" as const,
      assignedAgentId: assignedAgent._id,
      crewTag: decision.crewTag,
    };
}

export const routeTask = internalAction({
  args: {
    taskId: v.id("tasks"),
    workspaceId: v.string(),
  },
  handler: routeTaskHandler,
});
