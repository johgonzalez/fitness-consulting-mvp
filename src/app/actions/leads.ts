"use server";
import { revalidatePath } from "next/cache";
import { leadsConfig } from "@/config/site";
import { isDemoModeAvailable } from "@/lib/demo/config";
import { rejectDemoMutation } from "@/lib/demo/workspace";
import type { LeadGoal, LeadStatus, ServiceMode } from "@/lib/domain/trainer";
import { createClient } from "@/lib/supabase/server";
import { getVisitorHash } from "@/lib/visitor";

export type PublicMatch={slug:string;name:string;headline:string;specialty:string;city:string|null;service_mode:ServiceMode;photo_url:string|null;score:number;whatsapp_available:boolean};
export type LeadActionState={ok?:boolean;message?:string;matches?:PublicMatch[]};
const goals=new Set<string>(leadsConfig.goals.map(x=>x.value)); const bands=new Map<string,(typeof leadsConfig.budgetBands)[number]>(leadsConfig.budgetBands.map(x=>[x.value,x])); const timings=new Set<string>(leadsConfig.timings.map(x=>x.value));
export async function createLead(_state:LeadActionState,form:FormData):Promise<LeadActionState>{
  if(isDemoModeAvailable())return{message:"Workspace demo é somente leitura. Nenhuma solicitação foi enviada."};
  if(String(form.get("company")??"")) return {ok:true,matches:[]};
  const first=String(form.get("first_name")??"").trim(), whatsapp=String(form.get("whatsapp")??"").replace(/\D/g,""), email=String(form.get("email")??"").trim().toLowerCase();
  const goal=String(form.get("goal")??"") as LeadGoal, mode=String(form.get("service_mode")??"") as ServiceMode, city=String(form.get("city")??"").trim(), state=String(form.get("state")??"").trim().toUpperCase(), band=bands.get(String(form.get("budget_band")??"")), timing=String(form.get("start_timing")??"");
  if(first.length<2||first.length>60||whatsapp.length<10||whatsapp.length>15||(email&&!/^\S+@\S+\.\S+$/.test(email))||!goals.has(goal)||!(["online","presencial","both"] as string[]).includes(mode)||!band||!timings.has(timing)||(mode!=="online"&&(city.length<2||!/^[A-Z]{2}$/.test(state)))||form.get("consent")!=="on") return {message:"Revise os dados e confirme o consentimento para continuar."};
  const supabase=await createClient(); const hash=await getVisitorHash();
  const {data,error}=await supabase.rpc("create_student_lead_and_match",{p_first_name:first,p_whatsapp:whatsapp,p_email:email||null,p_goal:goal,p_service_mode:mode,p_city:city||null,p_state:state||null,p_budget_band:band.value,p_budget_min:band.min,p_budget_max:band.max,p_start_timing:timing,p_consent:true,p_session_hash:hash});
  if(error?.message.includes("rate_limited")||error?.message.includes("duplicate_submission")) return {message:"Você já enviou uma solicitação recentemente. Aguarde alguns minutos."};
  if(error) return {message:"Não foi possível buscar profissionais agora. Tente novamente."};
  return {ok:true,matches:((data as {matches?:PublicMatch[]})?.matches??[])};
}
export async function configureLeads(_state:LeadActionState,form:FormData):Promise<LeadActionState>{
 const demo=await rejectDemoMutation();if(demo)return demo;
 const supabase=await createClient(); const {data:user}=await supabase.auth.getUser(); if(!user.user)return{message:"Sua sessão expirou."};
 const objectives=form.getAll("objectives").map(String), service_ids=form.getAll("service_ids").map(String), mode=String(form.get("service_mode")) as ServiceMode;
 const {error}=await supabase.rpc("configure_my_leads_beta",{p_objectives:objectives,p_service_mode:mode,p_city:String(form.get("city")??""),p_state:String(form.get("state")??""),p_service_ids:service_ids,p_accepting:form.get("accepting")==="on"});
 if(error?.message.includes("entitlement"))return{message:"Seu acesso ao Leads Beta ainda não foi liberado."}; if(error)return{message:"Revise a configuração e selecione ao menos um serviço ativo com preço."}; revalidatePath("/dashboard/leads"); return{ok:true,message:"Participação no Leads Beta atualizada."};
}
export async function setLeadStatus(matchId:string,status:LeadStatus){ if(await rejectDemoMutation())return;const supabase=await createClient(); const {data:user}=await supabase.auth.getUser(); if(!user.user)return; await supabase.rpc("set_my_lead_match_status",{p_match_id:matchId,p_status:status}); revalidatePath("/dashboard/leads"); revalidatePath(`/dashboard/leads/${matchId}`); }
