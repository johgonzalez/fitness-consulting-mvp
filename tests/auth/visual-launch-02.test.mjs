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
const launchBrandSources = [
  read("../../src/app/page.tsx"),
  read("../../src/app/login/page.tsx"),
  read("../../src/app/signup/page.tsx"),
  read("../../src/components/auth/CheipiBrand.tsx"),
  read("../../src/components/auth/CheipiSplash.tsx"),
  read("../../src/components/auth/AuthShell.tsx"),
  read("../../src/components/auth/AuthContextPicker.tsx"),
  read("../../src/components/auth/SecureLogoutForm.tsx"),
  read("../../src/components/dashboard/BrandLogo.tsx"),
  read("../../src/components/student/StudentAppShell.tsx"),
];

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

test("launch surfaces expose Cheipi while preserving internal PPerfil identifiers", () => {
  const visibleBrandContract = launchBrandSources.join("\n");
  assert.match(visibleBrandContract, />Cheipi</);
  assert.match(visibleBrandContract, /Entrar — Cheipi/);
  assert.match(visibleBrandContract, /Criar acesso — Cheipi/);
  assert.doesNotMatch(visibleBrandContract, /[\"']PPerfil(?: — início)?[\"']/);
  assert.doesNotMatch(visibleBrandContract, />PPerfil</);
  assert.doesNotMatch(visibleBrandContract, /(?:pelo|no|o) PPerfil/);
});
