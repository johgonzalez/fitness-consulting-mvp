import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { DEMO_COOKIE_NAME, isActiveDemoCookie } from "@/lib/demo/config";
import { resolveAuthenticatedHome } from "@/lib/navigation/authenticated-home";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { safeInternalPath } from "@/lib/validation/auth";

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const trainerRoute = pathname.startsWith("/dashboard");
  const studentRoute = pathname.startsWith("/student");
  const protectedRoute = trainerRoute || studentRoute || pathname.startsWith("/onboarding");
  const authRoute = pathname === "/login" || pathname === "/signup";
  const demoWorkspace = isActiveDemoCookie(request.cookies.get(DEMO_COOKIE_NAME)?.value);

  if (demoWorkspace) {
    if (authRoute) return NextResponse.redirect(new URL("/dashboard", request.url));
    if (protectedRoute) return NextResponse.next({ request });
  }

  const config = getSupabaseConfig();
  if (!config.configured || !config.url || !config.key) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const supabase = createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const authenticated = Boolean(data?.claims?.sub);
  if (protectedRoute && !authenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }
  if (authenticated && (trainerRoute || studentRoute)) {
    const { data: identity } = await supabase.rpc("get_my_app_identity");
    const roles = Array.isArray((identity as { roles?: unknown } | null)?.roles)
      ? (identity as { roles: unknown[] }).roles
      : [];
    if (trainerRoute && !roles.includes("trainer")) {
      return NextResponse.redirect(new URL(roles.includes("student") ? "/student/today" : "/onboarding", request.url));
    }
    if (studentRoute && !roles.includes("student")) {
      return NextResponse.redirect(new URL(roles.includes("trainer") ? "/dashboard" : "/onboarding", request.url));
    }
  }
  if (authRoute && authenticated) {
    const explicitNext = safeInternalPath(request.nextUrl.searchParams.get("next"), "");
    if (explicitNext) return NextResponse.redirect(new URL(explicitNext, request.url));
    return NextResponse.redirect(new URL(await resolveAuthenticatedHome(supabase), request.url));
  }
  return response;
}
