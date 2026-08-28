import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveAuthenticatedHome } from "@/lib/navigation/authenticated-home";
import { normalizeAuthContext, safeInternalPath } from "@/lib/validation/auth";

const invitePattern = /^\/invite\/([a-f0-9]{64})$/;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextPath = safeInternalPath(url.searchParams.get("next"), "");
  const context = normalizeAuthContext(url.searchParams.get("context"));
  if (!code) return NextResponse.redirect(new URL("/login?oauth=failed", url));

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL("/login?oauth=failed", url));

  const invite = invitePattern.exec(nextPath);
  if (invite) {
    const { error: invitationError } = await supabase.rpc("accept_student_invitation", {
      p_token: invite[1],
      p_preferred_name: null,
    });
    if (invitationError) {
      const destination = new URL(nextPath, url);
      destination.searchParams.set("auth_error", "invited_account_required");
      return NextResponse.redirect(destination);
    }
    return NextResponse.redirect(new URL("/student/today", url));
  }

  return NextResponse.redirect(new URL(await resolveAuthenticatedHome(supabase, { context, nextPath }), url));
}
