import "server-only";

import { createClient } from "@/lib/supabase/server";

const STUDENT_PROFILE_IMAGE_PATH = /^[0-9a-f-]{36}\/profile\/[0-9a-f-]{36}\.(?:jpg|png|webp)$/i;

export function isStudentProfileImagePath(value: string | null | undefined): value is string {
  return typeof value === "string" && STUDENT_PROFILE_IMAGE_PATH.test(value);
}

export async function signStudentProfileImagePaths(paths: Array<string | null | undefined>) {
  const unique = [...new Set(paths.filter(isStudentProfileImagePath))];
  if (!unique.length) return new Map<string, string>();
  const supabase = await createClient();
  const { data } = await supabase.storage.from("student-private-media").createSignedUrls(unique, 600);
  return new Map((data ?? []).flatMap((item) => item.signedUrl && item.path ? [[item.path, item.signedUrl] as const] : []));
}

export async function resolveStudentProfileImageUrl(path: string | null | undefined) {
  if (!isStudentProfileImagePath(path)) return null;
  return (await signStudentProfileImagePaths([path])).get(path) ?? null;
}
