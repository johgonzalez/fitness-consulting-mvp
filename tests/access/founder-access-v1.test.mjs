import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const identityMigration=await readFile(new URL("../../supabase/migrations/20260827201846_trainer_identity_extension.sql",import.meta.url),"utf8");
const accessMigration=await readFile(new URL("../../supabase/migrations/20260827201856_access_foundation_waitlist.sql",import.meta.url),"utf8");
const actions=await readFile(new URL("../../src/app/actions/onboarding.ts",import.meta.url),"utf8");
const onboarding=await readFile(new URL("../../src/components/onboarding/OnboardingForm.tsx",import.meta.url),"utf8");

test("Trainer identity requires factual adult data server-side",()=>{
  assert.match(identityMigration,/p_full_name text/);
  assert.match(identityMigration,/p_birth_date date/);
  assert.match(identityMigration,/birth_date_required/);
  assert.match(identityMigration,/current_date - interval '18 years'/);
  assert.match(identityMigration,/trainer_must_be_adult/);
  assert.match(identityMigration,/preferred_name/);
  assert.match(identityMigration,/pronouns/);
  assert.match(identityMigration,/profile_image_url/);
  assert.match(identityMigration,/draft\.cref/);
});

test("legacy identity writer cannot bypass the adult gate",()=>{
  assert.match(identityMigration,/revoke all on function public\.save_my_onboarding_identity\(text,text,text\) from public, anon, authenticated/i);
  assert.match(actions,/p_birth_date:birthDate/);
  assert.match(onboarding,/name="birth_date"/);
});

test("Founder codes are hashed, atomic, limited and idempotent",()=>{
  assert.match(accessMigration,/code_hash text not null unique/);
  assert.doesNotMatch(accessMigration,/create table public\.access_codes[\s\S]*?\n\s+code text/i);
  assert.match(accessMigration,/from public\.access_codes code_row[\s\S]*for update/);
  assert.match(accessMigration,/redemption_count = redemption_count \+ 1/);
  assert.match(accessMigration,/on conflict \(trainer_user_id, grant_type\) where status = 'ACTIVE' do nothing/);
  assert.match(accessMigration,/ALREADY_ACTIVE/);
});

test("Founder Access remains independent from Billing while combining entitlements",()=>{
  assert.match(accessMigration,/trainer_has_active_billing/);
  assert.match(accessMigration,/trainer_has_active_access_grant/);
  assert.match(accessMigration,/trainer_has_full_access/);
  assert.match(accessMigration,/'access_source'.*'BILLING'/s);
  assert.match(accessMigration,/'FOUNDER_ACCESS'/);
  assert.doesNotMatch(accessMigration,/billing_state\s*=\s*'ACTIVE'/i);
});

test("Waitlist is private, normalized and grants no access",()=>{
  assert.ok(accessMigration.includes("constraint waitlist_whatsapp_check check (whatsapp ~ '^\\+[1-9][0-9]{7,14}$')"));
  assert.match(accessMigration,/unique \(email, audience\)/);
  assert.match(accessMigration,/on conflict \(email, audience\) do update/);
  assert.match(accessMigration,/revoke all on public\.access_codes, public\.access_grants, public\.waitlist_entries/);
  assert.doesNotMatch(accessMigration,/join_waitlist[\s\S]*insert into public\.access_grants/);
});

test("Legacy access validation remains strict without blocking onboarding",()=>{
  assert.match(actions,/Código inválido\./);
  assert.match(actions,/Este código não está mais disponível\./);
  assert.match(actions,/Este código atingiu o limite de ativações\./);
  assert.doesNotMatch(onboarding,/name="access_code"|Entrar na lista de espera/);
  assert.match(actions,/request_my_site_publication/);
});
