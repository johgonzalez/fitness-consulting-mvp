import "server-only";

import { createHash, randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  BillingCheckoutAccount,
  BillingCheckoutAttempt,
  BillingCheckoutRepository,
} from "./checkout.ts";
import type { StripeProviderCheckoutSession, ValidatedStripePrice } from "./providers/stripe/types.ts";
import { createBillingAdminClient } from "./supabase-admin.ts";

type AccountRow = {
  id: string;
  app_user_id: string;
  provider_customer_id: string | null;
};

type AttemptRow = {
  id: string;
  billing_account_id: string;
  provider_idempotency_key: string;
  provider_checkout_session_id: string | null;
  status: BillingCheckoutAttempt["status"];
  expires_at: string | null;
};

function account(row: AccountRow): BillingCheckoutAccount {
  return { id: row.id, appUserId: row.app_user_id, providerCustomerId: row.provider_customer_id };
}

function attempt(row: AttemptRow): BillingCheckoutAttempt {
  return {
    id: row.id,
    billingAccountId: row.billing_account_id,
    providerIdempotencyKey: row.provider_idempotency_key,
    providerCheckoutSessionId: row.provider_checkout_session_id,
    status: row.status,
    expiresAt: row.expires_at,
  };
}

export class SupabaseBillingCheckoutRepository implements BillingCheckoutRepository {
  private readonly client: SupabaseClient;

  constructor(client: SupabaseClient = createBillingAdminClient()) {
    this.client = client;
  }

  private async findAccount(appUserId: string): Promise<BillingCheckoutAccount | null> {
    const { data, error } = await this.client.from("billing_accounts")
      .select("id,app_user_id,provider_customer_id")
      .eq("app_user_id", appUserId)
      .maybeSingle();
    if (error) throw new Error("BILLING_ACCOUNT_READ_FAILED");
    return data ? account(data as AccountRow) : null;
  }

  async getOrCreateAccount(appUserId: string): Promise<BillingCheckoutAccount> {
    const existing = await this.findAccount(appUserId);
    if (existing) return existing;
    const id = randomUUID();
    const { data, error } = await this.client.from("billing_accounts")
      .insert({ id, app_user_id: appUserId, provider: "stripe", market: "BR" })
      .select("id,app_user_id,provider_customer_id")
      .single();
    if (!error && data) return account(data as AccountRow);
    if (error?.code === "23505") {
      const winner = await this.findAccount(appUserId);
      if (winner) return winner;
    }
    throw new Error("BILLING_ACCOUNT_CREATE_FAILED");
  }

  async attachProviderCustomer(
    billingAccount: BillingCheckoutAccount,
    providerCustomerId: string,
  ): Promise<BillingCheckoutAccount> {
    const { data, error } = await this.client.from("billing_accounts")
      .update({ provider: "stripe", provider_customer_id: providerCustomerId })
      .eq("id", billingAccount.id)
      .eq("app_user_id", billingAccount.appUserId)
      .is("provider_customer_id", null)
      .select("id,app_user_id,provider_customer_id")
      .maybeSingle();
    if (!error && data) return account(data as AccountRow);
    const current = await this.findAccount(billingAccount.appUserId);
    if (!current) throw new Error("BILLING_CUSTOMER_PERSIST_FAILED");
    return current;
  }

  async hasCurrentPaidSubscription(billingAccountId: string): Promise<boolean> {
    const { data, error } = await this.client.from("billing_subscriptions")
      .select("id")
      .eq("billing_account_id", billingAccountId)
      .eq("is_current", true)
      .eq("product_code", "PRO")
      .in("billing_state", ["ACTIVE", "GRACE"])
      .limit(1);
    if (error) throw new Error("BILLING_SUBSCRIPTION_READ_FAILED");
    return (data?.length ?? 0) > 0;
  }

  async reserveAttempt(
    billingAccount: BillingCheckoutAccount,
    price: ValidatedStripePrice,
  ): Promise<BillingCheckoutAttempt> {
    const now = new Date();
    const { data: existingRows, error: existingError } = await this.client.from("billing_checkout_attempts")
      .select("id,billing_account_id,provider_idempotency_key,provider_checkout_session_id,status,expires_at")
      .eq("billing_account_id", billingAccount.id)
      .in("status", ["CREATED", "SESSION_CREATED"])
      .order("created_at", { ascending: false })
      .limit(1);
    if (existingError) throw new Error("CHECKOUT_ATTEMPT_READ_FAILED");
    const existing = existingRows?.[0] as AttemptRow | undefined;
    if (existing && (!existing.expires_at || new Date(existing.expires_at) > now)) return attempt(existing);
    if (existing?.expires_at && new Date(existing.expires_at) <= now) {
      await this.client.from("billing_checkout_attempts").update({ status: "EXPIRED" }).eq("id", existing.id);
    }

    const id = randomUUID();
    const day = now.toISOString().slice(0, 10).replaceAll("-", "");
    const providerIdempotencyKey = `checkout:${billingAccount.id}:PRO:BR:MONTH:${day}`;
    const requestFingerprint = createHash("sha256")
      .update(`${billingAccount.id}|PRO|BR|BRL|MONTH|${price.providerPriceId}`)
      .digest("hex");
    const insert = {
      id,
      billing_account_id: billingAccount.id,
      product_code: "PRO",
      market: "BR",
      currency: "BRL",
      billing_interval: "month",
      amount_minor: price.unitAmountMinor,
      provider: "stripe",
      provider_price_id: price.providerPriceId,
      provider_idempotency_key: providerIdempotencyKey,
      status: "CREATED",
      request_fingerprint: requestFingerprint,
    };
    const { data, error } = await this.client.from("billing_checkout_attempts")
      .insert(insert)
      .select("id,billing_account_id,provider_idempotency_key,provider_checkout_session_id,status,expires_at")
      .single();
    if (!error && data) return attempt(data as AttemptRow);
    if (error?.code === "23505") {
      const { data: winner, error: winnerError } = await this.client.from("billing_checkout_attempts")
        .select("id,billing_account_id,provider_idempotency_key,provider_checkout_session_id,status,expires_at")
        .eq("provider", "stripe")
        .eq("provider_idempotency_key", providerIdempotencyKey)
        .single();
      if (!winnerError && winner) return attempt(winner as AttemptRow);
    }
    throw new Error("CHECKOUT_ATTEMPT_CREATE_FAILED");
  }

  async markAttemptOpen(attemptId: string, session: StripeProviderCheckoutSession): Promise<void> {
    const { error } = await this.client.from("billing_checkout_attempts").update({
      provider_checkout_session_id: session.id,
      status: "SESSION_CREATED",
      expires_at: session.expiresAt,
    }).eq("id", attemptId).eq("status", "CREATED");
    if (error) throw new Error("CHECKOUT_ATTEMPT_UPDATE_FAILED");
  }
}
