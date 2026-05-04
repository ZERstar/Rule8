import type { AgentToolDefinition } from "./agents/tools";

const ANTHROPIC_VERSION = "2023-06-01";
const PROMPT_CACHING_BETA = "prompt-caching-2024-07-31";
const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-20250514";
const DEFAULT_NVIDIA_MODEL = "qwen/qwen3.5-122b-a10b";
const DEFAULT_NVIDIA_FALLBACK_MODELS: string[] = [];
const DEFAULT_MODEL_TIMEOUT_MS = 45000;

type RunAgentModelArgs = {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  model?: string;
  tools?: AgentToolDefinition[];
  mockText?: string;
  allowMock?: boolean;
};

export type RunAgentModelResult = {
  text: string;
  toolCalls: ToolCall[];
  stopReason: "end_turn" | "tool_use" | "max_tokens" | "error";
  model: string;
  tokensIn: number;
  tokensOut: number;
  costCents: number;
  latencyMs: number;
  cacheHit: boolean;
  cacheTokens: number;
  mocked: boolean;
};

export type ToolCall = {
  id: string;
  name: string;
  input: Record<string, unknown>;
};

function estimateTokens(text: string) {
  return Math.max(40, Math.ceil(text.length / 4));
}

function estimateCostCents(tokensIn: number, tokensOut: number, cacheTokens: number) {
  const rawCents = ((tokensIn * 3) + (tokensOut * 15) + Math.round(cacheTokens * 0.3)) / 10000;
  return Math.max(1, Math.round(rawCents));
}

function collectResponseText(content: unknown) {
  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map((block) => {
      if (typeof block !== "object" || block === null) {
        return "";
      }

      const maybeBlock = block as { type?: string; text?: string };
      return maybeBlock.type === "text" ? maybeBlock.text ?? "" : "";
    })
    .join("\n")
    .trim();
}

function collectAnthropicToolCalls(content: unknown): ToolCall[] {
  if (!Array.isArray(content)) return [];

  return content.flatMap((block): ToolCall[] => {
    if (typeof block !== "object" || block === null) return [];
    const maybeBlock = block as { type?: string; id?: string; name?: string; input?: unknown };
    if (maybeBlock.type !== "tool_use" || !maybeBlock.id || !maybeBlock.name) return [];
    return [{
      id: maybeBlock.id,
      name: maybeBlock.name,
      input:
        typeof maybeBlock.input === "object" && maybeBlock.input !== null
          ? maybeBlock.input as Record<string, unknown>
          : {},
    }];
  });
}

function collectChatCompletionText(content: unknown) {
  if (typeof content === "string") {
    return content.trim();
  }

  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map((part) => {
      if (typeof part === "string") {
        return part;
      }

      if (typeof part !== "object" || part === null) {
        return "";
      }

      const maybePart = part as { type?: string; text?: string };
      return maybePart.type === "text" ? maybePart.text ?? "" : "";
    })
    .join("\n")
    .trim();
}

function collectChatCompletionToolCalls(toolCalls: unknown): ToolCall[] {
  if (!Array.isArray(toolCalls)) return [];

  return toolCalls.flatMap((toolCall): ToolCall[] => {
    if (typeof toolCall !== "object" || toolCall === null) return [];
    const maybeToolCall = toolCall as {
      id?: string;
      function?: { name?: string; arguments?: string };
    };
    const name = maybeToolCall.function?.name;
    if (!name) return [];

    let input: Record<string, unknown> = {};
    const rawArgs = maybeToolCall.function?.arguments;
    if (rawArgs) {
      try {
        const parsed = JSON.parse(rawArgs) as unknown;
        input = typeof parsed === "object" && parsed !== null ? parsed as Record<string, unknown> : {};
      } catch {
        input = {};
      }
    }

    return [{
      id: maybeToolCall.id ?? `${name}-${Date.now()}`,
      name,
      input,
    }];
  });
}

function toOpenAiTools(tools?: AgentToolDefinition[]) {
  return tools?.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema,
    },
  }));
}

function getProvider(nvidiaApiKey?: string) {
  return (process.env.AGENT_MODEL_PROVIDER ?? (nvidiaApiKey ? "nvidia" : "anthropic")).toLowerCase();
}

function getModel(provider: string, model?: string) {
  if (model) {
    return model;
  }

  if (process.env.AGENT_MODEL_ID) {
    return process.env.AGENT_MODEL_ID;
  }

  return provider === "nvidia" ? DEFAULT_NVIDIA_MODEL : DEFAULT_ANTHROPIC_MODEL;
}

function getNvidiaModelCandidates(primaryModel: string) {
  const configuredFallbacks =
    process.env.NVIDIA_FALLBACK_MODEL_IDS?.split(",")
      .map((model) => model.trim())
      .filter(Boolean) ?? DEFAULT_NVIDIA_FALLBACK_MODELS;

  return Array.from(new Set([primaryModel, ...configuredFallbacks]));
}

function getModelTimeoutMs() {
  const configured = Number(process.env.AGENT_MODEL_TIMEOUT_MS);
  return Number.isFinite(configured) && configured >= 1000
    ? configured
    : DEFAULT_MODEL_TIMEOUT_MS;
}

function mockResult(
  args: RunAgentModelArgs,
  model: string,
  startedAt: number,
  cacheHit = false,
): RunAgentModelResult {
  if (!args.mockText) {
    throw new Error("AI model unavailable and no mock response was provided.");
  }

  const tokensIn = estimateTokens(`${args.systemPrompt}\n${args.userPrompt}`);
  const tokensOut = estimateTokens(args.mockText);
  const cacheTokens = cacheHit ? Math.floor(tokensIn * 0.35) : 0;

  return {
    text: args.mockText,
    toolCalls: [],
    stopReason: "end_turn",
    model,
    tokensIn,
    tokensOut,
    costCents: estimateCostCents(tokensIn, tokensOut, cacheTokens),
    latencyMs: cacheHit ? 720 : Date.now() - startedAt,
    cacheHit,
    cacheTokens,
    mocked: true,
  };
}

function mockResponsesEnabled(args: RunAgentModelArgs) {
  return args.allowMock || process.env.ALLOW_MOCK_AI_RESPONSES === "true";
}

export async function runAgentModel(args: RunAgentModelArgs): Promise<RunAgentModelResult> {
  const startedAt = Date.now();
  const nvidiaApiKey = process.env.NVIDIA_API_KEY;
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  const provider = getProvider(nvidiaApiKey);
  const model = getModel(provider, args.model);

  if (provider === "nvidia" && nvidiaApiKey) {
    for (const candidateModel of getNvidiaModelCandidates(model)) {
      try {
        const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${nvidiaApiKey}`,
          },
          body: JSON.stringify({
            model: candidateModel,
            messages: [
              { role: "system", content: args.systemPrompt },
              { role: "user", content: args.userPrompt },
            ],
            max_tokens: args.maxTokens ?? 1024,
            tools: toOpenAiTools(args.tools),
          }),
          signal: AbortSignal.timeout(getModelTimeoutMs()),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`NVIDIA API error for ${candidateModel}: ${response.status}`, errorText);
          continue;
        }

        const body = (await response.json()) as {
          model?: string;
          choices?: Array<{
            finish_reason?: string;
            message?: {
              content?: unknown;
              tool_calls?: unknown;
            };
          }>;
          usage?: {
            prompt_tokens?: number;
            completion_tokens?: number;
          };
        };

        const choice = body.choices?.[0];
        const extractedText = collectChatCompletionText(choice?.message?.content);
        const toolCalls = collectChatCompletionToolCalls(choice?.message?.tool_calls);
        if (!extractedText && toolCalls.length === 0) {
          console.error("NVIDIA API: Failed to extract text from response", JSON.stringify(body));
          continue;
        }

        const tokensIn =
          body.usage?.prompt_tokens ?? estimateTokens(`${args.systemPrompt}\n${args.userPrompt}`);
        const tokensOut = body.usage?.completion_tokens ?? estimateTokens(extractedText);

        return {
          text: extractedText,
          toolCalls,
          stopReason:
            choice?.finish_reason === "tool_calls"
              ? "tool_use"
              : choice?.finish_reason === "length"
                ? "max_tokens"
                : "end_turn",
          model: body.model ?? candidateModel,
          tokensIn,
          tokensOut,
          costCents: estimateCostCents(tokensIn, tokensOut, 0),
          latencyMs: Date.now() - startedAt,
          cacheHit: false,
          cacheTokens: 0,
          mocked: false,
        };
      } catch (error) {
        console.error(`NVIDIA API error for ${candidateModel}:`, error);
      }
    }

    if (mockResponsesEnabled(args)) {
      console.error("All configured NVIDIA models failed; falling back to mock response.");
      return mockResult(args, model, startedAt);
    }

    throw new Error(`All configured NVIDIA models failed: ${getNvidiaModelCandidates(model).join(", ")}`);
  }

  if (!anthropicApiKey) {
    if (mockResponsesEnabled(args)) {
      return mockResult(args, model, startedAt, true);
    }

    throw new Error(
      provider === "nvidia"
        ? "NVIDIA_API_KEY is not configured for the AI agent."
        : "ANTHROPIC_API_KEY is not configured for the AI agent.",
    );
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": anthropicApiKey,
      "anthropic-version": ANTHROPIC_VERSION,
      "anthropic-beta": PROMPT_CACHING_BETA,
    },
    body: JSON.stringify({
      model,
      max_tokens: args.maxTokens ?? 1024,
      system: [
        {
          type: "text",
          text: args.systemPrompt,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: args.userPrompt }],
      tools: args.tools && args.tools.length > 0 ? args.tools : undefined,
    }),
    signal: AbortSignal.timeout(getModelTimeoutMs()),
  });

  if (!response.ok) {
    throw new Error(`Anthropic request failed with status ${response.status}`);
  }

  const body = (await response.json()) as {
    content?: unknown;
    model?: string;
    stop_reason?: "end_turn" | "tool_use" | "max_tokens" | string;
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
      cache_read_input_tokens?: number;
    };
  };

  const text = collectResponseText(body.content);
  const toolCalls = collectAnthropicToolCalls(body.content);
  if (!text && toolCalls.length === 0) {
    if (mockResponsesEnabled(args)) {
      return mockResult(args, model, startedAt);
    }

    throw new Error("Anthropic returned an empty response.");
  }

  const tokensIn = body.usage?.input_tokens ?? estimateTokens(`${args.systemPrompt}\n${args.userPrompt}`);
  const tokensOut = body.usage?.output_tokens ?? estimateTokens(text);
  const cacheTokens = body.usage?.cache_read_input_tokens ?? 0;

  return {
    text,
    toolCalls,
    stopReason:
      body.stop_reason === "tool_use"
        ? "tool_use"
        : body.stop_reason === "max_tokens"
          ? "max_tokens"
          : "end_turn",
    model: body.model ?? model,
    tokensIn,
    tokensOut,
    costCents: estimateCostCents(tokensIn, tokensOut, cacheTokens),
    latencyMs: Date.now() - startedAt,
    cacheHit: cacheTokens > 0,
    cacheTokens,
    mocked: false,
  };
}
