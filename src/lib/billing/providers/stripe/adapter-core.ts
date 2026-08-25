import type { NormalizedBillingProviderSnapshot } from "../../domain.ts";
import { resolveStripeCatalogEntry, validateStripePrice } from "./catalog.ts";
import { StripeProviderError, sanitizeStripeProviderError } from "./errors.ts";
import { normalizeStripeSubscription } from "./normalization.ts";
import type {
  CreateStripeCustomerInput,
  CreateStripeCheckoutSessionInput,
  GetNormalizedStripeSubscriptionInput,
  StripeBillingProvider,
  StripeCatalogSelection,
  StripeProviderConfiguration,
  StripeProviderCustomer,
  StripeProviderCheckoutSession,
  StripeProviderHealth,
  StripeProviderProduct,
  StripeSubscriptionReference,
  ValidatedStripePrice,
} from "./types.ts";

interface StripeClientPort {
  accounts: {
    retrieve(id: null): Promise<unknown>;
  };
  customers: {
    retrieve(id: string): Promise<unknown>;
    create(
      params: { metadata: Record<string, string> },
      options: { idempotencyKey: string },
    ): Promise<unknown>;
  };
  products: {
    retrieve(id: string): Promise<unknown>;
  };
  prices: {
    list(params: {
      lookup_keys: string[];
      active: boolean;
      limit: number;
      expand: string[];
    }): Promise<unknown>;
  };
  subscriptions: {
    retrieve(id: string, params: { expand: string[] }): Promise<unknown>;
    list(params: {
      customer: string;
      status: "all";
      limit: number;
    }): Promise<unknown>;
  };
  checkout: {
    sessions: {
      create(params: Record<string, unknown>, options: { idempotencyKey: string }): Promise<unknown>;
      retrieve(id: string): Promise<unknown>;
    };
  };
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const idempotencyPattern = /^[A-Za-z0-9:_-]{16,255}$/;

function objectId(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (typeof value !== "object" || value === null) return null;
  const id = (value as { id?: unknown }).id;
  return typeof id === "string" ? id : null;
}

function asObject(value: unknown, reason: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null) {
    throw new StripeProviderError("STRIPE_PROVIDER_UNAVAILABLE", { reason });
  }
  return value as Record<string, unknown>;
}

function matchesEnvironment(
  value: unknown,
  configuration: StripeProviderConfiguration,
): boolean {
  return value === (configuration.environment === "LIVE");
}

async function providerCall<T>(operation: string, call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (error) {
    throw sanitizeStripeProviderError(error, operation);
  }
}

function checkoutSession(
  raw: unknown,
  configuration: StripeProviderConfiguration,
  expectedCustomerId?: string,
): StripeProviderCheckoutSession {
  const session = asObject(raw, "invalid_checkout_session_response");
  const customerId = objectId(session.customer);
  const expiresAt = typeof session.expires_at === "number"
    ? new Date(session.expires_at * 1000).toISOString()
    : null;
  if (typeof session.id !== "string" || !session.id.startsWith("cs_test_")) {
    throw new StripeProviderError("STRIPE_PROVIDER_UNAVAILABLE", { reason: "invalid_checkout_session_id" });
  }
  if (!matchesEnvironment(session.livemode, configuration)) {
    throw new StripeProviderError("STRIPE_PROVIDER_UNAVAILABLE", { reason: "checkout_environment_mismatch" });
  }
  if (!customerId || (expectedCustomerId && customerId !== expectedCustomerId)) {
    throw new StripeProviderError("STRIPE_PROVIDER_UNAVAILABLE", { reason: "checkout_customer_mismatch" });
  }
  if (session.status !== "open" && session.status !== "complete" && session.status !== "expired") {
    throw new StripeProviderError("STRIPE_PROVIDER_UNAVAILABLE", { reason: "invalid_checkout_status" });
  }
  if (!expiresAt) {
    throw new StripeProviderError("STRIPE_PROVIDER_UNAVAILABLE", { reason: "invalid_checkout_expiry" });
  }
  const url = session.url === null || typeof session.url === "string" ? session.url : null;
  if (session.status === "open" && (!url || !url.startsWith("https://checkout.stripe.com/"))) {
    throw new StripeProviderError("STRIPE_PROVIDER_UNAVAILABLE", { reason: "invalid_checkout_url" });
  }
  return {
    id: session.id,
    customerId,
    status: session.status,
    url,
    expiresAt,
  };
}

export class StripeBillingProviderCore implements StripeBillingProvider {
  private readonly stripe: StripeClientPort;
  private readonly configuration: StripeProviderConfiguration;

  constructor(
    stripe: StripeClientPort,
    configuration: StripeProviderConfiguration,
  ) {
    this.stripe = stripe;
    this.configuration = configuration;
  }

  async getProviderHealth(): Promise<StripeProviderHealth> {
    const raw = await providerCall("accounts.retrieve_current", () => this.stripe.accounts.retrieve(null));
    const account = asObject(raw, "invalid_account_response");
    if (typeof account.id !== "string" || !account.id.startsWith("acct_")) {
      throw new StripeProviderError("STRIPE_PROVIDER_UNAVAILABLE", { reason: "invalid_account_id" });
    }
    if (this.configuration.accountId && account.id !== this.configuration.accountId) {
      throw new StripeProviderError("STRIPE_ACCOUNT_MISMATCH", { operation: "accounts.retrieve_current" });
    }
    return {
      connected: true,
      environment: this.configuration.environment,
      credentialType: this.configuration.credentialType,
      accountId: account.id,
      country: typeof account.country === "string" ? account.country.toUpperCase() : null,
      defaultCurrency: typeof account.default_currency === "string"
        ? account.default_currency.toUpperCase()
        : null,
    };
  }

  async getCustomer(customerId: string): Promise<StripeProviderCustomer> {
    if (!/^cus_[A-Za-z0-9]+$/.test(customerId)) {
      throw new StripeProviderError("STRIPE_OBJECT_NOT_FOUND", { object: "customer" });
    }
    const raw = await providerCall("customers.retrieve", () => this.stripe.customers.retrieve(customerId));
    const customer = asObject(raw, "invalid_customer_response");
    if (customer.id !== customerId) {
      throw new StripeProviderError("STRIPE_PROVIDER_UNAVAILABLE", { reason: "customer_id_mismatch" });
    }
    if (customer.deleted !== true && !matchesEnvironment(customer.livemode, this.configuration)) {
      throw new StripeProviderError("STRIPE_PROVIDER_UNAVAILABLE", { reason: "customer_environment_mismatch" });
    }
    return { id: customerId, deleted: customer.deleted === true };
  }

  async createCustomer(input: CreateStripeCustomerInput): Promise<StripeProviderCustomer> {
    if (!uuidPattern.test(input.billingAccountId) || !uuidPattern.test(input.appUserId)) {
      throw new StripeProviderError("STRIPE_CONFIGURATION_ERROR", { reason: "invalid_internal_identity" });
    }
    if (!idempotencyPattern.test(input.idempotencyKey)) {
      throw new StripeProviderError("STRIPE_CONFIGURATION_ERROR", { reason: "invalid_idempotency_key" });
    }
    const raw = await providerCall("customers.create", () => this.stripe.customers.create(
      {
        metadata: {
          billing_account_id: input.billingAccountId,
          app_user_id: input.appUserId,
        },
      },
      { idempotencyKey: input.idempotencyKey },
    ));
    const customer = asObject(raw, "invalid_customer_response");
    if (typeof customer.id !== "string" || !customer.id.startsWith("cus_")) {
      throw new StripeProviderError("STRIPE_PROVIDER_UNAVAILABLE", { reason: "invalid_customer_id" });
    }
    if (!matchesEnvironment(customer.livemode, this.configuration)) {
      throw new StripeProviderError("STRIPE_PROVIDER_UNAVAILABLE", { reason: "customer_environment_mismatch" });
    }
    return { id: customer.id, deleted: false };
  }

  async getProduct(productId: string): Promise<StripeProviderProduct> {
    if (!/^prod_[A-Za-z0-9]+$/.test(productId)) {
      throw new StripeProviderError("STRIPE_OBJECT_NOT_FOUND", { object: "product" });
    }
    const raw = await providerCall("products.retrieve", () => this.stripe.products.retrieve(productId));
    const product = asObject(raw, "invalid_product_response");
    if (product.id !== productId || typeof product.active !== "boolean") {
      throw new StripeProviderError("STRIPE_PROVIDER_UNAVAILABLE", { reason: "invalid_product_response" });
    }
    if (!matchesEnvironment(product.livemode, this.configuration)) {
      throw new StripeProviderError("STRIPE_PROVIDER_UNAVAILABLE", { reason: "product_environment_mismatch" });
    }
    return { id: productId, active: product.active };
  }

  async getPrice(selection: StripeCatalogSelection): Promise<ValidatedStripePrice> {
    const entry = resolveStripeCatalogEntry(selection, this.configuration);
    const raw = await providerCall("prices.list_by_lookup_key", () => this.stripe.prices.list({
      lookup_keys: [entry.lookupKey],
      active: true,
      limit: 2,
      expand: ["data.product"],
    }));
    const list = asObject(raw, "invalid_price_list_response");
    if (!Array.isArray(list.data) || list.data.length !== 1) {
      throw new StripeProviderError("STRIPE_CATALOG_MISMATCH", { reason: "lookup_key_not_unique" });
    }
    return validateStripePrice(list.data[0], entry);
  }

  async listCurrentSubscriptions(customerId: string): Promise<StripeSubscriptionReference[]> {
    if (!/^cus_[A-Za-z0-9]+$/.test(customerId)) {
      throw new StripeProviderError("STRIPE_OBJECT_NOT_FOUND", { object: "customer" });
    }
    const raw = await providerCall("subscriptions.list", () => this.stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 100,
    }));
    const list = asObject(raw, "invalid_subscription_list_response");
    if (!Array.isArray(list.data)) {
      throw new StripeProviderError("STRIPE_PROVIDER_UNAVAILABLE", { reason: "invalid_subscription_list" });
    }
    return list.data.flatMap((value): StripeSubscriptionReference[] => {
      if (typeof value !== "object" || value === null) return [];
      const subscription = value as Record<string, unknown>;
      const resolvedCustomerId = objectId(subscription.customer);
      if (typeof subscription.id !== "string"
        || typeof subscription.status !== "string"
        || resolvedCustomerId !== customerId
        || subscription.status === "canceled"
        || subscription.status === "incomplete_expired"
        || !matchesEnvironment(subscription.livemode, this.configuration)) return [];
      return [{
        id: subscription.id,
        customerId: resolvedCustomerId,
        providerStatus: subscription.status,
      }];
    });
  }

  async createCheckoutSession(
    input: CreateStripeCheckoutSessionInput,
  ): Promise<StripeProviderCheckoutSession> {
    if (!uuidPattern.test(input.billingAccountId) || !uuidPattern.test(input.checkoutAttemptId)) {
      throw new StripeProviderError("STRIPE_CONFIGURATION_ERROR", { reason: "invalid_internal_identity" });
    }
    if (!/^cus_[A-Za-z0-9]+$/.test(input.customerId) || !/^price_[A-Za-z0-9]+$/.test(input.priceId)) {
      throw new StripeProviderError("STRIPE_CONFIGURATION_ERROR", { reason: "invalid_provider_identity" });
    }
    if (!idempotencyPattern.test(input.idempotencyKey)) {
      throw new StripeProviderError("STRIPE_CONFIGURATION_ERROR", { reason: "invalid_idempotency_key" });
    }
    const raw = await providerCall("checkout.sessions.create", () => this.stripe.checkout.sessions.create({
      mode: "subscription",
      customer: input.customerId,
      line_items: [{ price: input.priceId, quantity: 1 }],
      payment_method_types: ["card"],
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      client_reference_id: input.checkoutAttemptId,
      metadata: {
        billing_account_id: input.billingAccountId,
        checkout_attempt_id: input.checkoutAttemptId,
        product_code: input.productCode,
        market: input.market,
      },
      subscription_data: {
        metadata: {
          billing_account_id: input.billingAccountId,
          product_code: input.productCode,
          market: input.market,
        },
      },
    }, { idempotencyKey: input.idempotencyKey }));
    return checkoutSession(raw, this.configuration, input.customerId);
  }

  async getCheckoutSession(sessionId: string): Promise<StripeProviderCheckoutSession> {
    if (!/^cs_test_[A-Za-z0-9]+$/.test(sessionId)) {
      throw new StripeProviderError("STRIPE_OBJECT_NOT_FOUND", { object: "checkout_session" });
    }
    const raw = await providerCall(
      "checkout.sessions.retrieve",
      () => this.stripe.checkout.sessions.retrieve(sessionId),
    );
    return checkoutSession(raw, this.configuration);
  }

  async getSubscription(
    input: GetNormalizedStripeSubscriptionInput,
  ): Promise<NormalizedBillingProviderSnapshot> {
    const [subscription, catalogPrice] = await Promise.all([
      providerCall("subscriptions.retrieve", () => this.stripe.subscriptions.retrieve(
        input.subscriptionId,
        { expand: ["items.data.price.product", "latest_invoice"] },
      )),
      this.getPrice(input.catalog),
    ]);
    return normalizeStripeSubscription({
      appUserId: input.appUserId,
      subscription,
      catalogPrice,
      observedAt: input.observedAt,
      priorPaidAccess: input.priorPaidAccess,
      isCurrent: input.isCurrent ?? true,
    });
  }
}

export type { StripeClientPort };
