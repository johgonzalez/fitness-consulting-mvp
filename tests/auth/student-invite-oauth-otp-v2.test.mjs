import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const auth = read("../../src/app/actions/auth.ts");
const callback = read("../../src/app/auth/callback/route.ts");
const form = read("../../src/components/auth/AuthForm.tsx");
const otp = read("../../src/components/auth/OtpVerificationForm.tsx");
const studentActions = read("../../src/app/actions/students.ts");
const studentsRepo = read("../../src/lib/supabase/students.ts");
const inviteMigration = read("../../supabase/migrations/20260827205439_student_invitation_lifecycle_v2.sql");
const profileMigration = read("../../supabase/migrations/20260827205427_student_profile_contact_media.sql");

test("Google OAuth preserves only a validated internal next path", () => {
  assert.match(auth, /safeInternalPath\(formData\.get\("next"\), ""\)/);
  assert.match(auth, /provider: "google"/);
  assert.match(callback, /exchangeCodeForSession/);
  assert.match(callback, /accept_student_invitation/);
  assert.doesNotMatch(callback, /new URL\(url\.searchParams\.get\("next"\)/);
  assert.match(form, /aria-label="Continuar com Google"/);
  assert.match(form, /developers\.google\.com\/static\/identity\/images\/g-logo\.png/);
  assert.doesNotMatch(form, />Continuar com Google</);
  assert.match(form, /aria-label="Entrar com Apple — em breve"/);
  assert.doesNotMatch(form, /provider:\s*["']apple["']/i);
});

test("password signup uses provider OTP verification and supported resend", () => {
  assert.match(auth, /verifyOtp\(\{ email, token, type: "email" \}\)/);
  assert.match(auth, /auth\.resend\(/);
  assert.match(otp, /autoComplete="one-time-code"/);
  assert.match(otp, /pattern="\[0-9\]\{6,10\}"/);
  assert.match(otp, /Reenviar código/);
  assert.doesNotMatch(auth, /Math\.random|create.*otp/i);
  const resendBody = auth.slice(auth.indexOf("export async function resendSignupOtp"), auth.indexOf("export async function startGoogleOAuth"));
  assert.match(resendBody, /type: "signup"/);
  assert.doesNotMatch(resendBody, /auth\.signUp/);
  assert.match(resendBody, /Enviamos um novo código para seu e-mail\./);
  assert.match(resendBody, /Você solicitou um novo código recentemente\. Aguarde um pouco e tente novamente\./);
  assert.match(resendBody, /Não conseguimos reenviar o código agora\./);
  assert.match(otp, /secondsUntilResend/);
  assert.match(auth, /resendCooldownSeconds: 60/);
  assert.match(otp, /setResendAvailableAt\(currentTime \+ \(result\.resendCooldownSeconds \?\? 0\) \* 1_000\)/);
  assert.doesNotMatch(resendBody, /Date\.now/);
});

test("OTP continuation survives refresh and exposes contextual Back and safe Exit", () => {
  assert.match(form, /useSyncExternalStore/);
  assert.match(form, /window\.sessionStorage\.getItem/);
  assert.match(form, /readPendingOtp/);
  assert.match(otp, /window\.sessionStorage\.setItem/);
  assert.match(otp, /window\.sessionStorage\.removeItem/);
  assert.match(otp, /onSubmit=\{clearPendingOtp\}/);
  assert.match(otp, /invitedFlow \? contextState\.nextPath! : authRouteWithNext\("\/signup", contextState\.nextPath, contextState\.context\)/);
  assert.match(otp, /authRouteWithNext\("\/login", undefined, contextState\.context\)/);
  assert.match(otp, /<Link href=\{backHref\}>Voltar<\/Link>/);
  assert.doesNotMatch(otp, /href=\{backHref\} onClick=\{clearPendingOtp\}/);
  assert.match(otp, />Sair</);
});

test("invitation creation is email-only and delivery failure preserves the invitation", () => {
  assert.match(studentsRepo, /create_student_invitation",\{p_email:email\}/);
  const createAction = studentActions.slice(studentActions.indexOf("export async function inviteStudentAction"), studentActions.indexOf("export async function resendInvitationAction"));
  assert.doesNotMatch(createAction, /form\.get\("name"\)/);
  assert.match(studentActions, /Convite criado, mas o e-mail não pôde ser enviado\./);
  assert.match(studentActions, /recordInvitationDelivery/);
});

test("resend and edit are owner RPC operations with atomic token rotation", () => {
  assert.match(inviteMigration, /prepare_my_student_invitation_resend/);
  assert.match(inviteMigration, /invitation_resend_rate_limited/);
  assert.match(inviteMigration, /edit_my_student_invitation_email/);
  assert.match(inviteMigration, /for update/);
  assert.match(inviteMigration, /gen_random_bytes\(32\)/);
  assert.match(inviteMigration, /'status', 'UNCHANGED'/);
  assert.match(studentActions, /Nenhum novo envio foi feito/);
});

test("accepted invitation replay is limited to the same authoritative user", () => {
  assert.match(inviteMigration, /invitation\.accepted_by_user_id <> current_user_id/);
  assert.match(inviteMigration, /return created_relationship_id/);
  assert.match(inviteMigration, /email_confirmed_at is not null/);
});

test("optional student profile has E.164 and private user-owned media contracts", () => {
  assert.match(profileMigration, /whatsapp_e164.*\\\+\[1-9\]/s);
  assert.match(profileMigration, /current_user_id::text.*\/profile\//s);
  assert.match(profileMigration, /student-private-media/);
  assert.match(profileMigration, /role_code = 'student'/);
});
