import { isStripeProviderConfigured, resolveStripeConfiguration } from "../../src/lib/billing/providers/stripe/configuration.ts";
import { StripeProviderError } from "../../src/lib/billing/providers/stripe/errors.ts";

if (!isStripeProviderConfigured(process.env)) {
  console.error("SANDBOX HEALTH CHECK: NOT RUN — CREDENTIAL REQUIRED");
  process.exitCode = 1;
} else {
  try {
    const configuration = resolveStripeConfiguration(process.env);
    if (configuration.environment !== "TEST") {
      console.error("LIVE CREDENTIAL BLOCKED");
      process.exitCode = 1;
    } else {
      const { createStripeBillingProvider } = await import("../../src/lib/billing/providers/stripe/adapter.ts");
      const health = await createStripeBillingProvider().getProviderHealth();
      console.log("CONNECTED");
      console.log(`environment=${health.environment}`);
      console.log(`credential_type=${health.credentialType}`);
      console.log(`account_id=${health.accountId}`);
      console.log(`country=${health.country ?? "UNAVAILABLE"}`);
      console.log(`default_currency=${health.defaultCurrency ?? "UNAVAILABLE"}`);
    }
  } catch (error) {
    if (error instanceof StripeProviderError) {
      if (error.safeContext.reason === "live_credential_blocked") {
        console.error("LIVE CREDENTIAL BLOCKED");
      } else {
        console.error(`SANDBOX HEALTH CHECK: FAILED — ${error.code}`);
      }
    } else {
      console.error("SANDBOX HEALTH CHECK: FAILED — STRIPE_PROVIDER_UNAVAILABLE");
    }
    process.exitCode = 1;
  }
}
