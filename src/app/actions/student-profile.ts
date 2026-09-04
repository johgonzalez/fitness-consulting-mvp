"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { normalizeProfileImage, profileImageMessage } from "@/lib/images/profile-image";

export type StudentProfileState = { ok?: boolean; message?: string };

export async function updateStudentProfileAction(_state: StudentProfileState, formData: FormData): Promise<StudentProfileState> {
  const preferredName = String(formData.get("preferred_name") ?? "").trim();
  const whatsapp = String(formData.get("whatsapp") ?? "").trim();
  if (preferredName.length > 120) return { message: "O nome deve ter até 120 caracteres." };
  if (whatsapp && (!whatsapp.startsWith("+") || !/^\+[0-9 ()-]{8,20}$/.test(whatsapp))) return { message: "Use o formato internacional, começando com + e o código do país." };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { message: "Entre novamente para atualizar seu perfil." };
  const { data: current, error: currentError } = await supabase.from("student_profiles").select("profile_image_path").eq("user_id", auth.user.id).maybeSingle();
  if (currentError) return { message: "Não foi possível carregar seu perfil." };
  let imagePath = current?.profile_image_path ?? null;
  const image = formData.get("profile_image");
  if (image instanceof File && image.size > 0) {
    let normalized;
    try { normalized = await normalizeProfileImage(image); } catch (error) { return { message: profileImageMessage(error) }; }
    imagePath = `${auth.user.id}/profile/${crypto.randomUUID()}.${normalized.extension}`;
    const { error: uploadError } = await supabase.storage.from("student-private-media").upload(imagePath, normalized.data, { contentType: normalized.contentType, upsert: false, cacheControl: "3600" });
    if (uploadError) return { message: "Não foi possível enviar a imagem agora." };
  }
  const { error } = await supabase.rpc("update_my_student_profile", { p_preferred_name: preferredName || null, p_whatsapp: whatsapp || null, p_profile_image_path: imagePath });
  if (error) { if (imagePath && imagePath !== current?.profile_image_path) await supabase.storage.from("student-private-media").remove([imagePath]); return { message: "Não foi possível salvar o perfil. Revise os dados." }; }
  if (current?.profile_image_path && imagePath !== current.profile_image_path) await supabase.storage.from("student-private-media").remove([current.profile_image_path]);
  revalidatePath("/student/profile");
  revalidatePath("/student/today");
  revalidatePath("/student", "layout");
  revalidatePath("/student/community");
  revalidatePath("/dashboard/community");
  return { ok: true, message: "Perfil atualizado." };
}
