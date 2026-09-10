import Link from "next/link";
import { DashboardMotionReady } from "@/components/dashboard/DashboardMotion";
import { TodayHero, type TodayMetric } from "@/components/dashboard/TodayHero";
import { redirect } from "next/navigation";
import { ArrowRight, Bell, ClipboardCheck, Dumbbell, Globe2, Send, UsersRound } from "lucide-react";
import { getTrainerAssessmentIndex } from "@/lib/assessments/workspace";
import { getWorkoutIndex } from "@/lib/workouts/workspace";
import { Avatar } from "@/components/ui/PPerfilPrimitives";
import { getLeadsWorkspace } from "@/lib/supabase/leads";
import { getStudentsWorkspace } from "@/lib/supabase/students";
import { findOwnerProfile } from "@/lib/supabase/trainers";
import { SupabaseWorkoutExecutionRepository } from "@/lib/supabase/workout-executions";
import { WorkoutExecutionService } from "@/lib/workouts/execution-service";
import { listCommunityNotifications } from "@/lib/supabase/community";

const dayFormatter = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" });

function countLabel(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export default async function DashboardPage() {
  const executionService = new WorkoutExecutionService(new SupabaseWorkoutExecutionRepository());
  const [profile, studentData, leadData, assessmentData, workoutData, workoutNotifications, communityNotifications] = await Promise.all([
    findOwnerProfile(), getStudentsWorkspace().catch(() => null), getLeadsWorkspace().catch(() => null), getTrainerAssessmentIndex().catch(() => null), getWorkoutIndex().catch(() => null), executionService.listTrainerNotifications(3).catch(() => []), listCommunityNotifications().catch(() => []),
  ]);
  if (!profile) redirect("/onboarding");

  const students = studentData?.students ?? [];
  const activeStudents = students.filter((student) => student.status === "active");
  const invitations = studentData?.invitations ?? [];
  const attentionLeads = (leadData?.matches ?? []).filter((lead) => lead.state === "new" || lead.state === "pending");
  const reviewAssessments = (assessmentData?.items ?? []).filter(({ assessment }) => assessment.status === "ANSWERED" || assessment.status === "IN_REVIEW");
  const draftWorkouts = (workoutData?.items ?? []).filter(({ currentVersion }) => currentVersion.status === "DRAFT");
  const communityRequests = communityNotifications.filter((notification) => notification.type === "JOIN_REQUEST" && !notification.readAt);
  const communityRequestGroup = communityRequests[0]?.groupId;
  const priorities = [
    ...workoutNotifications.map((notification) => ({
      label: `${notification.studentName} concluiu ${notification.sessionName}`,
      href: `/dashboard/students/${notification.trainerStudentRelationshipId}`,
      action: "Ver aluno",
      icon: Bell,
      tone: "success",
    })),
    communityRequests.length ? { label: `${countLabel(communityRequests.length, "solicitação", "solicitações")} de entrada em grupos`, href: communityRequestGroup ? `/dashboard/community/groups/${communityRequestGroup}/manage` : "/dashboard/community", action: "Revisar", icon: UsersRound, tone: "warning" } : null,
    reviewAssessments.length ? { label: `${countLabel(reviewAssessments.length, "avaliação", "avaliações")} para revisar`, href: "/dashboard/assessments", action: "Revisar", icon: ClipboardCheck, tone: "warning" } : null,
    draftWorkouts.length ? { label: `${countLabel(draftWorkouts.length, "treino", "treinos")} em rascunho`, href: "/dashboard/workouts", action: "Continuar", icon: Dumbbell, tone: "accent" } : null,
    attentionLeads.length ? { label: `${countLabel(attentionLeads.length, "lead", "leads")} aguardando ação`, href: "/dashboard/leads", action: "Ver leads", icon: UsersRound, tone: "info" } : null,
    invitations.length ? { label: countLabel(invitations.length, "convite pendente", "convites pendentes"), href: "/dashboard/students", action: "Acompanhar", icon: Send, tone: "neutral" } : null,
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));

  const hasWorkspaceContent = priorities.length > 0 || activeStudents.length > 0 || attentionLeads.length > 0 || profile.published;

  const metrics: TodayMetric[] = [
    ...(studentData ? [{ id: "students" as const, value: activeStudents.length, label: "Alunos ativos", href: "/dashboard/students" }] : []),
    ...(workoutData ? [{ id: "workouts" as const, value: draftWorkouts.length, label: "Treinos em rascunho", href: "/dashboard/workouts?status=draft" }] : []),
    ...(assessmentData ? [{ id: "assessments" as const, value: reviewAssessments.length, label: "Avaliações para revisar", href: "/dashboard/assessments" }] : []),
    ...(leadData ? [{ id: "leads" as const, value: attentionLeads.length, label: "Leads aguardando ação", href: "/dashboard/leads" }] : []),
  ];
  const firstPriority = priorities[0];
  const unavailable = !studentData || !leadData || !assessmentData || !workoutData;

  return <main className="pc-dashboard cheipi-today">
    <TodayHero name={profile.display_name.split(" ")[0]} date={dayFormatter.format(new Date())} metrics={metrics} />
    {unavailable ? <p className="cheipi-quiet-copy" role="status">Parte do resumo está indisponível. Abra a área desejada para tentar novamente.</p> : null}
    <section className="cheipi-next-action" aria-labelledby="today-title">
      <span>{firstPriority ? "Sua próxima ação" : unavailable ? "Resumo incompleto" : hasWorkspaceContent ? "Tudo em dia" : "Seu espaço está pronto"}</span>
      <h2 id="today-title">{firstPriority?.label ?? (unavailable ? "Acompanhe suas atividades." : hasWorkspaceContent ? "Continue o acompanhamento." : "Seu primeiro aluno começa aqui.")}</h2>
      {!firstPriority ? <p>{unavailable ? "Abra a área desejada para consultar os dados disponíveis." : hasWorkspaceContent ? "Quando houver algo para acompanhar, você encontra aqui." : "Convide seu primeiro aluno ou prepare seu site para apresentar seu trabalho."}</p> : null}
      <Link href={firstPriority?.href ?? (unavailable || hasWorkspaceContent ? "/dashboard/students" : "/dashboard/students?add=1#add-student")}>
        {firstPriority?.action ?? (unavailable || hasWorkspaceContent ? "Ver alunos" : "Adicionar aluno")}<ArrowRight aria-hidden="true" />
      </Link>
    </section>
    {!hasWorkspaceContent ? <Link className="cheipi-text-link" href="/dashboard/site">Preparar meu site<ArrowRight aria-hidden="true" /></Link> : null}
    {priorities.length > 1 ? <section className="cheipi-today-priorities" aria-label="Outras ações">
      <div className="pc-priority-list">{priorities.slice(1, 3).map(({ label, href, action, icon: Icon }) => <Link href={href} key={label} className="pc-priority-row"><span className="pc-priority-row__icon"><Icon aria-hidden="true" /></span><span><strong>{label}</strong><small>{action}</small></span><ArrowRight aria-hidden="true" /></Link>)}</div>
      {priorities.length > 3 ? <details className="cheipi-other-priorities"><summary>Mais {priorities.length - 3} pendências</summary><div className="pc-priority-list">{priorities.slice(3).map(({ label, href, action, icon: Icon }) => <Link href={href} key={label} className="pc-priority-row"><span className="pc-priority-row__icon"><Icon aria-hidden="true" /></span><span><strong>{label}</strong><small>{action}</small></span><ArrowRight aria-hidden="true" /></Link>)}</div></details> : null}
    </section> : null}

    <section className="cheipi-today-students" aria-label="Seus alunos">
      <header className="cheipi-section-heading"><h2>Alunos</h2><Link href="/dashboard/students">Ver todos<ArrowRight aria-hidden="true" /></Link></header>
      <div className="pc-student-list">{activeStudents.slice(0, 5).map((student) => <Link href={`/dashboard/students/${student.id}`} key={student.id}><Avatar name={student.name} imageUrl={student.profileImageUrl} size="small" /><span><strong>{student.name}</strong><small>Acompanhamento ativo</small></span><ArrowRight aria-hidden="true" /></Link>)}{!activeStudents.length ? <p className="cheipi-quiet-copy">Seus alunos aparecerão aqui depois de aceitar o convite.</p> : null}</div>
    </section>

    <div className="cheipi-today-actions"><Link className="pp-button pp-button--primary" href="/dashboard/workouts/new"><Dumbbell aria-hidden="true" />Criar treino</Link><Link className="pp-button pp-button--secondary" href="/dashboard/assessments/new"><ClipboardCheck aria-hidden="true" />Nova avaliação</Link></div>
    <Link className="cheipi-home-site" href="/dashboard/site"><Globe2 aria-hidden="true" /><span><strong>Meu site</strong><small>{profile.published ? "Publicado · pronto para compartilhar" : "Rascunho · continue quando quiser"}</small></span><ArrowRight aria-hidden="true" /></Link>
    <DashboardMotionReady route="/dashboard" targets={[".cheipi-today > section"]} motion="slide" />
  </main>;
}
