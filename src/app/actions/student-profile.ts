"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type StudentProfileState = { ok?: boolean; message?: string };
const mimeExtension: Record<string, "jpg" | "png" | "webp"> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

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
    const extension = mimeExtension[image.type];
    if (!extension || image.size > 5 * 1024 * 1024) return { message: "Use JPG, PNG ou WebP com até 5 MB." };
    imagePath = `${auth.user.id}/profile/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from("student-private-media").upload(imagePath, image, { contentType: image.type, upsert: false });
    if (uploadError) return { message: "Não foi possível enviar a imagem agora." };
  }
  const { error } = await supabase.rpc("update_my_student_profile", { p_preferred_name: preferredName || null, p_whatsapp: whatsapp || null, p_profile_image_path: imagePath });
  if (error) return { message: "Não foi possível salvar o perfil. Revise os dados." };
  revalidatePath("/student/profile");
  revalidatePath("/student/today");
  return { ok: true, message: "Perfil atualizado." };
}
