"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowLeft, Check, ChevronRight, Dumbbell, LoaderCircle, Sparkles, UserRound, WandSparkles } from "lucide-react";
import { createManualWorkoutAction, generateWorkoutAiDraftAction } from "@/app/actions/workouts";
import { Avatar } from "@/components/ui/PPerfilPrimitives";
import type { WorkoutAiDraftOutput } from "@/lib/workouts/ai-contract";
import type { WorkoutAiProviderStatus } from "@/lib/workouts/ai-provider";
import type { WorkoutStudentContext } from "@/lib/workouts/workspace";
import { formatWorkoutDate } from "@/lib/workouts/presentation";
import styles from "./workouts.module.css";

const promptSuggestions = [
  "Crie um treino de inferiores com foco em quadríceps para aproximadamente 55 minutos.",
  "Monte um programa de hipertrofia 4x por semana.",
  "Priorize exercícios com equipamentos disponíveis em academia.",
];

type CreationMode = "MANUAL" | "AI";

export function NewWorkoutFlow({
  contexts,
  providerStatus,
  initialMode,
}: {
  contexts: WorkoutStudentContext[];
  providerStatus: WorkoutAiProviderStatus;
  initialMode: CreationMode | null;
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<CreationMode | null>(initialMode);
  const [name, setName] = useState("Novo plano de treino");
  const [goal, setGoal] = useState("");
  const [prompt, setPrompt] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [generated, setGenerated] = useState<WorkoutAiDraftOutput | null>(null);
  const [generatedVersionId, setGeneratedVersionId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const selected = contexts.find((context) => context.student.id === selectedId) ?? null;
  const step = selected ? 2 : 1;

  function createManual() {
    if (!selected) return;
    setMessage(null);
    startTransition(async () => {
      const result = await createManualWorkoutAction({ relationshipId: selected.student.id, name, goal });
      setMessage(result.message);
      if (result.ok && result.resultId) router.push(`/dashboard/workouts/${result.resultId}`);
    });
  }

  function generateDraft() {
    if (!selected) return;
    setMessage(null);
    setGenerated(null);
    startTransition(async () => {
      const result = await generateWorkoutAiDraftAction({ relationshipId: selected.student.id, prompt });
      setMessage(result.message);
      if (result.ok && result.generated) {
        setGenerated(result.generated);
        setGeneratedVersionId(result.resultId ?? null);
      }
    });
  }

  return <main className={`dashboard-main pp-workspace ${styles.newWorkspace}`}>
    <Link href="/dashboard/workouts" className="pp-back-link"><ArrowLeft aria-hidden="true" />Voltar para treinos</Link>
    <header className={`pp-page-header ${styles.newHeader}`}>
      <div><p className="pp-page-context">Novo treino</p><h1>{generated ? "Draft gerado com IA" : "Crie com clareza desde o início"}</h1><p>{generated ? "A estrutura foi validada e continua sob sua responsabilidade." : "Escolha o aluno e depois defina como deseja começar."}</p></div>
      <ol className={styles.stepper} aria-label="Etapas da criação"><li className={step >= 1 ? styles.activeStep : undefined}><span>{step > 1 ? <Check aria-hidden="true" /> : "1"}</span>Aluno</li><li className={step >= 2 ? styles.activeStep : undefined}><span>2</span>Criação</li></ol>
    </header>

    {!selected ? <section className={styles.studentPicker} aria-labelledby="choose-student">
      <div className={styles.sectionTitle}><span><UserRound aria-hidden="true" /></span><div><h2 id="choose-student">Escolha o aluno</h2><p>Somente relacionamentos ativos aparecem nesta etapa.</p></div></div>
      <div className={styles.studentGrid}>{contexts.map((context) => <button type="button" key={context.student.id} onClick={() => setSelectedId(context.student.id)} className={styles.studentOption}>
        <Avatar name={context.student.name} size="large" />
        <span><strong>{context.student.name}</strong><small>{context.goal ?? "Objetivo ainda não registrado"}</small><em>{context.latestCompletedAssessment ? `Avaliação concluída em ${formatWorkoutDate(context.latestCompletedAssessment.completedAt)}` : "Sem avaliação concluída"}</em></span>
        <ChevronRight aria-hidden="true" />
      </button>)}</div>
    </section> : <>
      <section className={styles.selectedStudent}>
        <button type="button" onClick={() => { setSelectedId(null); setGenerated(null); }} aria-label="Trocar aluno"><Avatar name={selected.student.name} size="medium" /></button>
        <div><small>Aluno selecionado</small><strong>{selected.student.name}</strong></div>
        <dl><div><dt>Objetivo</dt><dd>{selected.goal ?? "Não informado"}</dd></div><div><dt>Experiência</dt><dd>{selected.experienceLevel ?? "Não informada"}</dd></div><div><dt>Disponibilidade</dt><dd>{selected.availableTrainingDays ? `${selected.availableTrainingDays}x por semana` : "Não informada"}</dd></div><div><dt>Última avaliação</dt><dd>{selected.latestCompletedAssessment ? formatWorkoutDate(selected.latestCompletedAssessment.completedAt) : "Sem avaliação concluída"}</dd></div></dl>
        <button type="button" className={styles.textButton} onClick={() => { setSelectedId(null); setMode(initialMode); }}>Trocar aluno</button>
      </section>

      {!mode && !generated ? <section className={styles.creationChoice} aria-labelledby="creation-mode">
        <div className={styles.sectionTitle}><span><Dumbbell aria-hidden="true" /></span><div><h2 id="creation-mode">Como quer criar?</h2><p>Você poderá editar toda a estrutura enquanto estiver em Draft.</p></div></div>
        <div>
          <button type="button" onClick={() => setMode("MANUAL")}><span><Dumbbell aria-hidden="true" /></span><strong>Criar manualmente</strong><p>Monte sessões, exercícios e séries do zero.</p><ChevronRight aria-hidden="true" /></button>
          <button type="button" onClick={() => setMode("AI")}><span><Sparkles aria-hidden="true" /></span><strong>Criar com IA</strong><p>Use o contexto real do aluno para gerar um Draft revisável.</p><ChevronRight aria-hidden="true" /></button>
        </div>
      </section> : null}

      {mode === "MANUAL" && !generated ? <section className={styles.manualSetup}>
        <div className={styles.sectionTitle}><span><Dumbbell aria-hidden="true" /></span><div><h2>Criar manualmente</h2><p>Defina a identidade do plano. A estrutura vem na próxima tela.</p></div></div>
        <label>Nome do plano<input value={name} onChange={(event) => setName(event.target.value)} maxLength={160} /></label>
        <label>Objetivo<textarea value={goal} onChange={(event) => setGoal(event.target.value)} maxLength={2000} placeholder="Ex.: Evoluir força e volume com quatro estímulos semanais." /></label>
        <div className={styles.formActions}><button type="button" className="pp-button pp-button--secondary" onClick={() => setMode(null)}>Voltar</button><button type="button" className="pp-button pp-button--primary" onClick={createManual} disabled={pending}>{pending ? <LoaderCircle className={styles.spin} aria-hidden="true" /> : <Dumbbell aria-hidden="true" />}Criar Draft</button></div>
      </section> : null}

      {mode === "AI" && !generated ? <section className={styles.aiSetup}>
        <div className={styles.sectionTitle}><span><Sparkles aria-hidden="true" /></span><div><h2>Criar treino com IA</h2><p>A IA prepara um ponto de partida. Você revisa e aprova cada detalhe.</p></div></div>
        <label>Conte para a IA o que você precisa<textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} maxLength={5000} placeholder="Objetivo, preferências, duração e limitações práticas do programa..." /></label>
        <div className={styles.promptSuggestions} aria-label="Sugestões de prompt">{promptSuggestions.map((suggestion) => <button type="button" key={suggestion} onClick={() => setPrompt(suggestion)}>{suggestion}</button>)}</div>
        {!providerStatus.available ? <div className={styles.providerUnavailable} role="status"><strong>Servidor de IA indisponível</strong><p>{providerStatus.message} Nenhum funcionamento é simulado fora do workspace demo.</p></div> : <p className={styles.aiDisclaimer}>O contexto usa apenas dados reais disponíveis. Nenhuma interpretação médica é gerada.</p>}
        <div className={styles.formActions}><button type="button" className="pp-button pp-button--secondary" onClick={() => setMode(null)}>Voltar</button><button type="button" className="pp-button pp-button--primary" onClick={generateDraft} disabled={pending || !providerStatus.available || prompt.trim().length < 2}>{pending ? <LoaderCircle className={styles.spin} aria-hidden="true" /> : <WandSparkles aria-hidden="true" />}{pending ? "Gerando Draft..." : "Gerar Draft"}</button></div>
      </section> : null}

      {generated ? <section className={styles.aiResult}>
        <header><span><Check aria-hidden="true" /></span><div><small>Draft validado</small><h2>{generated.planName}</h2><p>A IA preparou um ponto de partida. Revise cada detalhe.</p></div></header>
        <dl><div><dt>Sessões</dt><dd>{generated.sessions.length}</dd></div><div><dt>Duração estimada</dt><dd>{generated.sessions.reduce((sum, session) => sum + (session.estimatedDurationMinutes ?? 0), 0)} min</dd></div><div><dt>Foco</dt><dd>{selected.goal ?? "Conforme seu prompt"}</dd></div></dl>
        <div className={styles.generatedSessions}>{generated.sessions.map((session, index) => <article key={`${session.name}-${index}`}><span>{String.fromCharCode(65 + index)}</span><div><strong>{session.name}</strong><small>{session.sections.reduce((sum, section) => sum + section.exercises.length, 0)} exercícios · {session.estimatedDurationMinutes ?? "—"} min</small></div></article>)}</div>
        <div className={styles.formActions}><button type="button" className="pp-button pp-button--secondary" onClick={() => { setGenerated(null); setGeneratedVersionId(null); }}>Gerar novamente</button>{generatedVersionId ? <Link href={`/dashboard/workouts/${generatedVersionId}`} className="pp-button pp-button--primary">Revisar treino<ChevronRight aria-hidden="true" /></Link> : null}</div>
      </section> : null}
    </>}

    {message ? <p className={`${styles.actionMessage}${generated ? ` ${styles.successMessage}` : ""}`} role="status">{message}</p> : null}
  </main>;
}
