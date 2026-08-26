export const STUDENT_APP_HOME = "/student/today";

export function defaultAuthenticatedHome(roles?: readonly unknown[]) {
  if (roles?.includes("trainer")) return "/dashboard";
  if (roles?.includes("student")) return STUDENT_APP_HOME;
  return "/dashboard";
}

export function authRouteWithNext(route: "/login" | "/signup", nextPath?: string) {
  return nextPath ? `${route}?next=${encodeURIComponent(nextPath)}` : route;
}
