import type { NormalizedBillingProviderSnapshot } from "../../domain.ts";

export type StripeProviderEnvironment = "TEST" | "LIVE";
export type StripeCredentialType = "RESTRICTED" | "SECRET";

export interface StripeProviderConfiguration {
  environment: StripeProviderEnvironment;
  credentialType: StripeCredentialType;
  apiKey: string;
  accountId: string | null;
  proBrMonthlyLookupKey: string;
  proProductId: string | null;
}

export interface StripeProviderHealth {
  connected: true;
  environment: StripeProviderEnvironment;
  credentialType: StripeCredentialType;
  accountId: string;
  country: string | null;
  defaultCurrency: string | null;
}

export interface StripeProviderCustomer {
  id: string;
  deleted: boolean;
}

export interface CreateStripeCustomerInput {
  billingAccountId: string;
  appUserId: string;
  idempotencyKey: string;
}

export interface StripeCatalogSelection {
  productCode: string;
  market: string;
  currency: string;
  interval: string;
}

export interface StripeCatalogEntry {
  productCode: "PRO";
  market: "BR";
  currency: "BRL";
  interval: "MONTH";
  providerEnvironment: StripeProviderEnvironment;
  lookupKey: string;
  recognizedProductId: string | null;
}

export interface ValidatedStripePrice {
  providerPriceId: string;
  providerProductId: string;
  lookupKey: string;
  productCode: "PRO";
  market: "BR";
  currency: "BRL";
  interval: "MONTH";
  providerEnvironment: StripeProviderEnvironment;
  unitAmountMinor: number | null;
}

export interface StripeProviderProduct {
  id: string;
  active: boolean;
}

export interface StripeSubscriptionReference {
  id: string;
  customerId: string;
  providerStatus: string;
}

export interface NormalizeStripeSubscriptionInput {
  appUserId: string;
  subscription: unknown;
  catalogPrice: ValidatedStripePrice;
  observedAt: string;
  priorPaidAccess: boolean;
  isCurrent: boolean;
}

export interface GetNormalizedStripeSubscriptionInput {
  appUserId: string;
  subscriptionId: string;
  catalog: StripeCatalogSelection;
  observedAt: string;
  priorPaidAccess: boolean;
  isCurrent?: boolean;
}

export interface StripeBillingProvider {
  getProviderHealth(): Promise<StripeProviderHealth>;
  getCustomer(customerId: string): Promise<StripeProviderCustomer>;
  createCustomer(input: CreateStripeCustomerInput): Promise<StripeProviderCustomer>;
  getProduct(productId: string): Promise<StripeProviderProduct>;
  getPrice(selection: StripeCatalogSelection): Promise<ValidatedStripePrice>;
  listCurrentSubscriptions(customerId: string): Promise<StripeSubscriptionReference[]>;
  getSubscription(input: GetNormalizedStripeSubscriptionInput): Promise<NormalizedBillingProviderSnapshot>;
}
