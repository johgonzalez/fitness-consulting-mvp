import "server-only";

import { resolveStripeConfiguration } from "./configuration.ts";

export function loadStripeConfiguration() {
  return resolveStripeConfiguration(process.env);
}
