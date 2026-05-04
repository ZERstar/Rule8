import { v } from "convex/values";

import { internal } from "./_generated/api";
import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { runAgentModel } from "../lib/anthropic";

type OnboardingConfig = {
  industryTemplate: string;
  crews: Array<{
    key: string;
    label: string;
    icon: string;
    color: string;
    systemPrompt: string;
    toolKeys: string[];
  }>;
  suggestedIntegrations: string[];
  productSummary: string;
  dominantPain: string;
};

function slugFromOwner(ownerUserId: string) {
  const userScopedPart = ownerUserId.split("|").pop() ?? ownerUserId;
  return userScopedPart
    .slice(0, 24)
    .replace(/[^a-z0-9]/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || "workspace";
}

function fallbackOnboardingConfig(answers: string[]): OnboardingConfig {
  const all = answers.join(" ").toLowerCase();
  const hasBilling = /(billing|refund|stripe|invoice|payment|subscription|charge)/.test(all);
  const hasCommunity = /(discord|community|slack|member|moderation|social)/.test(all);
  const hasAgency = /(agency|client|freelance|project)/.test(all);

  const crews = [
    {
      key: hasBilling ? "billing" : "support",
      label: hasBilling ? "Billing & Refunds" : "Customer Support",
      icon: hasBilling ? "BR" : "CS",
      color: hasBilling ? "#14B8A6" : "#4D7CFF",
      systemPrompt: hasBilling
        ? "Handle billing questions, subscription lookups, and refund requests within policy."
        : "Handle customer support questions clearly and escalate risky requests.",
      toolKeys: hasBilling ? ["stripe_lookup", "stripe_refund"] : ["intercom_reply"],
    },
    {
      key: hasCommunity ? "community" : "onboarding",
      label: hasCommunity ? "Community" : "Onboarding",
      icon: hasCommunity ? "CM" : "OB",
      color: hasCommunity ? "#8B5CF6" : "#F59E0B",
      systemPrompt: hasCommunity
        ? "Moderate community channels, answer repeat questions, and flag emerging patterns."
        : "Help new customers get set up and reach first value quickly.",
      toolKeys: hasCommunity ? ["discord_reply", "discord_dm"] : ["intercom_reply"],
    },
  ];

  return {
    industryTemplate: hasCommunity ? "community" : hasAgency ? "agency" : hasBilling ? "saas-founder" : "custom",
    crews,
    suggestedIntegrations: [
      ...(hasBilling ? ["stripe"] : []),
      ...(hasCommunity ? ["discord"] : ["intercom"]),
    ],
    productSummary: answers[0] ?? "",
    dominantPain: answers[2] ?? "",
  };
}

function parseOnboardingConfig(text: string, answers: string[]): OnboardingConfig {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return fallbackOnboardingConfig(answers);

  try {
    const parsed = JSON.parse(match[0]) as Partial<OnboardingConfig>;
    const fallback = fallbackOnboardingConfig(answers);
    return {
      industryTemplate: typeof parsed.industryTemplate === "string" ? parsed.industryTemplate : fallback.industryTemplate,
      crews: Array.isArray(parsed.crews) && parsed.crews.length
        ? parsed.crews.map((crew, index) => ({
            key: typeof crew.key === "string" ? crew.key : `crew-${index + 1}`,
            label: typeof crew.label === "string" ? crew.label : `Crew ${index + 1}`,
            icon: typeof crew.icon === "string" ? crew.icon : "AI",
            color: typeof crew.color === "string" ? crew.color : "#64748B",
            systemPrompt: typeof crew.systemPrompt === "string"
              ? crew.systemPrompt
              : "Handle this workflow and escalate risky edge cases.",
            toolKeys: Array.isArray(crew.toolKeys)
              ? crew.toolKeys.filter((tool): tool is string => typeof tool === "string")
              : [],
          }))
        : fallback.crews,
      suggestedIntegrations: Array.isArray(parsed.suggestedIntegrations)
        ? parsed.suggestedIntegrations.filter((provider): provider is string => typeof provider === "string")
        : fallback.suggestedIntegrations,
      productSummary: typeof parsed.productSummary === "string" ? parsed.productSummary : fallback.productSummary,
      dominantPain: typeof parsed.dominantPain === "string" ? parsed.dominantPain : fallback.dominantPain,
    };
  } catch {
    return fallbackOnboardingConfig(answers);
  }
}

export const getOrCreate = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const ownerUserId = identity.tokenIdentifier;
    const existing = await ctx.db
      .query("workspaces")
      .withIndex("by_owner", (q) => q.eq("ownerUserId", ownerUserId))
      .unique();

    if (existing) return existing;

    const id = await ctx.db.insert("workspaces", {
      ownerUserId,
      name: args.name,
      slug: slugFromOwner(ownerUserId),
      plan: "free",
      industryTemplate: undefined,
      onboardingStep: undefined,
      onboardingCrewConfig: undefined,
      onboardingComplete: false,
      createdAt: Date.now(),
    });

    return await ctx.db.get(id);
  },
});

export const getByOwner = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    return await ctx.db
      .query("workspaces")
      .withIndex("by_owner", (q) => q.eq("ownerUserId", identity.tokenIdentifier))
      .unique();
  },
});

export const getOnboardingState = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace || workspace.ownerUserId !== identity.tokenIdentifier) {
      throw new Error("Unauthorized");
    }

    return {
      industryTemplate: workspace.industryTemplate,
      onboardingStep: workspace.onboardingStep,
      onboardingCrewConfig: workspace.onboardingCrewConfig,
      onboardingComplete: workspace.onboardingComplete,
    };
  },
});

export const listAll = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("workspaces").collect();
  },
});

export const assertOwned = internalQuery({
  args: { workspaceId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const workspace = await ctx.db
      .query("workspaces")
      .withIndex("by_owner", (q) => q.eq("ownerUserId", identity.tokenIdentifier))
      .unique();

    if (!workspace || workspace._id !== args.workspaceId) {
      throw new Error("Unauthorized");
    }

    return true;
  },
});

export const markOnboardingComplete = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    industryTemplate: v.optional(v.string()),
    crewConfig: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace || workspace.ownerUserId !== identity.tokenIdentifier) {
      throw new Error("Unauthorized");
    }

    const industryTemplate = args.industryTemplate ?? workspace.industryTemplate;
    const crewConfig = args.crewConfig ?? workspace.onboardingCrewConfig;

    await ctx.db.patch(args.workspaceId, {
      industryTemplate,
      onboardingStep: "done",
      onboardingCrewConfig: crewConfig,
      onboardingComplete: true,
    });

    if (crewConfig) {
      await ctx.runMutation(internal.agents.applyOnboardingCrewConfig, {
        workspaceId: args.workspaceId,
        crewConfig,
      });
    }
  },
});

export const saveOnboardingConfig = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    onboardingStep: v.string(),
    onboardingCrewConfig: v.optional(v.string()),
    industryTemplate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace || workspace.ownerUserId !== identity.tokenIdentifier) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.workspaceId, {
      onboardingStep: args.onboardingStep,
      onboardingCrewConfig: args.onboardingCrewConfig,
      industryTemplate: args.industryTemplate,
    });
  },
});

export const saveOnboardingConfigInternal = internalMutation({
  args: {
    workspaceId: v.id("workspaces"),
    onboardingStep: v.string(),
    onboardingCrewConfig: v.optional(v.string()),
    industryTemplate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.workspaceId, {
      onboardingStep: args.onboardingStep,
      onboardingCrewConfig: args.onboardingCrewConfig,
      industryTemplate: args.industryTemplate,
    });
  },
});

export const synthesizeOnboardingConfig = action({
  args: {
    workspaceId: v.id("workspaces"),
    answers: v.array(v.string()),
  },
  handler: async (ctx, args): Promise<OnboardingConfig> => {
    await ctx.runQuery(internal.workspaces.assertOwned, { workspaceId: args.workspaceId });

    const result = await runAgentModel({
      systemPrompt: [
        "You are the Rule8 Executive AI configuring a founder workspace.",
        "Return only JSON with industryTemplate, crews, suggestedIntegrations, productSummary, and dominantPain.",
        "Each crew needs key, label, icon, color, systemPrompt, and toolKeys.",
        "Prefer integrations from intercom, stripe, and discord when relevant.",
      ].join(" "),
      userPrompt: [
        `Product and customers: ${args.answers[0] ?? ""}`,
        `Current customer tools: ${args.answers[1] ?? ""}`,
        `Operational interruptions: ${args.answers[2] ?? ""}`,
      ].join("\n"),
      maxTokens: 900,
      mockText: JSON.stringify(fallbackOnboardingConfig(args.answers)),
      allowMock: true,
    });

    const config = parseOnboardingConfig(result.text, args.answers);
    const configJson = JSON.stringify(config);

    await ctx.runMutation(internal.chat.insertMessage, {
      workspaceId: args.workspaceId,
      role: "executive",
      text: `I built an onboarding draft with ${config.crews.length} crews and ${config.suggestedIntegrations.length} suggested integrations.`,
    });

    await ctx.runMutation(internal.workspaces.saveOnboardingConfigInternal, {
      workspaceId: args.workspaceId,
      onboardingStep: "review",
      onboardingCrewConfig: configJson,
      industryTemplate: config.industryTemplate,
    });

    return config;
  },
});
