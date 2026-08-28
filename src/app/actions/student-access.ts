"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type StudentWaitlistState = { message?: string; tone?: "success" | "danger" };

export async function joinStudentWaitlist(_state: StudentWaitlistState, formData: FormData): Promise<StudentWaitlistState> {
  const whatsapp = String(formData.get("whatsapp") ?? "").trim();
  const digits = whatsapp.replace(/\D/g, "");
  if (!/^[1-9][0-9]{7,14}$/.test(digits)) return { message: "Informe o WhatsApp com código do país e DDD.", tone: "danger" };

  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user?.email) return { message: "Sua sessão expirou. Entre novamente.", tone: "danger" };
  const { error } = await supabase.rpc("join_my_student_waitlist", { p_whatsapp: whatsapp });
  if (error) return { message: "Não foi possível registrar seu interesse agora.", tone: "danger" };

  revalidatePath("/access/student");
  redirect("/access/student?status=waitlisted");
}
