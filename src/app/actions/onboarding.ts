"use server";

import { redirect } from "next/navigation";
import { rejectDemoMutation } from "@/lib/demo/workspace";
import { createClient } from "@/lib/supabase/server";
import { type OnboardingState, validateOnboarding } from "@/lib/validation/onboarding";

export async function completeOnboarding(_state: OnboardingState, formData: FormData): Promise<OnboardingState> {
  const demo = await rejectDemoMutation();
  if (demo) return demo;
  const validation = validateOnboarding(formData);
  if (!validation.success || !validation.data) return { errors: validation.errors, message: "Revise os campos indicados." };

  let supabase;
  try { supabase = await createClient(); } catch { return { message: "Supabase ainda não está configurado neste ambiente." }; }
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return { message: "Sua sessão expirou. Entre novamente." };

  const values = validation.data;
  const { error } = await supabase.rpc("create_trainer_profile", {
    p_display_name: values.displayName,
    p_professional_name: values.professionalName,
    p_specialty: values.specialty,
    p_whatsapp: values.whatsapp,
    p_instagram: values.instagram,
    p_cref: values.cref,
    p_city: values.city,
    p_service_mode: values.serviceMode,
    p_slug_base: values.slugBase,
  });
  if (error) return { message: "Não foi possível concluir seu perfil. Tente novamente." };
  redirect("/dashboard");
}
