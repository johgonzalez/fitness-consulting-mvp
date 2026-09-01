"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  Clock3,
  Copy,
  Dumbbell,
  Eye,
  GripVertical,
  History,
  Layers3,
  LoaderCircle,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Save,
  Send,
  Trash2,
  X,
} from "lucide-react";
import {
  changeWorkoutLifecycleAction,
  mutateWorkoutAction,
  type WorkoutMutation,
} from "@/app/actions/workouts";
import { ExerciseLibraryDrawer } from "@/components/workouts/ExerciseLibraryDrawer";
import { ExerciseMedia } from "@/components/workouts/ExerciseMedia";
import { SetEditor } from "@/components/workouts/SetEditor";
import { StudentWorkoutContext } from "@/components/workouts/StudentWorkoutContext";
import { VersionHistoryPanel } from "@/components/workouts/VersionHistoryPanel";
import { WorkoutStatusBadge } from "@/components/workouts/WorkoutStatusBadge";
import type {
  Exercise,
  WorkoutExercisePrescription,
  WorkoutSection,
  WorkoutSectionType,
  WorkoutSession,
  WorkoutSetInput,
  WorkoutSetPrescription,
  WorkoutVersionProjection,
} from "@/lib/domain/workouts";
import { workoutSectionLabels } from "@/lib/workouts/presentation";
import type { TrainerWorkoutRecord } from "@/lib/workouts/workspace";
import styles from "./workouts.module.css";

type LibraryTarget = { sectionId: string; workoutExerciseId?: string } | null;
type SaveState = "saved" | "saving" | "error";

const sectionTypes: WorkoutSectionType[] = ["WARMUP", "MAIN", "SUPERSET", "CONDITIONING", "COOLDOWN", "CUSTOM"];

function defaultSet(setNumber: number, previous?: WorkoutSetPrescription): WorkoutSetInput {
  if (previous) return { ...previous, id: null, setNumber, notes: previous.notes };
  return {
    id: null,
    setNumber,
    setType: "STANDARD",
    targetReps: 10,
    targetRepsMin: null,
    targetRepsMax: null,
    targetLoad: null,
    loadUnit: null,
    durationSeconds: null,
    distanceValue: null,
    distanceUnit: null,
    restSeconds: 60,
    targetRpe: 7,
    notes: null,
  };
}

function moveItem<T>(items: T[], index: number, direction: -1 | 1) {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

function ExerciseCard({
  prescribed,
  sectionType,
  index,
  total,
  editable,
  demoMode,
  deleteArmed,
  onMove,
  onReplace,
  onArmDelete,
  onRemove,
  onUpdateDetails,
  onUpdateSet,
  onDuplicateSet,
  onRemoveSet,
  onAddSet,
}: {
  prescribed: WorkoutExercisePrescription;
  sectionType: WorkoutSectionType;
  index: number;
  total: number;
  editable: boolean;
  demoMode: boolean;
  deleteArmed: boolean;
  onMove: (direction: -1 | 1) => void;
  onReplace: () => void;
  onArmDelete: () => void;
  onRemove: () => void;
  onUpdateDetails: (patch: Partial<Pick<WorkoutExercisePrescription, "supersetGroupKey" | "trainerNote" | "studentInstruction" | "tempo">>, persist?: boolean) => void;
  onUpdateSet: (setId: string, patch: Partial<WorkoutSetInput>, persist?: boolean) => void;
  onDuplicateSet: (set: WorkoutSetPrescription) => void;
  onRemoveSet: (setId: string) => void;
  onAddSet: () => void;
}) {
  return <article className={`${styles.exerciseCard}${prescribed.supersetGroupKey ? ` ${styles.supersetExercise}` : ""}`}>
    <div className={styles.exerciseIdentity}>
      {editable ? <span className={styles.dragHandle} title="Use os botões para mover"><GripVertical aria-hidden="true" /></span> : null}
      <ExerciseMedia exercise={prescribed.exercise} demoMode={demoMode} priority={index === 0} />
      <div><span className={styles.exercisePosition}>{index + 1}</span><strong>{prescribed.exercise.name}</strong><small>{prescribed.exercise.primaryMuscleGroup} · {prescribed.exercise.equipment.join(" · ") || "Sem equipamento"}</small>{prescribed.supersetGroupKey ? <em>Superset {prescribed.supersetGroupKey}</em> : null}</div>
      {editable ? <div className={styles.exerciseActions}><button type="button" onClick={() => onMove(-1)} disabled={index === 0} aria-label="Mover exercício para cima"><ArrowUp aria-hidden="true" /></button><button type="button" onClick={() => onMove(1)} disabled={index === total - 1} aria-label="Mover exercício para baixo"><ArrowDown aria-hidden="true" /></button><button type="button" onClick={onReplace} aria-label="Substituir exercício"><RefreshCw aria-hidden="true" /></button><button type="button" onClick={onArmDelete} aria-label="Remover exercício"><MoreHorizontal aria-hidden="true" /></button></div> : null}
    </div>
    {deleteArmed ? <div className={styles.inlineConfirm} role="alert"><span>Remover este exercício e suas séries?</span><button type="button" onClick={onArmDelete}>Cancelar</button><button type="button" onClick={onRemove}>Remover</button></div> : null}
    <SetEditor sets={prescribed.sets} editable={editable} onUpdate={onUpdateSet} onDuplicate={onDuplicateSet} onRemove={onRemoveSet} onAdd={onAddSet} />
    <div className={styles.exerciseDetails}>
      {sectionType === "SUPERSET" ? <label><span>Grupo do superset</span><input value={prescribed.supersetGroupKey ?? ""} disabled={!editable} maxLength={32} placeholder="A" onChange={(event) => onUpdateDetails({ supersetGroupKey: event.target.value || null })} onBlur={() => onUpdateDetails({}, true)} /></label> : null}
      <label><span>Tempo</span><input value={prescribed.tempo ?? ""} disabled={!editable} maxLength={32} placeholder="Ex.: 3-1-1" onChange={(event) => onUpdateDetails({ tempo: event.target.value || null })} onBlur={() => onUpdateDetails({}, true)} /></label>
      {editable ? <label className={styles.trainerOnly}><span>Nota do Personal <small>privada</small></span><textarea value={prescribed.trainerNote ?? ""} maxLength={2000} placeholder="Apenas você vê esta nota." onChange={(event) => onUpdateDetails({ trainerNote: event.target.value || null })} onBlur={() => onUpdateDetails({}, true)} /></label> : null}
      <label className={styles.studentInstruction}><span>Instrução para o aluno</span><textarea value={prescribed.studentInstruction ?? ""} disabled={!editable} maxLength={2000} placeholder="Orientação que o aluno receberá." onChange={(event) => onUpdateDetails({ studentInstruction: event.target.value || null })} onBlur={() => onUpdateDetails({}, true)} /></label>
    </div>
  </article>;
}

export function WorkoutBuilder({ record, initialView = "builder", backHref = "/dashboard/workouts" }: { record: TrainerWorkoutRecord; initialView?: "builder" | "review" | "history" | "library"; backHref?: string }) {
  const router = useRouter();
  const [projection, setProjection] = useState(record.projection);
  const projectionRef = useRef(projection);
  const [exerciseLibrary, setExerciseLibrary] = useState(record.exerciseLibrary);
  const [selectedSessionId, setSelectedSessionId] = useState(record.projection.sessions[0]?.id ?? null);
  const [libraryTarget, setLibraryTarget] = useState<LibraryTarget>(() => initialView === "library" && record.projection.sessions[0]?.sections[0] ? { sectionId: record.projection.sessions[0].sections[0].id } : null);
  const [reviewMode, setReviewMode] = useState(initialView === "review");
  const [historyOpen, setHistoryOpen] = useState(initialView === "history");
  const [sectionPicker, setSectionPicker] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [message, setMessage] = useState<string | null>(null);
  const [failedMutation, setFailedMutation] = useState<WorkoutMutation | null>(null);
  const [publishConfirm, setPublishConfirm] = useState(false);
  const [pending, startTransition] = useTransition();
  const saveSequence = useRef(0);
  const selectedSession = projection.sessions.find((session) => session.id === selectedSessionId) ?? projection.sessions[0] ?? null;
  const editable = projection.version.status === "DRAFT" && !reviewMode;

  useEffect(() => { projectionRef.current = projection; }, [projection]);

  function applyLocal(mutator: (draft: WorkoutVersionProjection) => void) {
    const next = structuredClone(projectionRef.current);
    mutator(next);
    projectionRef.current = next;
    setProjection(next);
  }

  function runMutation(mutation: WorkoutMutation, onSuccess?: (resultId?: string) => void) {
    const sequence = ++saveSequence.current;
    setSaveState("saving");
    setMessage(null);
    startTransition(async () => {
      const result = await mutateWorkoutAction(projection.version.id, mutation);
      if (!result.ok) {
        setSaveState("error");
        setFailedMutation(mutation);
        setMessage(result.message);
        return;
      }
      if (sequence === saveSequence.current) setSaveState("saved");
      setFailedMutation(null);
      onSuccess?.(result.resultId);
    });
  }

  function retryFailed() {
    if (failedMutation) runMutation(failedMutation);
  }

  function reorderSessions(index: number, direction: -1 | 1) {
    const ordered = moveItem(projection.sessions, index, direction);
    if (ordered === projection.sessions) return;
    applyLocal((draft) => { draft.sessions = ordered.map((session, position) => ({ ...session, sortOrder: position })); });
    runMutation({ type: "REORDER_SESSIONS", sessionIds: ordered.map((session) => session.id) });
  }

  function addSession() {
    const name = `Treino ${String.fromCharCode(65 + projection.sessions.length)}`;
    runMutation({ type: "ADD_SESSION", name, estimatedDurationMinutes: 50 }, (resultId) => {
      if (!resultId) return;
      const created: WorkoutSession = { id: resultId, name, description: null, estimatedDurationMinutes: 50, sortOrder: projectionRef.current.sessions.length, sections: [] };
      applyLocal((draft) => { draft.sessions.push(created); });
      setSelectedSessionId(resultId);
    });
  }

  function updateSession(patch: Partial<Pick<WorkoutSession, "name" | "description" | "estimatedDurationMinutes">>, persist = false) {
    if (!selectedSession) return;
    applyLocal((draft) => {
      const session = draft.sessions.find((item) => item.id === selectedSession.id);
      if (session) Object.assign(session, patch);
    });
    if (persist) {
      const current = projectionRef.current.sessions.find((item) => item.id === selectedSession.id)!;
      runMutation({ type: "UPDATE_SESSION", sessionId: current.id, name: current.name, description: current.description, estimatedDurationMinutes: current.estimatedDurationMinutes });
    }
  }

  function removeSession(sessionId: string) {
    runMutation({ type: "REMOVE_SESSION", sessionId }, () => {
      applyLocal((draft) => { draft.sessions = draft.sessions.filter((session) => session.id !== sessionId).map((session, index) => ({ ...session, sortOrder: index })); });
      setSelectedSessionId(projectionRef.current.sessions[0]?.id ?? null);
      setDeleteTarget(null);
    });
  }

  function addSection(sectionType: WorkoutSectionType) {
    if (!selectedSession) return;
    runMutation({ type: "ADD_SECTION", sessionId: selectedSession.id, sectionType, name: null }, (resultId) => {
      if (!resultId) return;
      const created: WorkoutSection = { id: resultId, sectionType, name: null, sortOrder: selectedSession.sections.length, exercises: [] };
      applyLocal((draft) => { draft.sessions.find((item) => item.id === selectedSession.id)?.sections.push(created); });
      setSectionPicker(false);
    });
  }

  function updateSection(sectionId: string, patch: Partial<Pick<WorkoutSection, "name" | "sectionType">>, persist = false) {
    applyLocal((draft) => {
      for (const session of draft.sessions) {
        const section = session.sections.find((item) => item.id === sectionId);
        if (section) Object.assign(section, patch);
      }
    });
    if (persist) {
      const current = projectionRef.current.sessions.flatMap((session) => session.sections).find((item) => item.id === sectionId)!;
      runMutation({ type: "UPDATE_SECTION", sectionId, sectionType: current.sectionType, name: current.name });
    }
  }

  function reorderSections(index: number, direction: -1 | 1) {
    if (!selectedSession) return;
    const ordered = moveItem(selectedSession.sections, index, direction);
    if (ordered === selectedSession.sections) return;
    applyLocal((draft) => {
      const session = draft.sessions.find((item) => item.id === selectedSession.id);
      if (session) session.sections = ordered.map((section, position) => ({ ...section, sortOrder: position }));
    });
    runMutation({ type: "REORDER_SECTIONS", sessionId: selectedSession.id, sectionIds: ordered.map((section) => section.id) });
  }

  function removeSection(sectionId: string) {
    runMutation({ type: "REMOVE_SECTION", sectionId }, () => {
      applyLocal((draft) => { for (const session of draft.sessions) session.sections = session.sections.filter((section) => section.id !== sectionId).map((section, index) => ({ ...section, sortOrder: index })); });
      setDeleteTarget(null);
    });
  }

  function chooseExercise(exercise: Exercise) {
    if (!libraryTarget) return;
    if (libraryTarget.workoutExerciseId) {
      const targetId = libraryTarget.workoutExerciseId;
      runMutation({ type: "REPLACE_EXERCISE", workoutExerciseId: targetId, exerciseId: exercise.id }, () => {
        applyLocal((draft) => { for (const session of draft.sessions) for (const section of session.sections) { const item = section.exercises.find((entry) => entry.id === targetId); if (item) item.exercise = exercise; } });
        setLibraryTarget(null);
      });
      return;
    }
    const sectionId = libraryTarget.sectionId;
    runMutation({ type: "ADD_EXERCISE", sectionId, exerciseId: exercise.id, supersetGroupKey: null }, (resultId) => {
      if (!resultId) return;
      const created: WorkoutExercisePrescription = { id: resultId, sortOrder: 0, supersetGroupKey: null, trainerNote: null, studentInstruction: null, tempo: null, exercise, sets: [] };
      applyLocal((draft) => { for (const session of draft.sessions) { const section = session.sections.find((item) => item.id === sectionId); if (section) { created.sortOrder = section.exercises.length; section.exercises.push(created); } } });
      setLibraryTarget(null);
      addSet(resultId);
    });
  }

  function findPrescribed(id: string) {
    return projectionRef.current.sessions.flatMap((session) => session.sections).flatMap((section) => section.exercises).find((exercise) => exercise.id === id);
  }

  function updateExercise(id: string, patch: Partial<Pick<WorkoutExercisePrescription, "supersetGroupKey" | "trainerNote" | "studentInstruction" | "tempo">>, persist = false) {
    applyLocal((draft) => { for (const session of draft.sessions) for (const section of session.sections) { const exercise = section.exercises.find((item) => item.id === id); if (exercise) Object.assign(exercise, patch); } });
    if (persist) {
      const current = findPrescribed(id)!;
      runMutation({ type: "UPDATE_EXERCISE", workoutExerciseId: id, supersetGroupKey: current.supersetGroupKey, trainerNote: current.trainerNote, studentInstruction: current.studentInstruction, tempo: current.tempo });
    }
  }

  function reorderExercises(sectionId: string, index: number, direction: -1 | 1) {
    const section = projectionRef.current.sessions.flatMap((session) => session.sections).find((item) => item.id === sectionId)!;
    const ordered = moveItem(section.exercises, index, direction);
    if (ordered === section.exercises) return;
    applyLocal((draft) => { for (const session of draft.sessions) { const item = session.sections.find((entry) => entry.id === sectionId); if (item) item.exercises = ordered.map((exercise, position) => ({ ...exercise, sortOrder: position })); } });
    runMutation({ type: "REORDER_EXERCISES", sectionId, workoutExerciseIds: ordered.map((exercise) => exercise.id) });
  }

  function removeExercise(id: string) {
    runMutation({ type: "REMOVE_EXERCISE", workoutExerciseId: id }, () => {
      applyLocal((draft) => { for (const session of draft.sessions) for (const section of session.sections) section.exercises = section.exercises.filter((item) => item.id !== id).map((item, index) => ({ ...item, sortOrder: index })); });
      setDeleteTarget(null);
    });
  }

  function addSet(workoutExerciseId: string) {
    const exercise = findPrescribed(workoutExerciseId);
    const last = exercise?.sets.toSorted((left, right) => left.setNumber - right.setNumber).at(-1);
    const input = defaultSet((last?.setNumber ?? 0) + 1, last);
    runMutation({ type: "UPSERT_SET", workoutExerciseId, set: input }, (resultId) => {
      if (!resultId) return;
      applyLocal((draft) => { for (const session of draft.sessions) for (const section of session.sections) { const item = section.exercises.find((entry) => entry.id === workoutExerciseId); if (item) item.sets.push({ ...input, id: resultId }); } });
    });
  }

  function updateSet(workoutExerciseId: string, setId: string, patch: Partial<WorkoutSetInput>, persist = false) {
    applyLocal((draft) => { for (const session of draft.sessions) for (const section of session.sections) { const exercise = section.exercises.find((item) => item.id === workoutExerciseId); const set = exercise?.sets.find((item) => item.id === setId); if (set) Object.assign(set, patch); } });
    if (persist) {
      const set = findPrescribed(workoutExerciseId)?.sets.find((item) => item.id === setId);
      if (set) runMutation({ type: "UPSERT_SET", workoutExerciseId, set });
    }
  }

  function removeSet(setId: string) {
    runMutation({ type: "REMOVE_SET", workoutSetId: setId }, () => {
      applyLocal((draft) => { for (const session of draft.sessions) for (const section of session.sections) for (const exercise of section.exercises) exercise.sets = exercise.sets.filter((set) => set.id !== setId).map((set, index) => ({ ...set, setNumber: index + 1 })); });
    });
  }

  function connectSuperset(section: WorkoutSection) {
    applyLocal((draft) => { for (const session of draft.sessions) { const item = session.sections.find((entry) => entry.id === section.id); if (item) item.exercises.forEach((exercise) => { exercise.supersetGroupKey = "A"; }); } });
    for (const exercise of section.exercises) runMutation({ type: "UPDATE_EXERCISE", workoutExerciseId: exercise.id, supersetGroupKey: "A", trainerNote: exercise.trainerNote, studentInstruction: exercise.studentInstruction, tempo: exercise.tempo });
  }

  function lifecycle(action: "APPROVE" | "PUBLISH" | "ARCHIVE" | "CLONE") {
    setMessage(null);
    startTransition(async () => {
      const result = await changeWorkoutLifecycleAction({ versionId: projection.version.id, action });
      setMessage(result.message);
      if (!result.ok) return;
      if (action === "CLONE" && result.resultId && result.resultId !== projection.version.id) { router.push(`/dashboard/workouts/${result.resultId}`); return; }
      if (action === "APPROVE") applyLocal((draft) => { draft.version.status = "APPROVED"; draft.version.approvedAt = new Date().toISOString(); });
      if (action === "PUBLISH") applyLocal((draft) => { draft.version.status = "PUBLISHED"; draft.version.publishedAt = new Date().toISOString(); });
      if (action === "ARCHIVE") applyLocal((draft) => { draft.version.status = "ARCHIVED"; draft.version.archivedAt = new Date().toISOString(); });
      setReviewMode(false);
      setPublishConfirm(false);
    });
  }

  return <main className={`pp-workout-builder-shell ${styles.builderPage}${reviewMode ? ` ${styles.reviewPage}` : ""}`}>
    <header className={`pp-workout-builder-topbar ${styles.builderTopbar}`}>
      <Link href={backHref} aria-label="Voltar para treinos"><ArrowLeft aria-hidden="true" /></Link>
      <div className={styles.builderTitle}><span><strong>{projection.plan.name}</strong><small>{record.studentContext?.student.name ?? "Aluno"} · v{projection.version.versionNumber}</small></span></div>
      <div className={styles.saveState} data-state={saveState}>{saveState === "saving" ? <LoaderCircle className={styles.spin} aria-hidden="true" /> : saveState === "error" ? <X aria-hidden="true" /> : <Check aria-hidden="true" />}<span>{saveState === "saving" ? "Salvando" : saveState === "error" ? "Falha ao salvar" : "Salvo"}</span>{saveState === "error" ? <button type="button" onClick={retryFailed}>Tentar de novo</button> : null}</div>
      <WorkoutStatusBadge status={projection.version.status} />
      <button type="button" className={styles.historyButton} onClick={() => setHistoryOpen(true)}><History aria-hidden="true" /><span>Versões</span></button>
      <div className={styles.lifecycleActions}>
        {projection.version.status === "DRAFT" && !reviewMode ? <button type="button" className="pp-button pp-button--primary" onClick={() => setReviewMode(true)}><Eye aria-hidden="true" />Revisar treino</button> : null}
        {projection.version.status === "DRAFT" && reviewMode ? <><button type="button" className="pp-button pp-button--secondary" onClick={() => setReviewMode(false)}>Voltar e editar</button><button type="button" className="pp-button pp-button--primary" onClick={() => lifecycle("APPROVE")} disabled={pending}><Check aria-hidden="true" />Aprovar</button></> : null}
        {projection.version.status === "APPROVED" ? <button type="button" className="pp-button pp-button--primary" onClick={() => setPublishConfirm(true)}><Send aria-hidden="true" />Publicar</button> : null}
        {projection.version.status === "PUBLISHED" || projection.version.status === "ARCHIVED" ? <button type="button" className="pp-button pp-button--primary" onClick={() => lifecycle("CLONE")} disabled={pending}><Copy aria-hidden="true" />Criar nova versão</button> : null}
      </div>
    </header>

    {reviewMode ? <div className={styles.reviewBanner}><Eye aria-hidden="true" /><div><strong>Prévia do aluno</strong><p>Revise mídia, ordem, instruções e séries antes de aprovar.</p></div></div> : null}
    {message ? <div className={styles.builderMessage} role="status"><Save aria-hidden="true" />{message}<button type="button" onClick={() => setMessage(null)} aria-label="Fechar mensagem"><X aria-hidden="true" /></button></div> : null}

    <div className={styles.builderLayout}>
      <aside className={styles.sessionRail}>
        <header><span>Sessões</span>{editable ? <button type="button" onClick={addSession} aria-label="Adicionar sessão"><Plus aria-hidden="true" /></button> : null}</header>
        <nav aria-label="Sessões do plano">{projection.sessions.map((session, index) => <button type="button" className={session.id === selectedSession?.id ? styles.activeSession : undefined} onClick={() => setSelectedSessionId(session.id)} key={session.id}><span>{String.fromCharCode(65 + index)}</span><span><strong>{session.name}</strong><small>{session.estimatedDurationMinutes ?? "—"} min · {session.sections.reduce((sum, section) => sum + section.exercises.length, 0)} exercícios</small></span>{editable ? <em><i onClick={(event) => { event.stopPropagation(); reorderSessions(index, -1); }} role="button" aria-label="Mover sessão para cima"><ArrowUp aria-hidden="true" /></i><i onClick={(event) => { event.stopPropagation(); reorderSessions(index, 1); }} role="button" aria-label="Mover sessão para baixo"><ArrowDown aria-hidden="true" /></i></em> : null}</button>)}</nav>
        {editable ? <button type="button" className={styles.addSessionButton} onClick={addSession}><Plus aria-hidden="true" />Adicionar sessão</button> : null}
      </aside>

      <section className={styles.editorCanvas}>
        {selectedSession ? <>
          <header className={styles.sessionHeader}>
            <div>{editable ? <input value={selectedSession.name} maxLength={120} aria-label="Nome da sessão" onChange={(event) => updateSession({ name: event.target.value })} onBlur={() => updateSession({}, true)} /> : <h1>{selectedSession.name}</h1>}<p><Clock3 aria-hidden="true" />{editable ? <><input type="number" min={1} max={600} value={selectedSession.estimatedDurationMinutes ?? ""} aria-label="Duração estimada em minutos" onChange={(event) => updateSession({ estimatedDurationMinutes: event.target.value ? Number(event.target.value) : null })} onBlur={() => updateSession({}, true)} /> min estimados</> : `${selectedSession.estimatedDurationMinutes ?? "—"} min estimados`} · {selectedSession.sections.length} blocos</p></div>
            {editable ? <div>{deleteTarget === selectedSession.id ? <span className={styles.inlineDelete}><button type="button" onClick={() => setDeleteTarget(null)}>Cancelar</button><button type="button" onClick={() => removeSession(selectedSession.id)}>Remover sessão</button></span> : <button type="button" onClick={() => setDeleteTarget(selectedSession.id)} aria-label="Mais ações da sessão"><MoreHorizontal aria-hidden="true" /></button>}</div> : null}
          </header>

          {selectedSession.sections.length ? <div className={styles.sections}>{selectedSession.sections.map((section, sectionIndex) => <section className={styles.workoutSection} key={section.id}>
            <header className={styles.sectionHeader}>
              <span className={styles.sectionIndex}>{String(sectionIndex + 1).padStart(2, "0")}</span>
              <div>{editable ? <input value={section.name ?? workoutSectionLabels[section.sectionType]} maxLength={120} aria-label="Nome do bloco" onChange={(event) => updateSection(section.id, { name: event.target.value })} onBlur={() => updateSection(section.id, {}, true)} /> : <h2>{section.name ?? workoutSectionLabels[section.sectionType]}</h2>}<small>{workoutSectionLabels[section.sectionType]} · {section.exercises.length} exercícios</small></div>
              {section.sectionType === "SUPERSET" && editable && section.exercises.length >= 2 ? <button type="button" className={styles.connectSuperset} onClick={() => connectSuperset(section)}><Layers3 aria-hidden="true" />Conectar grupo A</button> : null}
              {editable ? <div className={styles.sectionActions}><button type="button" onClick={() => reorderSections(sectionIndex, -1)} disabled={sectionIndex === 0} aria-label="Mover bloco para cima"><ArrowUp aria-hidden="true" /></button><button type="button" onClick={() => reorderSections(sectionIndex, 1)} disabled={sectionIndex === selectedSession.sections.length - 1} aria-label="Mover bloco para baixo"><ArrowDown aria-hidden="true" /></button><button type="button" onClick={() => setDeleteTarget(deleteTarget === section.id ? null : section.id)} aria-label="Remover bloco"><Trash2 aria-hidden="true" /></button></div> : null}
            </header>
            {deleteTarget === section.id ? <div className={styles.inlineConfirm}><span>Remover este bloco e todo o conteúdo?</span><button type="button" onClick={() => setDeleteTarget(null)}>Cancelar</button><button type="button" onClick={() => removeSection(section.id)}>Remover</button></div> : null}
            <div className={styles.exerciseStack}>{section.exercises.map((exercise, exerciseIndex) => <ExerciseCard
              key={exercise.id}
              prescribed={exercise}
              sectionType={section.sectionType}
              index={exerciseIndex}
              total={section.exercises.length}
              editable={editable}
              demoMode={record.demoMode}
              deleteArmed={deleteTarget === exercise.id}
              onMove={(direction) => reorderExercises(section.id, exerciseIndex, direction)}
              onReplace={() => setLibraryTarget({ sectionId: section.id, workoutExerciseId: exercise.id })}
              onArmDelete={() => setDeleteTarget(deleteTarget === exercise.id ? null : exercise.id)}
              onRemove={() => removeExercise(exercise.id)}
              onUpdateDetails={(patch, persist) => updateExercise(exercise.id, patch, persist)}
              onUpdateSet={(setId, patch, persist) => updateSet(exercise.id, setId, patch, persist)}
              onDuplicateSet={(set) => {
                const input = defaultSet(exercise.sets.length + 1, set);
                runMutation({ type: "UPSERT_SET", workoutExerciseId: exercise.id, set: input }, (resultId) => { if (resultId) applyLocal((draft) => { for (const currentSession of draft.sessions) for (const currentSection of currentSession.sections) { const current = currentSection.exercises.find((item) => item.id === exercise.id); if (current) current.sets.push({ ...input, id: resultId }); } }); });
              }}
              onRemoveSet={removeSet}
              onAddSet={() => addSet(exercise.id)}
            />)}</div>
            {editable ? <button type="button" className={styles.addExerciseButton} onClick={() => setLibraryTarget({ sectionId: section.id })}><Plus aria-hidden="true" />Adicionar exercício</button> : null}
          </section>)}</div> : <div className={styles.builderEmpty}><Layers3 aria-hidden="true" /><strong>Comece pelo primeiro bloco</strong><p>Organize aquecimento, trabalho principal e finalização sem transformar o treino em uma planilha.</p>{editable ? <button type="button" className="pp-button pp-button--primary" onClick={() => setSectionPicker(true)}><Plus aria-hidden="true" />Adicionar bloco</button> : null}</div>}

          {editable ? <div className={styles.addSectionArea}>{sectionPicker ? <div className={styles.sectionTypePicker}><header><strong>Escolha o tipo de bloco</strong><button type="button" onClick={() => setSectionPicker(false)} aria-label="Fechar"><X aria-hidden="true" /></button></header><div>{sectionTypes.map((type) => <button type="button" key={type} onClick={() => addSection(type)}><span><Layers3 aria-hidden="true" /></span><strong>{workoutSectionLabels[type]}</strong><small>{type}</small></button>)}</div></div> : <button type="button" onClick={() => setSectionPicker(true)}><Plus aria-hidden="true" />Adicionar bloco</button>}</div> : null}
        </> : <div className={styles.builderEmpty}><Dumbbell aria-hidden="true" /><strong>Adicione a primeira sessão</strong><p>Uma sessão reúne os blocos e exercícios de um dia de treino.</p>{editable ? <button type="button" className="pp-button pp-button--primary" onClick={addSession}><Plus aria-hidden="true" />Adicionar sessão</button> : null}</div>}
      </section>

      <StudentWorkoutContext context={record.studentContext} />
    </div>

    <div className={styles.mobilePrimaryAction}>{projection.version.status === "DRAFT" && !reviewMode ? <button type="button" className="pp-button pp-button--primary" onClick={() => setReviewMode(true)}><Eye aria-hidden="true" />Revisar treino</button> : projection.version.status === "DRAFT" ? <button type="button" className="pp-button pp-button--primary" onClick={() => lifecycle("APPROVE")}><Check aria-hidden="true" />Aprovar treino</button> : projection.version.status === "APPROVED" ? <button type="button" className="pp-button pp-button--primary" onClick={() => setPublishConfirm(true)}><Send aria-hidden="true" />Publicar</button> : null}</div>

    <ExerciseLibraryDrawer open={libraryTarget !== null} exercises={exerciseLibrary} demoMode={record.demoMode} mode={libraryTarget?.workoutExerciseId ? "REPLACE" : "ADD"} onClose={() => setLibraryTarget(null)} onChoose={chooseExercise} onCustomCreated={(exercise) => setExerciseLibrary((items) => [...items, exercise])} />
    <VersionHistoryPanel plan={record.planSummary} currentId={projection.version.id} open={historyOpen} onClose={() => setHistoryOpen(false)} />

    {publishConfirm ? <div className={styles.confirmBackdrop} role="presentation"><section className={styles.publishConfirm} role="dialog" aria-modal="true" aria-labelledby="publish-title"><button type="button" onClick={() => setPublishConfirm(false)} aria-label="Fechar"><X aria-hidden="true" /></button><span><Send aria-hidden="true" /></span><h2 id="publish-title">Publicar para {record.studentContext?.student.name ?? "o aluno"}?</h2><p><strong>{projection.plan.name}</strong>, versão {projection.version.versionNumber}, ficará disponível ao aluno e não poderá mais ser editado.</p><div><button type="button" className="pp-button pp-button--secondary" onClick={() => setPublishConfirm(false)}>Cancelar</button><button type="button" className="pp-button pp-button--primary" onClick={() => lifecycle("PUBLISH")} disabled={pending}>{pending ? <LoaderCircle className={styles.spin} aria-hidden="true" /> : <Send aria-hidden="true" />}Confirmar publicação</button></div></section></div> : null}
  </main>;
}
