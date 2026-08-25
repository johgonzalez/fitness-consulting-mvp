import { StripeProviderError } from "./errors.ts";
import type {
  StripeCatalogEntry,
  StripeCatalogSelection,
  ValidatedStripePrice,
} from "./types.ts";

interface CatalogConfiguration {
  environment: "TEST" | "LIVE";
  proBrMonthlyLookupKey: string;
  proProductId: string | null;
}

interface StripePriceShape {
  id?: unknown;
  active?: unknown;
  currency?: unknown;
  lookup_key?: unknown;
  unit_amount?: unknown;
  livemode?: unknown;
  recurring?: { interval?: unknown; interval_count?: unknown } | null;
  product?: unknown;
  metadata?: unknown;
}

export const PRO_BR_MONTHLY_AMOUNT_MINOR = 5990;

function mismatch(reason: string): never {
  throw new StripeProviderError("STRIPE_CATALOG_MISMATCH", { reason });
}

export function resolveStripeCatalogEntry(
  selection: StripeCatalogSelection,
  configuration: CatalogConfiguration,
): StripeCatalogEntry {
  if (selection.productCode !== "PRO") mismatch("unknown_product");
  if (selection.market !== "BR") mismatch("unknown_market");
  if (selection.currency !== "BRL") mismatch("unknown_currency");
  if (selection.interval !== "MONTH") mismatch("unknown_interval");

  return {
    productCode: "PRO",
    market: "BR",
    currency: "BRL",
    interval: "MONTH",
    providerEnvironment: configuration.environment,
    lookupKey: configuration.proBrMonthlyLookupKey,
    recognizedProductId: configuration.proProductId,
  };
}

function productIdentity(product: unknown): {
  id: string;
  active: boolean | null;
  metadata: Record<string, unknown>;
} | null {
  if (typeof product === "string") return { id: product, active: null, metadata: {} };
  if (typeof product !== "object" || product === null) return null;
  const candidate = product as { id?: unknown; active?: unknown; deleted?: unknown };
  if (typeof candidate.id !== "string" || candidate.deleted === true) return null;
  return {
    id: candidate.id,
    active: typeof candidate.active === "boolean" ? candidate.active : null,
    metadata: typeof (product as { metadata?: unknown }).metadata === "object"
      && (product as { metadata?: unknown }).metadata !== null
      ? (product as { metadata: Record<string, unknown> }).metadata
      : {},
  };
}

export function validateStripePrice(
  price: unknown,
  entry: StripeCatalogEntry,
): ValidatedStripePrice {
  if (typeof price !== "object" || price === null) mismatch("invalid_price_object");
  const candidate = price as StripePriceShape;
  if (typeof candidate.id !== "string" || !candidate.id.startsWith("price_")) mismatch("invalid_price_id");
  if (candidate.active !== true) mismatch("inactive_price");
  if (candidate.livemode !== (entry.providerEnvironment === "LIVE")) mismatch("environment_mismatch");
  if (candidate.lookup_key !== entry.lookupKey) mismatch("lookup_key_mismatch");
  if (candidate.currency !== entry.currency.toLowerCase()) mismatch("currency_mismatch");
  if (candidate.recurring?.interval !== "month" || candidate.recurring.interval_count !== 1) {
    mismatch("interval_mismatch");
  }

  const product = productIdentity(candidate.product);
  if (!product || product.active === false) {
    mismatch("unrecognized_product");
  }
  if (entry.recognizedProductId) {
    if (product.id !== entry.recognizedProductId) mismatch("unrecognized_product");
  } else if (product.metadata.product_code !== entry.productCode
    || product.metadata.market !== entry.market) {
    mismatch("unrecognized_product");
  }

  if (typeof candidate.metadata === "object" && candidate.metadata !== null) {
    const metadata = candidate.metadata as Record<string, unknown>;
    const expected = {
      pperfil_product_code: entry.productCode,
      pperfil_market: entry.market,
      pperfil_currency: entry.currency,
      pperfil_interval: entry.interval,
    };
    for (const [key, value] of Object.entries(expected)) {
      if (key in metadata && metadata[key] !== value) mismatch("conflicting_price_metadata");
    }
  }

  if (candidate.unit_amount !== null
    && (!Number.isSafeInteger(candidate.unit_amount) || Number(candidate.unit_amount) < 0)) {
    mismatch("invalid_unit_amount");
  }
  if (candidate.unit_amount !== PRO_BR_MONTHLY_AMOUNT_MINOR) mismatch("amount_mismatch");

  return {
    providerPriceId: candidate.id,
    providerProductId: product.id,
    lookupKey: entry.lookupKey,
    productCode: entry.productCode,
    market: entry.market,
    currency: entry.currency,
    interval: entry.interval,
    providerEnvironment: entry.providerEnvironment,
    unitAmountMinor: candidate.unit_amount === null ? null : Number(candidate.unit_amount),
  };
}
