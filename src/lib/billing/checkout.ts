import type {
  StripeBillingProvider,
  StripeProviderCheckoutSession,
  ValidatedStripePrice,
} from "./providers/stripe/types.ts";

export type BillingCheckoutErrorCode =
  | "AUTH_REQUIRED"
  | "CLIENT_CATALOG_REJECTED"
  | "TRAINER_REQUIRED"
  | "BILLING_OWNERSHIP_MISMATCH"
  | "ALREADY_SUBSCRIBED"
  | "CHECKOUT_CONFIRMATION_PENDING"
  | "CHECKOUT_UNAVAILABLE";

export class BillingCheckoutError extends Error {
  readonly code: BillingCheckoutErrorCode;

  constructor(code: BillingCheckoutErrorCode) {
    super("Billing checkout could not be started.");
    this.name = "BillingCheckoutError";
    this.code = code;
  }
}

export interface BillingCheckoutIdentity {
  appUserId: string;
  roles: string[];
}

export interface BillingCheckoutAccount {
  id: string;
  appUserId: string;
  providerCustomerId: string | null;
}

export interface BillingCheckoutAttempt {
  id: string;
  billingAccountId: string;
  providerIdempotencyKey: string;
  providerCheckoutSessionId: string | null;
  status: "CREATED" | "SESSION_CREATED" | "COMPLETED" | "EXPIRED" | "FAILED" | "CANCELED";
  expiresAt: string | null;
}

export interface BillingCheckoutRepository {
  getOrCreateAccount(appUserId: string): Promise<BillingCheckoutAccount>;
  attachProviderCustomer(
    account: BillingCheckoutAccount,
    providerCustomerId: string,
  ): Promise<BillingCheckoutAccount>;
  hasCurrentPaidSubscription(billingAccountId: string): Promise<boolean>;
  reserveAttempt(account: BillingCheckoutAccount, price: ValidatedStripePrice): Promise<BillingCheckoutAttempt>;
  markAttemptOpen(attemptId: string, session: StripeProviderCheckoutSession): Promise<void>;
}

export interface StartProCheckoutInput {
  identity: BillingCheckoutIdentity;
  repository: BillingCheckoutRepository;
  provider: StripeBillingProvider;
  appBaseUrl: string;
}

export interface StartProCheckoutResult {
  state: "CHECKOUT_READY";
  checkoutUrl: string;
  reused: boolean;
}

export function assertNoClientCatalogAuthority(value: unknown): void {
  if (typeof value !== "object" || value === null || Array.isArray(value) || Object.keys(value).length > 0) {
    throw new BillingCheckoutError("CLIENT_CATALOG_REJECTED");
  }
}

function pendingSession(session: StripeProviderCheckoutSession): StartProCheckoutResult {
  if (session.status === "complete") throw new BillingCheckoutError("CHECKOUT_CONFIRMATION_PENDING");
  if (session.status !== "open" || !session.url || new Date(session.expiresAt).getTime() <= Date.now()) {
    throw new BillingCheckoutError("CHECKOUT_UNAVAILABLE");
  }
  return { state: "CHECKOUT_READY", checkoutUrl: session.url, reused: true };
}

export async function startProCheckout(input: StartProCheckoutInput): Promise<StartProCheckoutResult> {
  if (!input.identity.appUserId) throw new BillingCheckoutError("AUTH_REQUIRED");
  if (!input.identity.roles.includes("TRAINER")) throw new BillingCheckoutError("TRAINER_REQUIRED");

  let account = await input.repository.getOrCreateAccount(input.identity.appUserId);
  if (account.appUserId !== input.identity.appUserId) {
    throw new BillingCheckoutError("BILLING_OWNERSHIP_MISMATCH");
  }

  let customerId = account.providerCustomerId;
  if (customerId) {
    const customer = await input.provider.getCustomer(customerId);
    if (customer.deleted) throw new BillingCheckoutError("CHECKOUT_UNAVAILABLE");
  } else {
    const customer = await input.provider.createCustomer({
      billingAccountId: account.id,
      appUserId: account.appUserId,
      idempotencyKey: `billing-customer:${account.id}`,
    });
    account = await input.repository.attachProviderCustomer(account, customer.id);
    if (account.providerCustomerId !== customer.id) {
      throw new BillingCheckoutError("BILLING_OWNERSHIP_MISMATCH");
    }
    customerId = customer.id;
  }

  const [localSubscription, providerSubscriptions, price] = await Promise.all([
    input.repository.hasCurrentPaidSubscription(account.id),
    input.provider.listCurrentSubscriptions(customerId),
    input.provider.getPrice({ productCode: "PRO", market: "BR", currency: "BRL", interval: "MONTH" }),
  ]);
  if (localSubscription || providerSubscriptions.length > 0) {
    throw new BillingCheckoutError("ALREADY_SUBSCRIBED");
  }

  const attempt = await input.repository.reserveAttempt(account, price);
  if (attempt.providerCheckoutSessionId) {
    return pendingSession(await input.provider.getCheckoutSession(attempt.providerCheckoutSessionId));
  }

  const session = await input.provider.createCheckoutSession({
    billingAccountId: account.id,
    checkoutAttemptId: attempt.id,
    customerId,
    priceId: price.providerPriceId,
    productCode: "PRO",
    market: "BR",
    successUrl: `${input.appBaseUrl}/dashboard/settings/billing?checkout=returned&session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${input.appBaseUrl}/dashboard/settings/billing?checkout=canceled`,
    idempotencyKey: attempt.providerIdempotencyKey,
  });
  if (!session.url) throw new BillingCheckoutError("CHECKOUT_UNAVAILABLE");
  await input.repository.markAttemptOpen(attempt.id, session);
  return { state: "CHECKOUT_READY", checkoutUrl: session.url, reused: false };
}
