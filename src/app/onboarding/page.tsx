import Link from "next/link";
import { OnboardingForm, type OnboardingDraft } from "@/components/onboarding/OnboardingForm";
import { requireUser } from "@/lib/auth/user";
import { findOwnerEntitlements, findOwnerProfile } from "@/lib/supabase/trainers";
import { getStudentsWorkspace } from "@/lib/supabase/students";
import { createClient } from "@/lib/supabase/server";
import { mergeEmptyOnboardingIdentity, profilePrefillFromAuthMetadata } from "@/lib/auth/profile-prefill";

type BillingSummary={billing_state?:"FREE"|"ACTIVE"|"GRACE"|"SUSPENDED";product_code?:string};
type AccessState={founder_access_active?:boolean;waitlist_joined?:boolean;waitlist_email?:string|null;waitlist_whatsapp?:string|null};
type OnboardingSearchParams={updated?:string};
export default async function OnboardingPage({searchParams}:{searchParams:Promise<OnboardingSearchParams>}){
  const query=await searchParams;
  const user=await requireUser();const profile=await findOwnerProfile();const supabase=await createClient();const draftResult=await supabase.rpc("get_my_onboarding_draft");const storedDraft=(draftResult.data as OnboardingDraft|null)??null;const draft=mergeEmptyOnboardingIdentity(storedDraft,profilePrefillFromAuthMetadata("user_metadata" in user?user.user_metadata:null));let billing:BillingSummary|null=null;let accessState:AccessState|null=null;let canPublish=false;let studentActivation:"none"|"pending"|"active"="none";
  if(profile){const[{data},access,entitlements,students]=await Promise.all([supabase.rpc("get_my_billing_summary"),supabase.rpc("get_my_access_state"),findOwnerEntitlements(),getStudentsWorkspace().catch(()=>null)]);billing=data as BillingSummary|null;accessState=access.data as AccessState|null;canPublish=entitlements?.can_publish_site===true;if(students?.students.some(student=>student.status==="active"))studentActivation="active";else if(students?.invitations.some(invitation=>invitation.status==="pending"))studentActivation="pending";}
  const origin=process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/,"")??"";
  return <main className="onboarding-page"><section className="onboarding-panel"><Link href="/" className="saas-brand">PPerfil</Link><OnboardingForm key={query.updated??"current"} draft={draft} profile={profile} billing={billing} accessState={accessState} accountEmail={user.email??""} canPublish={canPublish} studentActivation={studentActivation} publicUrl={profile?`${origin}/p/${profile.slug}`:null}/></section></main>;
}
