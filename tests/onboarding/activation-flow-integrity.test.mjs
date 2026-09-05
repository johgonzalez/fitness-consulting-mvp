import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const onboarding=await readFile(new URL("../../src/components/onboarding/OnboardingForm.tsx",import.meta.url),"utf8");
const page=await readFile(new URL("../../src/app/onboarding/page.tsx",import.meta.url),"utf8");
const actions=await readFile(new URL("../../src/app/actions/onboarding.ts",import.meta.url),"utf8");
const share=await readFile(new URL("../../src/components/onboarding/SiteShareActions.tsx",import.meta.url),"utf8");
const migration=await readFile(new URL("../../supabase/migrations/20260827231237_activation_flow_integrity.sql",import.meta.url),"utf8");

test("Founder redemption requests publication in the same server action",()=>{const body=actions.slice(actions.indexOf("export async function redeemFounderAccess"),actions.indexOf("export async function joinTrainerWaitlist"));assert.ok(body.indexOf("redeem_my_access_code")<body.indexOf("request_my_site_publication"));assert.match(onboarding,/canPublish\?<><p>Seu acesso já inclui a publicação/);});

test("optional activation keeps a private draft and a route to the first student",()=>{assert.doesNotMatch(onboarding,/"waitlist_success"/);assert.match(onboarding,/rascunho privado/);assert.match(onboarding,/href="\/onboarding\?step=student"/);assert.match(onboarding,/formAction=\{logout\}|action=\{logout\}/);});

test("only active relationships or live pending invitations skip first-student activation",()=>{assert.match(page,/student\.status==="active"/);assert.match(page,/invitation\.status==="pending"/);assert.doesNotMatch(page,/invitations\.length/);assert.match(onboarding,/studentActivation==="active"/);assert.match(onboarding,/studentActivation==="pending"/);});

test("site sharing is truthful and supports native share with copy fallback",()=>{assert.match(share,/navigator\.share/);assert.match(share,/navigator\.clipboard\.writeText/);assert.match(share,/wa\.me/);assert.match(share,/Instagram e TikTok não permitem publicação direta/);assert.match(share,/SITE_SHARE_ACTION_MODEL/);});

test("onboarding draft remains the durable source for Back and idempotent resume",()=>{assert.doesNotMatch(migration,/delete from public\.trainer_onboarding_drafts/);assert.match(migration,/onboarding_completed_at = coalesce\(onboarding_completed_at, now\(\)\)/);assert.match(page,/get_my_onboarding_draft/);});
