import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const foundation = read("../../supabase/migrations/202608220001_identity_relationship_foundation.sql");
const service = read("../../src/lib/supabase/students.ts");
const actions = read("../../src/app/actions/students.ts");
const component = read("../../src/components/students/RevokeInvitationAction.tsx");
const studentsPage = read("../../src/app/dashboard/students/page.tsx");

function functionBody(source, signature, nextSignature) {
  const start = source.indexOf(signature);
  const end = source.indexOf(nextSignature, start + signature.length);
  assert.notEqual(start, -1, `${signature} must exist`);
  assert.notEqual(end, -1, `${nextSignature} must follow it`);
  return source.slice(start, end);
}

const revokeRpc = functionBody(
  foundation,
  "create or replace function public.revoke_my_student_invitation",
  "create or replace function public.accept_student_invitation",
);
const acceptRpc = functionBody(
  foundation,
  "create or replace function public.accept_student_invitation",
  "create or replace function public.deactivate_my_trainer_student_relationship",
);

test("revoke RPC is authenticated, ownership-scoped, and pending-only", () => {
  assert.match(revokeRpc, /security definer/i);
  assert.match(revokeRpc, /set search_path = ''/i);
  assert.match(revokeRpc, /invitation\.status = 'pending'/);
  assert.match(revokeRpc, /private\.owns_trainer\(invitation\.trainer_profile_id\)/);
  assert.match(revokeRpc, /set status = 'revoked', revoked_at = now\(\)/);
  assert.match(foundation, /grant execute on function[\s\S]*public\.revoke_my_student_invitation\(uuid\)[\s\S]*to authenticated;/i);
});

test("revocation preserves relationships and accepted invitations", () => {
  assert.doesNotMatch(revokeRpc, /delete\s+from/i);
  assert.doesNotMatch(revokeRpc, /trainer_student_relationships/i);
  assert.match(revokeRpc, /invitation\.status = 'pending'/);
});

test("revoked tokens cannot be accepted", () => {
  assert.match(acceptRpc, /invitation\.status <> 'pending'/);
  assert.match(acceptRpc, /raise exception 'invitation_invalid'/);
});

test("a fresh same-email invite is possible only after the pending invitation leaves pending", () => {
  assert.match(foundation, /create unique index student_invitations_one_pending_target_idx[\s\S]*where status = 'pending'/i);
  assert.match(foundation, /plaintext_token := encode\(extensions\.gen_random_bytes\(32\), 'hex'\)/);
  assert.match(revokeRpc, /set status = 'revoked'/);
});

test("application uses the authenticated RPC without a browser service-role shortcut", () => {
  assert.match(service, /supabase\.rpc\("revoke_my_student_invitation",\{p_invitation_id:id\}\)/);
  assert.doesNotMatch(service, /service[_-]?role/i);
  assert.match(actions, /await revokeStudentInvitation\(id\)/);
  assert.match(actions, /message:"Convite cancelado\."/);
  const revokeAction = actions.slice(
    actions.indexOf("export async function revokeInvitationAction"),
    actions.indexOf("export async function deactivateStudentAction"),
  );
  assert.doesNotMatch(revokeAction, /revalidatePath/);
});

test("pending invitation UI requires confirmation before cancellation", () => {
  assert.match(studentsPage, /invitation\.status === "pending" \? <RevokeInvitationAction/);
  assert.match(component, />Cancelar convite/);
  assert.match(component, /confirmation="Cancelar este convite\? O link atual deixará de funcionar\."/);
  assert.match(component, /refreshOnSuccess/);
});
