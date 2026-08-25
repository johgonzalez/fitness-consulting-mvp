import "server-only";

import Stripe from "stripe";
import { STRIPE_API_VERSION } from "./configuration.ts";
import { loadStripeConfiguration } from "./runtime-configuration.ts";
import type { StripeProviderConfiguration } from "./types.ts";

export function createStripeClient(
  configuration: StripeProviderConfiguration = loadStripeConfiguration(),
) {
  return new Stripe(configuration.apiKey, {
    // Stripe's SDK types track its latest generated API, while PPerfil pins the
    // approved account contract explicitly. Provider objects are normalized
    // structurally below this boundary instead of leaking generated SDK types.
    apiVersion: STRIPE_API_VERSION as Stripe.LatestApiVersion,
    appInfo: {
      name: "PPerfil Billing",
      version: "1.0.0",
    },
    maxNetworkRetries: 2,
    timeout: 10_000,
    typescript: true,
  });
}
