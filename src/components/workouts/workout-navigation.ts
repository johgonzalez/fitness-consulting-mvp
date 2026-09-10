export type WorkoutFilter = "all" | "draft" | "published" | "archived";
export type WorkoutListContext = { q?: string | string[]; status?: string | string[]; student?: string | string[]; discarded?: string | string[] };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function workoutListHref(context: WorkoutListContext = {}) {
  const params = new URLSearchParams();
  if (typeof context.status === "string" && ["draft", "published", "archived"].includes(context.status)) params.set("status", context.status);
  for (const key of ["student", "discarded"] as const) {
    const value = context[key];
    if (typeof value === "string" && uuid.test(value)) params.set(key, value);
  }
  if (typeof context.q === "string" && context.q.trim()) params.set("q", context.q.trim().slice(0, 160));
  const query = params.toString();
  return "/dashboard/workouts" + (query ? "?" + query : "");
}

export function workoutVersionHref(versionId: string, returnHref: string) {
  const incoming = new URL(returnHref, "http://local.invalid").searchParams;
  const safe = workoutListHref({ q: incoming.get("q") ?? undefined, status: incoming.get("status") ?? undefined, student: incoming.get("student") ?? undefined, discarded: incoming.get("discarded") ?? undefined });
  return "/dashboard/workouts/" + encodeURIComponent(versionId) + safe.slice("/dashboard/workouts".length);
}
