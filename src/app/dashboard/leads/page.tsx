import Link from "next/link";
import { redirect } from "next/navigation";
import { Clock3, LockKeyhole, MapPin, SlidersHorizontal, UsersRound } from "lucide-react";
import { LeadSettingsForm } from "@/components/leads/LeadSettingsForm";
import { EmptyState, Status } from "@/components/ui/PPerfilPrimitives";
import { DataList, DataListRow, IdentityCell, OperationalToolbar } from "@/components/ui/PPerfilOperational";
import { leadsConfig } from "@/config/site";
import type { LeadLifecycleState, ManagedLead } from "@/lib/domain/students";
import { getLeadsWorkspace } from "@/lib/supabase/leads";

const filters: Array<{ value: LeadLifecycleState | "all"; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "new", label: "Novos" },
  { value: "pending", label: "Pendentes" },
  { value: "converted", label: "Convertidos" },
  { value: "rejected", label: "Rejeitados" },
  { value: "expired", label: "Expirados" },
];

const stateLabels: Record<LeadLifecycleState, string> = {
  new: "Novo",
  pending: "Pendente",
  converted: "Convertido",
  rejected: "Rejeitado",
  expired: "Expirado",
};

const stateTones: Record<LeadLifecycleState, "accent" | "warning" | "success" | "danger" | "neutral"> = {
  new: "accent",
  pending: "warning",
  converted: "success",
  rejected: "danger",
  expired: "neutral",
};

function goalLabel(value: string) {
  return leadsConfig.goals.find((goal) => goal.value === value)?.label ?? value;
}

function reservationLabel(match: ManagedLead) {
  if (match.state !== "new" && match.state !== "pending") return "Encerrada";
  const milliseconds = Math.max(0, new Date(match.reservedUntil).getTime() - Date.now());
  const hours = Math.floor(milliseconds / 3_600_000);
  if (hours >= 24) return `${Math.floor(hours / 24)}d ${hours % 24}h restantes`;
  if (hours > 0) return `${hours}h restantes`;
  return `${Math.max(0, Math.ceil(milliseconds / 60_000))}min restantes`;
}

function leadLocation(match: ManagedLead) {
  return [match.lead.city, match.lead.state].filter(Boolean).join(", ") || "Local não informado";
}

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ status?: string; settings?: string }> }) {
  const [query, data] = await Promise.all([searchParams, getLeadsWorkspace()]);
  if (!data) redirect("/login");

  const activeFilter = filters.some((item) => item.value === query.status) ? query.status as LeadLifecycleState : "all";
  const visible = activeFilter === "all" ? data.matches : data.matches.filter((match) => match.state === activeFilter);
  const configurationOpen = !data.settings || query.settings === "1";

  return <main className={`dashboard-main pp-workspace pp-leads-workspace${configurationOpen ? " pp-leads-workspace--configuration" : ""}`}>
    <header className="pp-page-header">
      <div>
        <p className="pp-page-context">Oportunidades</p>
        <h1>Leads</h1>
        <p>Priorize cada contato dentro da janela de reserva e conduza a próxima ação.</p>
      </div>
    </header>

    {!data.entitlements.can_receive_leads ? <section className="pp-panel pp-access-state">
      <EmptyState icon={LockKeyhole} title="Acesso reservado ao Beta" description="Seu plano atual ainda não permite receber leads." />
    </section> : !data.settings ? <section className="pp-leads-config-surface">
      <LeadSettingsForm services={data.services} />
    </section> : <>
      <OperationalToolbar
        filters={filters.map((item) => ({
          label: item.label,
          href: item.value === "all" ? "/dashboard/leads" : `/dashboard/leads?status=${item.value}`,
          count: item.value === "all" ? data.matches.length : data.matches.filter((match) => match.state === item.value).length,
          active: activeFilter === item.value,
        }))}
        note={<><Clock3 aria-hidden="true" />Reserva operacional de 3 dias</>}
      />

      {visible.length ? <DataList label="Leads recebidos" columns={["Lead", "Interesse", "Origem", "Reserva", "Status", ""]} className="pp-lead-list">
        {visible.map((match) => <DataListRow href={`/dashboard/leads/${match.id}`} key={match.id}>
          <IdentityCell name={match.lead.firstName} detail={match.lead.email ?? match.lead.whatsapp} />
          <span className="pp-data-cell pp-data-cell--stacked" role="cell"><strong>{goalLabel(match.lead.goal)}</strong><small>{match.lead.serviceMode}</small></span>
          <span className="pp-data-cell pp-data-cell--stacked pp-data-cell--origin" role="cell"><strong>Ecossistema PPerfil</strong><small><MapPin aria-hidden="true" />{leadLocation(match)}</small></span>
          <span className="pp-data-cell pp-data-cell--reservation" role="cell"><Clock3 aria-hidden="true" /><span><strong>{reservationLabel(match)}</strong><small>{new Date(match.reservedUntil).toLocaleDateString("pt-BR")}</small></span></span>
          <span className="pp-data-cell pp-data-cell--status" role="cell"><Status tone={stateTones[match.state]}>{stateLabels[match.state]}</Status></span>
        </DataListRow>)}
      </DataList> : <section className="pp-panel">
        <EmptyState icon={UsersRound} title="Nenhum lead neste filtro" description="As oportunidades compatíveis aparecerão aqui quando forem recebidas." />
      </section>}

      {query.settings === "1" ? <section className="pp-leads-config-surface pp-lead-settings-panel">
        <LeadSettingsForm services={data.services} settings={data.settings} />
        <div className="pp-leads-config-surface__secondary"><Link href="/dashboard/leads" className="pp-button pp-button--secondary">Fechar configuração</Link></div>
      </section> : <Link href="/dashboard/leads?settings=1" className="pp-config-link"><SlidersHorizontal aria-hidden="true" />Configuração de recebimento <span>{data.settings.accepting_new_clients ? "Ativa" : "Pausada"}</span></Link>}
    </>}
  </main>;
}
