import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { DEMO_COOKIE_NAME, isActiveDemoCookie } from "@/lib/demo/config";
import { defaultAuthenticatedHome } from "@/lib/navigation/student-invitation";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { safeInternalPath } from "@/lib/validation/auth";

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const protectedRoute = pathname.startsWith("/dashboard") || pathname.startsWith("/onboarding");
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
  if (authRoute && authenticated) {
    const explicitNext = safeInternalPath(request.nextUrl.searchParams.get("next"), "");
    if (explicitNext) return NextResponse.redirect(new URL(explicitNext, request.url));
    const { data: identity } = await supabase.rpc("get_my_app_identity");
    const roles = (identity as { roles?: unknown[] } | null)?.roles;
    return NextResponse.redirect(new URL(defaultAuthenticatedHome(roles), request.url));
  }
  return response;
}
