import type { IntegrationConfig } from "./types";

type LookupStripeBillingContextArgs = {
  email: string;
  summary: string;
};

export type StripeLookupResult = {
  mode: "live" | "mock";
  duplicateDetected: boolean;
  customerId?: string;
  customerEmail: string;
  chargeId?: string;
  amountCents?: number;
  currency: string;
  reason: string;
};

export type StripeRefundResult = {
  mode: "live" | "mock";
  refundId: string;
  amountCents: number;
  chargeId: string;
  status: "succeeded" | "pending";
};

function parseRequestedAmountCents(summary: string) {
  const amountMatch = summary.match(/\$([0-9]+(?:\.[0-9]{1,2})?)/);
  if (!amountMatch) {
    return 2_400;
  }

  return Math.round(Number.parseFloat(amountMatch[1]) * 100);
}

function shouldTreatAsDuplicate(summary: string) {
  return /(charged twice|duplicate charge|double charge|refund)/i.test(summary);
}

function getStripeSecretKey(config?: IntegrationConfig) {
  return config?.accessToken ?? process.env.STRIPE_SECRET_KEY ?? "";
}

function getAuthHeader(secretKey: string) {
  return `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`;
}

export async function lookupStripeBillingContext(
  args: LookupStripeBillingContextArgs,
  config?: IntegrationConfig,
): Promise<StripeLookupResult> {
  const secretKey = getStripeSecretKey(config);

  if (!secretKey) {
    const amountCents = parseRequestedAmountCents(args.summary);
    const duplicateDetected = shouldTreatAsDuplicate(args.summary);

    return {
      mode: "mock",
      duplicateDetected,
      customerId: duplicateDetected ? `cus_mock_${args.email.replace(/[^a-z0-9]/gi, "_")}` : undefined,
      customerEmail: args.email,
      chargeId: duplicateDetected ? `ch_mock_${Date.now()}` : undefined,
      amountCents: duplicateDetected ? amountCents : undefined,
      currency: "usd",
      reason: duplicateDetected
        ? `Mocked Stripe lookup found a likely duplicate charge for ${args.email}.`
        : `Mocked Stripe lookup found no duplicate charge for ${args.email}.`,
    };
  }

  const customerSearch = await fetch(
    `https://api.stripe.com/v1/customers/search?query=${encodeURIComponent(`email:'${args.email}'`)}&limit=1`,
    {
      headers: {
        authorization: getAuthHeader(secretKey),
      },
    },
  );

  if (!customerSearch.ok) {
    throw new Error(`Stripe customer lookup failed with status ${customerSearch.status}`);
  }

  const customerBody = (await customerSearch.json()) as {
    data?: Array<{ id: string; email?: string }>;
  };
  const customer = customerBody.data?.[0];
  if (!customer) {
    return {
      mode: "live",
      duplicateDetected: false,
      customerEmail: args.email,
      currency: "usd",
      reason: `No Stripe customer found for ${args.email}.`,
    };
  }

  const chargesResponse = await fetch(
    `https://api.stripe.com/v1/charges?customer=${encodeURIComponent(customer.id)}&limit=10`,
    {
      headers: {
        authorization: getAuthHeader(secretKey),
      },
    },
  );

  if (!chargesResponse.ok) {
    throw new Error(`Stripe charge lookup failed with status ${chargesResponse.status}`);
  }

  const chargesBody = (await chargesResponse.json()) as {
    data?: Array<{ id: string; amount: number; currency: string; paid?: boolean; refunded?: boolean }>;
  };
  const charges = chargesBody.data ?? [];
  const duplicateCharge = charges.find((charge, index) =>
    charges.some(
      (candidate, candidateIndex) =>
        candidateIndex !== index &&
        candidate.amount === charge.amount &&
        candidate.paid &&
        !candidate.refunded,
    ),
  );

  if (!duplicateCharge) {
    return {
      mode: "live",
      duplicateDetected: false,
      customerId: customer.id,
      customerEmail: customer.email ?? args.email,
      currency: "usd",
      reason: `No duplicate charge detected for ${args.email}.`,
    };
  }

  return {
    mode: "live",
    duplicateDetected: true,
    customerId: customer.id,
    customerEmail: customer.email ?? args.email,
    chargeId: duplicateCharge.id,
    amountCents: duplicateCharge.amount,
    currency: duplicateCharge.currency,
    reason: `Found duplicate charge ${duplicateCharge.id} for ${args.email}.`,
  };
}

export async function refundStripeCharge(args: {
  chargeId: string;
  amountCents: number;
  reason?: string;
}, config?: IntegrationConfig): Promise<StripeRefundResult> {
  const secretKey = getStripeSecretKey(config);

  if (!secretKey) {
    return {
      mode: "mock",
      refundId: `re_mock_${Date.now()}`,
      amountCents: args.amountCents,
      chargeId: args.chargeId,
      status: "succeeded",
    };
  }

  const body = new URLSearchParams({
    charge: args.chargeId,
    amount: String(args.amountCents),
  });
  if (args.reason) body.set("reason", args.reason);

  const response = await fetch("https://api.stripe.com/v1/refunds", {
    method: "POST",
    headers: {
      authorization: getAuthHeader(secretKey),
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Stripe refund failed with status ${response.status}: ${text.slice(0, 200)}`);
  }

  const refund = (await response.json()) as {
    id: string;
    amount: number;
    charge: string;
    status?: "succeeded" | "pending";
  };

  return {
    mode: "live",
    refundId: refund.id,
    amountCents: refund.amount,
    chargeId: refund.charge,
    status: refund.status ?? "pending",
  };
}

export async function executeStripeLookup(
  input: { userEmail: string; summary?: string },
  config: IntegrationConfig,
): Promise<string> {
  const email = input.userEmail;
  if (!email) return "Stripe lookup requires userEmail.";

  const result = await lookupStripeBillingContext(
    { email, summary: input.summary ?? "" },
    config,
  );

  return [
    `mode=${result.mode}`,
    `duplicateDetected=${result.duplicateDetected}`,
    result.customerId ? `customerId=${result.customerId}` : undefined,
    `customerEmail=${result.customerEmail}`,
    result.chargeId ? `chargeId=${result.chargeId}` : undefined,
    result.amountCents ? `amountCents=${result.amountCents}` : undefined,
    `reason=${result.reason}`,
  ].filter(Boolean).join("; ");
}

export async function executeStripeRefund(
  input: { chargeId: string; amountCents: number; reason?: string },
  config: IntegrationConfig,
): Promise<string> {
  if (!input.chargeId) return "Stripe refund requires chargeId.";
  if (!input.amountCents) return "Stripe refund requires amountCents.";

  const refund = await refundStripeCharge(
    {
      chargeId: input.chargeId,
      amountCents: input.amountCents,
      reason: input.reason,
    },
    config,
  );

  return `Refund created: ${refund.refundId} - $${(refund.amountCents / 100).toFixed(2)} - status: ${refund.status}`;
}

export async function testStripeConnection(config: IntegrationConfig): Promise<string | null> {
  const secretKey = getStripeSecretKey(config);
  if (!secretKey) return "No secret key provided.";

  const res = await fetch("https://api.stripe.com/v1/balance", {
    headers: {
      authorization: getAuthHeader(secretKey),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    return `Token invalid (${res.status}): ${text.slice(0, 200)}`;
  }

  return null;
}
