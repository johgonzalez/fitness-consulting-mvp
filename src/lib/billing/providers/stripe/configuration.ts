import "server-only";

import { StripeProviderError } from "./errors.ts";
import type {
  StripeCredentialType,
  StripeProviderConfiguration,
  StripeProviderEnvironment,
} from "./types.ts";

export const STRIPE_API_VERSION = "2026-02-25.clover" as const;
export const DEFAULT_PRO_BR_MONTHLY_LOOKUP_KEY = "pperfil_pro_br_monthly";

type EnvironmentSource = Record<string, string | undefined>;

function resolveProviderEnvironment(source: EnvironmentSource): StripeProviderEnvironment {
  const configured = source.STRIPE_ENVIRONMENT?.trim().toUpperCase();
  if (configured === "TEST" || configured === "LIVE") return configured;
  if (configured) {
    throw new StripeProviderError("STRIPE_CONFIGURATION_ERROR", {
      field: "STRIPE_ENVIRONMENT",
      reason: "unsupported_value",
    });
  }
  return source.NODE_ENV === "production" ? "LIVE" : "TEST";
}

function parseCredential(
  apiKey: string,
): { environment: StripeProviderEnvironment; credentialType: StripeCredentialType } {
  if (apiKey.startsWith("rk_test_")) return { environment: "TEST", credentialType: "RESTRICTED" };
  if (apiKey.startsWith("sk_test_")) return { environment: "TEST", credentialType: "SECRET" };
  if (apiKey.startsWith("rk_live_")) return { environment: "LIVE", credentialType: "RESTRICTED" };
  if (apiKey.startsWith("sk_live_")) return { environment: "LIVE", credentialType: "SECRET" };
  throw new StripeProviderError("STRIPE_CONFIGURATION_ERROR", {
    field: "STRIPE_API_KEY",
    reason: "unsupported_credential_prefix",
  });
}

function optionalAccountId(source: EnvironmentSource): string | null {
  const value = source.STRIPE_ACCOUNT_ID?.trim();
  if (!value) return null;
  if (!/^acct_[A-Za-z0-9]+$/.test(value)) {
    throw new StripeProviderError("STRIPE_CONFIGURATION_ERROR", {
      field: "STRIPE_ACCOUNT_ID",
      reason: "invalid_format",
    });
  }
  return value;
}

function optionalProductId(source: EnvironmentSource): string | null {
  const value = source.STRIPE_PRO_PRODUCT_ID?.trim();
  if (!value) return null;
  if (!/^prod_[A-Za-z0-9]+$/.test(value)) {
    throw new StripeProviderError("STRIPE_CONFIGURATION_ERROR", {
      field: "STRIPE_PRO_PRODUCT_ID",
      reason: "invalid_format",
    });
  }
  return value;
}

export function isStripeProviderConfigured(source: EnvironmentSource): boolean {
  return Boolean(source.STRIPE_API_KEY?.trim());
}

export function resolveStripeConfiguration(
  source: EnvironmentSource,
): StripeProviderConfiguration {
  const apiKey = source.STRIPE_API_KEY?.trim();
  if (!apiKey) {
    throw new StripeProviderError("STRIPE_CONFIGURATION_ERROR", {
      field: "STRIPE_API_KEY",
      reason: "missing",
    });
  }

  const environment = resolveProviderEnvironment(source);
  const credential = parseCredential(apiKey);
  if (credential.environment !== environment) {
    throw new StripeProviderError("STRIPE_CONFIGURATION_ERROR", {
      field: "STRIPE_API_KEY",
      reason: environment === "TEST" ? "live_credential_blocked" : "test_credential_blocked",
    });
  }

  const lookupKey = source.STRIPE_PRO_BR_MONTHLY_LOOKUP_KEY?.trim()
    || DEFAULT_PRO_BR_MONTHLY_LOOKUP_KEY;
  if (!/^[a-z0-9_]{3,120}$/.test(lookupKey)) {
    throw new StripeProviderError("STRIPE_CONFIGURATION_ERROR", {
      field: "STRIPE_PRO_BR_MONTHLY_LOOKUP_KEY",
      reason: "invalid_format",
    });
  }

  return {
    environment,
    credentialType: credential.credentialType,
    apiKey,
    accountId: optionalAccountId(source),
    proBrMonthlyLookupKey: lookupKey,
    proProductId: optionalProductId(source),
  };
}
