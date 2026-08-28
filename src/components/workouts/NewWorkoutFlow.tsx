"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { ArrowLeft, Check, ChevronRight, Dumbbell, LoaderCircle, Sparkles, UserPlus, UserRound, WandSparkles, X } from "lucide-react";
import {
  createCustomExerciseAction,
  createManualWorkoutAction,
  generateWorkoutAiDraftAction,
  materializeWorkoutAiDraftAction,
} from "@/app/actions/workouts";
import { Avatar } from "@/components/ui/PPerfilPrimitives";
import type { Exercise } from "@/lib/domain/workouts";
import type { WorkoutAiDraftOutput } from "@/lib/workouts/ai-contract";
import type { WorkoutAiProviderStatus } from "@/lib/workouts/ai-provider";
import { formatWorkoutDate } from "@/lib/workouts/presentation";
import type { WorkoutStudentContext } from "@/lib/workouts/workspace";
import styles from "./workouts.module.css";

const promptSuggestions = [
  "Crie um treino de inferiores com foco em quadríceps para aproximadamente 55 minutos.",
  "Monte um programa de hipertrofia 4x por semana.",
  "Priorize exercícios com equipamentos disponíveis em academia.",
];

type CreationMode = "MANUAL" | "AI";
type ExercisePosition = { sessionIndex: number; sectionIndex: number; exerciseIndex: number };

function positionKey(position: ExercisePosition) {
  return `${position.sessionIndex}:${position.sectionIndex}:${position.exerciseIndex}`;
}

export function NewWorkoutFlow({
  contexts,
  exercises,
  providerStatus,
  initialMode,
  initialStudentId,
}: {
  contexts: WorkoutStudentContext[];
  exercises: Exercise[];
  providerStatus: WorkoutAiProviderStatus;
  initialMode: CreationMode | null;
  initialStudentId: string | null;
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(initialStudentId);
  const [availableExercises, setAvailableExercises] = useState(exercises);
  const [mode, setMode] = useState<CreationMode | null>(initialMode);
  const [name, setName] = useState("Novo plano de treino");
  const [goal, setGoal] = useState("");
  const [prompt, setPrompt] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [generated, setGenerated] = useState<WorkoutAiDraftOutput | null>(null);
  const [generatedProviderId, setGeneratedProviderId] = useState<string | null>(null);
  const [resolutionChoices, setResolutionChoices] = useState<Record<string, string>>({});
  const [customTarget, setCustomTarget] = useState<ExercisePosition | null>(null);
  const [customName, setCustomName] = useState("");
  const [customInstructions, setCustomInstructions] = useState("");
  const [customYoutube, setCustomYoutube] = useState("");
  const [pending, startTransition] = useTransition();
  const selected = contexts.find((context) => context.student.id === selectedId) ?? null;
  const step = selected ? 2 : 1;
  const unresolved = useMemo(() => generated?.sessions.flatMap((session, sessionIndex) =>
    session.sections.flatMap((section, sectionIndex) => section.exercises.flatMap((exercise, exerciseIndex) =>
      exercise.exerciseId === null ? [{ exercise, session, section, position: { sessionIndex, sectionIndex, exerciseIndex } }] : []))) ?? [], [generated]);

  function updateExercise(position: ExercisePosition, updater: (exercise: WorkoutAiDraftOutput["sessions"][number]["sections"][number]["exercises"][number]) => WorkoutAiDraftOutput["sessions"][number]["sections"][number]["exercises"][number]) {
    setGenerated((current) => current ? {
      ...current,
      sessions: current.sessions.map((session, sessionIndex) => sessionIndex !== position.sessionIndex ? session : {
        ...session,
        sections: session.sections.map((section, sectionIndex) => sectionIndex !== position.sectionIndex ? section : {
          ...section,
          exercises: section.exercises.map((exercise, exerciseIndex) => exerciseIndex === position.exerciseIndex ? updater(exercise) : exercise),
        }),
      }),
    } : current);
  }

  function resolveWithExisting(position: ExercisePosition) {
    const exerciseId = resolutionChoices[positionKey(position)];
    if (!exerciseId) return setMessage("Selecione um exercício da sua biblioteca.");
    updateExercise(position, (exercise) => ({ ...exercise, exerciseId, unresolvedExerciseName: null }));
    setMessage("Exercício associado ao catálogo.");
  }

  function removeUnresolved(position: ExercisePosition) {
    setGenerated((current) => {
      if (!current) return current;
      const section = current.sessions[position.sessionIndex]?.sections[position.sectionIndex];
      if (!section || section.exercises.length <= 1) {
        setMessage("Uma seção precisa manter pelo menos um exercício. Substitua este item.");
        return current;
      }
      return {
        ...current,
        sessions: current.sessions.map((session, sessionIndex) => sessionIndex !== position.sessionIndex ? session : {
          ...session,
          sections: session.sections.map((candidate, sectionIndex) => sectionIndex !== position.sectionIndex ? candidate : {
            ...candidate,
            exercises: candidate.exercises.filter((_, exerciseIndex) => exerciseIndex !== position.exerciseIndex),
          }),
        }),
      };
    });
  }

  function beginCustom(position: ExercisePosition, suggestedName: string | null) {
    setCustomTarget(position);
    setCustomName(suggestedName ?? "");
    setCustomInstructions("");
    setCustomYoutube("");
    setMessage(null);
  }

  function createCustomForDraft() {
    if (!customTarget) return;
    const target = customTarget;
    startTransition(async () => {
      const result = await createCustomExerciseAction({
        name: customName,
        description: null,
        primaryMuscleGroup: "full_body",
        secondaryMuscleGroups: [],
        equipment: [],
        movementPattern: null,
        instructions: customInstructions,
        coachingCues: [],
        locale: "pt-BR",
        youtubeUrl: customYoutube,
      });
      setMessage(result.message);
      if (result.ok && result.exercise) {
        setAvailableExercises((current) => [result.exercise!, ...current]);
        updateExercise(target, (exercise) => ({ ...exercise, exerciseId: result.exercise!.id, unresolvedExerciseName: null }));
        setCustomTarget(null);
      }
    });
  }

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
        setGeneratedProviderId(result.providerId ?? null);
      }
    });
  }

  function openGeneratedDraft() {
    if (!selected || !generated || unresolved.length) return;
    setMessage(null);
    startTransition(async () => {
      const result = await materializeWorkoutAiDraftAction({ relationshipId: selected.student.id, prompt, draft: generated, providerId: generatedProviderId ?? undefined });
      setMessage(result.message);
      if (result.ok && result.resultId) router.push(`/dashboard/workouts/${result.resultId}`);
    });
  }

  return <main className={`dashboard-main pp-workspace ${styles.newWorkspace}`}>
    <Link href="/dashboard/workouts" className="pp-back-link"><ArrowLeft aria-hidden="true" />Voltar para treinos</Link>
    <header className={`pp-page-header ${styles.newHeader}`}>
      <div><p className="pp-page-context">Novo treino</p><h1>{generated ? "Rascunho gerado com IA" : "Crie com clareza desde o início"}</h1><p>{generated ? "A estrutura foi validada e continua sob sua responsabilidade." : "Escolha o aluno e depois defina como deseja começar."}</p></div>
      <ol className={styles.stepper} aria-label="Etapas da criação"><li className={step >= 1 ? styles.activeStep : undefined}><span>{step > 1 ? <Check aria-hidden="true" /> : "1"}</span>Aluno</li><li className={step >= 2 ? styles.activeStep : undefined}><span>2</span>Criação</li></ol>
    </header>

    {!selected ? <section className={styles.studentPicker} aria-labelledby="choose-student">
      <div className={styles.sectionTitle}><span><UserRound aria-hidden="true" /></span><div><h2 id="choose-student">Escolha o aluno</h2><p>Somente relacionamentos ativos aparecem nesta etapa.</p></div></div>
      {contexts.length ? <div className={styles.studentGrid}>{contexts.map((context) => <button type="button" key={context.student.id} onClick={() => setSelectedId(context.student.id)} className={styles.studentOption}>
        <Avatar name={context.student.name} size="large" />
        <span><strong>{context.student.name}</strong><small>{context.goal ?? "Objetivo ainda não registrado"}</small><em>{context.latestCompletedAssessment ? `Avaliação concluída em ${formatWorkoutDate(context.latestCompletedAssessment.completedAt)}` : "Sem avaliação concluída"}</em></span>
        <ChevronRight aria-hidden="true" />
      </button>)}</div> : <div className={styles.noStudentState}><UserPlus aria-hidden="true" /><strong>Você precisa adicionar um aluno antes de criar um treino.</strong><Link href="/dashboard/students?add=1#add-student" className="pp-button pp-button--primary">Convidar aluno</Link></div>}
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
          <button type="button" onClick={() => setMode("AI")}><span><Sparkles aria-hidden="true" /></span><strong>Criar com IA</strong><p>Use o contexto real do aluno para gerar um rascunho revisável.</p><ChevronRight aria-hidden="true" /></button>
        </div>
      </section> : null}

      {mode === "MANUAL" && !generated ? <section className={styles.manualSetup}>
        <div className={styles.sectionTitle}><span><Dumbbell aria-hidden="true" /></span><div><h2>Criar manualmente</h2><p>Defina a identidade do plano. A estrutura vem na próxima tela.</p></div></div>
        <label>Nome do plano<input value={name} onChange={(event) => setName(event.target.value)} maxLength={160} /></label>
        <label>Objetivo<textarea value={goal} onChange={(event) => setGoal(event.target.value)} maxLength={2000} placeholder="Ex.: Evoluir força e volume com quatro estímulos semanais." /></label>
        <div className={styles.formActions}><button type="button" className="pp-button pp-button--secondary" onClick={() => setMode(null)}>Voltar</button><button type="button" className="pp-button pp-button--primary" onClick={createManual} disabled={pending}>{pending ? <LoaderCircle className={styles.spin} aria-hidden="true" /> : <Dumbbell aria-hidden="true" />}Criar Draft</button></div>
      </section> : null}

      {mode === "AI" && !generated ? <section className={styles.aiSetup}>
        <div className={styles.sectionTitle}><span><Sparkles aria-hidden="true" /></span><div><h2>Descreva o treino que você quer criar</h2><p>A IA prepara um ponto de partida para sua revisão.</p></div></div>
        <label>Orientação para o rascunho<textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} maxLength={5000} placeholder="Treino de hipertrofia 4x por semana para aluno intermediário, com foco em membros inferiores e sessões de até 60 minutos." /></label>
        <div className={styles.promptSuggestions} aria-label="Sugestões de prompt">{promptSuggestions.map((suggestion) => <button type="button" key={suggestion} onClick={() => setPrompt(suggestion)}>{suggestion}</button>)}</div>
        {!providerStatus.available ? <div className={styles.providerUnavailable} role="status"><strong>IA não está disponível neste ambiente.</strong><p>Você ainda pode criar o treino manualmente.</p></div> : <p className={styles.aiDisclaimer}>Revise o treino antes de publicar. A IA gera um rascunho e não substitui sua avaliação profissional.</p>}
        <div className={styles.formActions}><button type="button" className="pp-button pp-button--secondary" onClick={() => setMode(null)}>Voltar</button><button type="button" className="pp-button pp-button--primary" onClick={generateDraft} disabled={pending || !providerStatus.available || prompt.trim().length < 2}>{pending ? <LoaderCircle className={styles.spin} aria-hidden="true" /> : <WandSparkles aria-hidden="true" />}{pending ? "Gerando rascunho..." : "Gerar rascunho com IA"}</button></div>
      </section> : null}

      {generated ? <section className={styles.aiResult}>
        <header><span><Check aria-hidden="true" /></span><div><small>Rascunho validado</small><h2>{generated.planName}</h2><p>Revise e resolva qualquer item pendente antes de abrir o Builder.</p></div></header>
        <dl><div><dt>Sessões</dt><dd>{generated.sessions.length}</dd></div><div><dt>Duração estimada</dt><dd>{generated.sessions.reduce((sum, session) => sum + (session.estimatedDurationMinutes ?? 0), 0)} min</dd></div><div><dt>Pendências</dt><dd>{unresolved.length}</dd></div></dl>
        <div className={styles.generatedSessions}>{generated.sessions.map((session, index) => <article key={`${session.name}-${index}`}><span>{String.fromCharCode(65 + index)}</span><div><strong>{session.name}</strong><small>{session.sections.reduce((sum, section) => sum + section.exercises.length, 0)} exercícios · {session.estimatedDurationMinutes ?? "—"} min</small></div></article>)}</div>

        {unresolved.length ? <div className={styles.unresolvedList}><header><strong>Exercícios não encontrados</strong><p>Escolha um exercício existente, crie um personalizado ou remova o item.</p></header>{unresolved.map(({ exercise, session, section, position }) => {
          const key = positionKey(position);
          return <article key={`${key}:${exercise.unresolvedExerciseName}`}><div><small>{session.name} · {section.name ?? "Bloco"}</small><strong>{exercise.unresolvedExerciseName}</strong></div><select value={resolutionChoices[key] ?? ""} onChange={(event) => setResolutionChoices((current) => ({ ...current, [key]: event.target.value }))} aria-label={`Substituir ${exercise.unresolvedExerciseName}`}><option value="">Selecione da biblioteca</option>{availableExercises.map((candidate) => <option value={candidate.id} key={candidate.id}>{candidate.name}</option>)}</select><div><button type="button" onClick={() => resolveWithExisting(position)}>Usar exercício</button><button type="button" onClick={() => beginCustom(position, exercise.unresolvedExerciseName)}>Criar personalizado</button><button type="button" onClick={() => removeUnresolved(position)}><X aria-hidden="true" />Remover</button></div></article>;
        })}</div> : null}

        {customTarget ? <div className={styles.inlineCustomExercise}><header><strong>Novo exercício personalizado</strong><button type="button" onClick={() => setCustomTarget(null)} aria-label="Cancelar criação"><X aria-hidden="true" /></button></header><label>Nome<input value={customName} onChange={(event) => setCustomName(event.target.value)} maxLength={160} /></label><label>Instruções <small>opcional</small><textarea value={customInstructions} onChange={(event) => setCustomInstructions(event.target.value)} maxLength={5000} /></label><label>URL do YouTube <small>opcional</small><input type="url" value={customYoutube} onChange={(event) => setCustomYoutube(event.target.value)} placeholder="https://www.youtube.com/watch?v=..." /></label><button type="button" className="pp-button pp-button--primary" disabled={pending || customName.trim().length < 2} onClick={createCustomForDraft}>Criar e usar exercício</button></div> : null}

        <div className={styles.formActions}><button type="button" className="pp-button pp-button--secondary" onClick={() => { setGenerated(null); setGeneratedProviderId(null); setCustomTarget(null); }}>Descartar e gerar novamente</button><button type="button" className="pp-button pp-button--primary" disabled={pending || unresolved.length > 0} onClick={openGeneratedDraft}>{pending ? <LoaderCircle className={styles.spin} aria-hidden="true" /> : null}Abrir no Builder<ChevronRight aria-hidden="true" /></button></div>
      </section> : null}
    </>}

    {message ? <p className={`${styles.actionMessage}${generated ? ` ${styles.successMessage}` : ""}`} role="status">{message}</p> : null}
  </main>;
}
