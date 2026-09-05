import assert from "node:assert/strict";
import test from "node:test";
import {
  assertNoClientCatalogAuthority,
  BillingCheckoutError,
  startProCheckout,
} from "../../src/lib/billing/checkout.ts";
import { setupStripeSandboxCatalog } from "../../src/lib/billing/providers/stripe/catalog-setup.ts";
import { DEFAULT_PRO_BR_MONTHLY_LOOKUP_KEY } from "../../src/lib/billing/providers/stripe/configuration.ts";
import { StripeProviderError } from "../../src/lib/billing/providers/stripe/errors.ts";

const configuration = {
  environment: "TEST",
  credentialType: "RESTRICTED",
  apiKey: "rk_test_fixture",
  accountId: "acct_fixture",
  proBrMonthlyLookupKey: DEFAULT_PRO_BR_MONTHLY_LOOKUP_KEY,
  proProductId: null,
};

function catalogClient() {
  const products = [];
  const prices = [];
  let productCreates = 0;
  let priceCreates = 0;
  return {
    products,
    prices,
    counts: () => ({ productCreates, priceCreates }),
    client: {
      products: {
        list: async () => ({ data: products }),
        create: async (params) => {
          productCreates += 1;
          const product = {
            id: "prod_catalog",
            active: true,
            livemode: false,
            metadata: params.metadata,
          };
          products.push(product);
          return product;
        },
      },
      prices: {
        list: async () => ({ data: prices }),
        create: async (params) => {
          priceCreates += 1;
          const price = {
            id: "price_catalog",
            active: true,
            livemode: false,
            currency: params.currency,
            unit_amount: params.unit_amount,
            recurring: params.recurring,
            lookup_key: params.lookup_key,
            product: params.product,
            metadata: params.metadata,
          };
          prices.push({ ...price, product: products[0] });
          return price;
        },
      },
    },
  };
}

test("Sandbox catalog setup is idempotent and creates one recognized Product and Price", async () => {
  const fixture = catalogClient();
  const first = await setupStripeSandboxCatalog(fixture.client, configuration);
  const second = await setupStripeSandboxCatalog(fixture.client, configuration);
  assert.equal(first.productCreated, true);
  assert.equal(first.priceCreated, true);
  assert.equal(second.productCreated, false);
  assert.equal(second.priceCreated, false);
  assert.deepEqual(fixture.counts(), { productCreates: 1, priceCreates: 1 });
  assert.equal(second.price.unitAmountMinor, 5990);
});

test("Sandbox catalog setup fails closed on an incompatible lookup key", async () => {
  const fixture = catalogClient();
  fixture.products.push({
    id: "prod_catalog",
    active: true,
    livemode: false,
    metadata: { product_code: "PRO", market: "BR" },
  });
  fixture.prices.push({
    id: "price_catalog",
    active: true,
    livemode: false,
    currency: "brl",
    unit_amount: 4990,
    recurring: { interval: "month", interval_count: 1 },
    lookup_key: DEFAULT_PRO_BR_MONTHLY_LOOKUP_KEY,
    product: fixture.products[0],
    metadata: {},
  });
  await assert.rejects(
    setupStripeSandboxCatalog(fixture.client, configuration),
    (error) => error instanceof StripeProviderError && error.code === "STRIPE_CATALOG_MISMATCH",
  );
});

function checkoutFixture(overrides = {}) {
  const calls = { createdCustomers: 0, createdSessions: 0, markedOpen: 0, reserved: 0 };
  const account = {
    id: "b1b10000-0000-4000-8000-000000000001",
    appUserId: "b1b00000-0000-4000-8000-000000000001",
    providerCustomerId: null,
  };
  const attempt = {
    id: "c1c00000-0000-4000-8000-000000000001",
    billingAccountId: account.id,
    providerIdempotencyKey: "checkout:c1c00000-0000-4000-8000-000000000001",
    providerCheckoutSessionId: null,
    status: "CREATED",
    expiresAt: null,
  };
  const repository = {
    getOrCreateAccount: async () => account,
    attachProviderCustomer: async (current, customerId) => ({ ...current, providerCustomerId: customerId }),
    hasCurrentPaidSubscription: async () => false,
    reserveAttempt: async () => { calls.reserved += 1; return attempt; },
    markAttemptOpen: async () => { calls.markedOpen += 1; },
    ...overrides.repository,
  };
  const provider = {
    getProviderHealth: async () => ({ connected: true }),
    getCustomer: async (id) => ({ id, deleted: false }),
    createCustomer: async (input) => {
      calls.createdCustomers += 1;
      assert.equal(input.idempotencyKey, `billing-customer:${account.id}`);
      return { id: "cus_trainer", deleted: false };
    },
    getProduct: async () => ({ id: "prod_catalog", active: true }),
    getPrice: async () => ({
      providerPriceId: "price_catalog",
      providerProductId: "prod_catalog",
      lookupKey: DEFAULT_PRO_BR_MONTHLY_LOOKUP_KEY,
      productCode: "PRO",
      market: "BR",
      currency: "BRL",
      interval: "MONTH",
      providerEnvironment: "TEST",
      unitAmountMinor: 5990,
    }),
    listCurrentSubscriptions: async () => [],
    createCheckoutSession: async (input) => {
      calls.createdSessions += 1;
      assert.equal(input.priceId, "price_catalog");
      assert.equal(input.idempotencyKey, attempt.providerIdempotencyKey);
      return {
        id: "cs_test_checkout",
        customerId: "cus_trainer",
        status: "open",
        url: "https://checkout.stripe.com/c/pay/test",
        expiresAt: "2099-01-01T00:00:00.000Z",
      };
    },
    getCheckoutSession: async () => ({
      id: "cs_test_checkout",
      customerId: "cus_trainer",
      status: "open",
      url: "https://checkout.stripe.com/c/pay/test",
      expiresAt: "2099-01-01T00:00:00.000Z",
    }),
    getSubscription: async () => null,
    ...overrides.provider,
  };
  return { calls, account, attempt, repository, provider };
}

const trainer = { appUserId: "b1b00000-0000-4000-8000-000000000001", roles: ["trainer"] };

test("unauthenticated Checkout is denied before repository or Stripe access", async () => {
  const fixture = checkoutFixture();
  await assert.rejects(startProCheckout({
    identity: { ...trainer, appUserId: "" },
    repository: fixture.repository,
    provider: fixture.provider,
    appBaseUrl: "http://localhost:3000",
  }), (error) => error instanceof BillingCheckoutError && error.code === "AUTH_REQUIRED");
  assert.deepEqual(fixture.calls, { createdCustomers: 0, createdSessions: 0, markedOpen: 0, reserved: 0 });
});

test("Trainer Checkout creates one Customer and one Session without granting entitlement", async () => {
  const fixture = checkoutFixture();
  const result = await startProCheckout({
    identity: trainer,
    repository: fixture.repository,
    provider: fixture.provider,
    appBaseUrl: "http://localhost:3000",
  });
  assert.equal(result.state, "CHECKOUT_READY");
  assert.deepEqual(fixture.calls, { createdCustomers: 1, createdSessions: 1, markedOpen: 1, reserved: 1 });
  assert.equal("activate" in fixture.repository, false);
});

test("Student role cannot start Trainer Checkout", async () => {
  const fixture = checkoutFixture();
  await assert.rejects(startProCheckout({
    identity: { ...trainer, roles: ["student"] },
    repository: fixture.repository,
    provider: fixture.provider,
    appBaseUrl: "http://localhost:3000",
  }), (error) => error instanceof BillingCheckoutError && error.code === "TRAINER_REQUIRED");
  assert.equal(fixture.calls.createdCustomers, 0);
});

test("uppercase legacy role cannot impersonate the canonical trainer role", async () => {
  const fixture = checkoutFixture();
  await assert.rejects(startProCheckout({
    identity: { ...trainer, roles: ["TRAINER"] },
    repository: fixture.repository,
    provider: fixture.provider,
    appBaseUrl: "http://localhost:3000",
  }), (error) => error instanceof BillingCheckoutError && error.code === "TRAINER_REQUIRED");
  assert.equal(fixture.calls.createdCustomers, 0);
});

test("client cannot provide Price, amount, currency or Product authority", () => {
  assert.doesNotThrow(() => assertNoClientCatalogAuthority({}));
  for (const payload of [
    { priceId: "price_attacker" },
    { amount: 1 },
    { currency: "USD" },
    { productCode: "PRO" },
    { quantity: 99 },
  ]) {
    assert.throws(
      () => assertNoClientCatalogAuthority(payload),
      (error) => error instanceof BillingCheckoutError && error.code === "CLIENT_CATALOG_REJECTED",
    );
  }
});

test("cross-user billing account mismatch fails before Stripe Customer creation", async () => {
  const fixture = checkoutFixture({
    repository: { getOrCreateAccount: async () => ({ ...checkoutFixture().account, appUserId: "other-user" }) },
  });
  await assert.rejects(startProCheckout({
    identity: trainer,
    repository: fixture.repository,
    provider: fixture.provider,
    appBaseUrl: "http://localhost:3000",
  }), (error) => error instanceof BillingCheckoutError && error.code === "BILLING_OWNERSHIP_MISMATCH");
  assert.equal(fixture.calls.createdCustomers, 0);
});

test("existing local or Stripe subscription blocks duplicate Checkout", async () => {
  for (const overrides of [
    { repository: { hasCurrentPaidSubscription: async () => true } },
    { provider: { listCurrentSubscriptions: async () => [{ id: "sub_existing" }] } },
  ]) {
    const fixture = checkoutFixture(overrides);
    await assert.rejects(startProCheckout({
      identity: trainer,
      repository: fixture.repository,
      provider: fixture.provider,
      appBaseUrl: "http://localhost:3000",
    }), (error) => error instanceof BillingCheckoutError && error.code === "ALREADY_SUBSCRIBED");
    assert.equal(fixture.calls.createdSessions, 0);
  }
});

test("duplicate click reuses the open Checkout Session", async () => {
  const fixture = checkoutFixture();
  fixture.account.providerCustomerId = "cus_trainer";
  fixture.attempt.providerCheckoutSessionId = "cs_test_checkout";
  const result = await startProCheckout({
    identity: trainer,
    repository: fixture.repository,
    provider: fixture.provider,
    appBaseUrl: "http://localhost:3000",
  });
  assert.equal(result.reused, true);
  assert.equal(fixture.calls.createdSessions, 0);
});

test("onboarding Checkout returns to onboarding and preserves the seven-day trial", async () => {
  let request;
  const fixture = checkoutFixture({ provider: { createCheckoutSession: async input => {
    request = input;
    return { id: "cs_test_checkout", customerId: "cus_trainer", status: "open", url: "https://checkout.stripe.com/c/pay/test", expiresAt: "2099-01-01T00:00:00.000Z" };
  } } });
  await startProCheckout({ identity: trainer, repository: fixture.repository, provider: fixture.provider, appBaseUrl: "https://sandbox.example", returnPath: "onboarding" });
  assert.equal(request.successUrl, "https://sandbox.example/onboarding?checkout=returned");
  assert.equal(request.cancelUrl, "https://sandbox.example/onboarding?checkout=canceled");
  assert.equal(request.trialPeriodDays, 7);
  assert.equal("activate" in fixture.repository, false);
});
