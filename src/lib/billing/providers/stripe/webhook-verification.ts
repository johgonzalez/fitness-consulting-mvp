import "server-only";
import type Stripe from "stripe";
import { StripeProviderError } from "./errors.ts";
import type { StripeProviderEnvironment } from "./types.ts";

export async function verifyStripeWebhookEvent(input: {
  stripe: Pick<Stripe, "webhooks">;
  raw: string;
  signature: string;
  secret: string;
  environment: StripeProviderEnvironment;
}): Promise<Stripe.Event> {
  const event = await input.stripe.webhooks.constructEventAsync(input.raw, input.signature, input.secret);
  if (event.livemode !== (input.environment === "LIVE")) {
    throw new StripeProviderError("STRIPE_CONFIGURATION_ERROR", { reason: "webhook_environment_mismatch" });
  }
  return event;
}
