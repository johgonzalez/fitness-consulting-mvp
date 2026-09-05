import { NextResponse } from "next/server";
import { requireAppBaseUrl } from "@/lib/billing/app-base-url";
import { assertNoClientCatalogAuthority, BillingCheckoutError, startProCheckout } from "@/lib/billing/checkout";
import { createStripeBillingProvider } from "@/lib/billing/providers/stripe/adapter";
import { StripeProviderError } from "@/lib/billing/providers/stripe/errors";
import { SupabaseBillingCheckoutRepository } from "@/lib/billing/supabase-checkout-repository";
import { isDemoWorkspaceRequest } from "@/lib/demo/workspace";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function response(message: string, status: number, code: string) {
  return NextResponse.json({ ok: false, code, message }, { status });
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return origin === null || origin === new URL(request.url).origin;
}

async function rejectsClientAuthority(request: Request): Promise<boolean> {
  const length = Number(request.headers.get("content-length") ?? "0");
  if (!Number.isFinite(length) || length <= 0) return false;
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) return true;
  try {
    const body = await request.json();
    assertNoClientCatalogAuthority(body);
    return false;
  } catch {
    return true;
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return response("Origem da solicitação não autorizada.", 403, "ORIGIN_DENIED");
  if (await isDemoWorkspaceRequest()) {
    return response("O workspace Demo é somente leitura. Entre com uma conta real para assinar.", 403, "DEMO_READ_ONLY");
  }
  if (await rejectsClientAuthority(request)) {
    return response("O catálogo do pagamento é definido pelo servidor.", 400, "CLIENT_CATALOG_REJECTED");
  }

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return response("Sua sessão expirou. Entre novamente.", 401, "AUTH_REQUIRED");
  }
  const { data: identity, error: identityError } = await supabase.rpc("get_my_app_identity");
  const safeIdentity = identity as { id?: unknown; roles?: unknown } | null;
  if (identityError || safeIdentity?.id !== authData.user.id || !Array.isArray(safeIdentity.roles)) {
    return response("Não foi possível validar sua conta.", 403, "IDENTITY_REQUIRED");
  }
  if (!safeIdentity.roles.includes("trainer")) {
    return response("A assinatura do Personal exige uma conta de treinador.", 403, "TRAINER_REQUIRED");
  }

  try {
    const onboarding = new URL(request.url).searchParams.get("flow") === "onboarding";
    if (onboarding) {
      // Store intent with the user's session. Publication still requires backend entitlement.
      const { error } = await supabase.rpc("request_my_site_publication");
      if (error) return response("Não foi possível preparar a publicação. Tente novamente.", 503, "PUBLICATION_UNAVAILABLE");
    }
    const result = await startProCheckout({
      identity: { appUserId: authData.user.id, roles: safeIdentity.roles as string[] },
      repository: new SupabaseBillingCheckoutRepository(),
      provider: createStripeBillingProvider(),
      appBaseUrl: requireAppBaseUrl(),
      returnPath: onboarding ? "onboarding" : "billing",
    });
    return NextResponse.json({ ok: true, checkoutUrl: result.checkoutUrl, reused: result.reused });
  } catch (error) {
    if (error instanceof BillingCheckoutError) {
      if (error.code === "ALREADY_SUBSCRIBED") {
        return response("Sua assinatura já está ativa ou em processamento.", 409, error.code);
      }
      if (error.code === "CHECKOUT_CONFIRMATION_PENDING") {
        return response("Seu pagamento está aguardando confirmação.", 409, error.code);
      }
      if (error.code === "TRAINER_REQUIRED" || error.code === "BILLING_OWNERSHIP_MISMATCH") {
        return response("Operação não autorizada.", 403, error.code);
      }
    }
    if (error instanceof StripeProviderError && error.code === "STRIPE_ACCOUNT_MISMATCH") {
      return response("A configuração da conta de cobrança não pôde ser validada.", 503, error.code);
    }
    return response("Não foi possível iniciar o pagamento agora.", 503, "CHECKOUT_UNAVAILABLE");
  }
}
