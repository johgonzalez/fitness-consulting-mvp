import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const authActions = read("../../src/app/actions/auth.ts");
const studentActions = read("../../src/app/actions/students.ts");
const authForm = read("../../src/components/auth/AuthForm.tsx");
const authShell = read("../../src/components/auth/AuthShell.tsx");
const invitePage = read("../../src/app/invite/[token]/page.tsx");
const acceptForm = read("../../src/components/students/AcceptInvitationForm.tsx");
const confirmRoute = read("../../src/app/auth/confirm/route.ts");
const confirmResult = read("../../src/app/auth/confirm/result/page.tsx");
const logoutForm = read("../../src/components/auth/SecureLogoutForm.tsx");
const demoExit = read("../../src/app/demo/exit/route.ts");
const trainerHeader = read("../../src/components/dashboard/DashboardHeader.tsx");
const studentProfile = read("../../src/app/student/profile/page.tsx");
const proxy = read("../../src/lib/supabase/proxy.ts");
const authenticatedHome = read("../../src/lib/navigation/authenticated-home.ts");
const dashboardLayout = read("../../src/app/dashboard/layout.tsx");

test("login and signup share the canonical auth shell and preserve safe next", () => {
  assert.match(authShell, /pc-auth-page/);
  assert.match(authShell, /ThemeToggle/);
  assert.match(authForm, /name="next" value=\{nextPath\}/);
  assert.match(authForm, /name="context" value=\{context\}/);
  assert.match(authForm, /authRouteWithNext/);
  assert.match(authActions, /safeInternalPath\(formData\.get\("next"\), ""\)/);
  assert.match(authActions, /resolveAuthenticatedHome\(supabase, \{ context, nextPath:/);
});

test("invitation bridge prioritizes account creation and keeps next on both auth paths", () => {
  const createIndex = invitePage.indexOf("Criar acesso");
  const loginIndex = invitePage.indexOf("Já tem uma conta? Entrar");
  assert.ok(createIndex >= 0 && loginIndex > createIndex);
  assert.match(invitePage, /authRouteWithNext\("\/signup", next, "student"\)/);
  assert.match(invitePage, /authRouteWithNext\("\/login", next, "student"\)/);
});

test("invitation token is server-bound instead of rendered in a hidden form field", () => {
  assert.match(invitePage, /acceptInvitationAction\.bind\(null, token\)/);
  assert.doesNotMatch(acceptForm, /name="token"/);
  assert.doesNotMatch(acceptForm, /value=\{token\}/);
  assert.match(studentActions, /acceptInvitationAction\(token:string/);
});

test("invite errors remain generic across invalid, expired, used and mismatched claims", () => {
  assert.match(studentActions, /pode ter expirado, já ter sido usado ou pertencer a outro e-mail/);
  assert.doesNotMatch(studentActions, /invited_email_normalized/);
  assert.match(invitePage, /Este convite não está disponível/);
});

test("email confirmation uses safe next and renders success and error states", () => {
  assert.match(confirmRoute, /safeInternalPath\(next, "\/onboarding"\)/);
  assert.match(confirmRoute, /status", "success"/);
  assert.match(confirmRoute, /status", "error"/);
  assert.match(confirmResult, /E-mail confirmado/);
  assert.match(confirmResult, /Não foi possível confirmar/);
  assert.match(confirmResult, /safeInternalPath\(params\.next \?\? null, "\/onboarding"\)/);
});

test("trainer and student logout entry points require explicit confirmation", () => {
  assert.match(trainerHeader, /<SecureLogoutForm compact/);
  assert.match(studentProfile, /<SecureLogoutForm/);
  assert.match(logoutForm, /role="alertdialog"/);
  assert.match(logoutForm, /Encerrar esta sessão\?/);
  assert.match(logoutForm, /type="button" onClick=\{\(\) => setConfirmationOpen\(true\)\}/);
  assert.match(logoutForm, /type="button" disabled=\{pending\} onClick=\{logoutWithLocalCleanup\}/);
  assert.match(logoutForm, /await logout\(\)/);
  assert.match(authActions, /export async function logout\(\)[\s\S]*redirect\("\/"\)/);
  assert.match(demoExit, /new URL\("\/", request\.url\)/);
});

test("authenticated auth-route redirect respects explicit next and role-aware home", () => {
  assert.match(proxy, /safeInternalPath\(request\.nextUrl\.searchParams\.get\("next"\), ""\)/);
  assert.match(proxy, /resolveAuthenticatedHome\(supabase, \{ context, nextPath: explicitNext \}\)/);
  assert.doesNotMatch(proxy, /authRoute && authenticated\) return NextResponse\.redirect\(new URL\("\/dashboard"/);
});

test("protected Trainer and Student routes are role-separated", () => {
  assert.match(proxy, /const protectedRoute = trainerRoute \|\| studentRoute/);
  assert.match(proxy, /trainerRoute && !roles\.includes\("trainer"\)/);
  assert.match(proxy, /studentRoute && !roles\.includes\("student"\)/);
});

test("post-auth routing resumes factual V2 activation state", () => {
  assert.match(authenticatedHome, /get_my_trainer_profile/);
  assert.match(authenticatedHome, /onboarding_completed_at/);
  assert.match(authenticatedHome, /publication_requested_at/);
  assert.match(authenticatedHome, /get_my_access_state/);
  assert.match(authenticatedHome, /waitlist_joined/);
  assert.match(authenticatedHome, /get_my_students/);
  assert.match(authenticatedHome, /state\.relationships/);
  assert.match(authenticatedHome, /state\.invitations/);
});

test("pre-activation Waitlist cannot open the unrestricted Trainer dashboard", () => {
  assert.match(dashboardLayout, /publication_requested_at == null/);
  assert.match(dashboardLayout, /get_my_access_state/);
  assert.match(dashboardLayout, /waitlist_joined === true/);
  assert.match(dashboardLayout, /redirect\("\/onboarding"\)/);
});
