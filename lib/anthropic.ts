import type { AgentToolDefinition } from "./agents/tools";

const DEFAULT_MODEL = "claude-sonnet-4-6";
const ANTHROPIC_VERSION = "2023-06-01";
const PROMPT_CACHING_BETA = "prompt-caching-2024-07-31";

type RunAgentModelArgs = {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  model?: string;
  tools?: AgentToolDefinition[];
  mockText: string;
};

export type RunAgentModelResult = {
  text: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  costCents: number;
  latencyMs: number;
  cacheHit: boolean;
  cacheTokens: number;
  mocked: boolean;
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

export async function runAgentModel(args: RunAgentModelArgs): Promise<RunAgentModelResult> {
  const model = args.model ?? DEFAULT_MODEL;
  const startedAt = Date.now();
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    const tokensIn = estimateTokens(`${args.systemPrompt}\n${args.userPrompt}`);
    const tokensOut = estimateTokens(args.mockText);
    const cacheTokens = Math.floor(tokensIn * 0.35);

    return {
      text: args.mockText,
      model,
      tokensIn,
      tokensOut,
      costCents: estimateCostCents(tokensIn, tokensOut, cacheTokens),
      latencyMs: 720,
      cacheHit: true,
      cacheTokens,
      mocked: true,
    };
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
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
  });

  if (!response.ok) {
    throw new Error(`Anthropic request failed with status ${response.status}`);
  }

  const body = (await response.json()) as {
    content?: unknown;
    model?: string;
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
      cache_read_input_tokens?: number;
    };
  };

  const text = collectResponseText(body.content) || args.mockText;
  const tokensIn = body.usage?.input_tokens ?? estimateTokens(`${args.systemPrompt}\n${args.userPrompt}`);
  const tokensOut = body.usage?.output_tokens ?? estimateTokens(text);
  const cacheTokens = body.usage?.cache_read_input_tokens ?? 0;

  return {
    text,
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
