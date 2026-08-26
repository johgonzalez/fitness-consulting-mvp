import Link from "next/link";
import { OnboardingForm, type OnboardingDraft } from "@/components/onboarding/OnboardingForm";
import { requireUser } from "@/lib/auth/user";
import { findOwnerEntitlements, findOwnerProfile } from "@/lib/supabase/trainers";
import { getStudentsWorkspace } from "@/lib/supabase/students";
import { createClient } from "@/lib/supabase/server";

type BillingSummary={billing_state?:"FREE"|"ACTIVE"|"GRACE"|"SUSPENDED";product_code?:string};
type OnboardingSearchParams={checkout?:string;updated?:string};
export default async function OnboardingPage({searchParams}:{searchParams:Promise<OnboardingSearchParams>}){
  const query=await searchParams;
  await requireUser();const profile=await findOwnerProfile();let draft:OnboardingDraft|null=null;let billing:BillingSummary|null=null;let canPublish=false;let hasStudentActivity=false;
  if(!profile){const supabase=await createClient();const{data}=await supabase.rpc("get_my_onboarding_draft");draft=data as OnboardingDraft|null;}else{const supabase=await createClient();const[{data},entitlements,students]=await Promise.all([supabase.rpc("get_my_billing_summary"),findOwnerEntitlements(),getStudentsWorkspace().catch(()=>null)]);billing=data as BillingSummary|null;canPublish=entitlements?.can_publish_site===true;hasStudentActivity=Boolean(students&&(students.students.length||students.invitations.length));}
  const origin=process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/,"")??"";
  return <main className="onboarding-page"><section className="onboarding-panel"><Link href="/" className="saas-brand">PPerfil</Link><OnboardingForm key={query.updated??"current"} draft={draft} profile={profile} billing={billing} canPublish={canPublish} hasStudentActivity={hasStudentActivity} publicUrl={profile?`${origin}/p/${profile.slug}`:null} checkoutReturned={query.checkout==="returned"}/></section></main>;
}
