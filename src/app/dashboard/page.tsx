import "./dashboard-v3.css";

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
import { Avatar, EmptyState, Status } from "@/components/ui/PPerfilPrimitives";
import { getLeadsWorkspace } from "@/lib/supabase/leads";
import { getStudentsWorkspace } from "@/lib/supabase/students";
import {
  findDashboardMetrics,
  findOwnerEntitlements,
  findOwnerProfile,
} from "@/lib/supabase/trainers";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
});

function formatDate(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? "Data indisponível"
    : dateFormatter.format(parsed);
}
export default async function DashboardPage() {
  const [profile, entitlements, metrics, studentsWorkspace, leadsWorkspace] =
    await Promise.all([
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
  const attentionLeads = leads.filter(
    (lead) => lead.state === "new" || lead.state === "pending",
  );

  const maxAcquisitionValue = Math.max(
    metrics.profile_views,
    metrics.whatsapp_clicks,
    metrics.leads,
    1,
  );

  const templateName =
    profile.template_id === "template_01"
      ? "Essential Editorial"
      : profile.template_id === "template_02"
        ? "Motion"
        : "Conversion";

  const activity = [
    ...students.map((student) => ({
      id: `student-${student.id}`,
      date: student.startedAt,
      title: student.name,
      detail:
        student.status === "active"
          ? "Aluno ativo"
          : "Relacionamento atualizado",
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
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 4);

  return (
    <main className="dashboard-main pp-dashboard-v3">
      <header className="ppv3-page-head">
        <div>
          <p className="ppv3-kicker">Visão operacional</p>
          <h1>Dashboard</h1>
          <p>
            Olá, {firstName}. Acompanhe sua operação e priorize o que precisa
            de atenção.
          </p>
        </div>

        <Link
          href="/dashboard/students"
          className="ppv3-button ppv3-button--primary"
        >
          <Plus aria-hidden="true" />
          Adicionar aluno
        </Link>
      </header>

      <section className="ppv3-grid">
        {/* Approved V3 banner. Uses only current dashboard truths. */}
        <article className="ppv3-card ppv3-hero">
          <div className="ppv3-hero__copy">
            <span className="ppv3-kicker ppv3-kicker--accent">
              Resumo de hoje
            </span>
            <h2>
              Sua operação está
              <br />
              em movimento.
            </h2>
            <p>
              Você tem <strong>{attentionLeads.length} leads aguardando ação</strong>,
              {" "}
              <strong>{invitations.length} convites pendentes</strong> e{" "}
              <strong>{activeStudents.length} alunos ativos</strong>.
            </p>
          </div>

          <div className="ppv3-hero__actions">
            <Link href="/dashboard/leads" className="ppv3-button ppv3-button--primary">
              Ver prioridades
            </Link>
            {attentionLeads.length > 0 ? (
              <span className="ppv3-pill ppv3-pill--warning">
                {attentionLeads.length} leads em atenção
              </span>
            ) : null}
            {invitations.length > 0 ? (
              <span className="ppv3-pill ppv3-pill--accent">
                {invitations.length} convites
              </span>
            ) : null}
            <small>sem métricas inventadas</small>
          </div>
        </article>

        {/* Existing Meu Site information, moved upward visually. */}
        <article className="ppv3-card ppv3-site-card">
          <div className="ppv3-site-card__media">
            <Image
              src={
                profile.hero_image_url ||
                "/images/saas/site-preview-trainer.webp"
              }
              alt=""
              fill
              loading="eager"
              sizes="(max-width: 900px) 100vw, 360px"
              unoptimized={Boolean(profile.hero_image_url)}
            />
            <span className="ppv3-site-card__status">
              <Status tone={profile.published ? "success" : "warning"}>
                {profile.published ? "Publicado" : "Rascunho"}
              </Status>
            </span>
          </div>

          <div className="ppv3-site-card__copy">
            <span>Meu Site · {templateName}</span>
            <strong>pperfil.pro/p/{profile.slug}</strong>
            <p>
              {profile.published
                ? "Seu perfil está recebendo tráfego e pronto para conversão."
                : entitlements?.can_publish_site
                  ? "Revise o conteúdo antes de publicar."
                  : "Publicação ainda não habilitada para esta conta."}
            </p>
            <Link href="/dashboard/site" className="ppv3-text-link">
              Gerenciar site <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </article>

        <article className="ppv3-card ppv3-kpi">
          <div className="ppv3-kpi__top">
            <span className="ppv3-kpi__icon ppv3-tone--success">
              <GraduationCap aria-hidden="true" />
            </span>
            <small>Alunos ativos</small>
          </div>
          <div>
            <strong>{studentsWorkspace ? activeStudents.length : "—"}</strong>
            <p>
              {studentsWorkspace
                ? `${invitations.length} convite(s) pendente(s)`
                : "Dados indisponíveis"}
            </p>
          </div>
        </article>

        <article className="ppv3-card ppv3-kpi">
          <div className="ppv3-kpi__top">
            <span className="ppv3-kpi__icon ppv3-tone--accent">
              <UsersRound aria-hidden="true" />
            </span>
            <small>Leads em atenção</small>
          </div>
          <div>
            <strong>{leadsWorkspace ? attentionLeads.length : metrics.leads}</strong>
            <p>{metrics.leads} oportunidade(s) atribuída(s)</p>
          </div>
        </article>

        <article className="ppv3-card ppv3-kpi">
          <div className="ppv3-kpi__top">
            <span className="ppv3-kpi__icon ppv3-tone--info">
              <Eye aria-hidden="true" />
            </span>
            <small>Visitas ao perfil</small>
          </div>
          <div>
            <strong>{metrics.profile_views.toLocaleString("pt-BR")}</strong>
            <p>Acessos únicos na janela atual</p>
          </div>
        </article>

        <article className="ppv3-card ppv3-kpi">
          <div className="ppv3-kpi__top">
            <span className="ppv3-kpi__icon ppv3-tone--warning">
              <MessageCircle aria-hidden="true" />
            </span>
            <small>Contatos</small>
          </div>
          <div>
            <strong>{metrics.whatsapp_clicks.toLocaleString("pt-BR")}</strong>
            <p>Cliques rastreados no WhatsApp</p>
          </div>
        </article>

        <article className="ppv3-card ppv3-acquisition">
          <div className="ppv3-section-head">
            <div>
              <h3>Aquisição</h3>
              <p>Dados reais disponíveis no funil do seu perfil.</p>
            </div>
            <Link href="/dashboard/site" className="ppv3-text-link">
              Meu Site <ArrowUpRight aria-hidden="true" />
            </Link>
          </div>

          <div className="ppv3-funnel">
            {[
              {
                label: "Visitas ao perfil",
                value: metrics.profile_views,
                tone: "info",
              },
              {
                label: "Cliques no WhatsApp",
                value: metrics.whatsapp_clicks,
                tone: "accent",
              },
              {
                label: "Leads atribuídos",
                value: metrics.leads,
                tone: "success",
              },
            ].map((item) => (
              <div className="ppv3-funnel__row" key={item.label}>
                <span>{item.label}</span>
                <div className="ppv3-funnel__track">
                  <i
                    className={`ppv3-funnel__bar ppv3-funnel__bar--${item.tone}`}
                    style={{
                      width: `${Math.max(
                        (item.value / maxAcquisitionValue) * 100,
                        item.value > 0 ? 0.65 : 0,
                      )}%`,
                    }}
                  />
                </div>
                <strong>{item.value.toLocaleString("pt-BR")}</strong>
              </div>
            ))}
          </div>

          <footer className="ppv3-truth-note">
            <span>
              <Radar aria-hidden="true" />
              Sem séries históricas disponíveis
            </span>
            <small>O painel não fabrica tendências sem dados.</small>
          </footer>
        </article>

        <article className="ppv3-card ppv3-attention">
          <div className="ppv3-section-head">
            <div>
              <h3>Requer atenção</h3>
              <p>Pendências reais da sua operação.</p>
            </div>
          </div>

          <div className="ppv3-attention-list">
            {attentionLeads.length ? (
              <Link href="/dashboard/leads" className="ppv3-attention-item">
                <span className="ppv3-attention-item__icon ppv3-tone--warning">
                  <BellRing aria-hidden="true" />
                </span>
                <span>
                  <strong>{attentionLeads.length} lead(s) aguardando ação</strong>
                  <small>Revise antes do fim da reserva.</small>
                </span>
                <ArrowRight aria-hidden="true" />
              </Link>
            ) : null}

            {invitations.length ? (
              <Link href="/dashboard/students" className="ppv3-attention-item">
                <span className="ppv3-attention-item__icon ppv3-tone--accent">
                  <UserPlus aria-hidden="true" />
                </span>
                <span>
                  <strong>{invitations.length} convite(s) pendente(s)</strong>
                  <small>Acompanhe os acessos dos alunos.</small>
                </span>
                <ArrowRight aria-hidden="true" />
              </Link>
            ) : null}

            {!profile.published ? (
              <Link href="/dashboard/site" className="ppv3-attention-item">
                <span className="ppv3-attention-item__icon ppv3-tone--info">
                  <MonitorCheck aria-hidden="true" />
                </span>
                <span>
                  <strong>Perfil público não publicado</strong>
                  <small>Finalize a configuração do seu site.</small>
                </span>
                <ArrowRight aria-hidden="true" />
              </Link>
            ) : null}

            {!attentionLeads.length &&
            !invitations.length &&
            profile.published ? (
              <EmptyState
                compact
                icon={MonitorCheck}
                title="Tudo em dia"
                description="Nenhuma pendência identificada nos módulos disponíveis."
              />
            ) : null}
          </div>
        </article>

        <article className="ppv3-card ppv3-students">
          <div className="ppv3-students__head">
            <div>
              <h3>Alunos</h3>
              <p>Relacionamentos mais recentes.</p>
            </div>
            <Link href="/dashboard/students" className="ppv3-text-link">
              Ver todos <ArrowRight aria-hidden="true" />
            </Link>
          </div>

          {studentsWorkspace && students.length ? (
            <div className="ppv3-student-table" role="table" aria-label="Alunos recentes">
              <div className="ppv3-student-table__head" role="row">
                <span role="columnheader">Aluno</span>
                <span role="columnheader">Origem</span>
                <span role="columnheader">Desde</span>
                <span role="columnheader">Status</span>
              </div>

              {students.slice(0, 5).map((student) => (
                <Link
                  href={`/dashboard/students/${student.id}`}
                  className="ppv3-student-row"
                  role="row"
                  key={student.id}
                >
                  <span className="ppv3-student-row__identity" role="cell">
                    <Avatar name={student.name} size="small" />
                    <span>
                      <strong>{student.name}</strong>
                      <small>{student.email ?? "E-mail não informado"}</small>
                    </span>
                  </span>
                  <span role="cell">
                    {student.origin === "lead_conversion"
                      ? "Lead convertido"
                      : "Convite"}
                  </span>
                  <span role="cell">{formatDate(student.startedAt)}</span>
                  <span role="cell">
                    <Status
                      tone={student.status === "active" ? "success" : "neutral"}
                    >
                      {student.status === "active"
                        ? "Ativo"
                        : student.status === "inactive"
                          ? "Inativo"
                          : "Encerrado"}
                    </Status>
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={GraduationCap}
              title={
                studentsWorkspace
                  ? "Nenhum aluno ainda"
                  : "Alunos indisponíveis"
              }
              description={
                studentsWorkspace
                  ? "Adicione um aluno para iniciar o acompanhamento."
                  : "Não foi possível carregar este módulo agora."
              }
              action={
                studentsWorkspace ? (
                  <Link
                    href="/dashboard/students"
                    className="ppv3-button"
                  >
                    Adicionar aluno
                  </Link>
                ) : null
              }
            />
          )}
        </article>

        <div className="ppv3-rail">
          <article className="ppv3-card ppv3-activity">
            <div className="ppv3-section-head">
              <div>
                <h3>Atividade recente</h3>
              </div>
            </div>

            {activity.length ? (
              <ol>
                {activity.map((item) => (
                  <li key={item.id}>
                    <span
                      className={`ppv3-activity-dot ppv3-activity-dot--${item.kind}`}
                    />
                    <span>
                      <strong>{item.title}</strong>
                      <small>{item.detail}</small>
                    </span>
                    <time dateTime={item.date}>{formatDate(item.date)}</time>
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyState
                compact
                icon={Radar}
                title="Sem atividade recente"
                description="As movimentações aparecerão aqui quando ocorrerem."
              />
            )}
          </article>

          <article className="ppv3-card ppv3-finance">
            <span className="ppv3-finance__icon">
              <CircleDollarSign aria-hidden="true" />
            </span>
            <div>
              <strong>Financeiro</strong>
              <p>Módulo ainda não disponível nesta versão.</p>
            </div>
            <Status>Em breve</Status>
          </article>
        </div>
      </section>
    </main>
  );
}
