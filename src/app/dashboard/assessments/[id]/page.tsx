import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock3, Eye, MessageSquareText, Ruler, ShieldCheck, UserRound } from "lucide-react";
import { AssessmentLifecycleAction } from "@/components/assessments/AssessmentLifecycleAction";
import { AssessmentStatusBadge } from "@/components/assessments/AssessmentStatusBadge";
import { DraftAssessmentMetadataForm } from "@/components/assessments/DraftAssessmentMetadataForm";
import { ActionGroup, ContextPanel, MasterDetail } from "@/components/ui/PPerfilOperational";
import { Avatar, EmptyState } from "@/components/ui/PPerfilPrimitives";
import {
  assessmentTypeLabels,
  formatAnswer,
  formatAssessmentDate,
  formatAssessmentDateTime,
  localText,
} from "@/lib/assessments/presentation";
import { getTrainerAssessmentRecord } from "@/lib/assessments/workspace";

export default async function TrainerAssessmentDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ student?: string }> }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const record = await getTrainerAssessmentRecord(id);
  if (!record) notFound();
  const { assessment, student, template, measurements, events } = record;
  const studentName = student?.name ?? "Aluno";
  const backHref = student?.id === query.student ? `/dashboard/assessments?student=${query.student}` : "/dashboard/assessments";
  const answersByKey = new Map(assessment.answers.map((answer) => [answer.questionKey, answer.value]));
  const responseQuestions = assessment.templateSchema.questions.filter((question) => question.type !== "MEASUREMENT");
  const measurementQuestions = assessment.templateSchema.questions.filter((question) => question.type === "MEASUREMENT");
  const answerGroups = [
    { title: "Contexto e objetivos", questions: responseQuestions.filter((question) => question.type !== "SCALE" && question.type !== "PHOTO_REQUEST") },
    { title: "Percepção do período", questions: responseQuestions.filter((question) => question.type === "SCALE") },
    { title: "Registros complementares", questions: responseQuestions.filter((question) => question.type === "PHOTO_REQUEST") },
  ].filter((group) => group.questions.length > 0);
  const eventLabels = { CREATED: "Avaliação criada", DRAFT_UPDATED: "Configuração do Draft atualizada", SENT: "Enviada ao aluno", ANSWER_SAVED: "Resposta salva", SUBMITTED: "Respostas enviadas", REVIEW_STARTED: "Revisão iniciada", COMPLETED: "Avaliação concluída" } as const;

  return <main className="dashboard-main pp-record-page pp-assessment-record">
    <Link href={backHref} className="pp-back-link"><ArrowLeft aria-hidden="true" />Voltar para avaliações</Link>

    <header className="pp-record-header pp-assessment-record__header">
      <Avatar name={studentName} imageUrl={student?.profileImageUrl} size="large" />
      <div><div className="pp-record-header__title"><h1>{assessment.title}</h1><AssessmentStatusBadge status={assessment.status} /></div><p>{studentName} · {template ? assessmentTypeLabels[template.assessmentType] : "Avaliação versionada"}</p></div>
    </header>

    <nav className="pp-record-tabs" aria-label="Seções da avaliação">
      <a href="#visao-geral" aria-current="page">Visão geral</a><a href="#respostas">Respostas</a><a href="#medidas">Medidas</a><a href="#feedback">Feedback</a><a href="#historico">Histórico</a>
    </nav>

    <MasterDetail aside={<>
      {assessment.status === "DRAFT" ? <ActionGroup title="Configuração do Draft" description="Título, prazo e prioridade podem ser ajustados até o envio.">
        <DraftAssessmentMetadataForm assessmentId={assessment.id} title={assessment.title} isRequired={assessment.isRequired} dueAt={assessment.dueAt} />
      </ActionGroup> : null}
      <ActionGroup title="Próxima ação" description={assessment.status === "DRAFT" ? "Revise os dados e confirme o envio." : assessment.status === "SENT" ? "A avaliação está disponível para o aluno responder." : assessment.status === "ANSWERED" ? "Abra a revisão para preparar sua devolutiva." : assessment.status === "IN_REVIEW" ? "Registre o feedback antes de concluir." : "O ciclo está concluído e preservado como histórico."}>
        {assessment.status === "DRAFT" ? <><AssessmentLifecycleAction kind="send" assessmentId={assessment.id} studentName={studentName} assessmentTitle={assessment.title} returnHref={backHref} /><p className="pp-assessment-constraint">Após o envio, título, prazo e prioridade tornam-se somente leitura na V1.</p></> : null}
        {assessment.status === "SENT" ? <div className="pp-waiting-state"><Clock3 aria-hidden="true" /><strong>Aguardando resposta</strong><p>Nenhuma notificação fictícia foi registrada. O status mudará somente após o envio real do aluno.</p><Link href={`/student/assessments/${assessment.id}`} className="pp-button pp-button--secondary"><Eye aria-hidden="true" />Abrir experiência do aluno</Link></div> : null}
        {assessment.status === "ANSWERED" ? <AssessmentLifecycleAction kind="review" assessmentId={assessment.id} studentName={studentName} assessmentTitle={assessment.title} /> : null}
        {assessment.status === "IN_REVIEW" ? <AssessmentLifecycleAction kind="complete" assessmentId={assessment.id} studentName={studentName} assessmentTitle={assessment.title} /> : null}
        {assessment.status === "COMPLETED" ? <div className="pp-completed-state"><ShieldCheck aria-hidden="true" /><strong>Histórico somente leitura</strong><p>A conclusão, as respostas, medidas e a devolutiva não são editáveis nesta etapa.</p><Link href={`/student/assessments/${assessment.id}`} className="pp-button pp-button--secondary"><Eye aria-hidden="true" />Ver experiência final</Link></div> : null}
      </ActionGroup>
      <ActionGroup title="Contexto do aluno">
        <div className="pp-assessment-student-card"><Avatar name={studentName} imageUrl={student?.profileImageUrl} size="medium" /><span><strong>{studentName}</strong><small>{student?.email ?? "Contato protegido"}</small></span></div>
        {student ? <Link className="pp-text-link" href={`/dashboard/students/${student.id}`}><UserRound aria-hidden="true" />Abrir perfil do aluno</Link> : null}
      </ActionGroup>
    </>}>
      <ContextPanel title="Visão geral" description={assessment.status === "DRAFT" ? "A configuração pode ser ajustada no painel enquanto o status permanecer Draft." : "Dados imutáveis desta aplicação após o envio."} className="pp-assessment-overview" >
        <dl className="pp-detail-list" id="visao-geral">
          <div><dt>Status</dt><dd><AssessmentStatusBadge status={assessment.status} /></dd></div>
          <div><dt>Modelo</dt><dd>{template?.name ?? "Versão preservada"}<small>{template ? assessmentTypeLabels[template.assessmentType] : assessment.templateVersionId}</small></dd></div>
          <div><dt><CalendarDays aria-hidden="true" />Criada em</dt><dd>{formatAssessmentDate(assessment.createdAt)}</dd></div>
          <div><dt><CalendarDays aria-hidden="true" />Prazo</dt><dd>{formatAssessmentDate(assessment.dueAt, "Sem prazo")}</dd></div>
          <div><dt>Prioridade</dt><dd>{assessment.isRequired ? "Resposta obrigatória" : "Resposta opcional"}</dd></div>
          <div><dt>Conteúdo</dt><dd>{assessment.templateSchema.questions.length} perguntas<small>Versão {template?.versions.find((version) => version.id === assessment.templateVersionId)?.versionNumber ?? "preservada"}</small></dd></div>
        </dl>
      </ContextPanel>

      <ContextPanel title="Respostas" description={assessment.answers.length ? "Respostas agrupadas conforme o modelo aplicado." : "As respostas aparecerão aqui depois do envio do aluno."} className="pp-assessment-answers">
        <div id="respostas">
          {assessment.status === "DRAFT" ? <ol className="pp-question-preview">{assessment.templateSchema.questions.map((question, index) => <li key={question.key}><span>{String(index + 1).padStart(2, "0")}</span><strong>{localText(question.label)}</strong><small>{question.required ? "Obrigatória" : "Opcional"}</small></li>)}</ol> : assessment.answers.length ? <div className="pp-answer-groups">{answerGroups.map((group) => <section key={group.title}><h3>{group.title}</h3><dl className="pp-answer-list">{group.questions.map((question) => <div key={question.key}><dt><span>{String(responseQuestions.indexOf(question) + 1).padStart(2, "0")}</span><strong>{localText(question.label)}</strong>{question.required ? <small>Obrigatória</small> : null}</dt><dd>{formatAnswer(question, answersByKey.get(question.key))}</dd></div>)}</dl></section>)}</div> : <EmptyState compact icon={MessageSquareText} title="Aguardando respostas" description="Nenhuma resposta foi registrada para esta aplicação." />}
        </div>
      </ContextPanel>

      <ContextPanel title="Medidas" description="Valor, unidade e contexto de origem são exibidos sem conversão automática." className="pp-assessment-measurements">
        <div id="medidas">
          {measurementQuestions.length ? <div className="pp-measurement-list">{measurementQuestions.map((question) => {
            const measurement = measurements.find((item) => item.measurementCode === question.measurement.code);
            const answerValue = answersByKey.get(question.key);
            return <article key={question.key}><span><Ruler aria-hidden="true" /></span><div><strong>{localText(question.label)}</strong><small>{measurement ? `Origem: esta avaliação · ${formatAssessmentDateTime(measurement.measuredAt)}` : "Sem medida extraída desta avaliação"}</small></div><b>{measurement ? `${measurement.value.toLocaleString("pt-BR")} ${measurement.unitCode}` : formatAnswer(question, answerValue)}</b></article>;
          })}</div> : <EmptyState compact icon={Ruler} title="Modelo sem medidas" description="Esta versão não solicita medidas corporais." />}
        </div>
      </ContextPanel>

      <ContextPanel title="Feedback do Personal" description={assessment.status === "COMPLETED" ? "Devolutiva final liberada ao aluno." : "A devolutiva é escrita durante a revisão e só aparece ao aluno após a conclusão."} className="pp-assessment-feedback">
        <div id="feedback">{assessment.status === "COMPLETED" && assessment.trainerFeedback ? <blockquote><MessageSquareText aria-hidden="true" /><p>{assessment.trainerFeedback}</p><footer>Devolutiva de {formatAssessmentDate(assessment.completedAt)}</footer></blockquote> : <p className="pp-muted-copy">{assessment.status === "IN_REVIEW" ? "Use o painel de ação para escrever e confirmar o feedback final." : "Nenhum feedback final disponível neste estado."}</p>}</div>
      </ContextPanel>

      <ContextPanel title="Histórico" description="Linha do tempo derivada dos timestamps autoritativos do ciclo." className="pp-assessment-history">
        <ol id="historico">{events.map((event, index) => <li key={event.id}><span className={index === 0 ? "active" : undefined} /><div><strong>{eventLabels[event.eventType]}{event.eventType === "ANSWER_SAVED" && typeof event.metadata.question_key === "string" ? ` · ${event.metadata.question_key}` : ""}</strong><small>{formatAssessmentDateTime(event.createdAt)}</small></div></li>)}</ol>
      </ContextPanel>
    </MasterDetail>
  </main>;
}
