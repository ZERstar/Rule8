import { internal } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { ActionCtx } from "../../convex/_generated/server";
import { runAgentModel } from "../anthropic";
import type { AgentToolDefinition } from "./tools";
import {
  executeToolCall,
  isToolResultError,
  type IntegrationConfigMap,
  type ToolExecutionRecord,
} from "./tool-executor";

export const MAX_TOOL_ROUNDS = 5;

type AgentTag = "executive" | "finance" | "support" | "community" | "system";
type CrewTag = "executive" | "finance" | "support" | "community";

type AgenticLoopArgs = {
  ctx: ActionCtx;
  runId: string;
  taskId: Id<"tasks">;
  agentId: Id<"agents">;
  agentTag: AgentTag;
  crewTag: CrewTag;
  crewName: string;
  modelId: string;
  agentName: string;
  workspaceId: string;
  systemPrompt: string;
  userPrompt: string;
  tools: AgentToolDefinition[];
  maxTokens?: number;
  mockText: string;
  toolDefaults?: Record<string, Record<string, unknown>>;
};

export type AgenticLoopResult = {
  text: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  costCents: number;
  latencyMs: number;
  rounds: number;
  toolExecutions: ToolExecutionRecord[];
};

export async function runAgenticToolLoop(args: AgenticLoopArgs): Promise<AgenticLoopResult> {
  const conversationHistory: string[] = [args.userPrompt];
  const integrationConfigs: IntegrationConfigMap = await args.ctx.runQuery(
    internal.integrations.listConfigs,
    { workspaceId: args.workspaceId },
  );
  let finalText = "";
  let lastModel = args.modelId;
  let totalTokensIn = 0;
  let totalTokensOut = 0;
  let totalCostCents = 0;
  let totalLatencyMs = 0;
  const toolExecutions: ToolExecutionRecord[] = [];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    const result = await runAgentModel({
      systemPrompt: args.systemPrompt,
      userPrompt: conversationHistory.join("\n\n"),
      tools: args.tools,
      maxTokens: args.maxTokens ?? 1024,
      mockText: args.mockText,
    });

    lastModel = result.model;
    totalTokensIn += result.tokensIn;
    totalTokensOut += result.tokensOut;
    totalCostCents += result.costCents;
    totalLatencyMs += result.latencyMs;

    await args.ctx.runMutation(internal.traces.recordInternal, {
      runId: args.runId,
      taskId: args.taskId,
      agentId: args.agentId,
      agentTag: args.agentTag,
      crewTag: args.crewTag,
      crewName: args.crewName,
      action:
        round === 0
          ? `${args.agentName} agent reasoning with system prompt: ${args.systemPrompt.slice(0, 1000)}`
          : `${args.agentName} agent tool round ${round}`,
      stepType: "llm_call",
      model: result.model,
      status: "ok",
      toolName: undefined,
      toolOutputPreview: undefined,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
      costCents: result.costCents,
      latencyMs: result.latencyMs,
      cacheHit: result.cacheHit,
      cacheTokens: result.cacheTokens,
      confidence: 0.88,
      workspaceId: args.workspaceId,
    });

    if (result.text) {
      finalText = result.text;
    }

    if (result.stopReason !== "tool_use" || result.toolCalls.length === 0) {
      return {
        text: finalText || args.mockText,
        model: lastModel,
        tokensIn: totalTokensIn,
        tokensOut: totalTokensOut,
        costCents: totalCostCents,
        latencyMs: totalLatencyMs,
        rounds: round + 1,
        toolExecutions,
      };
    }

    for (const toolCall of result.toolCalls) {
      const input = {
        ...(args.toolDefaults?.[toolCall.name] ?? {}),
        ...toolCall.input,
      };
      const toolResult = await executeToolCall(toolCall.name, input, integrationConfigs);
      const toolStatus = isToolResultError(toolResult) ? "error" : "ok";
      toolExecutions.push({
        name: toolCall.name,
        status: toolStatus,
        result: toolResult,
      });

      await args.ctx.runMutation(internal.traces.recordInternal, {
        runId: args.runId,
        taskId: args.taskId,
        agentId: args.agentId,
        agentTag: args.agentTag,
        crewTag: args.crewTag,
        crewName: args.crewName,
        action: `${toolCall.name}(${JSON.stringify(input).slice(0, 80)})`,
        stepType: "tool_call",
        model: lastModel,
        status: toolStatus,
        toolName: toolCall.name,
        toolOutputPreview: toolResult.slice(0, 200),
        tokensIn: 0,
        tokensOut: 0,
        costCents: 0,
        latencyMs: 0,
        cacheHit: false,
        cacheTokens: 0,
        confidence: 0.9,
        workspaceId: args.workspaceId,
      });

      await args.ctx.runMutation(internal.traces.recordInternal, {
        runId: args.runId,
        taskId: args.taskId,
        agentId: args.agentId,
        agentTag: args.agentTag,
        crewTag: args.crewTag,
        crewName: args.crewName,
        action: `${toolCall.name} result for ${toolCall.id}`,
        stepType: "tool_result",
        model: lastModel,
        status: toolStatus,
        toolName: toolCall.name,
        toolOutputPreview: toolResult.slice(0, 200),
        tokensIn: 0,
        tokensOut: 0,
        costCents: 0,
        latencyMs: 0,
        cacheHit: false,
        cacheTokens: 0,
        confidence: 0.9,
        workspaceId: args.workspaceId,
      });

      conversationHistory.push(`Tool result for ${toolCall.name} (${toolCall.id}):\n${toolResult}`);
    }
  }

  return {
    text: finalText || "Tool execution stopped after reaching the maximum tool round limit.",
    model: lastModel,
    tokensIn: totalTokensIn,
    tokensOut: totalTokensOut,
    costCents: totalCostCents,
    latencyMs: totalLatencyMs,
    rounds: MAX_TOOL_ROUNDS,
    toolExecutions,
  };
}
