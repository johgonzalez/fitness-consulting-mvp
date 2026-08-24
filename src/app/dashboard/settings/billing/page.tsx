import { BillingCheckoutButton } from "@/components/billing/BillingCheckoutButton";
import { requireUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";

type BillingSummary = {
  product_code?: string;
  billing_state?: string;
  current_period_end?: string | null;
};

export default async function BillingSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  await requireUser();
  const [query, supabase] = await Promise.all([searchParams, createClient()]);
  const { data } = await supabase.rpc("get_my_billing_summary");
  const summary = (data ?? {}) as BillingSummary;
  const paid = summary.product_code === "PRO"
    && (summary.billing_state === "ACTIVE" || summary.billing_state === "GRACE");

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
      {paid
        ? <p className="billing-current-state">Plano atual: {summary.billing_state}</p>
        : <BillingCheckoutButton />}
    </section>
  </main>;
}
