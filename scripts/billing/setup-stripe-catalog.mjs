import { createStripeBillingProvider } from "../../src/lib/billing/providers/stripe/adapter.ts";
import { setupStripeSandboxCatalog } from "../../src/lib/billing/providers/stripe/catalog-setup.ts";
import { createStripeClient } from "../../src/lib/billing/providers/stripe/client.ts";
import { resolveStripeConfiguration } from "../../src/lib/billing/providers/stripe/configuration.ts";
import { StripeProviderError } from "../../src/lib/billing/providers/stripe/errors.ts";

try {
  const configuration = resolveStripeConfiguration(process.env);
  if (configuration.environment !== "TEST") throw new Error("LIVE CREDENTIAL BLOCKED");
  const health = await createStripeBillingProvider().getProviderHealth();
  if (health.country !== "BR" || health.defaultCurrency !== "BRL") {
    throw new StripeProviderError("STRIPE_CATALOG_MISMATCH", { reason: "account_commercial_context_mismatch" });
  }
  const result = await setupStripeSandboxCatalog(createStripeClient(configuration), configuration);
  console.log("CATALOG READY");
  console.log(`environment=${health.environment}`);
  console.log(`account_id=${health.accountId}`);
  console.log(`product_id=${result.productId}`);
  console.log(`product_created=${result.productCreated}`);
  console.log(`price_id=${result.price.providerPriceId}`);
  console.log(`price_created=${result.priceCreated}`);
  console.log(`lookup_key=${result.price.lookupKey}`);
  console.log(`amount_minor=${result.price.unitAmountMinor}`);
  console.log(`currency=${result.price.currency}`);
  console.log(`interval=${result.price.interval}`);
} catch (error) {
  if (error instanceof StripeProviderError) {
    console.error(`CATALOG SETUP FAILED — ${error.code}`);
  } else if (error instanceof Error && error.message === "LIVE CREDENTIAL BLOCKED") {
    console.error("LIVE CREDENTIAL BLOCKED");
  } else {
    console.error("CATALOG SETUP FAILED — STRIPE_PROVIDER_UNAVAILABLE");
  }
  process.exitCode = 1;
}
