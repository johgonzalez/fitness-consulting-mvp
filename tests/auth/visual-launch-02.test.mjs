import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const config = read("../../src/lib/auth/ui-config.ts");
const form = read("../../src/components/auth/AuthForm.tsx");
const otp = read("../../src/components/auth/OtpVerificationForm.tsx");
const providers = read("../../src/components/auth/AuthProviderControls.tsx");
const login = read("../../src/app/login/page.tsx");
const today = read("../../src/app/student/today/page.tsx");
const studentScreen = read("../../src/components/student/StudentTodayScreen.tsx");
const dashboard = read("../../src/app/dashboard/page.tsx");

test("hosted OTP authority is centralized and drives the accessible segmented UI", () => {
  assert.match(config, /SIGNUP_OTP_LENGTH = 8/);
  assert.match(otp, /Array\.from\(\{ length: SIGNUP_OTP_LENGTH \}/);
  assert.match(otp, /minLength=\{SIGNUP_OTP_LENGTH\}/);
  assert.match(otp, /maxLength=\{SIGNUP_OTP_LENGTH\}/);
  assert.match(otp, /code\.length !== SIGNUP_OTP_LENGTH/);
  assert.equal((otp.match(/name="token"/g) ?? []).length, 1);
});

test("progressive signup persists no password and autoverifies without a continue button", () => {
  assert.match(form, /"email" \| "password"/);
  assert.match(form, /JSON\.stringify\(\{ step: "password", email: signupEmail, context, nextPath \}\)/);
  assert.doesNotMatch(form, /password:\s*signupPassword/);
  assert.match(otp, /requestSubmit\(\)/);
  assert.doesNotMatch(otp, />Confirmar código</);
});

test("provider intent follows context selection and unsupported launch destinations are absent", () => {
  assert.match(login, /pick === "1"/);
  assert.match(login, /normalizeAuthMethodIntent/);
  assert.match(providers, /startGoogleOAuth/);
  assert.doesNotMatch(providers, /Apple|Community|Comunidade|Mensagens/);
});

test("Student Today keeps its original data contract and Dashboard keeps real loaders", () => {
  assert.match(today, /getStudentTodayWorkspace/);
  assert.doesNotMatch(today + studentScreen, /assessment/i);
  assert.match(dashboard, /findOwnerProfile\(\)/);
  assert.match(dashboard, /findDashboardMetrics\(\)/);
  assert.match(dashboard, /getStudentsWorkspace\(\)/);
  assert.match(dashboard, /getLeadsWorkspace\(\)/);
  assert.match(dashboard, /getTrainerAssessmentIndex\(\)/);
  assert.match(dashboard, /getWorkoutIndex\(\)/);
});
