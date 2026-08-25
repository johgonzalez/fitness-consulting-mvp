import "server-only";

import type { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { DEMO_COOKIE_NAME } from "@/lib/demo/config";
import { DEMO_SITE_PREFERENCES_COOKIE, resetDemoSiteState } from "@/lib/demo/site-workspace";

const expiredCookie = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 0,
};

export async function clearDemoWorkspaceSession() {
  resetDemoSiteState();
  const cookieStore = await cookies();
  cookieStore.set(DEMO_COOKIE_NAME, "", expiredCookie);
  cookieStore.set(DEMO_SITE_PREFERENCES_COOKIE, "", expiredCookie);
}

export function clearDemoWorkspaceResponse(response: NextResponse) {
  resetDemoSiteState();
  response.cookies.set(DEMO_COOKIE_NAME, "", expiredCookie);
  response.cookies.set(DEMO_SITE_PREFERENCES_COOKIE, "", expiredCookie);
  return response;
}
