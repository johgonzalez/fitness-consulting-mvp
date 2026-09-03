import { NextResponse } from "next/server";
import { createCommunityAdminClient } from "@/lib/community/admin";
import { COMMUNITY_PHOTO_POSTING_ENABLED } from "@/lib/community/features";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
const MAX_FILE_SIZE = 8 * 1024 * 1024;
const MAX_FILES = 4;
const MAX_MULTIPART_SIZE = MAX_FILES * MAX_FILE_SIZE + 1024 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type DetectedImage = { extension: "jpg" | "png" | "webp"; mimeType: "image/jpeg" | "image/png" | "image/webp" };
const jsonError = (message: string, status: number) => NextResponse.json({ ok: false, message }, { status });
function detectImage(bytes: Uint8Array): DetectedImage | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { extension: "jpg", mimeType: "image/jpeg" };
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return { extension: "png", mimeType: "image/png" };
  if (String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return { extension: "webp", mimeType: "image/webp" };
  return null;
}
function extensionMatches(name: string, detected: DetectedImage) {
  const extension = name.split(".").at(-1)?.toLowerCase(); return detected.extension === "jpg" ? extension === "jpg" || extension === "jpeg" : extension === detected.extension;
}
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return jsonError("Origem não autorizada.", 403);
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (!Number.isFinite(contentLength) || contentLength < 1 || contentLength > MAX_MULTIPART_SIZE) return jsonError("Envie até 4 imagens de 8 MB cada.", 413);
  const supabase = await createClient(); const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return jsonError("Sua sessão expirou. Entre novamente.", 401);
  if (!COMMUNITY_PHOTO_POSTING_ENABLED) return jsonError("Publicação de fotos ainda não está disponível.", 403);
  let form: FormData; try { form = await request.formData(); } catch { return jsonError("Não foi possível interpretar o envio.", 400); }
  const communityId = String(form.get("communityId") ?? ""), body = String(form.get("body") ?? "").trim(), files = form.getAll("images");
  if (!UUID.test(communityId) || body.length > 2000 || files.length < 1 || files.length > MAX_FILES || files.some((file) => !(file instanceof File))) return jsonError("Revise a publicação e as imagens.", 400);
  const { data: available, error: accessError } = await supabase.rpc("get_my_communities");
  const membership = Array.isArray(available) ? available.find((item) => item && typeof item === "object" && "id" in item && item.id === communityId) as { role?: string } | undefined : undefined;
  if (accessError || !membership) return jsonError("Você não tem acesso a esta Comunidade.", 403);
  const admin = createCommunityAdminClient(), postId = crypto.randomUUID(), uploaded: string[] = [], metadata: Array<Record<string, unknown>> = [];
  try {
    for (const [index, entry] of files.entries()) {
      const file = entry as File;
      if (file.size < 1 || file.size > MAX_FILE_SIZE) throw new Error("INVALID_SIZE");
      const bytes = new Uint8Array(await file.arrayBuffer()), detected = detectImage(bytes);
      if (!detected || file.type !== detected.mimeType || !extensionMatches(file.name, detected)) throw new Error("INVALID_SIGNATURE");
      const storagePath = `${communityId}/${auth.user.id}/${postId}/${crypto.randomUUID()}.${detected.extension}`;
      const { error } = await admin.storage.from("community-post-media").upload(storagePath, bytes, { contentType: detected.mimeType, cacheControl: "3600", upsert: false });
      if (error) throw error;
      uploaded.push(storagePath); metadata.push({ storage_path: storagePath, mime_type: detected.mimeType, file_size: file.size, sort_order: index });
    }
    const { error } = await admin.rpc("create_community_photo_post_as", { p_actor_user_id: auth.user.id, p_community_id: communityId, p_post_id: postId, p_body: body || null, p_media: metadata });
    if (error) throw error;
    return NextResponse.json({ ok: true, id: postId, message: "Fotos publicadas na Comunidade." }, { status: 201 });
  } catch (error) {
    if (uploaded.length) await admin.storage.from("community-post-media").remove(uploaded);
    const code = error instanceof Error ? error.message : "";
    return jsonError(code.includes("SIZE") || code.includes("SIGNATURE") ? "Envie imagens JPG, PNG ou WebP válidas de até 8 MB." : "Não foi possível publicar as fotos.", 400);
  }
}
