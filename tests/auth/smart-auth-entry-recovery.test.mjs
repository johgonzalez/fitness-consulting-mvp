import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const entry = read("../../src/components/auth/CheipiEntry.tsx");
const login = read("../../src/app/login/page.tsx");
const picker = read("../../src/components/auth/AuthContextPicker.tsx");
const resolver = read("../../src/lib/navigation/authenticated-home.ts");
const actions = read("../../src/app/actions/auth.ts");
const callback = read("../../src/app/auth/callback/route.ts");
const pendingPage = read("../../src/app/access/invitations/page.tsx");
const migration = read("../../supabase/migrations/202609030001_smart_auth_entry.sql");

test("Welcome starts Google immediately and email enters Auth without a pre-auth picker", () => {
  assert.match(entry, /form action=\{startGoogleOAuth\}/);
  assert.match(entry, /href=\{emailHref\}/);
  assert.doesNotMatch(entry, /pick|method/);
  assert.doesNotMatch(login, /pick === "1"|normalizeAuthMethodIntent/);
});

test("one post-auth resolver prioritizes explicit token then verified-email invitations", () => {
  const decisionBlock = resolver.slice(resolver.indexOf("export async function resolveAuthenticatedHome"));
  const tokenCheck = decisionBlock.indexOf("invitePathPattern.test(invitationNext)");
  const pendingCheck = decisionBlock.indexOf('rpc("get_my_pending_student_invitations")');
  const roleCheck = decisionBlock.indexOf('roles.includes("trainer")');
  assert.ok(tokenCheck >= 0 && tokenCheck < pendingCheck && pendingCheck < roleCheck);
  assert.match(actions, /resolveAuthenticatedHome\(supabase, \{ context, nextPath/);
  assert.match(callback, /resolveAuthenticatedHome\(supabase, \{ context, nextPath \}\)/);
});

test("pending invitation lookup exposes only safe metadata and acceptance stays explicit", () => {
  assert.match(migration, /create or replace function public\.get_my_pending_student_invitations\(\)/);
  assert.match(migration, /email_confirmed_at is not null/);
  assert.match(migration, /invited_email_normalized/);
  assert.match(migration, /'invitation_id'/);
  assert.match(migration, /'trainer_name'/);
  assert.match(migration, /'expires_at'/);
  const lookup = migration.slice(migration.indexOf("create or replace function public.get_my_pending_student_invitations"), migration.indexOf("create or replace function public.accept_my_pending_student_invitation"));
  assert.doesNotMatch(lookup, /token_hash|raw token|recipient_email/);
  assert.match(pendingPage, /Você recebeu um convite/);
  assert.match(pendingPage, /PendingInvitationAction/);
  assert.match(actions, /rpc\("accept_my_pending_student_invitation"/);
});

test("acceptance shares canonical race-safe relationship semantics", () => {
  assert.match(migration, /private\.accept_student_invitation_record/);
  assert.match(migration, /for update/);
  assert.match(migration, /invitation\.status = 'accepted'/);
  assert.match(migration, /on conflict \(trainer_profile_id, student_profile_id\) do update/);
  assert.match(migration, /public\.accept_student_invitation[\s\S]*private\.accept_student_invitation_record/);
  assert.match(migration, /public\.accept_my_pending_student_invitation[\s\S]*private\.accept_student_invitation_record/);
});

test("chooser appears only post-auth for multi-role or genuinely new accounts", () => {
  assert.match(resolver, /trainer && student/);
  assert.match(resolver, /return "\/login\?choose=1"/);
  assert.match(login, /chooserMode = roles\.includes\("trainer"\) && roles\.includes\("student"\) \? "workspace" : "start"/);
  assert.match(picker, /Criar meu perfil como Personal Trainer/);
  assert.match(picker, /Sou aluno e ainda não tenho convite/);
  assert.doesNotMatch(picker, /user_roles|student_profiles|trainer_profiles/);
});

test("new RPCs are authenticated-only and no unauthenticated email parameter exists", () => {
  assert.match(migration, /revoke all on function public\.get_my_pending_student_invitations\(\) from public, anon, authenticated/);
  assert.match(migration, /grant execute on function public\.get_my_pending_student_invitations\(\) to authenticated/);
  assert.match(migration, /grant execute on function public\.accept_my_pending_student_invitation\(uuid\) to authenticated/);
  assert.doesNotMatch(migration, /get_my_pending_student_invitations\([^)]*(?:email|text)/i);
  assert.doesNotMatch(migration, /accept_my_pending_student_invitation\([^)]*text/i);
});
