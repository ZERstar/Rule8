export type CrewTemplate = {
  key: string;
  label: string;
  icon: string;
  color: string;
  systemPrompt: string;
  toolKeys: string[];
};

export type IndustryTemplate = {
  key: string;
  label: string;
  description: string;
  crews: CrewTemplate[];
  suggestedIntegrations: string[];
};

export const INDUSTRY_TEMPLATES: IndustryTemplate[] = [
  {
    key: "saas-founder",
    label: "SaaS / B2B Software",
    description: "Running a software product with paying customers",
    suggestedIntegrations: ["intercom", "stripe", "resend"],
    crews: [
      { key: "support", label: "Customer Support", icon: "CS", color: "#4D7CFF", systemPrompt: "Handle customer support tickets with empathy and speed.", toolKeys: ["intercom_reply"] },
      { key: "billing", label: "Billing & Refunds", icon: "$", color: "#14B8A6", systemPrompt: "Handle billing queries, refund requests, and subscription lookups.", toolKeys: ["stripe_lookup", "stripe_refund"] },
      { key: "onboarding", label: "Onboarding", icon: "OB", color: "#8B5CF6", systemPrompt: "Help new customers get set up and see value quickly.", toolKeys: ["resend_email"] },
    ],
  },
  {
    key: "ecommerce",
    label: "E-commerce / DTC",
    description: "Online store with orders, returns, and customer experience",
    suggestedIntegrations: ["stripe", "resend"],
    crews: [
      { key: "returns", label: "Returns & Refunds", icon: "RT", color: "#14B8A6", systemPrompt: "Process return requests and refunds per policy.", toolKeys: ["stripe_refund"] },
      { key: "support", label: "Customer Support", icon: "CS", color: "#4D7CFF", systemPrompt: "Handle order inquiries and general customer questions.", toolKeys: [] },
      { key: "reviews", label: "Reviews & Reputation", icon: "RV", color: "#F59E0B", systemPrompt: "Respond to reviews and flag negative sentiment.", toolKeys: [] },
    ],
  },
  {
    key: "agency",
    label: "Agency / Freelance",
    description: "Client services, project billing, and communications",
    suggestedIntegrations: ["stripe", "resend"],
    crews: [
      { key: "client-comms", label: "Client Communications", icon: "CC", color: "#4D7CFF", systemPrompt: "Handle client questions and project updates professionally.", toolKeys: ["resend_email"] },
      { key: "billing", label: "Project Billing", icon: "$", color: "#14B8A6", systemPrompt: "Handle invoice queries and payment tracking.", toolKeys: ["stripe_lookup"] },
    ],
  },
  {
    key: "community",
    label: "Community / Creator",
    description: "Discord or Slack community management",
    suggestedIntegrations: ["discord"],
    crews: [
      { key: "moderation", label: "Community Moderation", icon: "CM", color: "#8B5CF6", systemPrompt: "Moderate community channels, respond to questions, and flag violations.", toolKeys: ["discord_reply", "discord_dm"] },
      { key: "support", label: "Member Support", icon: "MS", color: "#4D7CFF", systemPrompt: "Answer member questions and help resolve issues.", toolKeys: ["discord_reply"] },
    ],
  },
  {
    key: "blank",
    label: "Start from scratch",
    description: "Define your own crews",
    suggestedIntegrations: [],
    crews: [],
  },
];
