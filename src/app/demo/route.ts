import { NextResponse } from "next/server";
import { DEMO_COOKIE_NAME, DEMO_COOKIE_VALUE, isDemoModeAvailable } from "@/lib/demo/config";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isDemoModeAvailable()) {
    return NextResponse.json({ error: "Demo workspace is not available." }, { status: 404 });
  }

  const response = NextResponse.redirect(new URL("/dashboard", request.url));
  response.cookies.set(DEMO_COOKIE_NAME, DEMO_COOKIE_VALUE, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
