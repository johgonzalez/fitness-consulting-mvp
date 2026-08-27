import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { sendTransactionalEmail } from "../../src/lib/email/provider.ts";
import { buildStudentInvitationEmail } from "../../src/lib/email/student-invitation.ts";

const actions=await readFile(new URL("../../src/app/actions/students.ts",import.meta.url),"utf8");
const form=await readFile(new URL("../../src/components/students/InviteStudentForm.tsx",import.meta.url),"utf8");
const provider=await readFile(new URL("../../src/lib/email/provider.ts",import.meta.url),"utf8");
const template=await readFile(new URL("../../src/lib/email/student-invitation.ts",import.meta.url),"utf8");
const invitationMigration=await readFile(new URL("../../supabase/migrations/202608220001_identity_relationship_foundation.sql",import.meta.url),"utf8");
const integrityMigration=await readFile(new URL("../../supabase/migrations/20260827231237_activation_flow_integrity.sql",import.meta.url),"utf8");

const message={to:"student@example.test",subject:"Convite",html:"<p>Convite</p>",text:"Convite",idempotencyKey:"student-invitation/70000000-0000-4000-8000-000000000001"};
const withoutWarnings=async callback=>{const original=console.warn;console.warn=()=>{};try{return await callback()}finally{console.warn=original}};

test("Resend not configured fails gracefully without a network request",async()=>{let called=false;const result=await withoutWarnings(()=>sendTransactionalEmail(message,{env:{},fetchImpl:async()=>{called=true;throw new Error("must not run")}}));assert.deepEqual(result,{status:"failed",reason:"not_configured"});assert.equal(called,false)});

test("successful send uses the intended recipient and deterministic idempotency",async()=>{let request;const result=await sendTransactionalEmail(message,{env:{RESEND_API_KEY:"re_test_value",EMAIL_FROM:"PPerfil <onboarding@resend.dev>"},fetchImpl:async(url,init)=>{request={url,init};return new Response(JSON.stringify({id:"email_123"}),{status:200,headers:{"content-type":"application/json"}})}});assert.deepEqual(result,{status:"sent",providerMessageId:"email_123"});assert.equal(request.url,"https://api.resend.com/emails");assert.equal(request.init.headers["Idempotency-Key"],message.idempotencyKey);assert.equal(JSON.parse(request.init.body).to[0],message.to);assert.equal(JSON.parse(request.init.body).text,message.text)});

test("provider rejection and network failure return deterministic safe states",async()=>{const rejected=await withoutWarnings(()=>sendTransactionalEmail(message,{env:{RESEND_API_KEY:"re_test_value"},fetchImpl:async()=>new Response(JSON.stringify({message:"sensitive provider detail"}),{status:422})}));const network=await withoutWarnings(()=>sendTransactionalEmail(message,{env:{RESEND_API_KEY:"re_test_value"},fetchImpl:async()=>{throw new Error("raw network detail")}}));assert.deepEqual(rejected,{status:"failed",reason:"provider_rejected",providerStatus:422});assert.deepEqual(network,{status:"failed",reason:"network_error"});assert.doesNotMatch(JSON.stringify([rejected,network]),/sensitive provider detail|raw network detail/)});

test("invitation template is escaped, accessible and includes factual URL and expiry",()=>{const email=buildStudentInvitationEmail({invitationId:"70000000-0000-4000-8000-000000000001",recipientEmail:"student@example.test",trainerName:'<img src=x onerror="bad">',inviteUrl:"https://preview.example.test/invite/abc123",expiresAt:"2026-09-02T12:00:00.000Z"});assert.equal(email.to,"student@example.test");assert.match(email.html,/Aceitar convite/);assert.match(email.html,/https:\/\/preview\.example\.test\/invite\/abc123/);assert.match(email.text,/mesmo e-mail/);assert.match(email.text,/expira em/);assert.doesNotMatch(email.html,/<img src=x/);assert.match(email.html,/&lt;img src=x/)});

test("invitation persists before email attempt and delivery state stays factual",()=>{const actionBody=actions.slice(actions.indexOf("export async function inviteStudentAction"),actions.indexOf("export async function resendInvitationAction"));assert.ok(actionBody.indexOf("createStudentInvitation(email)")<actionBody.indexOf("deliverInvitation(invite,email)"));assert.match(actions,/delivery\.status==="sent"\?"provider_accepted"/);assert.match(actions,/delivery\.reason==="provider_rejected"\?"provider_rejected"/);assert.match(actions,/delivery\.reason==="network_error"\?"delivery_unknown"/);assert.match(actions,/O provedor aceitou o e-mail para entrega/);assert.doesNotMatch(actions,/Convite enviado\./);assert.match(form,/Link do convite/)});

test("provider acceptance is durably observable without exposing its identifier",()=>{assert.match(integrityMigration,/add column if not exists provider_message_id text/);assert.match(integrityMigration,/record_my_student_invitation_delivery/);assert.match(integrityMigration,/last_delivery_attempt_at = now\(\)/);assert.match(integrityMigration,/provider_accepted/);assert.match(integrityMigration,/revoke all on function public\.record_my_student_invitation_delivery/);assert.doesNotMatch(form,/provider_message_id|providerMessageId/)});

test("duplicate delivery and duplicate invitation creation are constrained",()=>{assert.match(provider,/"Idempotency-Key": message\.idempotencyKey/);assert.match(template,/student-invitation\/\$\{input\.invitationId\}\/\$\{deliveryFingerprint\}/);assert.match(invitationMigration,/student_invitations_one_pending_target_idx[\s\S]*where status = 'pending'/i)});

test("email secret remains server-only and canonical invite URL is environment-owned",()=>{assert.match(provider,/import "server-only"/);assert.match(actions,/process\.env\.NEXT_PUBLIC_SITE_URL/);assert.match(actions,/new URL\(`\/invite\/\$\{token\}`/);assert.doesNotMatch(provider,/NEXT_PUBLIC_RESEND|console\.(log|error)\([^)]*apiKey/);assert.doesNotMatch(form,/RESEND_API_KEY|providerMessageId/)});
