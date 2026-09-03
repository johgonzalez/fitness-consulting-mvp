export const billingStates = ["FREE", "ACTIVE", "GRACE", "SUSPENDED"] as const;
export type BillingState = (typeof billingStates)[number];

export const billingProductCodes = ["FREE", "PRO"] as const;
export type BillingProductCode = (typeof billingProductCodes)[number];

export type BillingProvider = string;
export type BillingInterval = "month" | "year";

export const paidCapabilities = [
  "site.publish",
  "leads.receive",
  "students.manage",
  "assessments.manage",
  "workouts.program",
  "student_workouts.execute",
  "progress.manage",
] as const;

export type PaidCapability = (typeof paidCapabilities)[number];
export type BillingCapabilityMap = Record<PaidCapability, boolean>;

export interface BillingSubscription {
  id: string;
  billingAccountId: string;
  provider: BillingProvider;
  providerSubscriptionId: string;
  providerProductId: string;
  providerPriceId: string;
  latestProviderInvoiceId: string | null;
  productCode: BillingProductCode;
  market: string;
  currency: string;
  billingInterval: BillingInterval;
  providerStatus: string;
  billingState: BillingState;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  endedAt: string | null;
  graceStartedAt: string | null;
  graceUntil: string | null;
  suspendedAt: string | null;
  lastSyncedAt: string;
  isCurrent: boolean;
}

export interface StudentContinuityContext {
  assignedWorkoutPublishedAt?: string | Date | null;
  assessmentSentAt?: string | Date | null;
}

export interface BillingAccessContext {
  now: string | Date;
  productCode: string;
  billingState: string;
  currentSubscriptionCount: number;
  market: string | null;
  currency: string | null;
  currentPeriodEnd?: string | Date | null;
  cancelAtPeriodEnd?: boolean;
  graceUntil?: string | Date | null;
  suspendedAt?: string | Date | null;
  providerSnapshotRecognized: boolean;
  providerPriceRecognized: boolean;
  accessGrant?: {
    grantType: string;
    status: string;
    expiresAt?: string | Date | null;
  } | null;
  student?: StudentContinuityContext;
}

export interface StudentContinuityDecision {
  active: boolean;
  endsAt: string | null;
  canCompleteAssignedWorkout: boolean;
  canRespondToSentAssessment: boolean;
  canReadOwnHistory: boolean;
  canUploadProgress: boolean;
}

export interface BillingAccessDecision {
  effectiveState: BillingState;
  activeCanceling: boolean;
  failClosed: boolean;
  capabilities: BillingCapabilityMap;
  trainerCanReadExistingData: boolean;
  studentContinuity: StudentContinuityDecision;
  reasons: string[];
  accessSource: "FREE" | "BILLING" | "FOUNDER_ACCESS";
}

export interface NormalizedBillingProviderSnapshot {
  appUserId: string;
  provider: BillingProvider;
  providerCustomerId: string;
  providerSubscriptionId: string;
  providerProductId: string;
  providerPriceId: string;
  latestProviderInvoiceId: string | null;
  productCode: "PRO";
  market: string;
  currency: string;
  billingInterval: BillingInterval;
  providerStatus: string;
  billingState: BillingState;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  endedAt: string | null;
  observedAt: string;
  priorPaidAccess: boolean;
  isCurrent: boolean;
}

export interface BillingStateChangeLogContext {
  billingAccountId: string;
  providerEventId?: string;
  subscriptionId: string;
  previousState: BillingState;
  nextState: BillingState;
  syncedAt: string;
  sanitizedErrorCode?: string;
}
