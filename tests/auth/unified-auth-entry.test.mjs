import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const picker = read("../../src/components/auth/AuthContextPicker.tsx");
const loginPage = read("../../src/app/login/page.tsx");
const signupPage = read("../../src/app/signup/page.tsx");
const authForm = read("../../src/components/auth/AuthForm.tsx");
const otpForm = read("../../src/components/auth/OtpVerificationForm.tsx");
const authActions = read("../../src/app/actions/auth.ts");
const callback = read("../../src/app/auth/callback/route.ts");
const resolver = read("../../src/lib/navigation/authenticated-home.ts");
const proxy = read("../../src/lib/supabase/proxy.ts");
const accessPage = read("../../src/app/access/student/page.tsx");
const accessState = read("../../src/components/auth/StudentAccessState.tsx");
const migration = read("../../supabase/migrations/202608280001_unified_auth_entry.sql");

test("the entry asks for a UX context without assigning authorization", () => {
  assert.match(picker, /Como você usa o PPerfil|Escolha como você usa o PPerfil/);
  assert.match(picker, /Sou Personal Trainer/);
  assert.match(picker, /Crie seu site, organize seus alunos e acompanhe os treinos\./);
  assert.match(picker, /Sou Aluno/);
  assert.match(picker, /Acesse seus treinos e acompanhe sua evolução\./);
  assert.doesNotMatch(picker, /user_roles|student_profiles|trainer_profiles/);
});

test("context and invitation continuation survive password, OTP and Google", () => {
  assert.match(authForm, /name="context" value=\{context\}/);
  assert.match(otpForm, /name="context" value=\{state\.context\}/);
  assert.match(authActions, /callback\.searchParams\.set\("context", context\)/);
  assert.match(authActions, /finishInvitationIfPresent\(nextPath\)/);
  assert.match(callback, /accept_student_invitation/);
  assert.match(callback, /resolveAuthenticatedHome\(supabase, \{ context, nextPath \}\)/);
});

test("one server resolver authorizes requested workspaces from backend state", () => {
  assert.match(resolver, /get_my_app_identity/);
  assert.match(resolver, /get_my_trainer_profile/);
  assert.match(resolver, /get_my_student_entry_state/);
  assert.match(resolver, /student_role_active !== true/);
  assert.match(resolver, /active_relationship !== true/);
  assert.match(resolver, /roles\.includes\("trainer"\)/);
  assert.match(resolver, /roles\.includes\("student"\)/);
  assert.match(resolver, /invitePathPattern/);
});

test("student without an invitation gets factual guidance and a role-free waitlist", () => {
  assert.match(accessPage, /get_my_student_entry_state/);
  assert.match(accessState, /Para acessar o app, você precisa receber um convite do seu Personal\./);
  assert.match(accessState, /Entrar na lista de espera/);
  assert.match(accessState, /Voltar/);
  assert.match(accessState, /Sair/);
  assert.match(migration, /'student', 'unified_auth'/);
  assert.doesNotMatch(migration, /insert into public\.user_roles|insert into public\.trainer_student_relationships|insert into public\.student_profiles/);
});

test("student entry RPCs are authenticated-only and derive email from auth", () => {
  assert.match(migration, /where auth_user\.id = \(select auth\.uid\(\)\)/);
  assert.match(migration, /select lower\(email\) into authenticated_email[\s\S]*from auth\.users/);
  assert.match(migration, /revoke all on function public\.join_my_student_waitlist\(text\) from public, anon/);
  assert.match(migration, /grant execute on function public\.join_my_student_waitlist\(text\) to authenticated/);
  assert.match(migration, /set search_path = ''/);
});

test("proxy keeps role isolation and lets an authenticated user choose a workspace", () => {
  assert.match(proxy, /trainerRoute && !roles\.includes\("trainer"\)/);
  assert.match(proxy, /studentRoute && !roles\.includes\("student"\)/);
  assert.match(proxy, /searchParams\.get\("choose"\) === "1"/);
  assert.match(proxy, /resolveAuthenticatedHome\(supabase, \{ context, nextPath: explicitNext \}\)/);
});

test("auth pages reject unsafe next values before rendering links or forms", () => {
  assert.match(loginPage, /safeInternalPath\(rawNext \?\? null, ""\)/);
  assert.match(signupPage, /safeInternalPath\(rawNext \?\? null, ""\)/);
});

test("authenticated auth pages resolve context server-side even if proxy resolution is unavailable", () => {
  assert.match(loginPage, /supabase\.auth\.getUser\(\)/);
  assert.match(loginPage, /resolveAuthenticatedHome\(supabase, \{ context, nextPath: next \}\)/);
  assert.match(signupPage, /supabase\.auth\.getUser\(\)/);
  assert.match(signupPage, /resolveAuthenticatedHome\(supabase, \{ context, nextPath: next \}\)/);
});
