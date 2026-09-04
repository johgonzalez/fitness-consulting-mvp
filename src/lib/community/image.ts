import "server-only";
import sharp from "sharp";

export const COMMUNITY_IMAGE_MAX_SOURCE_BYTES = 12 * 1024 * 1024;
export const COMMUNITY_IMAGE_MAX_OUTPUT_BYTES = 4 * 1024 * 1024;
export const COMMUNITY_IMAGE_MAX_EDGE = 1600;
const COMMUNITY_IMAGE_MAX_SOURCE_PIXELS = 40_000_000;
const accepted = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function hardenCommunityImage(file: File, maxEdge = COMMUNITY_IMAGE_MAX_EDGE) {
  if (file.size < 1 || file.size > COMMUNITY_IMAGE_MAX_SOURCE_BYTES || !accepted.has(file.type)) throw new Error("INVALID_IMAGE");
  const source = Buffer.from(await file.arrayBuffer());
  const pipeline = sharp(source, { failOn: "error", limitInputPixels: COMMUNITY_IMAGE_MAX_SOURCE_PIXELS });
  const metadata = await pipeline.metadata();
  if (!metadata.width || !metadata.height || metadata.width > 12000 || metadata.height > 12000) throw new Error("INVALID_DIMENSIONS");
  const { data, info } = await pipeline.rotate().resize({ width: maxEdge, height: maxEdge, fit: "inside", withoutEnlargement: true }).webp({ quality: 84, effort: 2 }).toBuffer({ resolveWithObject: true });
  if (data.byteLength < 1 || data.byteLength > COMMUNITY_IMAGE_MAX_OUTPUT_BYTES || !info.width || !info.height) throw new Error("INVALID_OUTPUT");
  return { data, width: info.width, height: info.height, size: data.byteLength, mimeType: "image/webp" as const };
}
