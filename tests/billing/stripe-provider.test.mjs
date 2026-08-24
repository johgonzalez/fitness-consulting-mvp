import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { StripeBillingProviderCore } from "../../src/lib/billing/providers/stripe/adapter-core.ts";
import {
  DEFAULT_PRO_BR_MONTHLY_LOOKUP_KEY,
  STRIPE_API_VERSION,
  resolveStripeConfiguration,
} from "../../src/lib/billing/providers/stripe/configuration.ts";
import { resolveStripeCatalogEntry, validateStripePrice } from "../../src/lib/billing/providers/stripe/catalog.ts";
import { StripeProviderError, sanitizeStripeProviderError } from "../../src/lib/billing/providers/stripe/errors.ts";
import { normalizeStripeSubscription } from "../../src/lib/billing/providers/stripe/normalization.ts";

const testConfig = {
  environment: "TEST",
  credentialType: "RESTRICTED",
  apiKey: ["rk", "test", "fixture"].join("_"),
  accountId: null,
  proBrMonthlyLookupKey: DEFAULT_PRO_BR_MONTHLY_LOOKUP_KEY,
  proProductId: "prod_pperfil_pro",
};

const catalogSelection = {
  productCode: "PRO",
  market: "BR",
  currency: "BRL",
  interval: "MONTH",
};

const priceFixture = {
  id: "price_pperfil_pro_br_monthly",
  active: true,
  currency: "brl",
  lookup_key: DEFAULT_PRO_BR_MONTHLY_LOOKUP_KEY,
  unit_amount: 5990,
  livemode: false,
  recurring: { interval: "month", interval_count: 1 },
  product: { id: "prod_pperfil_pro", active: true },
  metadata: {},
};

const validatedPrice = validateStripePrice(
  priceFixture,
  resolveStripeCatalogEntry(catalogSelection, testConfig),
);

function subscriptionFixture(status = "active") {
  return {
    id: "sub_pperfil_pro",
    status,
    customer: "cus_pperfil_trainer",
    currency: "brl",
    livemode: false,
    cancel_at_period_end: false,
    canceled_at: null,
    ended_at: null,
    latest_invoice: { id: "in_pperfil_latest" },
    items: {
      data: [{
        current_period_start: 1787529600,
        current_period_end: 1790208000,
        price: { id: validatedPrice.providerPriceId },
      }],
    },
  };
}

function stripeMock(overrides = {}) {
  return {
    accounts: { retrieve: async () => ({ id: "acct_fixture", country: "BR", default_currency: "brl" }) },
    customers: {
      retrieve: async (id) => ({ id, object: "customer", livemode: false }),
      create: async () => ({ id: "cus_created", object: "customer", livemode: false }),
    },
    products: { retrieve: async (id) => ({ id, active: true, livemode: false }) },
    prices: { list: async () => ({ data: [priceFixture] }) },
    subscriptions: {
      retrieve: async () => subscriptionFixture(),
      list: async () => ({ data: [] }),
    },
    ...overrides,
  };
}

function expectCode(callback, code) {
  assert.throws(callback, (error) => error instanceof StripeProviderError && error.code === code);
}

test("TEST accepts restricted and secret test credentials", () => {
  for (const apiKey of [
    ["rk", "test", "fixture"].join("_"),
    ["sk", "test", "fixture"].join("_"),
  ]) {
    const config = resolveStripeConfiguration({ STRIPE_ENVIRONMENT: "TEST", STRIPE_API_KEY: apiKey });
    assert.equal(config.environment, "TEST");
  }
});

test("provider pins the approved Stripe API version", () => {
  assert.equal(STRIPE_API_VERSION, "2026-02-25.clover");
});

test("TEST blocks live credentials before any provider call", () => {
  expectCode(() => resolveStripeConfiguration({
    STRIPE_ENVIRONMENT: "TEST",
    STRIPE_API_KEY: ["rk", "live", "fixture"].join("_"),
  }), "STRIPE_CONFIGURATION_ERROR");
});

test("LIVE rejects test credentials", () => {
  expectCode(() => resolveStripeConfiguration({
    STRIPE_ENVIRONMENT: "LIVE",
    STRIPE_API_KEY: ["rk", "test", "fixture"].join("_"),
  }), "STRIPE_CONFIGURATION_ERROR");
});

test("missing key fails only when provider configuration is requested", () => {
  assert.equal(resolveStripeCatalogEntry(catalogSelection, testConfig).productCode, "PRO");
  expectCode(() => resolveStripeConfiguration({ STRIPE_ENVIRONMENT: "TEST" }), "STRIPE_CONFIGURATION_ERROR");
});

test("account pin mismatch fails closed", async () => {
  const provider = new StripeBillingProviderCore(stripeMock(), {
    ...testConfig,
    accountId: "acct_expected",
  });
  await assert.rejects(
    provider.getProviderHealth(),
    (error) => error instanceof StripeProviderError && error.code === "STRIPE_ACCOUNT_MISMATCH",
  );
});

test("catalog resolves only PRO BR BRL MONTH", () => {
  const entry = resolveStripeCatalogEntry(catalogSelection, testConfig);
  assert.equal(entry.lookupKey, DEFAULT_PRO_BR_MONTHLY_LOOKUP_KEY);
  assert.equal(entry.recognizedProductId, "prod_pperfil_pro");
});

for (const [label, override] of [
  ["unknown product", { productCode: "FREE" }],
  ["unknown market", { market: "US" }],
  ["unknown currency", { currency: "USD" }],
  ["unknown interval", { interval: "YEAR" }],
]) {
  test(`${label} fails closed`, () => {
    expectCode(
      () => resolveStripeCatalogEntry({ ...catalogSelection, ...override }, testConfig),
      "STRIPE_CATALOG_MISMATCH",
    );
  });
}

test("conflicting Price metadata fails closed without becoming authority", () => {
  expectCode(() => validateStripePrice(
    { ...priceFixture, metadata: { pperfil_product_code: "ENTERPRISE" } },
    resolveStripeCatalogEntry(catalogSelection, testConfig),
  ), "STRIPE_CATALOG_MISMATCH");
});

test("Price currency mismatch fails closed", () => {
  expectCode(() => validateStripePrice(
    { ...priceFixture, currency: "usd" },
    resolveStripeCatalogEntry(catalogSelection, testConfig),
  ), "STRIPE_CATALOG_MISMATCH");
});

test("Price interval mismatch fails closed", () => {
  expectCode(() => validateStripePrice(
    { ...priceFixture, recurring: { interval: "year", interval_count: 1 } },
    resolveStripeCatalogEntry(catalogSelection, testConfig),
  ), "STRIPE_CATALOG_MISMATCH");
});

test("unrecognized Stripe Product fails closed", () => {
  expectCode(() => validateStripePrice(
    { ...priceFixture, product: { id: "prod_random", active: true } },
    resolveStripeCatalogEntry(catalogSelection, testConfig),
  ), "STRIPE_CATALOG_MISMATCH");
});

test("TEST catalog rejects a Live Price", () => {
  expectCode(() => validateStripePrice(
    { ...priceFixture, livemode: true },
    resolveStripeCatalogEntry(catalogSelection, testConfig),
  ), "STRIPE_CATALOG_MISMATCH");
});

test("subscription normalization returns provider-neutral Billing snapshot", () => {
  const normalized = normalizeStripeSubscription({
    appUserId: "b1b00000-0000-4000-8000-000000000001",
    subscription: subscriptionFixture("active"),
    catalogPrice: validatedPrice,
    observedAt: "2026-08-24T12:00:00.000Z",
    priorPaidAccess: false,
    isCurrent: true,
  });
  assert.equal(normalized.provider, "stripe");
  assert.equal(normalized.billingState, "ACTIVE");
  assert.equal(normalized.productCode, "PRO");
  assert.equal(normalized.currency, "BRL");
});

test("trialing fails closed because PPerfil V1 has no trial", () => {
  expectCode(() => normalizeStripeSubscription({
    appUserId: "b1b00000-0000-4000-8000-000000000001",
    subscription: subscriptionFixture("trialing"),
    catalogPrice: validatedPrice,
    observedAt: "2026-08-24T12:00:00.000Z",
    priorPaidAccess: false,
    isCurrent: true,
  }), "STRIPE_UNSUPPORTED_STATUS");
});

test("TEST normalizer rejects a Live Subscription", () => {
  expectCode(() => normalizeStripeSubscription({
    appUserId: "b1b00000-0000-4000-8000-000000000001",
    subscription: { ...subscriptionFixture("active"), livemode: true },
    catalogPrice: validatedPrice,
    observedAt: "2026-08-24T12:00:00.000Z",
    priorPaidAccess: false,
    isCurrent: true,
  }), "STRIPE_CATALOG_MISMATCH");
});

test("past_due is only a GRACE candidate and does not manufacture grace dates", () => {
  const normalized = normalizeStripeSubscription({
    appUserId: "b1b00000-0000-4000-8000-000000000001",
    subscription: subscriptionFixture("past_due"),
    catalogPrice: validatedPrice,
    observedAt: "2026-08-24T12:00:00.000Z",
    priorPaidAccess: false,
    isCurrent: true,
  });
  assert.equal(normalized.billingState, "GRACE");
  assert.equal(normalized.priorPaidAccess, false);
  assert.equal("graceUntil" in normalized, false);
});

test("customer creation uses internal IDs only and sends an idempotency key", async () => {
  let captured;
  const provider = new StripeBillingProviderCore(stripeMock({
    customers: {
      retrieve: async (id) => ({ id, livemode: false }),
      create: async (params, options) => {
        captured = { params, options };
        return { id: "cus_created", livemode: false };
      },
    },
  }), testConfig);
  await provider.createCustomer({
    billingAccountId: "b1b10000-0000-4000-8000-000000000001",
    appUserId: "b1b00000-0000-4000-8000-000000000001",
    idempotencyKey: "billing-customer:b1b10000-0000-4000-8000-000000000001",
  });
  assert.deepEqual(captured.params.metadata, {
    billing_account_id: "b1b10000-0000-4000-8000-000000000001",
    app_user_id: "b1b00000-0000-4000-8000-000000000001",
  });
  assert.equal(captured.options.idempotencyKey.startsWith("billing-customer:"), true);
  assert.equal("email" in captured.params, false);
});

test("provider errors are sanitized", () => {
  const raw = new Error("secret provider response body");
  const sanitized = sanitizeStripeProviderError(raw, "subscriptions.retrieve");
  assert.equal(sanitized.code, "STRIPE_PROVIDER_UNAVAILABLE");
  assert.equal(sanitized.message.includes("secret provider response body"), false);
  assert.deepEqual(sanitized.safeContext, { operation: "subscriptions.retrieve" });
});

test("provider authentication errors retain only safe classification", () => {
  const sanitized = sanitizeStripeProviderError({
    type: "StripeAuthenticationError",
    statusCode: 401,
    message: "raw credential detail",
  }, "accounts.retrieve_current");
  assert.equal(sanitized.code, "STRIPE_AUTHENTICATION_ERROR");
  assert.equal(sanitized.message.includes("raw credential detail"), false);
});

test("runtime configuration, client and adapter are explicitly server-only", async () => {
  const files = await Promise.all([
    readFile(new URL("../../src/lib/billing/providers/stripe/configuration.ts", import.meta.url), "utf8"),
    readFile(new URL("../../src/lib/billing/providers/stripe/runtime-configuration.ts", import.meta.url), "utf8"),
    readFile(new URL("../../src/lib/billing/providers/stripe/client.ts", import.meta.url), "utf8"),
    readFile(new URL("../../src/lib/billing/providers/stripe/adapter.ts", import.meta.url), "utf8"),
  ]);
  for (const source of files) assert.match(source, /^import "server-only";/);
  assert.equal(files.some((source) => source.includes("NEXT_PUBLIC_STRIPE")), false);
});

test("Stripe types do not leak into the canonical Billing domain or resolver", async () => {
  const [domain, resolver] = await Promise.all([
    readFile(new URL("../../src/lib/billing/domain.ts", import.meta.url), "utf8"),
    readFile(new URL("../../src/lib/billing/access-resolver.ts", import.meta.url), "utf8"),
  ]);
  assert.equal(/from ["']stripe["']/.test(domain), false);
  assert.equal(/from ["']stripe["']/.test(resolver), false);
});
