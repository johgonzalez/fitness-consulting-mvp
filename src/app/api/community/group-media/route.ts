import { NextResponse } from "next/server";
import { hardenCommunityImage } from "@/lib/community/image";
import { getCommunityGroup } from "@/lib/supabase/community";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fail = (message: string, status: number) => NextResponse.json({ ok: false, message }, { status });

export async function POST(request: Request) {
  const requestOrigin = request.headers.get("origin");
  if (requestOrigin && requestOrigin !== new URL(request.url).origin) return fail("Origem não autorizada.", 403);
  const supabase = await createClient(); const { data: auth, error } = await supabase.auth.getUser();
  if (error || !auth.user) return fail("Sua sessão expirou. Entre novamente.", 401);
  let form: FormData; try { form = await request.formData(); } catch { return fail("Envio inválido.", 400); }
  const groupId = String(form.get("groupId") ?? ""), kind = String(form.get("kind") ?? ""), file = form.get("image");
  if (!UUID.test(groupId) || !["avatar", "cover"].includes(kind) || !(file instanceof File)) return fail("Revise a imagem.", 400);
  try {
    const group = await getCommunityGroup(groupId); if (group.membershipRole !== "OWNER") return fail("Somente o dono pode alterar a imagem do grupo.", 403);
    const image = await hardenCommunityImage(file, kind === "avatar" ? 768 : 2048);
    const storagePath = `${groupId}/${auth.user.id}/group/${kind}-${crypto.randomUUID()}.webp`;
    const { error: uploadError } = await supabase.storage.from("community-post-media").upload(storagePath, image.data, { contentType: image.mimeType, cacheControl: "3600", upsert: false });
    if (uploadError) throw uploadError;
    const { data: signed } = await supabase.storage.from("community-post-media").createSignedUrl(storagePath, 3600);
    return NextResponse.json({ ok: true, path: storagePath, signedUrl: signed?.signedUrl ?? null, message: "Imagem preparada." });
  } catch (cause) { const message = cause instanceof Error ? cause.message : ""; return fail(message.startsWith("INVALID_") ? "Use uma imagem JPG, PNG ou WebP válida." : "Não foi possível preparar a imagem.", 400); }
}
