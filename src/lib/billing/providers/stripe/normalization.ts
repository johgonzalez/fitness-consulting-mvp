import type { BillingState, NormalizedBillingProviderSnapshot } from "../../domain.ts";
import { StripeProviderError } from "./errors.ts";
import type { NormalizeStripeSubscriptionInput } from "./types.ts";

interface StripeSubscriptionItemShape {
  current_period_start?: unknown;
  current_period_end?: unknown;
  price?: { id?: unknown } | null;
}

interface StripeSubscriptionShape {
  id?: unknown;
  status?: unknown;
  customer?: unknown;
  currency?: unknown;
  cancel_at_period_end?: unknown;
  canceled_at?: unknown;
  ended_at?: unknown;
  latest_invoice?: unknown;
  livemode?: unknown;
  items?: { data?: unknown } | null;
}

function providerId(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (typeof value !== "object" || value === null) return null;
  const id = (value as { id?: unknown }).id;
  return typeof id === "string" ? id : null;
}

function isoFromUnix(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (!Number.isSafeInteger(value) || Number(value) < 0) return null;
  return new Date(Number(value) * 1000).toISOString();
}

export function mapStripeSubscriptionStatus(status: string): BillingState {
  switch (status) {
    case "active":
      return "ACTIVE";
    case "past_due":
      return "GRACE";
    case "unpaid":
    case "canceled":
    case "paused":
    case "incomplete":
    case "incomplete_expired":
      return "SUSPENDED";
    case "trialing":
      throw new StripeProviderError("STRIPE_UNSUPPORTED_STATUS", { status: "trialing" });
    default:
      throw new StripeProviderError("STRIPE_UNSUPPORTED_STATUS", { status: "unknown" });
  }
}

export function normalizeStripeSubscription(
  input: NormalizeStripeSubscriptionInput,
): NormalizedBillingProviderSnapshot {
  if (typeof input.subscription !== "object" || input.subscription === null) {
    throw new StripeProviderError("STRIPE_CATALOG_MISMATCH", { reason: "invalid_subscription_object" });
  }
  const subscription = input.subscription as StripeSubscriptionShape;
  if (typeof subscription.id !== "string" || !subscription.id.startsWith("sub_")) {
    throw new StripeProviderError("STRIPE_CATALOG_MISMATCH", { reason: "invalid_subscription_id" });
  }
  if (typeof subscription.status !== "string") {
    throw new StripeProviderError("STRIPE_UNSUPPORTED_STATUS", { status: "missing" });
  }
  if (subscription.currency !== input.catalogPrice.currency.toLowerCase()) {
    throw new StripeProviderError("STRIPE_CATALOG_MISMATCH", { reason: "subscription_currency_mismatch" });
  }
  if (subscription.livemode !== (input.catalogPrice.providerEnvironment === "LIVE")) {
    throw new StripeProviderError("STRIPE_CATALOG_MISMATCH", { reason: "subscription_environment_mismatch" });
  }

  const customerId = providerId(subscription.customer);
  if (!customerId?.startsWith("cus_")) {
    throw new StripeProviderError("STRIPE_CATALOG_MISMATCH", { reason: "invalid_customer_id" });
  }
  const items = Array.isArray(subscription.items?.data)
    ? subscription.items.data as StripeSubscriptionItemShape[]
    : [];
  const catalogItem = items.find((item) => item.price?.id === input.catalogPrice.providerPriceId);
  if (!catalogItem) {
    throw new StripeProviderError("STRIPE_CATALOG_MISMATCH", { reason: "recognized_price_not_subscribed" });
  }
  const periodStart = isoFromUnix(catalogItem.current_period_start);
  const periodEnd = isoFromUnix(catalogItem.current_period_end);
  if (!periodStart || !periodEnd || Date.parse(periodEnd) <= Date.parse(periodStart)) {
    throw new StripeProviderError("STRIPE_CATALOG_MISMATCH", { reason: "invalid_subscription_period" });
  }

  return {
    appUserId: input.appUserId,
    provider: "stripe",
    providerCustomerId: customerId,
    providerSubscriptionId: subscription.id,
    providerProductId: input.catalogPrice.providerProductId,
    providerPriceId: input.catalogPrice.providerPriceId,
    latestProviderInvoiceId: providerId(subscription.latest_invoice),
    productCode: "PRO",
    market: input.catalogPrice.market,
    currency: input.catalogPrice.currency,
    billingInterval: "month",
    providerStatus: subscription.status,
    billingState: mapStripeSubscriptionStatus(subscription.status),
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: subscription.cancel_at_period_end === true,
    canceledAt: isoFromUnix(subscription.canceled_at),
    endedAt: isoFromUnix(subscription.ended_at),
    observedAt: input.observedAt,
    priorPaidAccess: input.priorPaidAccess,
    isCurrent: input.isCurrent,
  };
}
