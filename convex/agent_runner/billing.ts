import { v } from "convex/values";

import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { runAgentModel, type RunAgentModelResult } from "../../lib/anthropic";
import { buildWorkerSystemPrompt } from "../../lib/agents/prompts";
import { FINANCE_TOOLS } from "../../lib/agents/tools";
import {
  lookupStripeBillingContext,
  refundStripeCharge,
} from "../../lib/providers/stripe";

function extractEmail(summary: string, rawPayload: string) {
  const summaryMatch = summary.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  if (summaryMatch) {
    return summaryMatch[0].toLowerCase();
  }

  const payloadMatch = rawPayload.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return payloadMatch?.[0]?.toLowerCase();
}

function getBillingFallback(summary: string, didRefund: boolean, amountCents?: number) {
  if (didRefund && amountCents) {
    return `We confirmed the duplicate billing event and initiated a refund for $${(amountCents / 100).toFixed(2)}. You will see the reversal on your statement shortly.`;
  }

  return `We reviewed the billing activity tied to your request and prepared the next response: ${summary}.`;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export const handleTask = internalAction({
  args: {
    taskId: v.id("tasks"),
    runId: v.string(),
    workspaceId: v.string(),
  },
  handler: async (ctx, args) => {
    const task = await ctx.runQuery(internal.tasks.getById, { taskId: args.taskId });
    if (!task || !task.assignedAgentId) {
      throw new Error("Assigned billing task was not found or has no assigned agent.");
    }

    const assignedAgent = await ctx.runQuery(internal.agents.getCrewLead, {
      workspaceId: args.workspaceId,
      crewTag: "finance",
    });
    const refundLimitCents: number = await ctx.runQuery(
      internal.productContext.getRefundLimitCents,
      { workspaceId: args.workspaceId },
    );

    if (!assignedAgent) {
      throw new Error("Finance crew lead not found for billing task.");
    }

    // US-17: Load episodic context from prior interactions with this user
    let episodicContext = "";
    const episodicEmail = task.userEmail ?? extractEmail(task.summary, task.rawPayload);
    if (episodicEmail) {
      const priorTasks = await ctx.runQuery(internal.tasks.getRecentByUserEmail, {
        workspaceId: args.workspaceId,
        userEmail: episodicEmail,
        excludeTaskId: task._id,
        limit: 5,
      });

      if (priorTasks.length > 0) {
        episodicContext =
          `\n\nEpisodic context: ${priorTasks.length} prior interaction${priorTasks.length === 1 ? "" : "s"} with this user:\n` +
          priorTasks
            .map(
              (t: { summary: string; resolution?: string; escalationReason?: string; createdAt: number }, i: number) =>
                `${i + 1}. [${new Date(t.createdAt).toISOString()}] ${t.summary.slice(0, 100)} → ${(t.resolution ?? t.escalationReason ?? "unresolved").slice(0, 80)}`,
            )
            .join("\n");

        await ctx.runMutation(internal.traces.recordInternal, {
          runId: args.runId,
          taskId: task._id,
          agentId: assignedAgent._id,
          agentTag: "finance",
          crewTag: "finance",
          crewName: assignedAgent.crewName,
          action: `Loaded ${priorTasks.length} prior interaction${priorTasks.length === 1 ? "" : "s"} for episodic context.`,
          stepType: "tool_call",
          model: assignedAgent.modelId,
          status: "ok",
          toolName: "memory_lookup",
          toolOutputPreview: `Episodic context: ${priorTasks.length} prior interactions`,
          tokensIn: 0,
          tokensOut: 0,
          costCents: 0,
          latencyMs: 40,
          cacheHit: false,
          cacheTokens: 0,
          confidence: 0.99,
          workspaceId: args.workspaceId,
        });
      }
    }

    const customerEmail = extractEmail(task.summary, task.rawPayload);
    if (!customerEmail) {
      await ctx.runMutation(internal.tasks.escalateTaskInternal, {
        taskId: task._id,
        reason: "Unable to identify customer email for Stripe lookup.",
        totalTokens: 0,
        totalCostCents: 0,
        latencyMs: undefined,
      });

      await ctx.runMutation(internal.traces.recordInternal, {
        runId: args.runId,
        taskId: task._id,
        agentId: assignedAgent._id,
        agentTag: "finance",
        crewTag: "finance",
        crewName: assignedAgent.crewName,
        action: "Escalated billing task because no customer email could be derived for Stripe lookup.",
        stepType: "escalation",
        model: assignedAgent.modelId,
        status: "warn",
        toolName: "stripe_lookup",
        toolOutputPreview: "Missing customer email in task summary and payload.",
        tokensIn: 0,
        tokensOut: 0,
        costCents: 0,
        latencyMs: 1,
        cacheHit: false,
        cacheTokens: 0,
        confidence: 0.4,
        workspaceId: args.workspaceId,
      });

      return {
        status: "escalated" as const,
        reason: "Unable to identify customer email for Stripe lookup.",
      };
    }

    const lookup = await lookupStripeBillingContext({
      email: customerEmail,
      summary: task.summary,
    });

    await ctx.runMutation(internal.traces.recordInternal, {
      runId: args.runId,
      taskId: task._id,
      agentId: assignedAgent._id,
      agentTag: "finance",
      crewTag: "finance",
      crewName: assignedAgent.crewName,
      action: `Queried Stripe billing context for ${customerEmail}.`,
      stepType: "tool_call",
      model: assignedAgent.modelId,
      status: lookup.duplicateDetected ? "ok" : "warn",
      toolName: "stripe_lookup",
      toolOutputPreview: lookup.reason,
      tokensIn: 0,
      tokensOut: 0,
      costCents: 0,
      latencyMs: 120,
      cacheHit: false,
      cacheTokens: 0,
      confidence: lookup.duplicateDetected ? 0.94 : 0.58,
      workspaceId: args.workspaceId,
    });

    if (!lookup.duplicateDetected || !lookup.chargeId || !lookup.amountCents) {
      const resolution = `We reviewed your billing history but did not find an automatic duplicate-charge refund candidate for ${customerEmail}. A human review can be requested if you want us to inspect the account manually.`;

      await ctx.runMutation(internal.traces.recordInternal, {
        runId: args.runId,
        taskId: task._id,
        agentId: assignedAgent._id,
        agentTag: "finance",
        crewTag: "finance",
        crewName: assignedAgent.crewName,
        action: `${assignedAgent.name} prepared a billing follow-up without issuing a refund.`,
        stepType: "resolution",
        model: assignedAgent.modelId,
        status: "ok",
        toolName: "intercom_reply",
        toolOutputPreview: resolution.slice(0, 160),
        tokensIn: 0,
        tokensOut: 0,
        costCents: 0,
        latencyMs: 120,
        cacheHit: false,
        cacheTokens: 0,
        confidence: 0.72,
        workspaceId: args.workspaceId,
      });

      await ctx.runMutation(internal.tasks.resolveTaskInternal, {
        taskId: task._id,
        resolution,
        totalTokens: 0,
        totalCostCents: 0,
        latencyMs: 120,
      });

      return {
        status: "resolved" as const,
        resolution,
      };
    }

    if (lookup.amountCents > refundLimitCents) {
      const reason = `Duplicate charge found for $${(lookup.amountCents / 100).toFixed(2)}, above refund policy limit of $${(refundLimitCents / 100).toFixed(2)}.`;

      await ctx.runMutation(internal.traces.recordInternal, {
        runId: args.runId,
        taskId: task._id,
        agentId: assignedAgent._id,
        agentTag: "finance",
        crewTag: "finance",
        crewName: assignedAgent.crewName,
        action: `Escalated refund because amount exceeded workspace billing policy.`,
        stepType: "escalation",
        model: assignedAgent.modelId,
        status: "warn",
        toolName: "policy_lookup",
        toolOutputPreview: reason,
        tokensIn: 0,
        tokensOut: 0,
        costCents: 0,
        latencyMs: 80,
        cacheHit: false,
        cacheTokens: 0,
        confidence: 0.65,
        workspaceId: args.workspaceId,
      });

      await ctx.runMutation(internal.tasks.escalateTaskInternal, {
        taskId: task._id,
        reason,
        totalTokens: 0,
        totalCostCents: 0,
        latencyMs: 80,
      });

      return {
        status: "escalated" as const,
        reason,
      };
    }

    const refund = await refundStripeCharge({
      chargeId: lookup.chargeId,
      amountCents: lookup.amountCents,
    });

    await ctx.runMutation(internal.traces.recordInternal, {
      runId: args.runId,
      taskId: task._id,
      agentId: assignedAgent._id,
      agentTag: "finance",
      crewTag: "finance",
      crewName: assignedAgent.crewName,
      action: `Initiated refund for Stripe charge ${refund.chargeId}.`,
      stepType: "tool_call",
      model: assignedAgent.modelId,
      status: refund.status === "succeeded" ? "ok" : "warn",
      toolName: "stripe_refund",
      toolOutputPreview: `Refund ${refund.refundId} queued for $${(refund.amountCents / 100).toFixed(2)}.`,
      tokensIn: 0,
      tokensOut: 0,
      costCents: 0,
      latencyMs: 180,
      cacheHit: false,
      cacheTokens: 0,
      confidence: 0.95,
      workspaceId: args.workspaceId,
    });

    let modelResult: RunAgentModelResult;
    try {
      modelResult = await runAgentModel({
        systemPrompt: buildWorkerSystemPrompt({
          agentName: assignedAgent.name,
          crewName: assignedAgent.crewName,
          description: assignedAgent.description,
        }),
        userPrompt: `Task summary:\n${task.summary}\n\nStripe lookup:\n${lookup.reason}\nRefund result:\n${refund.refundId} for $${(refund.amountCents / 100).toFixed(2)}${episodicContext}`,
        maxTokens: 320,
        tools: FINANCE_TOOLS,
        mockText: getBillingFallback(task.summary, true, refund.amountCents),
      });
    } catch (error: unknown) {
      const reason = `AI model failed while drafting billing response: ${errorMessage(error)}`;

      await ctx.runMutation(internal.traces.recordInternal, {
        runId: args.runId,
        taskId: task._id,
        agentId: assignedAgent._id,
        agentTag: "finance",
        crewTag: "finance",
        crewName: assignedAgent.crewName,
        action: reason,
        stepType: "error",
        model: assignedAgent.modelId,
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
    }

    await ctx.runMutation(internal.traces.recordInternal, {
      runId: args.runId,
      taskId: task._id,
      agentId: assignedAgent._id,
      agentTag: "finance",
      crewTag: "finance",
      crewName: assignedAgent.crewName,
      action: `${assignedAgent.name} drafted the final billing response after Stripe actions.`,
      stepType: "llm_call",
      model: modelResult.model,
      status: "ok",
      toolName: undefined,
      toolOutputPreview: undefined,
      tokensIn: modelResult.tokensIn,
      tokensOut: modelResult.tokensOut,
      costCents: modelResult.costCents,
      latencyMs: modelResult.latencyMs,
      cacheHit: modelResult.cacheHit,
      cacheTokens: modelResult.cacheTokens,
      confidence: 0.91,
      workspaceId: args.workspaceId,
    });

    await ctx.runMutation(internal.traces.recordInternal, {
      runId: args.runId,
      taskId: task._id,
      agentId: assignedAgent._id,
      agentTag: "finance",
      crewTag: "finance",
      crewName: assignedAgent.crewName,
      action: `Sent billing resolution for task ${task.externalId ?? task._id}.`,
      stepType: "resolution",
      model: modelResult.model,
      status: "ok",
      toolName: "intercom_reply",
      toolOutputPreview: modelResult.text.slice(0, 160),
      tokensIn: 0,
      tokensOut: 0,
      costCents: 0,
      latencyMs: 120,
      cacheHit: false,
      cacheTokens: 0,
      confidence: 0.93,
      workspaceId: args.workspaceId,
    });

    await ctx.runMutation(internal.tasks.resolveTaskInternal, {
      taskId: task._id,
      resolution: modelResult.text,
      totalTokens: modelResult.tokensIn + modelResult.tokensOut,
      totalCostCents: modelResult.costCents,
      latencyMs: modelResult.latencyMs,
    });

    return {
      status: "resolved" as const,
      resolution: modelResult.text,
      refundId: refund.refundId,
    };
  },
});
