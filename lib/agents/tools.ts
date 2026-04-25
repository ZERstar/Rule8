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

export const FINANCE_TOOLS: AgentToolDefinition[] = [
  {
    name: "stripe_lookup",
    description: "Look up billing context in Stripe for a given customer email.",
    input_schema: {
      type: "object",
      properties: {
        email: {
          type: "string",
          description: "The customer email to inspect in Stripe.",
        },
      },
      required: ["email"],
    },
  },
  {
    name: "stripe_refund",
    description: "Issue a refund for an eligible Stripe charge.",
    input_schema: {
      type: "object",
      properties: {
        chargeId: {
          type: "string",
          description: "The Stripe charge ID to refund.",
        },
        amount: {
          type: "number",
          description: "Refund amount in cents.",
        },
      },
      required: ["chargeId", "amount"],
    },
  },
  SUPPORT_TOOLS[0],
];

export const COMMUNITY_TOOLS: AgentToolDefinition[] = [
  {
    name: "discord_reply",
    description: "Send a reply in the Discord channel or thread where the message was posted.",
    input_schema: {
      type: "object",
      properties: {
        channelId: {
          type: "string",
          description: "The Discord channel ID to reply in.",
        },
        content: {
          type: "string",
          description: "The reply message content.",
        },
      },
      required: ["channelId", "content"],
    },
  },
  {
    name: "discord_dm",
    description: "Send a direct message warning to a Discord user who violated community guidelines.",
    input_schema: {
      type: "object",
      properties: {
        userId: {
          type: "string",
          description: "The Discord user ID to send a warning DM to.",
        },
        content: {
          type: "string",
          description: "The warning message content.",
        },
      },
      required: ["userId", "content"],
    },
  },
];
