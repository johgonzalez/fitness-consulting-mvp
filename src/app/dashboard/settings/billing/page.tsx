import { BillingCheckoutButton } from "@/components/billing/BillingCheckoutButton";
import { requireUser } from "@/lib/auth/user";
import { isDemoWorkspaceRequest } from "@/lib/demo/workspace";
import { createClient } from "@/lib/supabase/server";

type BillingSummary = {
  product_code?: string;
  billing_state?: string;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean;
  grace_until?: string | null;
};

const billingStateCopy: Record<string, { label: string; description: string }> = {
  FREE: { label: "Plano gratuito", description: "Seu espaço e seus dados continuam disponíveis. Ative o Pro quando quiser publicar e usar os recursos incluídos no plano." },
  ACTIVE: { label: "Assinatura ativa", description: "Seu acesso ao PPerfil Pro está ativo." },
  GRACE: { label: "Pagamento em regularização", description: "Seu acesso continua disponível durante o período de regularização." },
  SUSPENDED: { label: "Acesso Pro suspenso", description: "Seus dados foram preservados. Regularize o plano para reativar os recursos Pro." },
};

function formatDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString("pt-BR") : null;
}

export default async function BillingSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  await requireUser();
  const [query, demoMode] = await Promise.all([searchParams, isDemoWorkspaceRequest()]);
  let summary: BillingSummary = {};
  if (!demoMode) {
    const supabase = await createClient();
    const { data } = await supabase.rpc("get_my_billing_summary");
    summary = (data ?? {}) as BillingSummary;
  }
  const paid = summary.product_code === "PRO"
    && (summary.billing_state === "ACTIVE" || summary.billing_state === "GRACE");
  const state = billingStateCopy[summary.billing_state ?? "FREE"] ?? billingStateCopy.FREE;
  const periodEnd = formatDate(summary.current_period_end);
  const graceUntil = formatDate(summary.grace_until);

  return <main className="dashboard-main pp-workspace pp-settings-page billing-settings-page">
    <header className="pp-page-header">
      <div>
        <p className="pp-page-context">Conta</p>
        <h1>Plano e cobrança</h1>
        <p>Gerencie a assinatura do seu espaço profissional no PPerfil.</p>
      </div>
    </header>

    {query.checkout === "canceled" ? <section className="billing-return-state" role="status">
      <strong>Pagamento cancelado</strong>
      <p>Nenhum valor foi cobrado. Você pode tentar novamente quando quiser.</p>
    </section> : null}
    {query.checkout === "returned" ? <section className="billing-return-state" role="status">
      <strong>Pagamento recebido pela Stripe.</strong>
      <p>Estamos confirmando sua assinatura. A ativação será concluída pelo sistema de cobrança.</p>
    </section> : null}

    <section className="billing-plan-card">
      <div>
        <p className="pp-page-context">PPerfil Pro</p>
        <h2>Seu negócio fitness, organizado em um só lugar.</h2>
        <p>Site profissional, gestão de alunos, avaliações, treinos e progresso.</p>
      </div>
      <div className="billing-plan-price"><strong>R$ 59,90</strong><span>/ mês</span></div>
      {demoMode ? <div className="billing-status-summary">
        <span>Workspace de demonstração</span>
        <strong>Plano e cobrança sem alterações reais</strong>
        <p>A cobrança fica disponível somente em uma conta real.</p>
      </div> : <div className="billing-status-summary" role="status">
        <span>{summary.product_code === "PRO" ? "PPerfil Pro" : "PPerfil Free"}</span>
        <strong>{summary.cancel_at_period_end ? "Cancelamento programado" : state.label}</strong>
        <p>{summary.cancel_at_period_end && periodEnd ? `O acesso Pro permanece ativo até ${periodEnd}. Seus dados serão preservados.` : state.description}</p>
        {summary.billing_state === "ACTIVE" && periodEnd && !summary.cancel_at_period_end ? <small>Próximo ciclo em {periodEnd}</small> : null}
        {summary.billing_state === "GRACE" && graceUntil ? <small>Período de regularização até {graceUntil}</small> : null}
      </div>}
      {!demoMode && !paid ? <BillingCheckoutButton /> : null}
    </section>
  </main>;
}
