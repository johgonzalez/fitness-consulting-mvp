"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, Check, CheckCircle2, Clock3, Edit3, LockKeyhole, Ruler, Save, Send, ShieldCheck } from "lucide-react";
import { saveAssessmentAnswerAction, submitAssessmentAction } from "@/app/actions/assessments";
import { AssessmentStatusBadge } from "@/components/assessments/AssessmentStatusBadge";
import { Avatar } from "@/components/ui/PPerfilPrimitives";
import type { AssessmentAnswerValue, AssessmentDetail, AssessmentQuestion } from "@/lib/domain/assessments";
import { estimateAssessmentMinutes, formatAnswer, formatAssessmentDate, localText } from "@/lib/assessments/presentation";

type AnswerMap = Record<string, AssessmentAnswerValue>;
type ExperienceView = "intro" | "question" | "review" | "success" | "readonly";

function hasValue(value: AssessmentAnswerValue | undefined) {
  if (value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object" && value !== null && "unitCode" in value) return Number.isFinite(value.value) && Boolean(value.unitCode) && Boolean(value.measuredAt);
  return true;
}

function purposeFromMetadata(metadata: Record<string, unknown> | undefined) {
  const whenToUse = metadata?.when_to_use;
  if (typeof whenToUse === "object" && whenToUse !== null) {
    const value = (whenToUse as Record<string, unknown>)["pt-BR"];
    if (typeof value === "string") return value;
  }
  return "Suas respostas ajudam o Personal a entender seu momento e ajustar o acompanhamento com mais contexto.";
}

function QuestionField({ question, value, onChange }: { question: AssessmentQuestion; value: AssessmentAnswerValue | undefined; onChange: (value: AssessmentAnswerValue) => void }) {
  if (question.type === "SHORT_TEXT" || question.type === "LONG_TEXT") {
    const props = { value: typeof value === "string" ? value : "", onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(event.target.value), maxLength: 5000, placeholder: "Escreva sua resposta…" };
    return question.type === "LONG_TEXT" ? <textarea {...props} rows={7} /> : <input {...props} type="text" />;
  }
  if (question.type === "NUMBER") return <div className="pp-student-number"><input type="number" inputMode="decimal" value={typeof value === "number" ? value : ""} onChange={(event) => onChange(Number(event.target.value))} placeholder="0" /></div>;
  if (question.type === "DATE") return <input type="date" value={typeof value === "string" ? value : ""} onChange={(event) => onChange(event.target.value)} />;
  if (question.type === "BOOLEAN") return <div className="pp-student-options pp-student-options--binary">{[{ value: true, label: "Sim" }, { value: false, label: "Não" }].map((option) => <button key={String(option.value)} type="button" aria-pressed={value === option.value} onClick={() => onChange(option.value)}><span>{option.label}</span>{value === option.value ? <Check aria-hidden="true" /> : null}</button>)}</div>;
  if (question.type === "SINGLE_CHOICE") return <div className="pp-student-options">{question.options.map((option) => <button key={option.value} type="button" aria-pressed={value === option.value} onClick={() => onChange(option.value)}><span>{localText(option.label)}</span>{value === option.value ? <Check aria-hidden="true" /> : null}</button>)}</div>;
  if (question.type === "MULTI_CHOICE") {
    const selected = Array.isArray(value) ? value : [];
    return <div className="pp-student-options">{question.options.map((option) => <button key={option.value} type="button" aria-pressed={selected.includes(option.value)} onClick={() => onChange(selected.includes(option.value) ? selected.filter((entry) => entry !== option.value) : [...selected, option.value])}><span>{localText(option.label)}</span>{selected.includes(option.value) ? <Check aria-hidden="true" /> : null}</button>)}</div>;
  }
  if (question.type === "SCALE") return <div className="pp-scale-field"><div>{Array.from({ length: question.scale.max - question.scale.min + 1 }, (_, index) => question.scale.min + index).map((number) => <button type="button" key={number} aria-pressed={value === number} onClick={() => onChange(number)}>{number}</button>)}</div><span><small>Menor</small><small>Maior</small></span></div>;
  if (question.type === "MEASUREMENT") {
    const measurement = typeof value === "object" && value !== null && "unitCode" in value ? value : { value: 0, unitCode: question.measurement.unitCodes[0], measuredAt: new Date().toISOString().slice(0, 10) };
    return <div className="pp-measurement-field">
      <div><label><span>Valor</span><input type="number" inputMode="decimal" step="any" value={measurement.value || ""} onChange={(event) => onChange({ ...measurement, value: Number(event.target.value) })} /></label><label><span>Unidade</span><select value={measurement.unitCode} onChange={(event) => onChange({ ...measurement, unitCode: event.target.value })}>{question.measurement.unitCodes.map((unit) => <option key={unit}>{unit}</option>)}</select></label></div>
      <label><span>Data da medição</span><input type="date" value={measurement.measuredAt.slice(0, 10)} onChange={(event) => onChange({ ...measurement, measuredAt: `${event.target.value}T12:00:00.000Z` })} /></label>
      <p><Ruler aria-hidden="true" /><span><strong>Origem da medida</strong>Informada por você nesta avaliação. O PPerfil não converte unidades automaticamente.</span></p>
    </div>;
  }
  return <div className="pp-photo-unavailable"><LockKeyhole aria-hidden="true" /><div><strong>Registro de foto ainda indisponível</strong><p>O upload privado será liberado em um Sprint futuro. Nenhum arquivo público será solicitado.</p>{!question.required ? <button type="button" className="pp-button pp-button--secondary" onClick={() => onChange({ skipped: true })}>{typeof value === "object" && value !== null && "skipped" in value ? <><Check aria-hidden="true" />Sem foto neste check-in</> : "Continuar sem foto"}</button> : null}</div></div>;
}

function ReadonlyAnswers({ assessment, answers }: { assessment: AssessmentDetail; answers: AnswerMap }) {
  return <dl className="pp-student-readonly-answers">{assessment.templateSchema.questions.map((question, index) => <div key={question.key}><dt><span>{String(index + 1).padStart(2, "0")}</span>{localText(question.label)}</dt><dd>{formatAnswer(question, answers[question.key])}</dd></div>)}</dl>;
}

export function StudentAssessmentExperience({ assessment, trainer, demoMode }: { assessment: AssessmentDetail; trainer: { name: string; imageUrl: string | null; credential: string | null }; demoMode: boolean }) {
  const initialAnswers = useMemo(() => Object.fromEntries(assessment.answers.map((answer) => [answer.questionKey, answer.value])) as AnswerMap, [assessment.answers]);
  const initialView: ExperienceView = assessment.status === "SENT" ? "intro" : "readonly";
  const [view, setView] = useState<ExperienceView>(initialView);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>(initialAnswers);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");
  const [confirmingSubmit, setConfirmingSubmit] = useState(false);
  const [pending, startTransition] = useTransition();
  const question = assessment.templateSchema.questions[index];
  const progress = Math.round(((index + 1) / assessment.templateSchema.questions.length) * 100);
  const storageKey = `pperfil-demo-assessment:${assessment.id}`;

  function updateAnswer(value: AssessmentAnswerValue) {
    setAnswers((current) => ({ ...current, [question.key]: value }));
    setSaveState("idle");
    setError("");
  }

  useEffect(() => {
    if (view !== "question" || !question || !hasValue(answers[question.key])) return;
    const timeout = window.setTimeout(() => {
      setSaveState("saving");
      if (demoMode) {
        try { window.localStorage.setItem(storageKey, JSON.stringify(answers)); setSaveState("saved"); } catch { setSaveState("error"); }
        return;
      }
      void saveAssessmentAnswerAction({ assessmentId: assessment.id, questionKey: question.key, value: JSON.stringify(answers[question.key]) })
        .then((result) => setSaveState(result.ok ? "saved" : "error"))
        .catch(() => setSaveState("error"));
    }, 650);
    return () => window.clearTimeout(timeout);
  }, [answers, assessment.id, demoMode, question, storageKey, view]);

  function nextQuestion() {
    if (question.required && !hasValue(answers[question.key])) { setError("Responda esta pergunta para continuar."); return; }
    if (index === assessment.templateSchema.questions.length - 1) setView("review");
    else setIndex((current) => current + 1);
  }

  function submit() {
    const missing = assessment.templateSchema.questions.find((item) => item.required && !hasValue(answers[item.key]));
    if (missing) { setIndex(assessment.templateSchema.questions.indexOf(missing)); setView("question"); setError("Responda esta pergunta obrigatória antes de enviar."); return; }
    setError("");
    startTransition(async () => {
      const result = await submitAssessmentAction({ assessmentId: assessment.id });
      if (result.ok) { setView("success"); if (demoMode) window.localStorage.removeItem(storageKey); }
      else setError(result.message ?? "Não foi possível enviar as respostas.");
    });
  }

  if (view === "intro") return <main className="pp-student-assessment pp-student-assessment--intro">
    <section className="pp-student-card">
      <div className="pp-student-trainer"><Avatar name={trainer.name} imageUrl={trainer.imageUrl} size="large" /><span><small>Seu Personal</small><strong>{trainer.name}</strong>{trainer.credential ? <em>{trainer.credential}</em> : null}</span></div>
      <div className="pp-student-intro-copy"><p>Avaliação</p><h1>{assessment.title}</h1><span>{purposeFromMetadata(assessment.templateSchema.metadata)}</span></div>
      <dl className="pp-student-intro-facts"><div><Clock3 aria-hidden="true" /><dt>Tempo estimado</dt><dd>{estimateAssessmentMinutes(assessment.templateSchema.questions.length)} minutos</dd></div><div><CalendarDays aria-hidden="true" /><dt>Data de entrega</dt><dd>{formatAssessmentDate(assessment.dueAt, "Sem prazo")}</dd></div></dl>
      <p className="pp-student-privacy"><ShieldCheck aria-hidden="true" /><span>Suas respostas fazem parte do acompanhamento e seguem as regras de acesso do relacionamento.</span></p>
      <button className="pp-button pp-button--primary pp-student-primary" onClick={() => setView("question")}>Começar<ArrowRight aria-hidden="true" /></button>
      <small className="pp-student-footnote">Você pode sair e continuar depois.</small>
    </section>
  </main>;

  if (view === "success") return <main className="pp-student-assessment pp-student-assessment--success"><section className="pp-student-card"><span className="pp-success-mark"><Check aria-hidden="true" /></span><p>Respostas enviadas</p><h1>Avaliação concluída com sucesso</h1><span>Seu Personal já pode revisar suas respostas e preparar uma devolutiva.</span>{demoMode ? <small className="pp-demo-note">Simulação local: nenhum dado foi enviado ao Supabase.</small> : null}<button className="pp-button pp-button--secondary pp-student-primary" onClick={() => setView("readonly")}>Ver minhas respostas</button></section></main>;

  if (view === "readonly") return <main className="pp-student-assessment pp-student-assessment--readonly"><section className="pp-student-card">
    <header><div><p>{assessment.status === "COMPLETED" ? "Avaliação concluída" : assessment.status === "IN_REVIEW" ? "Em revisão pelo Personal" : "Respostas enviadas"}</p><h1>{assessment.title}</h1></div><AssessmentStatusBadge status={assessment.status === "SENT" ? "ANSWERED" : assessment.status} /></header>
    {assessment.completedAt ? <p className="pp-student-completed-date"><CalendarDays aria-hidden="true" />Concluída em {formatAssessmentDate(assessment.completedAt)}</p> : null}
    {assessment.status === "COMPLETED" && assessment.trainerFeedback ? <blockquote className="pp-student-feedback"><div><Avatar name={trainer.name} imageUrl={trainer.imageUrl} size="medium" /><span><small>Feedback do seu Personal</small><strong>{trainer.name}</strong></span></div><p>{assessment.trainerFeedback}</p></blockquote> : <p className="pp-student-review-note"><Clock3 aria-hidden="true" />Seu Personal recebeu suas respostas e fará a revisão. A devolutiva aparecerá aqui quando for concluída.</p>}
    {assessment.answers.length || Object.keys(answers).length ? <ReadonlyAnswers assessment={assessment} answers={answers} /> : <p className="pp-muted-copy">As respostas desta simulação ficam disponíveis depois de percorrer o formulário.</p>}
  </section></main>;

  if (view === "review") return <main className="pp-student-assessment pp-student-assessment--review"><section className="pp-student-card">
    <button className="pp-student-back" type="button" onClick={() => { setIndex(assessment.templateSchema.questions.length - 1); setView("question"); }}><ArrowLeft aria-hidden="true" />Voltar</button>
    <div className="pp-student-review-heading"><p>Revisão final</p><h1>Revise e envie</h1><span>Confira suas respostas. Depois do envio, elas ficam somente para leitura.</span></div>
    <dl className="pp-student-review-list">{assessment.templateSchema.questions.map((item, itemIndex) => <div key={item.key}><dt><span>{String(itemIndex + 1).padStart(2, "0")}</span><strong>{localText(item.label)}</strong><button type="button" onClick={() => { setIndex(itemIndex); setView("question"); }} aria-label={`Editar ${localText(item.label)}`}><Edit3 aria-hidden="true" />Editar</button></dt><dd>{formatAnswer(item, answers[item.key])}</dd></div>)}</dl>
    <p className="pp-student-lock"><LockKeyhole aria-hidden="true" />Ao enviar, suas respostas ficarão disponíveis para revisão do seu Personal.</p>
    {error ? <p className="matrix-message error" role="alert">{error}</p> : null}
    <div className="pp-student-review-submit">{!confirmingSubmit ? <button className="pp-button pp-button--primary pp-student-primary" type="button" onClick={() => setConfirmingSubmit(true)}><Send aria-hidden="true" />Enviar avaliação</button> : <div className="pp-student-submit-confirm" role="group" aria-label="Confirmar envio da avaliação"><p><LockKeyhole aria-hidden="true" />Depois do envio, as respostas ficam somente para leitura. Deseja continuar?</p><div><button type="button" className="pp-button pp-button--ghost" disabled={pending} onClick={() => setConfirmingSubmit(false)}>Voltar</button><button type="button" className="pp-button pp-button--primary" disabled={pending} onClick={submit}>{pending ? "Enviando…" : "Confirmar envio"}</button></div></div>}</div>
  </section></main>;

  return <main className="pp-student-assessment pp-student-assessment--question"><section className="pp-student-card">
    <header className="pp-student-question-header"><button type="button" onClick={() => index === 0 ? setView("intro") : setIndex((current) => current - 1)} aria-label="Voltar"><ArrowLeft aria-hidden="true" /></button><span>{index + 1} de {assessment.templateSchema.questions.length}</span></header>
    <div className="pp-student-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span style={{ width: `${progress}%` }} /></div>
    <p className={`pp-save-state pp-save-state--${saveState}`} role="status">{saveState === "saving" ? <><Save aria-hidden="true" />Salvando…</> : saveState === "saved" ? <><CheckCircle2 aria-hidden="true" />Salvo automaticamente</> : saveState === "error" ? "Não foi possível salvar agora" : "Suas respostas são salvas durante o preenchimento"}</p>
    <div className="pp-student-question-copy"><p>Pergunta {String(index + 1).padStart(2, "0")}</p><h1>{localText(question.label)}</h1>{question.description ? <span>{localText(question.description)}</span> : null}{question.required ? <small>Resposta obrigatória</small> : <small>Resposta opcional</small>}</div>
    <div className="pp-student-field"><QuestionField question={question} value={answers[question.key]} onChange={updateAnswer} /></div>
    {error ? <p className="matrix-message error" role="alert">{error}</p> : null}
    <div className="pp-student-question-actions"><button type="button" className="pp-button pp-button--ghost" onClick={() => index === 0 ? setView("intro") : setIndex((current) => current - 1)}>Voltar</button><button type="button" className="pp-button pp-button--primary" onClick={nextQuestion}>{index === assessment.templateSchema.questions.length - 1 ? "Revisar" : "Continuar"}<ArrowRight aria-hidden="true" /></button></div>
  </section></main>;
}
