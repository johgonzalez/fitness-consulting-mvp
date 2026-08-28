import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { authRouteWithNext, defaultAuthenticatedHome, STUDENT_APP_HOME } from "../../src/lib/navigation/student-invitation.ts";
import { safeInternalPath } from "../../src/lib/validation/auth.ts";

test("accepted invitations target the Student app", () => {
  assert.equal(STUDENT_APP_HOME, "/student/today");
});

test("login and signup preserve the invitation route", () => {
  const next = "/invite/abc123";
  assert.equal(authRouteWithNext("/login", next), "/login?next=%2Finvite%2Fabc123");
  assert.equal(authRouteWithNext("/signup", next), "/signup?next=%2Finvite%2Fabc123");
  assert.equal(authRouteWithNext("/login", next, "student"), "/login?next=%2Finvite%2Fabc123&context=student");
});

test("default login destination respects Student-only and multi-role identities", () => {
  assert.equal(defaultAuthenticatedHome(["student"]), "/student/today");
  assert.equal(defaultAuthenticatedHome(["trainer"]), "/dashboard");
  assert.equal(defaultAuthenticatedHome(["student", "trainer"]), "/dashboard");
  assert.equal(defaultAuthenticatedHome(), "/onboarding");
});

test("auth redirect validation keeps internal invite routes and rejects external paths", () => {
  assert.equal(safeInternalPath("/invite/abc123", "/dashboard"), "/invite/abc123");
  assert.equal(safeInternalPath("//attacker.example/invite", "/dashboard"), "/dashboard");
  assert.equal(safeInternalPath("https://attacker.example/invite", "/dashboard"), "/dashboard");
  assert.equal(safeInternalPath("/\\attacker.example/invite", "/dashboard"), "/dashboard");
  assert.equal(safeInternalPath("/%2f%2fattacker.example/invite", "/dashboard"), "/dashboard");
});

test("the acceptance action and auth switch use the shared invitation route contract", () => {
  const actionSource = readFileSync(new URL("../../src/app/actions/students.ts", import.meta.url), "utf8");
  const authFormSource = readFileSync(new URL("../../src/components/auth/AuthForm.tsx", import.meta.url), "utf8");
  assert.match(actionSource, /redirect\(STUDENT_APP_HOME\)/);
  assert.doesNotMatch(actionSource, /acceptInvitationAction[\s\S]*redirect\("\/dashboard"\)/);
  assert.match(authFormSource, /authRouteWithNext\(signupMode \? "\/login" : "\/signup", nextPath, context\)/);
});
