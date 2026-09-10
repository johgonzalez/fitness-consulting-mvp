export type StudentListContext = { status?: string | string[]; q?: string | string[] };
export type StudentListFilter = "all" | "active" | "inactive";

export function normalizeStudentListContext(context: StudentListContext = {}): { status: StudentListFilter; q: string } {
  return {
    status: context.status === "active" || context.status === "inactive" ? context.status : "all",
    q: typeof context.q === "string" ? context.q.trim().slice(0, 120) : "",
  };
}

function contextQuery(context: StudentListContext) {
  const { status, q } = normalizeStudentListContext(context);
  const params = new URLSearchParams();
  if (status !== "all") params.set("status", status);
  if (q) params.set("q", q);
  return params;
}

export function studentListHref(context: StudentListContext = {}, add = false) {
  const params = contextQuery(context);
  if (add) params.set("add", "1");
  return "/dashboard/students" + (params.size ? "?" + params : "") + (add ? "#add-student" : "");
}

export function studentRecordHref(id: string, context: StudentListContext = {}, section?: "progress") {
  const params = contextQuery(context);
  return "/dashboard/students/" + encodeURIComponent(id) + (section === "progress" ? "/progress" : "") + (params.size ? "?" + params : "");
}
