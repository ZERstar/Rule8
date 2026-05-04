import { v } from "convex/values";

import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { buildWorkerSystemPrompt } from "../../lib/agents/prompts";
import { runAgenticToolLoop, type AgenticLoopResult } from "../../lib/agents/tool-loop";
import {
  executeToolCall,
  isToolResultError,
  type IntegrationConfigMap,
} from "../../lib/agents/tool-executor";
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

function isTransientError(message: string) {
  return /(timeout|timed out|etimedout|rate limit|429|500|502|503|504|temporary|econnreset|econnrefused|fetch failed|network)/i.test(message);
}

async function sendIntercomReply(args: {
  configs: IntegrationConfigMap;
  conversationId?: string;
  message: string;
}) {
  const result = await executeToolCall(
    "intercom_reply",
    { conversationId: args.conversationId, message: args.message },
    args.configs,
  );
  return {
    result,
    status: isToolResultError(result) ? "error" as const : "ok" as const,
  };
}

export const handleTask = internalAction({
  args: {
    taskId: v.id("tasks"),
    runId: v.string(),
    workspaceId: v.string(),
  },
  handler: async (ctx, args) => {
    const task = await ctx.runQuery(internal.tasks.getByIdInternal, { taskId: args.taskId });
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

    await ctx.runMutation(internal.agents.setStatus, {
      agentId: assignedAgent._id,
      status: "running",
    });

    try {
      const contextRows = await ctx.runQuery(internal.productContext.listAllInternal, {
        workspaceId: args.workspaceId,
      });
      const integrationConfigs: IntegrationConfigMap = await ctx.runQuery(
        internal.integrations.listConfigs,
        { workspaceId: args.workspaceId },
      );
      const contextMap = Object.fromEntries(contextRows.map((row) => [row.key, row.value]));
      const systemPrompt = buildWorkerSystemPrompt({
        agentName: assignedAgent.name,
        crewName: assignedAgent.crewName,
        description: assignedAgent.description,
        productDescription: contextMap.product_description,
        refundPolicy: contextMap.refund_policy,
        escalationRules: contextMap.escalation_rules,
        agentTone: contextMap.agent_tone,
        connectedProviders: assignedAgent.integrationNames,
      });

      await ctx.runMutation(internal.traces.recordInternal, {
        runId: args.runId,
        taskId: task._id,
        agentId: assignedAgent._id,
        agentTag: "finance",
        crewTag: "finance",
        crewName: assignedAgent.crewName,
        action: `${assignedAgent.name} prepared billing prompt context. PRODUCT: ${contextMap.product_description ?? "unset"} REFUND POLICY: ${contextMap.refund_policy ?? "unset"} ESCALATION RULES: ${contextMap.escalation_rules ?? "unset"}`,
        stepType: "llm_call",
        model: assignedAgent.modelId,
        status: "ok",
        toolName: undefined,
        toolOutputPreview: undefined,
        tokensIn: 0,
        tokensOut: 0,
        costCents: 0,
        latencyMs: 0,
        cacheHit: false,
        cacheTokens: 0,
        confidence: 0.88,
        workspaceId: args.workspaceId,
      });

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
    }, integrationConfigs.stripe ?? {});

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
      const outbound = task.source === "intercom"
        ? await sendIntercomReply({
          configs: integrationConfigs,
          conversationId: task.externalId,
          message: resolution,
        })
        : null;

      await ctx.runMutation(internal.traces.recordInternal, {
        runId: args.runId,
        taskId: task._id,
        agentId: assignedAgent._id,
        agentTag: "finance",
        crewTag: "finance",
        crewName: assignedAgent.crewName,
        action: outbound
          ? `Delivered billing follow-up for task ${task.externalId ?? task._id}.`
          : `${assignedAgent.name} prepared a billing follow-up without issuing a refund.`,
        stepType: "resolution",
        model: assignedAgent.modelId,
        status: outbound?.status ?? "ok",
        toolName: outbound ? "intercom_reply" : undefined,
        toolOutputPreview: (outbound?.result ?? resolution).slice(0, 160),
        tokensIn: 0,
        tokensOut: 0,
        costCents: 0,
        latencyMs: 120,
        cacheHit: false,
        cacheTokens: 0,
        confidence: 0.72,
        workspaceId: args.workspaceId,
      });

      if (outbound?.status === "error") {
        throw new Error(outbound.result);
      }

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
    }, integrationConfigs.stripe ?? {});

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

    let modelResult: AgenticLoopResult;
    try {
      modelResult = await runAgenticToolLoop({
        ctx,
        runId: args.runId,
        taskId: task._id,
        agentId: assignedAgent._id,
        agentTag: "finance",
        crewTag: "finance",
        crewName: assignedAgent.crewName,
        modelId: assignedAgent.modelId,
        agentName: assignedAgent.name,
        workspaceId: args.workspaceId,
        systemPrompt,
        userPrompt: `Task summary:\n${task.summary}\n\nStripe lookup:\n${lookup.reason}\nRefund result:\n${refund.refundId} for $${(refund.amountCents / 100).toFixed(2)}${episodicContext}`,
        maxTokens: 320,
        tools: FINANCE_TOOLS,
        mockText: getBillingFallback(task.summary, true, refund.amountCents),
        toolDefaults: {
          intercom_reply: { conversationId: task.externalId },
        },
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

      throw new Error(reason);
    }

    let outboundResult = modelResult.toolExecutions.find(
      (tool) => tool.name === "intercom_reply" && tool.status === "ok",
    )?.result;

    if (task.source === "intercom" && !outboundResult) {
      const outbound = await sendIntercomReply({
        configs: integrationConfigs,
        conversationId: task.externalId,
        message: modelResult.text,
      });
      outboundResult = outbound.result;

      await ctx.runMutation(internal.traces.recordInternal, {
        runId: args.runId,
        taskId: task._id,
        agentId: assignedAgent._id,
        agentTag: "finance",
        crewTag: "finance",
        crewName: assignedAgent.crewName,
        action: `Delivered billing response for task ${task.externalId ?? task._id}.`,
        stepType: "tool_call",
        model: modelResult.model,
        status: outbound.status,
        toolName: "intercom_reply",
        toolOutputPreview: outbound.result.slice(0, 200),
        tokensIn: 0,
        tokensOut: 0,
        costCents: 0,
        latencyMs: 120,
        cacheHit: false,
        cacheTokens: 0,
        confidence: outbound.status === "ok" ? 0.92 : 0.2,
        workspaceId: args.workspaceId,
      });

      if (outbound.status === "error") {
        throw new Error(outbound.result);
      }
    }

    await ctx.runMutation(internal.traces.recordInternal, {
      runId: args.runId,
      taskId: task._id,
      agentId: assignedAgent._id,
      agentTag: "finance",
      crewTag: "finance",
      crewName: assignedAgent.crewName,
      action: outboundResult
        ? `Confirmed billing response delivery for task ${task.externalId ?? task._id}.`
        : `${assignedAgent.name} prepared a billing resolution for task ${task._id}.`,
      stepType: "resolution",
      model: modelResult.model,
      status: "ok",
      toolName: outboundResult ? "intercom_reply" : undefined,
      toolOutputPreview: (outboundResult ?? modelResult.text).slice(0, 160),
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
    } catch (error: unknown) {
      const message = errorMessage(error);
      const transient = isTransientError(message);

      await ctx.runMutation(internal.tasks.scheduleRetry, {
        taskId: args.taskId,
        error: message,
        failureMode: transient ? "transient" : "permanent",
      });

      if (transient) {
        const updatedTask = await ctx.runQuery(internal.tasks.getByIdInternal, {
          taskId: args.taskId,
        });
        if (updatedTask?.status === "pending" && updatedTask.nextRetryAt) {
          await ctx.scheduler.runAfter(
            Math.max(0, updatedTask.nextRetryAt - Date.now()),
            internal.agent_runner.billing.handleTask,
            {
              taskId: args.taskId,
              runId: `${args.runId}-retry-${updatedTask.retryCount ?? 0}`,
              workspaceId: args.workspaceId,
            },
          );
        }
      }

      return {
        status: transient ? "retry_scheduled" as const : "failed" as const,
        reason: message,
      };
    } finally {
      await ctx.runMutation(internal.agents.setStatus, {
        agentId: assignedAgent._id,
        status: "idle",
      });
    }
  },
});
