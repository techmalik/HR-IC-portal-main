import geoip from "geoip-lite";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_TEST_API_KEY || "";
const PAYSTACK_BASE_URL = "https://api.paystack.co";

// ---------------------------------------------------------------------------
// Currency detection
// ---------------------------------------------------------------------------

const EU_COUNTRY_CODES = new Set([
  "AT","BE","BG","CY","CZ","DE","DK","EE","ES","FI","FR","GR","HR",
  "HU","IE","IT","LT","LU","LV","MT","NL","PL","PT","RO","SE","SI","SK",
]);

export type BillingCurrency = "NGN" | "USD" | "EUR";

export function detectCurrencyFromIp(ip: string): BillingCurrency {
  const cleaned = ip.replace(/^::ffff:/, "");
  const geo = geoip.lookup(cleaned);
  if (!geo) return "USD";
  const country = geo.country;
  if (country === "NG") return "NGN";
  if (EU_COUNTRY_CODES.has(country)) return "EUR";
  return "USD";
}

// ---------------------------------------------------------------------------
// Pricing per plan per currency
// Paystack amounts are in the LOWEST denomination (kobo for NGN, cents for USD/EUR)
// ---------------------------------------------------------------------------

export const PAYSTACK_PRICES: Record<string, Record<BillingCurrency, { amount: number; label: string }>> = {
  starter: {
    NGN: { amount: 1500000, label: "₦15,000" },
    USD: { amount:     900, label: "$9"       },
    EUR: { amount:     800, label: "€8"       },
  },
  pro: {
    NGN: { amount: 2200000, label: "₦22,000" },
    USD: { amount:    1400, label: "$14"      },
    EUR: { amount:    1300, label: "€13"      },
  },
};

// Display prices for the billing page (does not require Paystack plan codes)
export const DISPLAY_PRICES: Record<string, Record<BillingCurrency, string>> = {
  starter: { NGN: "₦15,000", USD: "$9", EUR: "€8" },
  pro:     { NGN: "₦22,000", USD: "$14", EUR: "€13" },
};

// ---------------------------------------------------------------------------
// Low-level Paystack API helper
// ---------------------------------------------------------------------------

async function paystackRequest<T = any>(
  method: "GET" | "POST" | "PUT",
  path: string,
  body?: Record<string, any>,
): Promise<{ status: boolean; message: string; data: T }> {
  const res = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json() as any;

  if (!res.ok || !json.status) {
    throw new Error(json.message || `Paystack request failed: ${res.status}`);
  }

  return json;
}

// ---------------------------------------------------------------------------
// Customer operations
// ---------------------------------------------------------------------------

export interface PaystackCustomer {
  id: number;
  customer_code: string;
  email: string;
}

export async function findOrCreateCustomer(email: string, firstName: string, lastName: string): Promise<PaystackCustomer> {
  // Try to fetch existing customer by email
  try {
    const existing = await paystackRequest<PaystackCustomer>("GET", `/customer/${encodeURIComponent(email)}`);
    return existing.data;
  } catch {
    // Customer not found — create one
    const created = await paystackRequest<PaystackCustomer>("POST", "/customer", {
      email,
      first_name: firstName,
      last_name: lastName,
    });
    return created.data;
  }
}

// ---------------------------------------------------------------------------
// Transaction initialisation — used to start the checkout redirect
// ---------------------------------------------------------------------------

export interface PaystackInitResult {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export async function initializeTransaction(opts: {
  email: string;
  planCode: string;
  currency: BillingCurrency;
  callbackUrl: string;
  metadata?: Record<string, any>;
}): Promise<PaystackInitResult> {
  // When a plan code is provided, Paystack uses the plan's configured amount for recurring billing.
  // We also pass the amount for the first charge (in kobo/cents).
  const planKey = opts.metadata?.plan as string | undefined;
  const price = planKey ? PAYSTACK_PRICES[planKey]?.[opts.currency]?.amount : undefined;

  const body: Record<string, any> = {
    email: opts.email,
    currency: opts.currency,
    plan: opts.planCode,
    callback_url: opts.callbackUrl,
    metadata: opts.metadata,
  };

  // Include amount if available; omit otherwise so Paystack falls back to the plan amount
  if (price) body.amount = price;

  const result = await paystackRequest<PaystackInitResult>("POST", "/transaction/initialize", body);
  return result.data;
}

// ---------------------------------------------------------------------------
// Transaction verification — called after the Paystack redirect
// ---------------------------------------------------------------------------

export interface PaystackVerifyResult {
  status: string;           // "success" | "failed" | "abandoned"
  reference: string;
  amount: number;
  currency: string;
  customer: { email: string; customer_code: string };
  plan_object?: { plan_code: string };
  subscription?: { subscription_code: string };
  metadata?: Record<string, any>;
}

export async function verifyTransaction(reference: string): Promise<PaystackVerifyResult> {
  const result = await paystackRequest<PaystackVerifyResult>("GET", `/transaction/verify/${encodeURIComponent(reference)}`);
  return result.data;
}

// ---------------------------------------------------------------------------
// Plan creation helper — run once during setup to create plans in Paystack
// ---------------------------------------------------------------------------

export interface PaystackPlan {
  plan_code: string;
  name: string;
  amount: number;
  currency: string;
  interval: string;
}

export async function createPlan(opts: {
  name: string;
  amount: number;
  currency: BillingCurrency;
  interval?: string;
}): Promise<PaystackPlan> {
  const result = await paystackRequest<PaystackPlan>("POST", "/plan", {
    name: opts.name,
    amount: opts.amount,
    currency: opts.currency,
    interval: opts.interval || "monthly",
  });
  return result.data;
}

export async function listPlans(): Promise<PaystackPlan[]> {
  const result = await paystackRequest<PaystackPlan[]>("GET", "/plan?perPage=50");
  return result.data ?? [];
}
