import "server-only";

import { PRO_BR_MONTHLY_AMOUNT_MINOR, resolveStripeCatalogEntry, validateStripePrice } from "./catalog.ts";
import { StripeProviderError, sanitizeStripeProviderError } from "./errors.ts";
import type { StripeProviderConfiguration, ValidatedStripePrice } from "./types.ts";

interface CatalogAdminClient {
  products: {
    list(params: { active: true; limit: 100 }): Promise<unknown>;
    create(params: Record<string, unknown>, options: { idempotencyKey: string }): Promise<unknown>;
  };
  prices: {
    list(params: { lookup_keys: string[]; limit: 10; expand: string[] }): Promise<unknown>;
    create(params: Record<string, unknown>, options: { idempotencyKey: string }): Promise<unknown>;
  };
}

export interface StripeCatalogSetupResult {
  productId: string;
  price: ValidatedStripePrice;
  productCreated: boolean;
  priceCreated: boolean;
}

function asObject(value: unknown, reason: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null) {
    throw new StripeProviderError("STRIPE_PROVIDER_UNAVAILABLE", { reason });
  }
  return value as Record<string, unknown>;
}

async function adminCall<T>(operation: string, call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (error) {
    throw sanitizeStripeProviderError(error, operation);
  }
}

function productMatches(value: unknown): value is Record<string, unknown> & { id: string } {
  if (typeof value !== "object" || value === null) return false;
  const product = value as Record<string, unknown>;
  const metadata = typeof product.metadata === "object" && product.metadata !== null
    ? product.metadata as Record<string, unknown>
    : {};
  return typeof product.id === "string"
    && product.id.startsWith("prod_")
    && product.active === true
    && product.livemode === false
    && metadata.product_code === "PRO"
    && metadata.market === "BR";
}

export async function setupStripeSandboxCatalog(
  stripe: CatalogAdminClient,
  configuration: StripeProviderConfiguration,
): Promise<StripeCatalogSetupResult> {
  if (configuration.environment !== "TEST") {
    throw new StripeProviderError("STRIPE_CONFIGURATION_ERROR", { reason: "live_credential_blocked" });
  }
  if (!configuration.accountId) {
    throw new StripeProviderError("STRIPE_CONFIGURATION_ERROR", { reason: "account_pin_required" });
  }

  const listedProducts = asObject(
    await adminCall("products.list_catalog", () => stripe.products.list({ active: true, limit: 100 })),
    "invalid_product_list",
  );
  if (!Array.isArray(listedProducts.data)) {
    throw new StripeProviderError("STRIPE_PROVIDER_UNAVAILABLE", { reason: "invalid_product_list" });
  }
  const recognizedProducts = listedProducts.data.filter(productMatches);
  if (recognizedProducts.length > 1) {
    throw new StripeProviderError("STRIPE_CATALOG_MISMATCH", { reason: "duplicate_recognized_product" });
  }

  let product = recognizedProducts[0];
  let productCreated = false;
  if (!product) {
    const rawProduct = await adminCall("products.create_catalog", () => stripe.products.create({
      name: "PPerfil Pro",
      metadata: { product_code: "PRO", market: "BR" },
    }, { idempotencyKey: "catalog:TEST:PRO:BR:product:v1" }));
    if (!productMatches(rawProduct)) {
      throw new StripeProviderError("STRIPE_PROVIDER_UNAVAILABLE", { reason: "invalid_created_product" });
    }
    product = rawProduct;
    productCreated = true;
  }
  if (configuration.proProductId && product.id !== configuration.proProductId) {
    throw new StripeProviderError("STRIPE_CATALOG_MISMATCH", { reason: "configured_product_mismatch" });
  }

  const listedPrices = asObject(await adminCall("prices.list_catalog", () => stripe.prices.list({
    lookup_keys: [configuration.proBrMonthlyLookupKey],
    limit: 10,
    expand: ["data.product"],
  })), "invalid_price_list");
  if (!Array.isArray(listedPrices.data)) {
    throw new StripeProviderError("STRIPE_PROVIDER_UNAVAILABLE", { reason: "invalid_price_list" });
  }
  if (listedPrices.data.length > 1) {
    throw new StripeProviderError("STRIPE_CATALOG_MISMATCH", { reason: "lookup_key_not_unique" });
  }

  const entry = resolveStripeCatalogEntry({
    productCode: "PRO",
    market: "BR",
    currency: "BRL",
    interval: "MONTH",
  }, { ...configuration, proProductId: product.id });
  if (listedPrices.data.length === 1) {
    return {
      productId: product.id,
      price: validateStripePrice(listedPrices.data[0], entry),
      productCreated,
      priceCreated: false,
    };
  }

  const rawPrice = await adminCall("prices.create_catalog", () => stripe.prices.create({
    currency: "brl",
    unit_amount: PRO_BR_MONTHLY_AMOUNT_MINOR,
    recurring: { interval: "month", interval_count: 1 },
    product: product.id,
    lookup_key: configuration.proBrMonthlyLookupKey,
    metadata: {
      pperfil_product_code: "PRO",
      pperfil_market: "BR",
      pperfil_currency: "BRL",
      pperfil_interval: "MONTH",
    },
  }, { idempotencyKey: "catalog:TEST:PRO:BR:BRL:MONTH:price:v1" }));

  return {
    productId: product.id,
    price: validateStripePrice({ ...asObject(rawPrice, "invalid_created_price"), product }, entry),
    productCreated,
    priceCreated: true,
  };
}
