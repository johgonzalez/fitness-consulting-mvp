import { NextResponse } from "next/server";
import { DEMO_COOKIE_NAME } from "@/lib/demo/config";

export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/login", request.url));
  response.cookies.set(DEMO_COOKIE_NAME, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  return response;
}
