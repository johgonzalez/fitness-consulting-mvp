export const stripeProviderErrorCodes = [
  "STRIPE_CONFIGURATION_ERROR",
  "STRIPE_AUTHENTICATION_ERROR",
  "STRIPE_ACCOUNT_MISMATCH",
  "STRIPE_CATALOG_MISMATCH",
  "STRIPE_PROVIDER_UNAVAILABLE",
  "STRIPE_OBJECT_NOT_FOUND",
  "STRIPE_UNSUPPORTED_STATUS",
] as const;

export type StripeProviderErrorCode = (typeof stripeProviderErrorCodes)[number];

const publicMessages: Record<StripeProviderErrorCode, string> = {
  STRIPE_CONFIGURATION_ERROR: "Stripe provider configuration is invalid.",
  STRIPE_AUTHENTICATION_ERROR: "Stripe provider authentication failed.",
  STRIPE_ACCOUNT_MISMATCH: "Stripe account pin validation failed.",
  STRIPE_CATALOG_MISMATCH: "Stripe catalog object does not match the approved PPerfil catalog.",
  STRIPE_PROVIDER_UNAVAILABLE: "Stripe provider is temporarily unavailable.",
  STRIPE_OBJECT_NOT_FOUND: "The requested Stripe object was not found.",
  STRIPE_UNSUPPORTED_STATUS: "Stripe returned a subscription status unsupported by PPerfil Billing V1.",
};

export class StripeProviderError extends Error {
  readonly code: StripeProviderErrorCode;
  readonly safeContext: Readonly<Record<string, string>>;

  constructor(
    code: StripeProviderErrorCode,
    safeContext: Record<string, string> = {},
    options?: ErrorOptions,
  ) {
    super(publicMessages[code], options);
    this.name = "StripeProviderError";
    this.code = code;
    this.safeContext = Object.freeze({ ...safeContext });
  }
}

interface StripeLikeError {
  type?: unknown;
  code?: unknown;
  statusCode?: unknown;
}

export function sanitizeStripeProviderError(
  error: unknown,
  operation: string,
): StripeProviderError {
  if (error instanceof StripeProviderError) return error;

  const candidate = typeof error === "object" && error !== null
    ? error as StripeLikeError
    : {};
  const type = typeof candidate.type === "string" ? candidate.type : "";
  const code = typeof candidate.code === "string" ? candidate.code : "";
  const statusCode = typeof candidate.statusCode === "number" ? candidate.statusCode : null;
  const safeContext = { operation };

  if (type === "StripeAuthenticationError" || statusCode === 401) {
    return new StripeProviderError("STRIPE_AUTHENTICATION_ERROR", safeContext, { cause: error });
  }
  if (code === "resource_missing" || statusCode === 404) {
    return new StripeProviderError("STRIPE_OBJECT_NOT_FOUND", safeContext, { cause: error });
  }
  return new StripeProviderError("STRIPE_PROVIDER_UNAVAILABLE", safeContext, { cause: error });
}
