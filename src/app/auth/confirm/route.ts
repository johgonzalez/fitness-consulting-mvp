import { NextResponse } from "next/server";
import { clearDemoWorkspaceResponse } from "@/lib/demo/session";
import { createClient } from "@/lib/supabase/server";
import { safeInternalPath } from "@/lib/validation/auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");
  const safeNext = safeInternalPath(next, "/onboarding");
  const resultUrl = new URL("/auth/confirm/result", url.origin);
  resultUrl.searchParams.set("next", safeNext);
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      resultUrl.searchParams.set("status", "success");
      return clearDemoWorkspaceResponse(NextResponse.redirect(resultUrl));
    }
  }
  resultUrl.searchParams.set("status", "error");
  return NextResponse.redirect(resultUrl);
}
