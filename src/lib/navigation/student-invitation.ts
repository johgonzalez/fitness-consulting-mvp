export const STUDENT_APP_HOME = "/student/today";

export function defaultAuthenticatedHome(roles?: readonly unknown[]) {
  if (roles?.includes("trainer")) return "/dashboard";
  if (roles?.includes("student")) return STUDENT_APP_HOME;
  return "/onboarding";
}

export function authRouteWithNext(route: "/login" | "/signup", nextPath?: string, context?: "trainer" | "student") {
  const params = new URLSearchParams();
  if (nextPath) params.set("next", nextPath);
  if (context) params.set("context", context);
  const query = params.toString();
  return query ? `${route}?${query}` : route;
}
