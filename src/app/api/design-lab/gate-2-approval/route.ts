import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unavailable() {
  return new NextResponse(null, { status: 404, headers: { "Cache-Control": "no-store" } });
}

function isSameDevelopmentOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const requestUrl = new URL(request.url);
  const originUrl = new URL(origin);
  if (originUrl.origin === requestUrl.origin) return true;
  const loopback = new Set(["127.0.0.1", "localhost"]);
  return originUrl.protocol === "http:" && requestUrl.protocol === "http:"
    && originUrl.port === requestUrl.port
    && loopback.has(originUrl.hostname) && loopback.has(requestUrl.hostname);
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") return unavailable();
  if (!isSameDevelopmentOrigin(request)) {
    return NextResponse.json({ error: "Origem inválida." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ error: "Conteúdo inválido." }, { status: 415, headers: { "Cache-Control": "no-store" } });
  }
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (declaredLength > 4096) return NextResponse.json({ error: "Conteúdo excede o limite." }, { status: 413 });
  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > 4096) {
    return NextResponse.json({ error: "Conteúdo excede o limite." }, { status: 413, headers: { "Cache-Control": "no-store" } });
  }
  let parsed: unknown;
  try { parsed = JSON.parse(body); } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  const { parseGate2ApprovalRequest, persistGate2Approval } = await import("@/app/design-lab/v1/gate-2-approval-server");
  const approvalRequest = parseGate2ApprovalRequest(parsed);
  if (!approvalRequest) {
    return NextResponse.json({ error: "Decisão fora do contrato do Gate 2." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  try {
    const result = await persistGate2Approval(approvalRequest);
    return NextResponse.json(result, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = message.startsWith("CONFLICT_") ? 409 : 500;
    return NextResponse.json(
      { error: status === 409 ? "O Gate mudou. Atualize o Lab antes de continuar." : "Não foi possível registrar a decisão local." },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
