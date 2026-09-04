import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock3, Mail, MapPin, MessageCircle, Phone, Radar, Target } from "lucide-react";
import { LeadLifecycleActions } from "@/components/leads/LeadLifecycleActions";
import { ActionGroup, ContextPanel, MasterDetail } from "@/components/ui/PPerfilOperational";
import { Avatar, Status } from "@/components/ui/PPerfilPrimitives";
import { leadsConfig } from "@/config/site";
import type { LeadLifecycleState } from "@/lib/domain/students";
import { getLead } from "@/lib/supabase/leads";

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

function valueLabel<T extends readonly { value: string; label: string }[]>(items: T, value: string) {
  return items.find((item) => item.value === value)?.label ?? value;
}

function serviceModeLabel(value: string) {
  return value === "online" ? "Online" : value === "presencial" ? "Presencial" : value === "both" ? "Online e presencial" : value;
}

function remaining(deadline: string) {
  const milliseconds = Math.max(0, new Date(deadline).getTime() - Date.now());
  const hours = Math.floor(milliseconds / 3_600_000);
  if (hours >= 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h`;
  return `${Math.max(0, Math.ceil(milliseconds / 60_000))}min`;
}

function phoneDigits(value: string) {
  return value.replace(/\D/g, "");
}

export default async function LeadDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const match = await getLead(id);
  if (!match) notFound();

  const lead = match.lead;
  const isActionable = match.state === "new" || match.state === "pending";
  const location = [lead.city, lead.state].filter(Boolean).join(", ") || "Não informado";
  const contactPhone = phoneDigits(lead.whatsapp);

  return <main className="dashboard-main pp-record-page pp-lead-record">
    <Link href="/dashboard/leads" className="pp-back-link"><ArrowLeft aria-hidden="true" />Voltar para leads</Link>

    <header className="pp-record-header">
      <Avatar name={lead.firstName} size="large" />
      <div>
        <div className="pp-record-header__title"><h1>{lead.firstName}</h1><Status tone={stateTones[match.state]}>{stateLabels[match.state]}</Status></div>
        <p>{valueLabel(leadsConfig.goals, lead.goal)} · {serviceModeLabel(lead.serviceMode)}</p>
      </div>
    </header>

    <div className="pp-lead-contact-actions" aria-label="Atalhos de contato">
      <a href={`https://wa.me/${contactPhone}`} target="_blank" rel="noreferrer"><MessageCircle aria-hidden="true" />WhatsApp</a>
      <a href={`tel:${contactPhone}`}><Phone aria-hidden="true" />Ligar</a>
      {lead.email ? <a href={`mailto:${lead.email}`}><Mail aria-hidden="true" />E-mail</a> : null}
    </div>

    <nav className="pp-record-tabs" aria-label="Seções do lead"><span aria-current="page">Visão geral</span></nav>

    <MasterDetail aside={<>
      <ContextPanel title="Reserva" description="Janela exclusiva para decisão do Personal.">
        <div className={`pp-countdown${isActionable ? " pp-countdown--active" : ""}`}>
          <Clock3 aria-hidden="true" />
          <span><strong>{isActionable ? remaining(match.reservedUntil) : "Encerrada"}</strong><small>{isActionable ? "tempo restante" : `Prazo: ${new Date(match.reservedUntil).toLocaleString("pt-BR")}`}</small></span>
        </div>
      </ContextPanel>
      <ActionGroup title="Próxima ação" description={isActionable ? "Registre uma decisão antes do fim da reserva." : "O ciclo operacional deste lead foi concluído."}>
        <LeadLifecycleActions id={match.id} state={match.state} hasEmail={Boolean(lead.email)} />
      </ActionGroup>
    </>}>
      <ContextPanel title="Oportunidade" description="Por que este contato chegou até você.">
        <dl className="pp-detail-list">
          <div><dt><Target aria-hidden="true" />Objetivo</dt><dd>{valueLabel(leadsConfig.goals, lead.goal)}</dd></div>
          <div><dt><Radar aria-hidden="true" />Compatibilidade</dt><dd>{match.score}%</dd></div>
          <div><dt>Modalidade</dt><dd>{serviceModeLabel(lead.serviceMode)}</dd></div>
          <div><dt>Faixa de investimento</dt><dd>{valueLabel(leadsConfig.budgetBands, lead.budgetBand)}</dd></div>
          <div><dt>Quando pretende começar</dt><dd>{valueLabel(leadsConfig.timings, lead.startTiming)}</dd></div>
          <div><dt><MapPin aria-hidden="true" />Local</dt><dd>{location}</dd></div>
        </dl>
      </ContextPanel>

      <ContextPanel title="Identidade e contato" description="Informações fornecidas pela própria pessoa.">
        <dl className="pp-detail-list pp-detail-list--contact">
          <div><dt><Phone aria-hidden="true" />WhatsApp</dt><dd><a href={`https://wa.me/${contactPhone}`} target="_blank" rel="noreferrer">{lead.whatsapp}</a></dd></div>
          <div><dt><Mail aria-hidden="true" />E-mail</dt><dd>{lead.email ? <a href={`mailto:${lead.email}`}>{lead.email}</a> : "Não informado"}</dd></div>
          <div><dt><CalendarDays aria-hidden="true" />Recebido em</dt><dd>{new Date(match.createdAt).toLocaleString("pt-BR")}</dd></div>
          <div><dt>Origem</dt><dd>Ecossistema Cheipi<small>Canal específico não registrado</small></dd></div>
        </dl>
      </ContextPanel>
    </MasterDetail>
  </main>;
}
