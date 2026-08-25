import "server-only";

import { StripeBillingProviderCore, type StripeClientPort } from "./adapter-core.ts";
import { createStripeClient } from "./client.ts";
import { loadStripeConfiguration } from "./runtime-configuration.ts";
import type { StripeBillingProvider } from "./types.ts";

export function createStripeBillingProvider(): StripeBillingProvider {
  const configuration = loadStripeConfiguration();
  const stripe = createStripeClient(configuration);
  return new StripeBillingProviderCore(stripe as unknown as StripeClientPort, configuration);
}
