"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarDays, Check, ClipboardCheck, Send, UserRound } from "lucide-react";
import { createAssessmentAction } from "@/app/actions/assessments";
import { Avatar } from "@/components/ui/PPerfilPrimitives";
import type { AssessmentTemplateSummary } from "@/lib/domain/assessments";
import type { ManagedStudent } from "@/lib/domain/students";
import { assessmentTypeLabels, estimateAssessmentMinutes } from "@/lib/assessments/presentation";

const steps = ["Aluno", "Modelo", "Configuração", "Revisão"];

export function NewAssessmentWizard({ students, templates, demoMode }: { students: ManagedStudent[]; templates: AssessmentTemplateSummary[]; demoMode: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [title, setTitle] = useState(templates[0]?.name ?? "");
  const [dueAt, setDueAt] = useState("");
  const [required, setRequired] = useState(templates[0]?.defaultRequired ?? false);
  const [state, formAction, pending] = useActionState(createAssessmentAction, {});

  const student = students.find((item) => item.id === studentId);
  const template = templates.find((item) => item.id === templateId);
  const version = template?.versions.toSorted((a, b) => b.versionNumber - a.versionNumber)[0];
  const minimumDueDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date.toISOString().slice(0, 10);
  }, []);

  useEffect(() => {
    if (state.ok && state.assessmentId) router.push(`/dashboard/assessments/${state.assessmentId}`);
  }, [router, state.assessmentId, state.ok]);

  function chooseTemplate(id: string) {
    const next = templates.find((item) => item.id === id);
    setTemplateId(id);
    if (next) {
      setTitle(next.name);
      setRequired(next.defaultRequired);
    }
  }

  const canContinue = step === 0 ? Boolean(student) : step === 1 ? Boolean(template && version) : step === 2 ? title.trim().length >= 2 : true;

  return <form action={formAction} className="pp-assessment-wizard">
    <input type="hidden" name="relationship_id" value={studentId} />
    <input type="hidden" name="template_version_id" value={version?.id ?? ""} />
    <input type="hidden" name="is_required" value={String(required)} />
    <input type="hidden" name="title" value={title} />
    <input type="hidden" name="due_at" value={dueAt} />

    <ol className="pp-wizard-progress" aria-label="Progresso da nova avaliação">
      {steps.map((label, index) => <li key={label} className={index === step ? "active" : index < step ? "complete" : undefined} aria-current={index === step ? "step" : undefined}>
        <span>{index < step ? <Check aria-hidden="true" /> : index + 1}</span><small>{label}</small>
      </li>)}
    </ol>

    <section className="pp-wizard-surface" aria-live="polite">
      {step === 0 ? <div className="pp-wizard-step">
        <header><span><UserRound aria-hidden="true" /></span><div><p>Etapa 1 de 4</p><h2>Para quem é a avaliação?</h2><small>Somente relacionamentos ativos podem receber uma nova avaliação.</small></div></header>
        <fieldset className="pp-choice-grid"><legend className="sr-only">Selecione um aluno ativo</legend>
          {students.map((item) => <label key={item.id} className={studentId === item.id ? "selected" : undefined}>
            <input type="radio" name="student_choice" value={item.id} checked={studentId === item.id} onChange={() => setStudentId(item.id)} />
            <Avatar name={item.name} size="medium" /><span><strong>{item.name}</strong><small>{item.email ?? "E-mail não informado"}</small></span><i><Check aria-hidden="true" /></i>
          </label>)}
        </fieldset>
      </div> : null}

      {step === 1 ? <div className="pp-wizard-step">
        <header><span><ClipboardCheck aria-hidden="true" /></span><div><p>Etapa 2 de 4</p><h2>Escolha o modelo</h2><small>O conteúdo da versão selecionada é imutável e não será alterado por este fluxo.</small></div></header>
        <fieldset className="pp-template-choice"><legend className="sr-only">Selecione um modelo</legend>
          {templates.map((item) => {
            const latest = item.versions.toSorted((a, b) => b.versionNumber - a.versionNumber)[0];
            return <label key={item.id} className={templateId === item.id ? "selected" : undefined}>
              <input type="radio" name="template_choice" value={item.id} checked={templateId === item.id} onChange={() => chooseTemplate(item.id)} />
              <span className="pp-template-choice__type">{assessmentTypeLabels[item.assessmentType]}</span>
              <strong>{item.name}</strong><p>{item.description}</p>
              <small>{latest?.schema.questions.length ?? 0} perguntas · cerca de {estimateAssessmentMinutes(latest?.schema.questions.length ?? 0)} min · v{latest?.versionNumber ?? "—"}</small>
              <i><Check aria-hidden="true" /></i>
            </label>;
          })}
        </fieldset>
      </div> : null}

      {step === 2 ? <div className="pp-wizard-step pp-wizard-step--metadata">
        <header><span><CalendarDays aria-hidden="true" /></span><div><p>Etapa 3 de 4</p><h2>Configure o envio</h2><small>Defina somente os dados desta aplicação. O modelo permanece intacto.</small></div></header>
        <div className="pp-form-grid">
          <label className="pp-field pp-field--wide"><span>Título da avaliação <b>Obrigatório</b></span><input value={title} onChange={(event) => setTitle(event.target.value)} minLength={2} maxLength={160} required /></label>
          <label className="pp-field"><span>Prazo de resposta <em>Opcional</em></span><input type="date" value={dueAt} min={minimumDueDate} onChange={(event) => setDueAt(event.target.value)} /></label>
          <label className="pp-switch-field"><input type="checkbox" checked={required} onChange={(event) => setRequired(event.target.checked)} /><span><strong>Resposta obrigatória</strong><small>Indica prioridade para o aluno; não envia notificação automática.</small></span></label>
        </div>
      </div> : null}

      {step === 3 ? <div className="pp-wizard-step pp-wizard-step--review">
        <header><span><Check aria-hidden="true" /></span><div><p>Etapa 4 de 4</p><h2>Revise antes de criar</h2><small>Confira o aluno, o modelo e os dados da aplicação.</small></div></header>
        <dl className="pp-review-summary">
          <div><dt>Aluno</dt><dd>{student?.name ?? "—"}<small>{student?.email}</small></dd></div>
          <div><dt>Modelo</dt><dd>{template?.name ?? "—"}<small>Versão {version?.versionNumber ?? "—"} · {version?.schema.questions.length ?? 0} perguntas</small></dd></div>
          <div><dt>Título</dt><dd>{title}</dd></div>
          <div><dt>Prazo</dt><dd>{dueAt ? new Date(`${dueAt}T12:00:00`).toLocaleDateString("pt-BR") : "Sem prazo definido"}</dd></div>
          <div><dt>Prioridade</dt><dd>{required ? "Resposta obrigatória" : "Resposta opcional"}</dd></div>
        </dl>
        <div className="pp-review-questions"><strong>Perguntas do modelo</strong><ol>{version?.schema.questions.map((question) => <li key={question.key}>{question.label["pt-BR"] ?? Object.values(question.label)[0]}{question.required ? <b>Obrigatória</b> : null}</li>)}</ol></div>
        {demoMode ? <p className="pp-demo-note">No workspace demo, o fluxo pode ser revisado por completo, mas a criação não grava dados nem chama o Supabase.</p> : null}
      </div> : null}
    </section>

    <footer className="pp-wizard-actions">
      {step > 0 ? <button type="button" className="pp-button pp-button--ghost" onClick={() => setStep((current) => current - 1)}><ArrowLeft aria-hidden="true" />Voltar</button> : <span />}
      {step < 3 ? <button type="button" className="pp-button pp-button--primary" disabled={!canContinue} onClick={() => setStep((current) => current + 1)}>Continuar<ArrowRight aria-hidden="true" /></button> : <div>
        <button type="submit" name="send_now" value="false" className="pp-button pp-button--secondary" disabled={pending}>{pending ? "Criando…" : "Salvar rascunho"}</button>
        <button type="submit" name="send_now" value="true" className="pp-button pp-button--primary" disabled={pending}><Send aria-hidden="true" />{pending ? "Enviando…" : "Criar e enviar"}</button>
      </div>}
    </footer>
    {state.message ? <p className={`matrix-message ${state.ok ? "success" : "error"}`} role="status">{state.message}</p> : null}
  </form>;
}
