import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Bell, ClipboardCheck, Dumbbell, ExternalLink, Globe2, Send, Share2, UserPlus, UsersRound } from "lucide-react";
import { getTrainerAssessmentIndex } from "@/lib/assessments/workspace";
import { getWorkoutIndex } from "@/lib/workouts/workspace";
import { Avatar, Status } from "@/components/ui/PPerfilPrimitives";
import { getLeadsWorkspace } from "@/lib/supabase/leads";
import { getStudentsWorkspace } from "@/lib/supabase/students";
import { findDashboardMetrics, findOwnerProfile } from "@/lib/supabase/trainers";
import { SupabaseWorkoutExecutionRepository } from "@/lib/supabase/workout-executions";
import { WorkoutExecutionService } from "@/lib/workouts/execution-service";

const dayFormatter = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" });

function countLabel(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export default async function DashboardPage() {
  const executionService = new WorkoutExecutionService(new SupabaseWorkoutExecutionRepository());
  const [profile, metrics, studentData, leadData, assessmentData, workoutData, workoutNotifications] = await Promise.all([
    findOwnerProfile(), findDashboardMetrics(), getStudentsWorkspace().catch(() => null), getLeadsWorkspace().catch(() => null), getTrainerAssessmentIndex().catch(() => null), getWorkoutIndex().catch(() => null), executionService.listTrainerNotifications(3).catch(() => []),
  ]);
  if (!profile) redirect("/onboarding");

  const students = studentData?.students ?? [];
  const activeStudents = students.filter((student) => student.status === "active");
  const invitations = studentData?.invitations ?? [];
  const attentionLeads = (leadData?.matches ?? []).filter((lead) => lead.state === "new" || lead.state === "pending");
  const reviewAssessments = (assessmentData?.items ?? []).filter(({ assessment }) => assessment.status === "ANSWERED" || assessment.status === "IN_REVIEW");
  const draftWorkouts = (workoutData?.items ?? []).filter(({ currentVersion }) => currentVersion.status === "DRAFT");
  const siteHref = `/p/${profile.slug}`;
  const siteUrl = `pperfil.com/p/${profile.slug}`;
  const priorities = [
    ...workoutNotifications.map((notification) => ({
      label: `${notification.studentName} concluiu ${notification.sessionName}`,
      href: `/dashboard/students/${notification.trainerStudentRelationshipId}`,
      action: "Ver aluno",
      icon: Bell,
      tone: "success",
    })),
    reviewAssessments.length ? { label: `${countLabel(reviewAssessments.length, "avaliação", "avaliações")} para revisar`, href: "/dashboard/assessments", action: "Revisar", icon: ClipboardCheck, tone: "warning" } : null,
    draftWorkouts.length ? { label: `${countLabel(draftWorkouts.length, "treino", "treinos")} em rascunho`, href: "/dashboard/workouts", action: "Continuar", icon: Dumbbell, tone: "accent" } : null,
    attentionLeads.length ? { label: `${countLabel(attentionLeads.length, "lead", "leads")} aguardando ação`, href: "/dashboard/leads", action: "Ver leads", icon: UsersRound, tone: "info" } : null,
    invitations.length ? { label: countLabel(invitations.length, "convite pendente", "convites pendentes"), href: "/dashboard/students", action: "Acompanhar", icon: Send, tone: "neutral" } : null,
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));

  return <main className="pc-dashboard">
    <header className="pc-dashboard__header"><div><h1>Bom dia, {profile.display_name.split(" ")[0]}</h1><p>{dayFormatter.format(new Date())}</p></div><Link className="pc-primary-action" href="/dashboard/workouts/new"><Dumbbell aria-hidden="true" />Criar treino</Link></header>

    <section className="pc-pulse" aria-label="Resumo do negócio">
      <div><strong>{activeStudents.length}</strong><span>alunos ativos</span></div><div><strong>{draftWorkouts.length}</strong><span>treinos em rascunho</span></div><div><strong>{reviewAssessments.length}</strong><span>avaliações pendentes</span></div><div><strong>{attentionLeads.length}</strong><span>novos leads</span></div><div><Status tone={profile.published ? "success" : "warning"}>{profile.published ? "Site publicado" : "Site em rascunho"}</Status></div>
    </section>

    <div className="pc-dashboard__workspace">
      <section className="pc-dashboard__today" aria-labelledby="today-title">
        <header><h2 id="today-title">Hoje</h2><span>{countLabel(priorities.length, "prioridade", "prioridades")}</span></header>
        <div className="pc-priority-list">{priorities.length ? priorities.map(({ label, href, action, icon: Icon, tone }) => <Link href={href} key={label} className="pc-priority-row"><span className={`pc-priority-row__icon pc-tone--${tone}`}><Icon aria-hidden="true" /></span><strong>{label}</strong><span>{action}</span><ArrowRight aria-hidden="true" /></Link>) : <div className="pc-quiet-state"><strong>Nenhuma pendência nos módulos disponíveis.</strong><span>Seu dia começa organizado.</span></div>}</div>

        <div className="pc-section-heading"><h2>Alunos</h2><Link href="/dashboard/students">Ver todos <ArrowRight aria-hidden="true" /></Link></div>
        <div className="pc-student-list">{activeStudents.slice(0, 5).map((student) => <Link href={`/dashboard/students/${student.id}`} key={student.id}><Avatar name={student.name} size="small" /><span><strong>{student.name}</strong><small>{student.email ?? "Contato não informado"}</small></span><Status tone="success">Ativo</Status><ArrowRight aria-hidden="true" /></Link>)}{!activeStudents.length ? <div className="pc-quiet-state"><strong>Nenhum aluno ativo.</strong><Link href="/dashboard/students?add=1#add-student">Adicionar aluno</Link></div> : null}</div>
      </section>

      <aside className="pc-dashboard__rail">
        <section className="pc-site-panel"><header><Globe2 aria-hidden="true" /><div><strong>Meu Site</strong><Status tone={profile.published ? "success" : "warning"}>{profile.published ? "Publicado" : "Rascunho"}</Status></div></header><a href={siteHref} target="_blank" rel="noreferrer">{siteUrl}<ExternalLink aria-hidden="true" /></a>{profile.published ? <p>{metrics.profile_views.toLocaleString("pt-BR")} visitas · {metrics.leads.toLocaleString("pt-BR")} leads</p> : <p>Finalize a revisão antes de publicar.</p>}<div><Link href={siteHref} target="_blank">Abrir</Link><Link href="/dashboard/site">Editar</Link><Link href="/dashboard/site"><Share2 aria-hidden="true" />Compartilhar</Link></div></section>
        <section className="pc-quick-actions" aria-labelledby="quick-actions-title"><h2 id="quick-actions-title">Ações rápidas</h2><div><Link href="/dashboard/students?add=1#add-student"><UserPlus aria-hidden="true" />Adicionar aluno</Link><Link href="/dashboard/workouts/new"><Dumbbell aria-hidden="true" />Criar treino</Link><Link href="/dashboard/assessments/new"><ClipboardCheck aria-hidden="true" />Nova avaliação</Link><Link href="/dashboard/site"><Globe2 aria-hidden="true" />Meu Site</Link></div></section>
        <p className="pc-data-note">Mensagens e check-ins aparecerão quando esses módulos disponibilizarem dados confiáveis.</p>
      </aside>
    </div>
  </main>;
}
