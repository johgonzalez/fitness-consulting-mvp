import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const login = read("../../src/app/login/page.tsx");
const signup = read("../../src/app/signup/page.tsx");
const picker = read("../../src/components/auth/AuthContextPicker.tsx");
const authActions = read("../../src/app/actions/auth.ts");
const callback = read("../../src/app/auth/callback/route.ts");
const forgot = read("../../src/app/forgot-password/page.tsx");
const reset = read("../../src/app/reset-password/page.tsx");
const dashboard = read("../../src/app/dashboard/page.tsx");
const css = read("../../src/app/auth-dashboard-v1.css");
const premiumCss = read("../../src/app/premium-consumer-v1a.css");
const authShell = read("../../src/components/auth/AuthShell.tsx");

test("returning users and invited students bypass unnecessary role selection", () => {
  assert.match(login, /if \(choose === "1"\)/);
  assert.doesNotMatch(login, /if \(!context\).*AuthContextPicker/);
  assert.match(login, /invited \? "student" : normalizeAuthContext/);
  assert.match(login, /resolveAuthenticatedHome\(supabase, \{ context, nextPath: next \}\)/);
  assert.match(signup, /if \(!context\).*AuthContextPicker/);
});

test("role selection is semantic, explicit and never grants authorization", () => {
  assert.match(picker, /<fieldset/);
  assert.match(picker, /type="radio"/);
  assert.match(picker, /disabled=\{!selection \|\| pending\}/);
  assert.match(picker, /authRouteWithNext\(route, nextPath, selection\)/);
  assert.doesNotMatch(picker, /user_roles|trainer_profiles|student_profiles|insert|rpc/);
});

test("password recovery uses canonical Supabase Auth without product-role mutation", () => {
  assert.match(authActions, /resetPasswordForEmail/);
  assert.match(authActions, /updateUser\(\{ password \}\)/);
  assert.match(authActions, /Se existir uma conta com este e-mail/);
  assert.match(callback, /nextPath === "\/reset-password"/);
  assert.match(forgot, /ForgotPasswordForm/);
  assert.match(reset, /ResetPasswordForm/);
  assert.doesNotMatch(authActions, /user_roles|trainer_profiles|student_profiles/);
});

test("dashboard remains factual, attention-first and open-layout", () => {
  assert.match(dashboard, /Veja o que precisa da sua atenção agora/);
  assert.match(dashboard, /workoutNotifications/);
  assert.match(dashboard, /reviewAssessments/);
  assert.match(dashboard, /attentionLeads/);
  assert.match(dashboard, /Meu Site/);
  assert.doesNotMatch(dashboard, /receita|retenção|rating|faturamento/i);
  assert.match(css, /pc-dashboard--v1b/);
  assert.match(css, /pc-priority-row/);
  assert.match(css, /@media \(max-width: 760px\)/);
});

test("auth reuses the canonical monochrome product shell identity", () => {
  assert.match(authShell, /className="pc-auth-page pp-app-shell-v1"/);
  assert.match(authShell, /<BrandLogo href="\/" monochrome \/>/);
  assert.match(css, /var\(--pp-shell-solid\)/);
  assert.match(css, /var\(--pp-shell-on-solid\)/);
  assert.doesNotMatch(css, /--pc-contrast-(?:bg|text)/);
  assert.match(css, /data-auth-view="login"[^}]*\.pc-auth-layout[\s\S]*?display: flex;/);
  assert.doesNotMatch(css, /grid-template-columns: minmax\(72px, 0\.34fr\)/);
  assert.doesNotMatch(premiumCss, /\.pc-auth-page\{[^}]*--pp-background:/);
  assert.doesNotMatch(premiumCss, /\[data-theme="dark"\] \.pc-auth-page\{/);
});
