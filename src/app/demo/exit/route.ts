import { NextResponse } from "next/server";
import { DEMO_COOKIE_NAME } from "@/lib/demo/config";
import { DEMO_SITE_PREFERENCES_COOKIE, resetDemoSiteState } from "@/lib/demo/site-workspace";

export async function GET(request: Request) {
  resetDemoSiteState();
  const response = NextResponse.redirect(new URL("/login", request.url));
  response.cookies.set(DEMO_COOKIE_NAME, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  response.cookies.set(DEMO_SITE_PREFERENCES_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  return response;
}
