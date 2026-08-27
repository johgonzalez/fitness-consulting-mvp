"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ServiceMode, TemplateId } from "@/lib/domain/trainer";
import { isTemplateId } from "@/lib/domain/template-registry";
import { rejectDemoMutation } from "@/lib/demo/workspace";
import { normalizeInstagramIdentity } from "@/lib/instagram";
import { createClient } from "@/lib/supabase/server";

export type OnboardingActionState = { ok?: boolean; message?: string };
const specialties = new Map([["hypertrophy", "Hipertrofia"], ["weight_loss", "Emagrecimento"], ["strength", "Força"], ["conditioning", "Condicionamento"], ["running", "Corrida"], ["mobility", "Mobilidade"]]);
const modes = new Set<ServiceMode>(["online", "presencial", "both"]);

async function context() { const supabase = await createClient(); const { data, error } = await supabase.auth.getUser(); return error || !data.user ? null : { supabase, user: data.user }; }
function imageType(bytes: Uint8Array) { if (bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff)return{ext:"jpg",type:"image/jpeg"};if(bytes[0]===0x89&&bytes[1]===0x50&&bytes[2]===0x4e&&bytes[3]===0x47)return{ext:"png",type:"image/png"};if(String.fromCharCode(...bytes.slice(0,4))==="RIFF"&&String.fromCharCode(...bytes.slice(8,12))==="WEBP")return{ext:"webp",type:"image/webp"};return null; }
function tiktokUrl(value:string):string|null|false { if(!value)return null;const handle=value.replace(/^https?:\/\/(www\.)?tiktok\.com\/@/i,"").replace(/^@/,"").replace(/\/$/,"");return /^[A-Za-z0-9._-]{1,40}$/.test(handle)?`https://www.tiktok.com/@${handle}`:false; }
function youtubeUrl(value:string):string|null|false { if(!value)return null;const candidate=value.startsWith("@")?`https://www.youtube.com/${value}`:value;try{const url=new URL(candidate);return url.protocol==="https:"&&["youtube.com","www.youtube.com","youtu.be","www.youtu.be"].includes(url.hostname)?url.toString():false}catch{return false} }
function redirectToAuthoritativeOnboarding():never{return redirect(`/onboarding?updated=${crypto.randomUUID()}`)}

function parseBirthDate(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : value;
}

function isAdult(birthDate: string): boolean {
  const today = new Date();
  const eighteenthBirthday = new Date(`${birthDate}T00:00:00Z`);
  eighteenthBirthday.setUTCFullYear(eighteenthBirthday.getUTCFullYear() + 18);
  const utcToday = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return eighteenthBirthday.getTime() <= utcToday;
}

export async function saveOnboardingIdentity(_state:OnboardingActionState,form:FormData):Promise<OnboardingActionState>{
  const demo=await rejectDemoMutation();if(demo)return demo;const fullName=String(form.get("full_name")??"").trim();const birthDate=parseBirthDate(String(form.get("birth_date")??""));const preferredName=String(form.get("preferred_name")??"").trim();const pronouns=String(form.get("pronouns")??"").trim();const professionalName=String(form.get("professional_name")??"").trim();
  if(fullName.length<2||fullName.length>160||!birthDate||!isAdult(birthDate)||preferredName.length>100||pronouns.length>40||professionalName.length>100)return{message:"Revise sua identidade. Para criar uma conta de Personal, você precisa ter 18 anos ou mais."};const ctx=await context();if(!ctx)return{message:"Sua sessão expirou. Entre novamente."};let profileImageUrl:string|null=null;
  const displayName=preferredName||fullName;const identity=await ctx.supabase.rpc("ensure_my_app_user",{p_display_name:displayName,p_locale:null,p_timezone:null,p_country_code:null});if(identity.error)return{message:"Não foi possível preparar sua conta."};
  const file=form.get("image");if(file instanceof File&&file.size>0){if(file.size>5*1024*1024)return{message:"A foto deve ter até 5 MB."};const bytes=new Uint8Array(await file.arrayBuffer());const detected=imageType(bytes);if(!detected)return{message:"Envie uma foto JPG, PNG ou WebP."};const path=`${ctx.user.id}/onboarding/profile/${crypto.randomUUID()}.${detected.ext}`;const upload=await ctx.supabase.storage.from("trainer-public-media").upload(path,bytes,{contentType:detected.type,cacheControl:"31536000"});if(upload.error)return{message:"Não foi possível enviar sua foto."};profileImageUrl=ctx.supabase.storage.from("trainer-public-media").getPublicUrl(path).data.publicUrl;}
  const{error}=await ctx.supabase.rpc("save_my_onboarding_identity",{p_full_name:fullName,p_birth_date:birthDate,p_preferred_name:preferredName||null,p_pronouns:pronouns||null,p_professional_name:professionalName||null,p_profile_image_url:profileImageUrl});if(error)return{message:error.message.includes("trainer_must_be_adult")?"Para criar uma conta de Personal, você precisa ter 18 anos ou mais.":"Não foi possível salvar sua identidade."};redirectToAuthoritativeOnboarding();
}

export async function redeemFounderAccess(_state:OnboardingActionState,form:FormData):Promise<OnboardingActionState>{
  const demo=await rejectDemoMutation();if(demo)return demo;const code=String(form.get("access_code")??"").trim();if(code.length<8||code.length>96)return{message:"Código inválido."};const ctx=await context();if(!ctx)return{message:"Sua sessão expirou. Entre novamente."};
  const{data,error}=await ctx.supabase.rpc("redeem_my_access_code",{p_raw_code:code});if(error)return{message:"Não foi possível validar o código agora."};const status=typeof data==="object"&&data!==null&&"status" in data?String(data.status):"INVALID";
  if(status==="INVALID")return{message:"Código inválido."};if(status==="EXPIRED")return{message:"Este código não está mais disponível."};if(status==="LIMIT_REACHED")return{message:"Este código atingiu o limite de ativações."};if(status!=="GRANTED"&&status!=="ALREADY_ACTIVE")return{message:"Não foi possível validar o código agora."};
  const publication=await ctx.supabase.rpc("request_my_site_publication");if(publication.error)return{message:"Seu acesso foi ativado, mas a publicação ainda não foi concluída."};revalidatePath("/onboarding");redirectToAuthoritativeOnboarding();
}

export async function joinTrainerWaitlist(_state:OnboardingActionState,form:FormData):Promise<OnboardingActionState>{
  const demo=await rejectDemoMutation();if(demo)return demo;const whatsapp=String(form.get("waitlist_whatsapp")??"").trim();const ctx=await context();if(!ctx||!ctx.user.email)return{message:"Sua sessão expirou. Entre novamente."};const digits=whatsapp.replace(/\D/g,"");if(!/^[1-9][0-9]{7,14}$/.test(digits))return{message:"Informe o WhatsApp com código do país e DDD."};
  const{error}=await ctx.supabase.rpc("join_waitlist",{p_email:ctx.user.email,p_whatsapp:whatsapp,p_audience:"trainer",p_source:"onboarding"});if(error)return{message:"Não foi possível entrar na lista de espera agora."};revalidatePath("/onboarding");redirectToAuthoritativeOnboarding();
}

export async function saveOnboardingProfessional(_state:OnboardingActionState,form:FormData):Promise<OnboardingActionState>{
  const code=String(form.get("specialty_code")??"");const custom=String(form.get("custom_specialty")??"").trim();const label=code==="custom"?custom:specialties.get(code);const mode=String(form.get("service_mode")??"") as ServiceMode;const city=String(form.get("city")??"").trim();const cref=String(form.get("cref")??"").trim();
  if(!label||label.length<2||label.length>120||!modes.has(mode)||city.length>120||cref.length>60)return{message:"Revise sua especialidade e formato de atendimento."};const ctx=await context();if(!ctx)return{message:"Sua sessão expirou. Entre novamente."};const{error}=await ctx.supabase.rpc("save_my_onboarding_professional",{p_specialty_code:code,p_specialty_label:label,p_service_mode:mode,p_city:city||null,p_cref:cref||null});if(error)return{message:"Não foi possível salvar sua atuação."};redirectToAuthoritativeOnboarding();
}

export async function saveOnboardingSocial(_state:OnboardingActionState,form:FormData):Promise<OnboardingActionState>{
  const whatsapp=String(form.get("whatsapp")??"").replace(/\D/g,"");const rawInstagram=String(form.get("instagram")??"").trim();const instagram=normalizeInstagramIdentity(rawInstagram,"");const tiktok=tiktokUrl(String(form.get("tiktok")??"").trim());const youtube=youtubeUrl(String(form.get("youtube")??"").trim());
  if(whatsapp.length<10||whatsapp.length>15||(rawInstagram&&!instagram.handle)||tiktok===false||youtube===false)return{message:"Revise os canais informados."};const ctx=await context();if(!ctx)return{message:"Sua sessão expirou. Entre novamente."};const{error}=await ctx.supabase.rpc("save_my_onboarding_social",{p_whatsapp:whatsapp,p_instagram:instagram.handle,p_tiktok:tiktok,p_youtube:youtube});if(error)return{message:"Não foi possível salvar seus canais."};redirectToAuthoritativeOnboarding();
}

export async function saveOnboardingTemplate(_state:OnboardingActionState,form:FormData):Promise<OnboardingActionState>{
  const template=String(form.get("template_id")??"") as TemplateId;if(!isTemplateId(template))return{message:"Escolha um template válido."};const ctx=await context();if(!ctx)return{message:"Sua sessão expirou. Entre novamente."};const saved=await ctx.supabase.rpc("save_my_onboarding_template",{p_template:template});if(saved.error)return{message:"Não foi possível salvar o template."};const finalized=await ctx.supabase.rpc("finalize_my_onboarding");if(finalized.error)return{message:"Não foi possível gerar seu site agora."};redirectToAuthoritativeOnboarding();
}

export async function requestOnboardingPublication(_state:OnboardingActionState):Promise<OnboardingActionState>{void _state;const ctx=await context();if(!ctx)return{message:"Sua sessão expirou. Entre novamente."};const{error}=await ctx.supabase.rpc("request_my_site_publication");if(error)return{message:"Não foi possível preparar a publicação."};revalidatePath("/onboarding");redirect("/onboarding");}
