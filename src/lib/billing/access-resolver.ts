import {
  paidCapabilities,
  type BillingAccessContext,
  type BillingAccessDecision,
  type BillingCapabilityMap,
  type BillingState,
} from "./domain.ts";

const STUDENT_CONTINUITY_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

function denyAllCapabilities(): BillingCapabilityMap {
  return Object.fromEntries(paidCapabilities.map((capability) => [capability, false])) as BillingCapabilityMap;
}

function allowAllCapabilities(): BillingCapabilityMap {
  return Object.fromEntries(paidCapabilities.map((capability) => [capability, true])) as BillingCapabilityMap;
}

function timestamp(value: string | Date | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const result = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(result) ? result : null;
}

function isBillingState(value: string): value is BillingState {
  return value === "FREE" || value === "ACTIVE" || value === "GRACE" || value === "SUSPENDED";
}

function wasAuthorizedBeforeSuspension(value: string | Date | null | undefined, suspendedAt: number | null) {
  const authorizedAt = timestamp(value);
  return authorizedAt !== null && suspendedAt !== null && authorizedAt <= suspendedAt;
}

export function resolveBillingAccess(context: BillingAccessContext): BillingAccessDecision {
  const now = timestamp(context.now);
  const reasons: string[] = [];
  const validState = isBillingState(context.billingState);
  const validProduct = context.productCode === "FREE" || context.productCode === "PRO";
  const currentSubscriptionCountValid = Number.isInteger(context.currentSubscriptionCount)
    && context.currentSubscriptionCount >= 0;
  const subscriptionAuthorityValid = context.productCode === "FREE"
    ? currentSubscriptionCountValid && context.currentSubscriptionCount <= 1
    : currentSubscriptionCountValid && context.currentSubscriptionCount === 1;
  const providerAuthorityValid = context.productCode === "FREE"
    || (context.providerSnapshotRecognized && context.providerPriceRecognized);
  const internationalPrimitivesValid = context.productCode === "FREE"
    || (/^[A-Z]{2}$/.test(context.market ?? "") && /^[A-Z]{3}$/.test(context.currency ?? ""));

  if (now === null) reasons.push("invalid_now");
  if (!validState) reasons.push("unknown_billing_state");
  if (!validProduct) reasons.push("unknown_product");
  if (!subscriptionAuthorityValid) {
    reasons.push(context.currentSubscriptionCount === 0
      ? "missing_current_subscription"
      : "conflicting_current_subscriptions");
  }
  if (!providerAuthorityValid) reasons.push("unrecognized_provider_authority");
  if (!internationalPrimitivesValid) reasons.push("invalid_market_or_currency");

  let effectiveState: BillingState = isBillingState(context.billingState)
    ? context.billingState
    : "SUSPENDED";
  let paidAccess = false;
  let activeCanceling = false;

  if (reasons.length > 0) effectiveState = "SUSPENDED";

  if (reasons.length === 0 && now !== null) {
    if (context.productCode === "FREE") {
      if (context.billingState !== "FREE") {
        reasons.push("free_product_state_mismatch");
        effectiveState = "SUSPENDED";
      } else {
        effectiveState = "FREE";
      }
    } else if (context.billingState === "ACTIVE") {
      if (context.cancelAtPeriodEnd) {
        const periodEnd = timestamp(context.currentPeriodEnd);
        if (periodEnd === null) {
          reasons.push("canceling_period_missing");
          effectiveState = "SUSPENDED";
        } else if (now >= periodEnd) {
          reasons.push("canceling_period_ended");
          effectiveState = "SUSPENDED";
        } else {
          paidAccess = true;
          activeCanceling = true;
        }
      } else {
        paidAccess = true;
      }
    } else if (context.billingState === "GRACE") {
      const graceUntil = timestamp(context.graceUntil);
      if (graceUntil === null) {
        reasons.push("grace_deadline_missing");
        effectiveState = "SUSPENDED";
      } else if (now >= graceUntil) {
        reasons.push("grace_expired");
        effectiveState = "SUSPENDED";
      } else {
        paidAccess = true;
      }
    }
  }

  const grantExpiresAt = timestamp(context.accessGrant?.expiresAt);
  const founderAccess = now !== null
    && context.accessGrant?.grantType === "FOUNDER_ACCESS"
    && context.accessGrant.status === "ACTIVE"
    && (context.accessGrant.expiresAt == null || (grantExpiresAt !== null && grantExpiresAt > now));
  const fullAccess = paidAccess || founderAccess;

  const suspendedAt = timestamp(context.suspendedAt);
  const continuityEndsAt = suspendedAt === null ? null : suspendedAt + STUDENT_CONTINUITY_DAYS * DAY_MS;
  const continuityActive = effectiveState === "SUSPENDED"
    && now !== null
    && continuityEndsAt !== null
    && now < continuityEndsAt;

  return {
    effectiveState,
    activeCanceling,
    failClosed: reasons.length > 0 && !founderAccess,
    capabilities: fullAccess ? allowAllCapabilities() : denyAllCapabilities(),
    trainerCanReadExistingData: true,
    studentContinuity: {
      active: continuityActive,
      endsAt: continuityEndsAt === null ? null : new Date(continuityEndsAt).toISOString(),
      canCompleteAssignedWorkout: fullAccess || (
        continuityActive && wasAuthorizedBeforeSuspension(context.student?.assignedWorkoutPublishedAt, suspendedAt)
      ),
      canRespondToSentAssessment: fullAccess || (
        continuityActive && wasAuthorizedBeforeSuspension(context.student?.assessmentSentAt, suspendedAt)
      ),
      canReadOwnHistory: true,
      canUploadProgress: fullAccess,
    },
    reasons,
    accessSource: paidAccess ? "BILLING" : founderAccess ? "FOUNDER_ACCESS" : "FREE",
  };
}
