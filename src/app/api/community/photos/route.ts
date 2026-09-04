import { NextResponse } from "next/server";
import { COMMUNITY_PHOTO_POSTING_ENABLED } from "@/lib/community/features";
import { COMMUNITY_IMAGE_MAX_SOURCE_BYTES, hardenCommunityImage } from "@/lib/community/image";
import { getCommunityPost } from "@/lib/supabase/community";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
const MAX_FILES = 4;
const MAX_MULTIPART_BYTES = MAX_FILES * COMMUNITY_IMAGE_MAX_SOURCE_BYTES + 1024 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function fail(message: string, status: number) { return NextResponse.json({ ok: false, message }, { status }); }
function safeLength(request: Request) { const raw = request.headers.get("content-length"); if (!raw) return null; const value = Number(raw); return Number.isSafeInteger(value) ? value : null; }

export async function POST(request: Request) {
  const requestOrigin = request.headers.get("origin");
  if (requestOrigin && requestOrigin !== new URL(request.url).origin) return fail("Origem não autorizada.", 403);
  const contentLength = safeLength(request);
  if (contentLength !== null && (contentLength < 1 || contentLength > MAX_MULTIPART_BYTES)) return fail("Envie até 4 imagens de 12 MB cada.", 413);
  if (!COMMUNITY_PHOTO_POSTING_ENABLED) return fail("Publicação de fotos ainda não está disponível.", 403);

  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return fail("Sua sessão expirou. Entre novamente.", 401);

  let form: FormData;
  try { form = await request.formData(); } catch { return fail("Não foi possível interpretar o envio.", 400); }
  const groupId = String(form.get("groupId") ?? "");
  const clientMutationId = String(form.get("clientMutationId") ?? "");
  const body = String(form.get("body") ?? "").trim();
  const files = form.getAll("images");
  if (!UUID.test(groupId) || !UUID.test(clientMutationId) || body.length > 2000 || files.length < 1 || files.length > MAX_FILES || files.some((item) => !(item instanceof File))) return fail("Revise a publicação e as imagens.", 400);

  const postId = crypto.randomUUID();
  const uploaded: string[] = [];
  const media: Array<{ storage_path: string; mime_type: "image/webp"; file_size: number; sort_order: number; width: number; height: number }> = [];
  try {
    for (const [index, item] of files.entries()) {
      if (request.signal.aborted) throw new Error("UPLOAD_ABORTED");
      const file = item as File;
      const image = await hardenCommunityImage(file);
      const storagePath = `${groupId}/${auth.user.id}/${postId}/${crypto.randomUUID()}.webp`;
      const { error: uploadError } = await supabase.storage.from("community-post-media").upload(storagePath, image.data, { contentType: image.mimeType, cacheControl: "3600", upsert: false });
      if (uploadError) throw uploadError;
      uploaded.push(storagePath);
      media.push({ storage_path: storagePath, mime_type: image.mimeType, file_size: image.size, sort_order: index, width: image.width, height: image.height });
    }
    if (request.signal.aborted) throw new Error("UPLOAD_ABORTED");
    const { data: createdId, error: createError } = await supabase.rpc("create_community_photo_post_v1", { p_group_id: groupId, p_post_id: postId, p_body: body || null, p_media: media, p_client_mutation_id: clientMutationId });
    if (createError) throw createError;
    const actualId = String(createdId ?? postId);
    const post = await getCommunityPost(actualId, groupId);
    return NextResponse.json({ ok: true, id: actualId, post, message: "Fotos publicadas na Comunidade." }, { status: 201 });
  } catch (error) {
    if (uploaded.length) await supabase.storage.from("community-post-media").remove(uploaded);
    const message = error instanceof Error ? error.message : "";
    if (/INVALID_(IMAGE|DIMENSIONS|OUTPUT)/.test(message)) return fail("Use imagens JPG, PNG ou WebP válidas. Elas serão otimizadas para publicação.", 400);
    if (message.includes("rate_limited")) return fail("Muitas publicações em pouco tempo. Aguarde um instante.", 429);
    if (message.includes("denied") || message.includes("access")) return fail("Você não tem permissão para publicar neste grupo.", 403);
    return fail("Não foi possível publicar as imagens. Tente novamente.", 400);
  }
}
