import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const publicKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!publicKey||!serviceKey)throw new Error("HOSTED_QA_CONFIGURATION_REQUIRED");
const admin=createClient(url,serviceKey,{auth:{autoRefreshToken:false,persistSession:false}});
const runId=Date.now().toString(36);const password=`Qa!${randomBytes(18).toString("base64url")}9`;
const identities=["trainer-a","trainer-b","student"].map(label=>({label,email:`pperfil-${label}-${runId}@example.test`,id:null}));
const results=[];const uploaded=[];
const record=(name,passed)=>{assert.equal(passed,true,name);results.push({name,passed:true});};
const sessionClient=async(identity)=>{const client=createClient(url,publicKey,{auth:{autoRefreshToken:false,persistSession:false}});const{error}=await client.auth.signInWithPassword({email:identity.email,password});if(error)throw error;return client;};

try{
  for(const identity of identities){const{data,error}=await admin.auth.admin.createUser({email:identity.email,password,email_confirm:true,user_metadata:{qa:true}});if(error)throw error;identity.id=data.user.id;}
  const[aIdentity,bIdentity,studentIdentity]=identities;const a=await sessionClient(aIdentity);const b=await sessionClient(bIdentity);const student=await sessionClient(studentIdentity);
  for(const[client,identity]of[[a,aIdentity],[b,bIdentity],[student,studentIdentity]]){const{error}=await client.rpc("ensure_my_app_user",{p_display_name:identity.label,p_locale:"pt-BR",p_timezone:"America/Sao_Paulo",p_country_code:"BR"});if(error)throw error;}
  await admin.from("user_roles").insert({user_id:studentIdentity.id,role_code:"student"});

  const png=Uint8Array.from(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=","base64"));
  const photoPath=`${aIdentity.id}/onboarding/profile/${randomUUID()}.png`;uploaded.push(photoPath);
  const upload=await a.storage.from("trainer-public-media").upload(photoPath,png,{contentType:"image/png"});record("Trainer A uploads own professional photo",!upload.error);
  const crossUpload=await b.storage.from("trainer-public-media").upload(`${aIdentity.id}/onboarding/profile/${randomUUID()}.png`,png,{contentType:"image/png"});record("Trainer B cannot upload into Trainer A folder",Boolean(crossUpload.error));
  const publicUrl=a.storage.from("trainer-public-media").getPublicUrl(photoPath).data.publicUrl;

  let response=await a.rpc("save_my_onboarding_identity",{p_display_name:"Trainer QA A",p_professional_name:"Personal QA",p_profile_image_url:publicUrl});if(response.error)throw response.error;
  response=await a.rpc("get_my_onboarding_draft");record("Resume after photo",response.data?.identity_completed_at!=null&&response.data?.professional_completed_at==null);
  response=await a.rpc("save_my_onboarding_professional",{p_specialty_code:"strength",p_specialty_label:"Força",p_service_mode:"both",p_city:"São Paulo",p_cref:null});if(response.error)throw response.error;
  response=await a.rpc("get_my_onboarding_draft");record("Resume after specialty",response.data?.professional_completed_at!=null&&response.data?.social_completed_at==null);
  response=await a.rpc("save_my_onboarding_social",{p_whatsapp:"5511999999001",p_instagram:"trainer.qa",p_tiktok:"https://www.tiktok.com/@trainer.qa",p_youtube:"https://www.youtube.com/@trainerqa"});if(response.error)throw response.error;
  response=await a.rpc("get_my_onboarding_draft");record("Resume after social",response.data?.social_completed_at!=null&&response.data?.template_completed_at==null);
  response=await a.rpc("save_my_onboarding_template",{p_template:"template_02"});if(response.error)throw response.error;
  response=await a.rpc("get_my_onboarding_draft");record("Resume after template",response.data?.template_id==="template_02"&&response.data?.template_completed_at!=null);
  response=await a.rpc("finalize_my_onboarding");if(response.error)throw response.error;const slug=response.data;
  response=await a.rpc("get_my_trainer_profile");const profile=response.data;record("Finalization is factual and idempotent",Boolean(profile?.id)&&profile?.slug===slug&&profile?.template_id==="template_02"&&profile?.profile_image_url===publicUrl);

  response=await b.rpc("get_my_onboarding_draft");record("Trainer B cannot read Trainer A draft",response.data===null);
  response=await b.from("trainer_profiles").update({tiktok:"https://www.tiktok.com/@forged"}).eq("id",profile.id).select("id");record("Trainer B cannot mutate Trainer A profile",!response.error&&response.data.length===0);
  response=await student.from("trainer_profiles").update({youtube:"https://www.youtube.com/@forged"}).eq("id",profile.id).select("id");record("Student cannot mutate Trainer profile",!response.error&&response.data.length===0);
  response=await student.rpc("set_my_site_template",{p_template:"template_03"});record("Student cannot mutate Trainer site configuration",Boolean(response.error));
  const anon=createClient(url,publicKey,{auth:{autoRefreshToken:false,persistSession:false}});
  response=await anon.from("trainer_profiles").select("id,slug").eq("slug",slug);record("Anonymous cannot see unpublished profile",!response.error&&response.data.length===0);
  response=await a.from("billing_subscriptions").insert({});record("Trainer cannot forge Billing subscription",Boolean(response.error));

  response=await a.rpc("request_my_site_publication");if(response.error)throw response.error;
  response=await a.rpc("get_my_trainer_profile");record("Success URL or publication request alone cannot activate",response.data?.published===false);
  response=await admin.from("trainer_entitlements").select("can_publish_site").eq("trainer_id",profile.id).single();record("FREE Trainer has no publication entitlement",response.data?.can_publish_site===false);

  const observed=new Date();const common={p_app_user_id:aIdentity.id,p_provider:"stripe",p_provider_customer_id:`cus_qa_${runId}`,p_provider_subscription_id:`sub_qa_${runId}`,p_provider_product_id:"prod_V8O6ulkkoHStvD",p_provider_price_id:"price_1U87KfGcGN0dnwUzQprr10CB",p_latest_provider_invoice_id:null,p_product_code:"PRO",p_market:"BR",p_currency:"BRL",p_billing_interval:"month",p_current_period_start:observed.toISOString(),p_current_period_end:new Date(observed.getTime()+7*86400000).toISOString(),p_cancel_at_period_end:false,p_canceled_at:null,p_ended_at:null,p_prior_paid_access:false,p_is_current:true};
  response=await admin.rpc("reconcile_billing_subscription",{...common,p_provider_status:"trialing",p_billing_state:"ACTIVE",p_observed_at:observed.toISOString()});if(response.error)throw response.error;
  response=await admin.from("trainer_entitlements").select("can_publish_site").eq("trainer_id",profile.id).single();record("Authoritative reconciliation enables publication",response.data?.can_publish_site===true);
  response=await anon.from("trainer_profiles").select("id,slug").eq("slug",slug);record("Entitled published profile becomes public",!response.error&&response.data.length===1);

  const suspendedAt=new Date(observed.getTime()+1000);response=await admin.rpc("reconcile_billing_subscription",{...common,p_provider_status:"canceled",p_billing_state:"SUSPENDED",p_observed_at:suspendedAt.toISOString(),p_canceled_at:suspendedAt.toISOString(),p_ended_at:suspendedAt.toISOString()});if(response.error)throw response.error;
  response=await admin.from("trainer_profiles").select("id,published,display_name,template_id,publication_requested_at").eq("id",profile.id).single();record("Entitlement loss retains Trainer content and publication intent",response.data?.published===true&&response.data?.display_name==="Trainer QA A"&&response.data?.publication_requested_at!=null);
  response=await anon.from("trainer_profiles").select("id,slug").eq("slug",slug);record("Inactive entitlement removes public exposure",!response.error&&response.data.length===0);

  console.log(JSON.stringify({status:"PASS",results},null,2));
}finally{
  if(uploaded.length)await admin.storage.from("trainer-public-media").remove(uploaded);
  for(const identity of identities){if(!identity.id)continue;const account=await admin.from("billing_accounts").select("id").eq("app_user_id",identity.id).maybeSingle();if(account.data?.id){await admin.from("billing_subscriptions").delete().eq("billing_account_id",account.data.id);await admin.from("billing_checkout_attempts").delete().eq("billing_account_id",account.data.id);await admin.from("billing_accounts").delete().eq("id",account.data.id);}await admin.auth.admin.deleteUser(identity.id);}
}
