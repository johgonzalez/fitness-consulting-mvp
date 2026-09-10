import assert from "node:assert/strict";
import test from "node:test";
import { activateAuraRoute, completeAuraRoute, createAuraMotionCycle, normalizeAuraMotionPath, planAuraMotion } from "../../src/lib/navigation/aura-motion.ts";

function readyAt(path) {
  return completeAuraRoute(createAuraMotionCycle(path), path).cycle;
}

test("initial deep links become ready without pretending to have a previous screen", () => {
  const path = "/dashboard/workouts/version-1";
  const result = completeAuraRoute(createAuraMotionCycle(path), path);
  assert.equal(result.plan.kind, "none");
  assert.equal(result.cycle.lastReadyPath, path);
});

test("a delayed page cannot animate after a newer destination was selected", () => {
  const students = activateAuraRoute(readyAt("/dashboard"), "/dashboard/students");
  const workouts = activateAuraRoute(students, "/dashboard/workouts");
  assert.equal(completeAuraRoute(workouts, "/dashboard/students"), null);
  const result = completeAuraRoute(workouts, "/dashboard/workouts");
  assert.equal(result.plan.kind, "tab");
  assert.equal(result.plan.offsetPx, 20);
  assert.equal(result.cycle.lastReadyPath, "/dashboard/workouts");
});

test("a ready page animates once despite refresh, repeated effects or mutation results", () => {
  const path = "/dashboard/students";
  const pending = activateAuraRoute(readyAt("/dashboard"), path);
  const finished = completeAuraRoute(pending, path).cycle;
  assert.equal(completeAuraRoute(finished, path), null);
  assert.strictEqual(activateAuraRoute(finished, `${path}/?status=active&q=Ana`), finished);
  assert.equal(completeAuraRoute(finished, path), null);
});

test("list to detail and its real return have opposite entry directions", () => {
  const detail = planAuraMotion("/dashboard/students", "/dashboard/students/student-1");
  const back = planAuraMotion("/dashboard/students/student-1", "/dashboard/students");
  assert.equal(detail.kind, "detail");
  assert.equal(back.kind, "return");
  assert.equal(detail.offsetPx, -back.offsetPx);
  assert.equal(detail.offsetPx, 20);
  assert.equal(detail.durationMs, 260);
  assert.equal(back.durationMs, 240);
});

test("main destinations follow dock order in either direction", () => {
  const routes = ["/dashboard", "/dashboard/students", "/dashboard/workouts", "/dashboard/community", "/dashboard/business"];
  for (let index = 1; index < routes.length; index += 1) {
    assert.equal(planAuraMotion(routes[index - 1], routes[index]).offsetPx, 20);
    assert.equal(planAuraMotion(routes[index], routes[index - 1]).offsetPx, -20);
    assert.equal(planAuraMotion(routes[index - 1], routes[index]).durationMs, 190);
    assert.equal(planAuraMotion(routes[index], routes[index - 1]).durationMs, 190);
  }
});

test("assessments and business subroutes stay in their established destination groups", () => {
  assert.equal(planAuraMotion("/dashboard/students", "/dashboard/assessments/new").kind, "detail");
  for (const route of ["site", "preview", "leads", "profile", "settings/billing"]) {
    assert.equal(planAuraMotion("/dashboard/business", `/dashboard/${route}`).kind, "detail");
    assert.equal(planAuraMotion(`/dashboard/${route}`, "/dashboard/business").kind, "return");
  }
});

test("sibling details use a neutral fade rather than inventing a history direction", () => {
  const result = planAuraMotion("/dashboard/students/one", "/dashboard/students/two");
  assert.equal(result.kind, "fade");
  assert.equal(result.offsetPx, 0);
});

test("reduced motion completes readiness without movement or navigation delay", () => {
  const pending = activateAuraRoute(readyAt("/dashboard"), "/dashboard/workouts");
  const reduced = completeAuraRoute(pending, "/dashboard/workouts", true);
  assert.deepEqual(reduced.plan, { kind: "none", durationMs: 0, offsetPx: 0 });
  assert.equal(completeAuraRoute(reduced.cycle, "/dashboard/workouts", false), null);
});

test("returning to a previously visited route creates a fresh visual cycle", () => {
  const first = readyAt("/dashboard/students");
  const detail = completeAuraRoute(activateAuraRoute(first, "/dashboard/students/one"), "/dashboard/students/one").cycle;
  const returned = completeAuraRoute(activateAuraRoute(detail, "/dashboard/students"), "/dashboard/students");
  assert.equal(returned.plan.kind, "return");
  assert.ok(returned.cycle.revision > detail.revision);
});

test("path normalization ignores UI queries without accepting external navigation", () => {
  assert.equal(normalizeAuraMotionPath("/dashboard/workouts/?view=review#section"), "/dashboard/workouts");
  for (const path of ["https://example.com/dashboard", "//example.com/dashboard", "javascript:alert(1)", "/student/today", "/dashboard-other"]) {
    assert.equal(normalizeAuraMotionPath(path), null);
  }
  assert.equal(planAuraMotion("/dashboard/workouts", "/dashboard/workouts-other").kind, "fade");
});
