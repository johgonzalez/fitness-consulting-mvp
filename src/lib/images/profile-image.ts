import "server-only";
import sharp from "sharp";

export const PROFILE_IMAGE_MAX_SOURCE_BYTES = 5 * 1024 * 1024;
const accepted = new Set(["image/jpeg", "image/png", "image/webp"]);
const heic = new Set(["image/heic", "image/heif", "image/heic-sequence", "image/heif-sequence"]);

export class ProfileImageError extends Error {
  constructor(public readonly code: "HEIC_UNSUPPORTED" | "INVALID_IMAGE" | "IMAGE_TOO_LARGE") { super(code); }
}

export async function normalizeProfileImage(file: File) {
  if (file.size > PROFILE_IMAGE_MAX_SOURCE_BYTES) throw new ProfileImageError("IMAGE_TOO_LARGE");
  if (heic.has(file.type.toLowerCase()) || /\.hei[cf]$/i.test(file.name)) throw new ProfileImageError("HEIC_UNSUPPORTED");
  if (file.size < 1 || !accepted.has(file.type.toLowerCase())) throw new ProfileImageError("INVALID_IMAGE");
  try {
    const input = Buffer.from(await file.arrayBuffer());
    const { data, info } = await sharp(input, { failOn: "error", limitInputPixels: 25_000_000 })
      .rotate()
      .resize({ width: 1200, height: 1200, fit: "cover", position: "attention", withoutEnlargement: true })
      .webp({ quality: 82, effort: 3 })
      .toBuffer({ resolveWithObject: true });
    if (!info.width || !info.height || data.byteLength < 1) throw new Error("empty");
    return { data, contentType: "image/webp" as const, extension: "webp" as const };
  } catch (error) {
    if (error instanceof ProfileImageError) throw error;
    throw new ProfileImageError("INVALID_IMAGE");
  }
}

export function profileImageMessage(error: unknown) {
  if (error instanceof ProfileImageError && error.code === "HEIC_UNSUPPORTED") return "Fotos HEIC ainda não são compatíveis. No iPhone, escolha uma foto em JPG, PNG ou WebP.";
  if (error instanceof ProfileImageError && error.code === "IMAGE_TOO_LARGE") return "A foto deve ter até 5 MB.";
  return "Use uma foto JPG, PNG ou WebP válida.";
}
