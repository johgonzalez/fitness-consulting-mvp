import { NextResponse } from "next/server";
import { DEMO_COOKIE_NAME, DEMO_COOKIE_VALUE, isDemoModeAvailable } from "@/lib/demo/config";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isDemoModeAvailable()) {
    return NextResponse.json({ error: "Demo workspace is not available." }, { status: 404 });
  }

  const requestedPath = new URL(request.url).searchParams.get("next");
  const safePath = requestedPath?.startsWith("/student/") || requestedPath?.startsWith("/dashboard")
    ? requestedPath
    : "/dashboard";
  const response = NextResponse.redirect(new URL(safePath, request.url));
  response.cookies.set(DEMO_COOKIE_NAME, DEMO_COOKIE_VALUE, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
