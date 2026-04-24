type TraceDetailProps = {
  runId: string;
  model: string;
  stepType: string;
  cacheHit: boolean;
  cacheTokens: number;
  toolName?: string;
  toolOutputPreview?: string;
  confidence?: number;
  tokensIn: number;
  tokensOut: number;
};

export function TraceDetail({
  runId, model, stepType, cacheHit, cacheTokens,
  toolName, toolOutputPreview, confidence, tokensIn, tokensOut,
}: TraceDetailProps) {
  const rows = [
    { key: "Run ID",       value: runId },
    { key: "Model",        value: model },
    { key: "Step type",    value: stepType },
    { key: "Tokens in",    value: tokensIn.toLocaleString() },
    { key: "Tokens out",   value: tokensOut.toLocaleString() },
    { key: "Cache hit",    value: cacheHit ? "Yes" : "No" },
    { key: "Cache tokens", value: cacheTokens > 0 ? cacheTokens.toLocaleString() : "—" },
    ...(toolName ? [{ key: "Tool", value: toolName }] : []),
    ...(toolOutputPreview ? [{ key: "Tool output", value: toolOutputPreview }] : []),
    ...(confidence !== undefined
      ? [{ key: "Confidence", value: `${(confidence * 100).toFixed(0)}%` }]
      : []),
  ];

  return (
    <div className="mt-1 rounded-[6px] overflow-hidden" style={{ background: "var(--color-s2)" }}>
      {rows.map(({ key, value }, i) => (
        <div
          key={key}
          className="flex items-start gap-3 px-3 py-1.5"
          style={{ borderTop: i > 0 ? "1px solid var(--color-b1)" : undefined }}
        >
          <span className="w-24 shrink-0 font-mono text-[10px]" style={{ color: "var(--color-t3)" }}>
            {key}
          </span>
          <span className="break-all font-mono text-[10px]" style={{ color: "var(--color-t2)" }}>
            {value}
          </span>
        </div>
      ))}
    </div>
  );
}
