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

export async function saveOnboardingIdentity(_state:OnboardingActionState,form:FormData):Promise<OnboardingActionState>{
  const demo=await rejectDemoMutation();if(demo)return demo;const displayName=String(form.get("display_name")??"").trim();const professionalName=String(form.get("professional_name")??"").trim();
  if(displayName.length<2||displayName.length>100||professionalName.length>100)return{message:"Revise seu nome profissional."};const ctx=await context();if(!ctx)return{message:"Sua sessão expirou. Entre novamente."};let profileImageUrl:string|null=null;
  const identity=await ctx.supabase.rpc("ensure_my_app_user",{p_display_name:displayName,p_locale:null,p_timezone:null,p_country_code:null});if(identity.error)return{message:"Não foi possível preparar sua conta."};
  const file=form.get("image");if(file instanceof File&&file.size>0){if(file.size>5*1024*1024)return{message:"A foto deve ter até 5 MB."};const bytes=new Uint8Array(await file.arrayBuffer());const detected=imageType(bytes);if(!detected)return{message:"Envie uma foto JPG, PNG ou WebP."};const path=`${ctx.user.id}/onboarding/profile/${crypto.randomUUID()}.${detected.ext}`;const upload=await ctx.supabase.storage.from("trainer-public-media").upload(path,bytes,{contentType:detected.type,cacheControl:"31536000"});if(upload.error)return{message:"Não foi possível enviar sua foto."};profileImageUrl=ctx.supabase.storage.from("trainer-public-media").getPublicUrl(path).data.publicUrl;}
  const{error}=await ctx.supabase.rpc("save_my_onboarding_identity",{p_display_name:displayName,p_professional_name:professionalName||null,p_profile_image_url:profileImageUrl});if(error)return{message:"Não foi possível salvar sua identidade."};redirect("/onboarding");
}

export async function saveOnboardingProfessional(_state:OnboardingActionState,form:FormData):Promise<OnboardingActionState>{
  const code=String(form.get("specialty_code")??"");const custom=String(form.get("custom_specialty")??"").trim();const label=code==="custom"?custom:specialties.get(code);const mode=String(form.get("service_mode")??"") as ServiceMode;const city=String(form.get("city")??"").trim();const cref=String(form.get("cref")??"").trim();
  if(!label||label.length<2||label.length>120||!modes.has(mode)||city.length>120||cref.length>60)return{message:"Revise sua especialidade e formato de atendimento."};const ctx=await context();if(!ctx)return{message:"Sua sessão expirou. Entre novamente."};const{error}=await ctx.supabase.rpc("save_my_onboarding_professional",{p_specialty_code:code,p_specialty_label:label,p_service_mode:mode,p_city:city||null,p_cref:cref||null});if(error)return{message:"Não foi possível salvar sua atuação."};redirect("/onboarding");
}

export async function saveOnboardingSocial(_state:OnboardingActionState,form:FormData):Promise<OnboardingActionState>{
  const whatsapp=String(form.get("whatsapp")??"").replace(/\D/g,"");const rawInstagram=String(form.get("instagram")??"").trim();const instagram=normalizeInstagramIdentity(rawInstagram,"");const tiktok=tiktokUrl(String(form.get("tiktok")??"").trim());const youtube=youtubeUrl(String(form.get("youtube")??"").trim());
  if(whatsapp.length<10||whatsapp.length>15||(rawInstagram&&!instagram.handle)||tiktok===false||youtube===false)return{message:"Revise os canais informados."};const ctx=await context();if(!ctx)return{message:"Sua sessão expirou. Entre novamente."};const{error}=await ctx.supabase.rpc("save_my_onboarding_social",{p_whatsapp:whatsapp,p_instagram:instagram.handle,p_tiktok:tiktok,p_youtube:youtube});if(error)return{message:"Não foi possível salvar seus canais."};redirect("/onboarding");
}

export async function saveOnboardingTemplate(_state:OnboardingActionState,form:FormData):Promise<OnboardingActionState>{
  const template=String(form.get("template_id")??"") as TemplateId;if(!isTemplateId(template))return{message:"Escolha um template válido."};const ctx=await context();if(!ctx)return{message:"Sua sessão expirou. Entre novamente."};const saved=await ctx.supabase.rpc("save_my_onboarding_template",{p_template:template});if(saved.error)return{message:"Não foi possível salvar o template."};const finalized=await ctx.supabase.rpc("finalize_my_onboarding");if(finalized.error)return{message:"Não foi possível gerar seu site agora."};redirect("/onboarding");
}

export async function requestOnboardingPublication(_state:OnboardingActionState):Promise<OnboardingActionState>{void _state;const ctx=await context();if(!ctx)return{message:"Sua sessão expirou. Entre novamente."};const{error}=await ctx.supabase.rpc("request_my_site_publication");if(error)return{message:"Não foi possível preparar a publicação."};revalidatePath("/onboarding");redirect("/onboarding");}
