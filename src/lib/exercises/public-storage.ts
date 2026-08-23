const exerciseMediaPath = /^trainer-public-media\/system\/exercises\/repdb-free-v1\/[a-z0-9-]+-(main|start|peak)\.webp$/;

export function resolvePublicExerciseStoragePath(storagePath: string): string | null {
  if (!exerciseMediaPath.test(storagePath)) return null;
  const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, "");
  if (!configuredUrl) return null;
  try {
    const baseUrl = new URL(configuredUrl);
    if (baseUrl.protocol !== "https:") return null;
    const [bucket, ...objectParts] = storagePath.split("/");
    const objectPath = objectParts.map(encodeURIComponent).join("/");
    return `${baseUrl.origin}/storage/v1/object/public/${bucket}/${objectPath}`;
  } catch {
    return null;
  }
}
