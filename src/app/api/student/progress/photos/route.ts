import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_MULTIPART_SIZE = MAX_FILE_SIZE + 128 * 1024;
const PHOTO_VIEWS = new Set(["FRONT", "SIDE", "BACK"]);

type DetectedImage = {
  extension: "jpg" | "png" | "webp";
  mimeType: "image/jpeg" | "image/png" | "image/webp";
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ ok: false, message }, { status });
}

function detectImage(bytes: Uint8Array): DetectedImage | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { extension: "jpg", mimeType: "image/jpeg" };
  }
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return { extension: "png", mimeType: "image/png" };
  }
  if (
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF"
    && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    return { extension: "webp", mimeType: "image/webp" };
  }
  return null;
}

function extensionMatches(fileName: string, detected: DetectedImage): boolean {
  const extension = fileName.split(".").at(-1)?.toLocaleLowerCase("en-US") ?? "";
  if (detected.extension === "jpg") return extension === "jpg" || extension === "jpeg";
  return extension === detected.extension;
}

function requestIsSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return origin === null || origin === new URL(request.url).origin;
}

export async function POST(request: Request) {
  if (!requestIsSameOrigin(request)) return jsonError("Origem da solicitação não autorizada.", 403);

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (!Number.isFinite(contentLength) || contentLength <= 0 || contentLength > MAX_MULTIPART_SIZE) {
    return jsonError("A foto deve ter no máximo 10 MB.", 413);
  }

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return jsonError("Sua sessão expirou. Entre novamente.", 401);

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonError("Não foi possível interpretar o envio.", 400);
  }

  const viewType = String(formData.get("viewType") ?? "").toLocaleUpperCase("en-US");
  const file = formData.get("image");
  if (!PHOTO_VIEWS.has(viewType)) return jsonError("Escolha Frente, Lateral ou Costas.", 400);
  if (!(file instanceof File) || file.size < 1 || file.size > MAX_FILE_SIZE) {
    return jsonError("Envie uma foto JPG, PNG ou WebP de até 10 MB.", 400);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const detected = detectImage(bytes);
  if (!detected || file.type !== detected.mimeType || !extensionMatches(file.name, detected)) {
    return jsonError("O conteúdo, o formato e a extensão da foto devem corresponder a JPG, PNG ou WebP.", 400);
  }

  const { data: student, error: studentError } = await supabase
    .from("student_profiles")
    .select("id")
    .eq("user_id", authData.user.id)
    .maybeSingle();
  if (studentError || !student?.id) return jsonError("Perfil de aluno não autorizado para este envio.", 403);

  const { data: relationship, error: relationshipError } = await supabase
    .from("trainer_student_relationships")
    .select("id")
    .eq("student_profile_id", student.id)
    .eq("status", "active")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (relationshipError || !relationship?.id) {
    return jsonError("É necessário um acompanhamento ativo para enviar fotos de progresso.", 403);
  }

  const storagePath = `${authData.user.id}/${student.id}/progress/${viewType}/${crypto.randomUUID()}.${detected.extension}`;
  const { error: uploadError } = await supabase.storage
    .from("student-private-media")
    .upload(storagePath, bytes, {
      contentType: detected.mimeType,
      cacheControl: "3600",
      upsert: false,
    });
  if (uploadError) return jsonError("Não foi possível enviar a foto privada. Tente novamente.", 500);

  const { data: mediaId, error: metadataError } = await supabase.rpc("create_progress_photo", {
    p_storage_path: storagePath,
    p_view_type: viewType,
    p_mime_type: detected.mimeType,
    p_file_size: file.size,
    p_consent_version: "progress-photo-v1",
  });

  if (metadataError || !mediaId) {
    await supabase.storage.from("student-private-media").remove([storagePath]);
    return jsonError("A foto não pôde ser registrada com segurança. Tente novamente.", 500);
  }

  return NextResponse.json({
    ok: true,
    mediaId,
    message: "Foto privada adicionada ao seu progresso.",
  }, { status: 201 });
}
