import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  BellRing,
  CircleDollarSign,
  Eye,
  GraduationCap,
  MessageCircle,
  MonitorCheck,
  Plus,
  Radar,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { Avatar, EmptyState, Metric, SectionHeader, Status } from "@/components/ui/PPerfilPrimitives";
import { getLeadsWorkspace } from "@/lib/supabase/leads";
import { getStudentsWorkspace } from "@/lib/supabase/students";
import { findDashboardMetrics, findOwnerEntitlements, findOwnerProfile } from "@/lib/supabase/trainers";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });

function formatDate(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "Data indisponível" : dateFormatter.format(parsed);
}

export default async function DashboardPage() {
  const [profile, entitlements, metrics, studentsWorkspace, leadsWorkspace] = await Promise.all([
    findOwnerProfile(),
    findOwnerEntitlements(),
    findDashboardMetrics(),
    getStudentsWorkspace().catch(() => null),
    getLeadsWorkspace().catch(() => null),
  ]);

  if (!profile) redirect("/onboarding");

  const firstName = profile.display_name.split(" ")[0];
  const students = studentsWorkspace?.students ?? [];
  const activeStudents = students.filter((student) => student.status === "active");
  const invitations = studentsWorkspace?.invitations ?? [];
  const leads = leadsWorkspace?.matches ?? [];
  const attentionLeads = leads.filter((lead) => lead.state === "new" || lead.state === "pending");
  const maxAcquisitionValue = Math.max(metrics.profile_views, metrics.whatsapp_clicks, metrics.leads, 1);
  const templateName = profile.template_id === "template_01" ? "Essential Editorial" : profile.template_id === "template_02" ? "Motion" : "Conversion";

  const activity = [
    ...students.map((student) => ({
      id: `student-${student.id}`,
      date: student.startedAt,
      title: student.name,
      detail: student.status === "active" ? "Aluno ativo" : "Relacionamento atualizado",
      kind: "student" as const,
    })),
    ...invitations.map((invitation) => ({
      id: `invite-${invitation.id}`,
      date: invitation.createdAt,
      title: invitation.name ?? invitation.email,
      detail: "Convite enviado",
      kind: "invite" as const,
    })),
    ...leads.map((lead) => ({
      id: `lead-${lead.id}`,
      date: lead.createdAt,
      title: lead.lead.firstName,
      detail: "Lead recebido",
      kind: "lead" as const,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 4);

  return <main className="dashboard-main pp-dashboard">
    <header className="pp-page-header">
      <div>
        <p className="pp-page-context">Visão operacional</p>
        <h1>Dashboard</h1>
        <p>Olá, {firstName}. Acompanhe sua operação e priorize o que precisa de atenção.</p>
      </div>
      <Link href="/dashboard/students" className="pp-button pp-button--primary"><Plus aria-hidden="true" />Adicionar aluno</Link>
    </header>

    <section className="pp-metric-grid" aria-label="Indicadores da operação">
      <Metric label="Alunos ativos" value={studentsWorkspace ? activeStudents.length : "—"} description={studentsWorkspace ? `${invitations.length} convite(s) pendente(s)` : "Dados indisponíveis"} icon={GraduationCap} href="/dashboard/students" tone="success" />
      <Metric label="Leads em atenção" value={leadsWorkspace ? attentionLeads.length : metrics.leads} description={`${metrics.leads} oportunidade(s) atribuída(s)`} icon={UsersRound} href="/dashboard/leads" tone="accent" />
      <Metric label="Visitas ao perfil" value={metrics.profile_views} description="Acessos únicos na janela atual" icon={Eye} href="/dashboard/site" tone="info" />
      <Metric label="Contatos" value={metrics.whatsapp_clicks} description="Cliques rastreados no WhatsApp" icon={MessageCircle} href="/dashboard/site" tone="warning" />
    </section>

    <section className="pp-dashboard-grid pp-dashboard-grid--primary" aria-label="Aquisição e prioridades">
      <article className="pp-panel pp-panel--acquisition">
        <SectionHeader title="Aquisição" description="Dados reais disponíveis no funil do seu perfil." action={<Link href="/dashboard/site" className="pp-text-link">Meu Site <ArrowUpRight aria-hidden="true" /></Link>} />
        <div className="pp-acquisition-chart" role="img" aria-label={`Funil com ${metrics.profile_views} visitas, ${metrics.whatsapp_clicks} contatos e ${metrics.leads} leads`}>
          {[
            { label: "Visitas ao perfil", value: metrics.profile_views, tone: "info" },
            { label: "Cliques no WhatsApp", value: metrics.whatsapp_clicks, tone: "accent" },
            { label: "Leads atribuídos", value: metrics.leads, tone: "success" },
          ].map((item) => <div className="pp-funnel-row" key={item.label}>
            <span>{item.label}</span>
            <div><i className={`pp-funnel-bar pp-funnel-bar--${item.tone}`} style={{ width: `${Math.max((item.value / maxAcquisitionValue) * 100, item.value > 0 ? 8 : 0)}%` }} /></div>
            <strong>{item.value}</strong>
          </div>)}
        </div>
        <footer className="pp-panel__footer"><span><Radar aria-hidden="true" />Sem séries históricas disponíveis</span><small>O painel não fabrica tendências sem dados.</small></footer>
      </article>

      <article className="pp-panel pp-panel--attention">
        <SectionHeader title="Requer atenção" description="Pendências reais da sua operação." />
        <div className="pp-attention-list">
          {attentionLeads.length ? <Link href="/dashboard/leads" className="pp-attention-item">
            <span className="pp-attention-item__icon pp-tone--warning"><BellRing aria-hidden="true" /></span>
            <span><strong>{attentionLeads.length} lead(s) aguardando ação</strong><small>Revise antes do fim da reserva.</small></span>
            <ArrowRight aria-hidden="true" />
          </Link> : null}
          {invitations.length ? <Link href="/dashboard/students" className="pp-attention-item">
            <span className="pp-attention-item__icon pp-tone--accent"><UserPlus aria-hidden="true" /></span>
            <span><strong>{invitations.length} convite(s) pendente(s)</strong><small>Acompanhe os acessos dos alunos.</small></span>
            <ArrowRight aria-hidden="true" />
          </Link> : null}
          {!profile.published ? <Link href="/dashboard/site" className="pp-attention-item">
            <span className="pp-attention-item__icon pp-tone--info"><MonitorCheck aria-hidden="true" /></span>
            <span><strong>Perfil público não publicado</strong><small>Finalize a configuração do seu site.</small></span>
            <ArrowRight aria-hidden="true" />
          </Link> : null}
          {!attentionLeads.length && !invitations.length && profile.published ? <EmptyState compact icon={MonitorCheck} title="Tudo em dia" description="Nenhuma pendência identificada nos módulos disponíveis." /> : null}
        </div>
      </article>
    </section>

    <section className="pp-dashboard-grid pp-dashboard-grid--secondary" aria-label="Alunos, atividade e módulos">
      <article className="pp-panel pp-panel--students">
        <SectionHeader title="Alunos" description="Relacionamentos mais recentes." action={<Link href="/dashboard/students" className="pp-text-link">Ver todos <ArrowRight aria-hidden="true" /></Link>} />
        {studentsWorkspace && students.length ? <div className="pp-student-table" role="table" aria-label="Alunos recentes">
          <div className="pp-student-table__head" role="row"><span role="columnheader">Aluno</span><span role="columnheader">Origem</span><span role="columnheader">Desde</span><span role="columnheader">Status</span></div>
          {students.slice(0, 5).map((student) => <Link href={`/dashboard/students/${student.id}`} className="pp-student-row" role="row" key={student.id}>
            <span className="pp-student-row__identity" role="cell"><Avatar name={student.name} size="small" /><span><strong>{student.name}</strong><small>{student.email ?? "E-mail não informado"}</small></span></span>
            <span role="cell">{student.origin === "lead_conversion" ? "Lead convertido" : "Convite"}</span>
            <span role="cell">{formatDate(student.startedAt)}</span>
            <span role="cell"><Status tone={student.status === "active" ? "success" : "neutral"}>{student.status === "active" ? "Ativo" : student.status === "inactive" ? "Inativo" : "Encerrado"}</Status></span>
          </Link>)}
        </div> : <EmptyState icon={GraduationCap} title={studentsWorkspace ? "Nenhum aluno ainda" : "Alunos indisponíveis"} description={studentsWorkspace ? "Adicione um aluno para iniciar o acompanhamento." : "Não foi possível carregar este módulo agora."} action={studentsWorkspace ? <Link href="/dashboard/students" className="pp-button pp-button--secondary">Adicionar aluno</Link> : null} />}
      </article>

      <div className="pp-dashboard-rail">
        <article className="pp-panel pp-panel--site">
          <div className="pp-site-media">
            <Image src={profile.hero_image_url || "/images/saas/site-preview-trainer.webp"} alt="" fill loading="eager" sizes="(max-width: 900px) 100vw, 360px" unoptimized={Boolean(profile.hero_image_url)} />
            <span><Status tone={profile.published ? "success" : "warning"}>{profile.published ? "Publicado" : "Rascunho"}</Status></span>
          </div>
          <div className="pp-site-copy">
            <span className="pp-site-copy__label">Meu Site · {templateName}</span>
            <strong>pperfil.pro/p/{profile.slug}</strong>
            <p>{profile.published ? "Seu perfil está recebendo tráfego e pronto para conversão." : entitlements?.can_publish_site ? "Revise o conteúdo antes de publicar." : "Publicação ainda não habilitada para esta conta."}</p>
            <Link href="/dashboard/site" className="pp-text-link">Gerenciar site <ArrowRight aria-hidden="true" /></Link>
          </div>
        </article>

        <article className="pp-panel pp-panel--activity">
          <SectionHeader title="Atividade recente" />
          {activity.length ? <ol className="pp-activity-list">{activity.map((item) => <li key={item.id}>
            <span className={`pp-activity-dot pp-activity-dot--${item.kind}`} />
            <span><strong>{item.title}</strong><small>{item.detail}</small></span>
            <time dateTime={item.date}>{formatDate(item.date)}</time>
          </li>)}</ol> : <EmptyState compact icon={Radar} title="Sem atividade recente" description="As movimentações aparecerão aqui quando ocorrerem." />}
        </article>

        <article className="pp-panel pp-panel--unavailable">
          <span className="pp-attention-item__icon"><CircleDollarSign aria-hidden="true" /></span>
          <div><strong>Financeiro</strong><p>Módulo ainda não disponível nesta versão.</p></div>
          <Status>Em breve</Status>
        </article>
      </div>
    </section>
  </main>;
}
