import "server-only";
import type { LeadSettings, TrainerEntitlements, TrainerService } from "@/lib/domain/trainer";
import type { CreatedInvitation, LeadLifecycleState, ManagedLead } from "@/lib/domain/students";
import { demoWorkspaceFixture } from "@/lib/demo/fixture";
import { isDemoWorkspaceRequest } from "@/lib/demo/workspace";
import { createClient } from "@/lib/supabase/server";
import { findOwnerProfile } from "@/lib/supabase/trainers";

type MatchRow = { id:string;lead_id:string;trainer_id:string;score:number;status:ManagedLead["status"];reserved_until:string;created_at:string };
type LeadRow = { id:string;first_name:string;whatsapp:string;email:string|null;goal:string;service_mode:string;city:string|null;state:string|null;budget_band:string;start_timing:string };
const stateOf=(row:MatchRow):LeadLifecycleState => row.status === "new" || row.status === "pending" ? (new Date(row.reserved_until).getTime() <= Date.now() ? "expired" : row.status) : row.status;

export async function getLeadsWorkspace(){
  if(await isDemoWorkspaceRequest())return demoWorkspaceFixture.leads;
  const profile=await findOwnerProfile(); if(!profile)return null;
  const supabase=await createClient();
  const [entitlements,settings,services,matches]=await Promise.all([
    supabase.from("trainer_entitlements").select("trainer_id,can_build_site,can_preview_site,can_use_template_01,can_use_template_02,can_use_free_template,can_use_premium_templates,can_publish_site,can_receive_leads,can_use_matching").eq("trainer_id",profile.id).single(),
    supabase.from("trainer_lead_settings").select("trainer_id,objectives,service_mode,city,state,service_ids,accepting_new_clients").eq("trainer_id",profile.id).maybeSingle(),
    supabase.rpc("get_my_services"),
    supabase.from("lead_matches").select("id,lead_id,trainer_id,score,status,reserved_until,created_at").eq("trainer_id",profile.id).order("created_at",{ascending:false}),
  ]);
  if(entitlements.error||services.error||matches.error)throw new Error("Unable to load leads workspace.");
  const rows=(matches.data??[]) as MatchRow[]; const ids=rows.map(x=>x.lead_id);
  let leads:LeadRow[]=[]; if(ids.length){const result=await supabase.from("student_leads").select("id,first_name,whatsapp,email,goal,service_mode,city,state,budget_band,start_timing").in("id",ids);if(result.error)throw new Error("Unable to load assigned leads.");leads=(result.data??[]) as LeadRow[]}
  const byId=new Map(leads.map(x=>[x.id,x]));
  const managed=rows.flatMap(row=>{const lead=byId.get(row.lead_id);return lead?[{id:row.id,leadId:row.lead_id,trainerId:row.trainer_id,score:row.score,status:row.status,state:stateOf(row),reservedUntil:row.reserved_until,createdAt:row.created_at,lead:{firstName:lead.first_name,whatsapp:lead.whatsapp,email:lead.email,goal:lead.goal,serviceMode:lead.service_mode,city:lead.city,state:lead.state,budgetBand:lead.budget_band,startTiming:lead.start_timing}} satisfies ManagedLead]:[]});
  return {profile,entitlements:entitlements.data as TrainerEntitlements,settings:settings.data as LeadSettings|null,services:(services.data??[]) as TrainerService[],matches:managed};
}

export async function getLead(matchId:string){const data=await getLeadsWorkspace();return data?.matches.find(x=>x.id===matchId)??null}
export async function rejectLead(matchId:string){if(await isDemoWorkspaceRequest())throw new Error("demo_workspace_read_only");const supabase=await createClient();const{error}=await supabase.rpc("reject_my_lead",{p_match_id:matchId});if(error)throw error}
export async function convertLead(matchId:string){if(await isDemoWorkspaceRequest())throw new Error("demo_workspace_read_only");const supabase=await createClient();const{data,error}=await supabase.rpc("convert_my_lead",{p_match_id:matchId});if(error||!data)throw error??new Error("Conversion failed");const value=data as {invitation_id:string;token:string;expires_at:string;conversion_id:string};return{invitationId:value.invitation_id,token:value.token,expiresAt:value.expires_at,conversionId:value.conversion_id} satisfies CreatedInvitation}
