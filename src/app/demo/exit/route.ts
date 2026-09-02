import { NextResponse } from "next/server";
import { clearDemoWorkspaceResponse } from "@/lib/demo/session";

export async function GET(request: Request) {
  return clearDemoWorkspaceResponse(NextResponse.redirect(new URL("/", request.url)));
}
