export type AgentToolDefinition = {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, { type: string; description?: string }>;
    required?: string[];
  };
};

export const SUPPORT_TOOLS: AgentToolDefinition[] = [
  {
    name: "intercom_reply",
    description: "Send a final customer response back to Intercom.",
    input_schema: {
      type: "object",
      properties: {
        reply: {
          type: "string",
          description: "The exact response that should be sent to the customer.",
        },
      },
      required: ["reply"],
    },
  },
];
