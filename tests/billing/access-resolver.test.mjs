import assert from "node:assert/strict";
import test from "node:test";
import { resolveBillingAccess } from "../../src/lib/billing/access-resolver.ts";

const base = {
  now: "2026-08-24T12:00:00.000Z",
  productCode: "PRO",
  billingState: "ACTIVE",
  market: "BR",
  currency: "BRL",
  currentPeriodEnd: "2026-09-24T12:00:00.000Z",
  cancelAtPeriodEnd: false,
  graceUntil: null,
  suspendedAt: null,
  providerSnapshotRecognized: true,
  providerPriceRecognized: true,
};

function assertAllCapabilities(decision, expected) {
  assert.equal(Object.values(decision.capabilities).every((value) => value === expected), true);
}

test("FREE fails closed for every paid capability", () => {
  const decision = resolveBillingAccess({ ...base, productCode: "FREE", billingState: "FREE", market: null, currency: null });
  assert.equal(decision.effectiveState, "FREE");
  assertAllCapabilities(decision, false);
});

test("active Founder Access grants capabilities without changing FREE Billing", () => {
  const decision = resolveBillingAccess({
    ...base,
    productCode: "FREE",
    billingState: "FREE",
    market: null,
    currency: null,
    accessGrant: { grantType: "FOUNDER_ACCESS", status: "ACTIVE", expiresAt: null },
  });
  assert.equal(decision.effectiveState, "FREE");
  assert.equal(decision.accessSource, "FOUNDER_ACCESS");
  assertAllCapabilities(decision, true);
});

test("expired or revoked Founder Access grants nothing", () => {
  for (const accessGrant of [
    { grantType: "FOUNDER_ACCESS", status: "REVOKED", expiresAt: null },
    { grantType: "FOUNDER_ACCESS", status: "ACTIVE", expiresAt: base.now },
  ]) {
    const decision = resolveBillingAccess({
      ...base,
      productCode: "FREE",
      billingState: "FREE",
      market: null,
      currency: null,
      accessGrant,
    });
    assert.equal(decision.effectiveState, "FREE");
    assert.equal(decision.accessSource, "FREE");
    assertAllCapabilities(decision, false);
  }
});

test("ACTIVE enables canonical paid capabilities", () => {
  const decision = resolveBillingAccess(base);
  assert.equal(decision.effectiveState, "ACTIVE");
  assert.equal(decision.activeCanceling, false);
  assertAllCapabilities(decision, true);
});

test("ACTIVE cancel_at_period_end remains paid before period end", () => {
  const decision = resolveBillingAccess({ ...base, cancelAtPeriodEnd: true });
  assert.equal(decision.activeCanceling, true);
  assertAllCapabilities(decision, true);
});

test("GRACE remains paid strictly before expiry", () => {
  const decision = resolveBillingAccess({ ...base, billingState: "GRACE", graceUntil: "2026-08-25T12:00:00.000Z" });
  assert.equal(decision.effectiveState, "GRACE");
  assertAllCapabilities(decision, true);
});

test("GRACE expires exactly at the boundary", () => {
  const decision = resolveBillingAccess({ ...base, billingState: "GRACE", graceUntil: base.now });
  assert.equal(decision.effectiveState, "SUSPENDED");
  assertAllCapabilities(decision, false);
});

test("expired GRACE is suspended", () => {
  const decision = resolveBillingAccess({ ...base, billingState: "GRACE", graceUntil: "2026-08-23T12:00:00.000Z" });
  assert.equal(decision.effectiveState, "SUSPENDED");
  assertAllCapabilities(decision, false);
});

test("SUSPENDED blocks paid capabilities", () => {
  const decision = resolveBillingAccess({ ...base, billingState: "SUSPENDED", suspendedAt: "2026-08-24T12:00:00.000Z" });
  assertAllCapabilities(decision, false);
  assert.equal(decision.studentContinuity.canUploadProgress, false);
});

for (const [label, now, active] of [
  ["day 0", "2026-08-24T12:00:00.000Z", true],
  ["day 13", "2026-09-06T12:00:00.000Z", true],
  ["day 14 boundary", "2026-09-07T12:00:00.000Z", false],
  ["after day 14", "2026-09-08T12:00:00.000Z", false],
]) {
  test(`student continuity ${label}`, () => {
    const decision = resolveBillingAccess({
      ...base,
      now,
      billingState: "SUSPENDED",
      suspendedAt: "2026-08-24T12:00:00.000Z",
      student: {
        assignedWorkoutPublishedAt: "2026-08-23T12:00:00.000Z",
        assessmentSentAt: "2026-08-23T12:00:00.000Z",
      },
    });
    assert.equal(decision.studentContinuity.active, active);
    assert.equal(decision.studentContinuity.canCompleteAssignedWorkout, active);
    assert.equal(decision.studentContinuity.canRespondToSentAssessment, active);
    assert.equal(decision.studentContinuity.canReadOwnHistory, true);
    assert.equal(decision.studentContinuity.canUploadProgress, false);
  });
}

test("content created after suspension is not eligible for continuity", () => {
  const decision = resolveBillingAccess({
    ...base,
    billingState: "SUSPENDED",
    suspendedAt: "2026-08-24T12:00:00.000Z",
    student: {
      assignedWorkoutPublishedAt: "2026-08-25T12:00:00.000Z",
      assessmentSentAt: "2026-08-25T12:00:00.000Z",
    },
  });
  assert.equal(decision.studentContinuity.canCompleteAssignedWorkout, false);
  assert.equal(decision.studentContinuity.canRespondToSentAssessment, false);
});

for (const [label, override] of [
  ["unknown provider state", { providerSnapshotRecognized: false }],
  ["unknown product", { productCode: "ENTERPRISE" }],
  ["invalid currency", { currency: "REAL" }],
  ["unrecognized provider Price", { providerPriceRecognized: false }],
]) {
  test(`${label} fails closed`, () => {
    const decision = resolveBillingAccess({ ...base, ...override });
    assert.equal(decision.effectiveState, "SUSPENDED");
    assert.equal(decision.failClosed, true);
    assertAllCapabilities(decision, false);
  });
}
