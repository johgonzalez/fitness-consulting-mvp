import Link from "next/link";
import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/onboarding/OnboardingForm";
import { requireUser } from "@/lib/auth/user";
import { findOwnerProfile } from "@/lib/supabase/trainers";

export default async function OnboardingPage() {
  await requireUser();
  if (await findOwnerProfile()) redirect("/dashboard");
  return <main className="onboarding-page"><section className="onboarding-panel"><Link href="/" className="saas-brand">PPerfil</Link><OnboardingForm /></section></main>;
}
