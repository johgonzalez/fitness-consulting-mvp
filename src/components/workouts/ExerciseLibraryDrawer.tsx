"use client";

import { useDeferredValue, useMemo, useState, useTransition } from "react";
import { Check, ChevronLeft, Dumbbell, Filter, Plus, Search, X } from "lucide-react";
import { createCustomExerciseAction } from "@/app/actions/workouts";
import { ExerciseMedia } from "@/components/workouts/ExerciseMedia";
import type { Exercise } from "@/lib/domain/workouts";
import styles from "./workouts.module.css";

export function ExerciseLibraryDrawer({
  open,
  exercises,
  demoMode,
  mode,
  onClose,
  onChoose,
  onCustomCreated,
}: {
  open: boolean;
  exercises: Exercise[];
  demoMode: boolean;
  mode: "ADD" | "REPLACE";
  onClose: () => void;
  onChoose: (exercise: Exercise) => void;
  onCustomCreated: (exercise: Exercise) => void;
}) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [muscle, setMuscle] = useState("all");
  const [equipment, setEquipment] = useState("all");
  const [source, setSource] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(exercises[0]?.id ?? null);
  const [creating, setCreating] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customInstructions, setCustomInstructions] = useState("");
  const [customMuscle, setCustomMuscle] = useState("full_body");
  const [customEquipment, setCustomEquipment] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const muscles = useMemo(() => [...new Set(exercises.map((exercise) => exercise.primaryMuscleGroup))].toSorted(), [exercises]);
  const equipmentOptions = useMemo(() => [...new Set(exercises.flatMap((exercise) => exercise.equipment))].toSorted(), [exercises]);
  const filtered = useMemo(() => {
    const normalized = deferredQuery.trim().toLocaleLowerCase("pt-BR");
    return exercises.filter((exercise) => {
      const matchesQuery = !normalized || `${exercise.name} ${exercise.primaryMuscleGroup} ${exercise.equipment.join(" ")}`.toLocaleLowerCase("pt-BR").includes(normalized);
      return matchesQuery
        && (muscle === "all" || exercise.primaryMuscleGroup === muscle)
        && (equipment === "all" || exercise.equipment.includes(equipment))
        && (source === "all" || exercise.sourceType === source);
    });
  }, [deferredQuery, equipment, exercises, muscle, source]);
  const selected = filtered.find((exercise) => exercise.id === selectedId) ?? filtered[0] ?? null;

  function createCustom() {
    setMessage(null);
    startTransition(async () => {
      const result = await createCustomExerciseAction({
        name: customName,
        description: null,
        primaryMuscleGroup: customMuscle,
        secondaryMuscleGroups: [],
        equipment: customEquipment.split(",").map((item) => item.trim()).filter(Boolean),
        movementPattern: null,
        instructions: customInstructions,
        coachingCues: [],
        locale: "pt-BR",
      });
      setMessage(result.message);
      if (result.ok && result.resultId) {
        const created: Exercise = {
          id: result.resultId,
          sourceType: "TRAINER_CUSTOM",
          name: customName.trim(),
          description: null,
          primaryMuscleGroup: customMuscle,
          secondaryMuscleGroups: [],
          equipment: customEquipment.split(",").map((item) => item.trim()).filter(Boolean),
          movementPattern: null,
          instructions: customInstructions.trim(),
          coachingCues: [],
          locale: "pt-BR",
          media: [],
        };
        onCustomCreated(created);
        setSelectedId(created.id);
        setCreating(false);
        setCustomName("");
        setCustomInstructions("");
        setCustomEquipment("");
      }
    });
  }

  if (!open) return null;
  return <div className={styles.libraryBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <aside className={styles.libraryDrawer} role="dialog" aria-modal="true" aria-labelledby="exercise-library-title">
      <header className={styles.libraryHeader}><div><span><Dumbbell aria-hidden="true" /></span><div><h2 id="exercise-library-title">Biblioteca de exercícios</h2><p>{mode === "ADD" ? "Escolha o próximo exercício" : "Substitua sem perder a prescrição"}</p></div></div><button type="button" className="pp-icon-button" onClick={onClose} aria-label="Fechar biblioteca"><X aria-hidden="true" /></button></header>
      <div className={styles.librarySearch}><Search aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar exercício" aria-label="Buscar exercício" /></div>
      <div className={styles.libraryFilters}><Filter aria-hidden="true" /><select value={muscle} onChange={(event) => setMuscle(event.target.value)} aria-label="Filtrar por grupo muscular"><option value="all">Todos os músculos</option>{muscles.map((item) => <option key={item}>{item}</option>)}</select><select value={equipment} onChange={(event) => setEquipment(event.target.value)} aria-label="Filtrar por equipamento"><option value="all">Todos os equipamentos</option>{equipmentOptions.map((item) => <option key={item}>{item}</option>)}</select><select value={source} onChange={(event) => setSource(event.target.value)} aria-label="Filtrar por origem"><option value="all">Sistema + meus</option><option value="PPERFIL_LIBRARY">PPerfil</option><option value="TRAINER_CUSTOM">Meus exercícios</option></select></div>

      <div className={styles.libraryContent}>
        <div className={styles.libraryList}>
          {filtered.length ? filtered.map((exercise) => <button type="button" className={`${styles.libraryCard}${selected?.id === exercise.id ? ` ${styles.libraryCardSelected}` : ""}`} key={exercise.id} onClick={() => setSelectedId(exercise.id)}>
            <ExerciseMedia exercise={exercise} demoMode={demoMode} />
            <span><strong>{exercise.name}</strong><small>{exercise.primaryMuscleGroup}</small><em>{exercise.equipment.join(" · ") || "Sem equipamento"}</em></span>
            {selected?.id === exercise.id ? <Check aria-hidden="true" /> : null}
          </button>) : <div className={styles.libraryEmpty}><Dumbbell aria-hidden="true" /><strong>Nenhum exercício encontrado</strong><p>Limpe um filtro ou crie um exercício personalizado.</p></div>}
          <button type="button" className={styles.createExerciseButton} onClick={() => setCreating(true)}><Plus aria-hidden="true" />Criar exercício personalizado</button>
        </div>
        <div className={styles.exercisePreview}>
          {creating ? <div className={styles.customExerciseForm}><button type="button" onClick={() => setCreating(false)}><ChevronLeft aria-hidden="true" />Voltar à biblioteca</button><h3>Novo exercício</h3><label>Nome<input value={customName} onChange={(event) => setCustomName(event.target.value)} maxLength={160} /></label><label>Grupo muscular<select value={customMuscle} onChange={(event) => setCustomMuscle(event.target.value)}><option value="full_body">Corpo inteiro</option><option value="quadriceps">Quadríceps</option><option value="glutes">Glúteos</option><option value="back">Costas</option><option value="chest">Peitoral</option><option value="core">Core</option></select></label><label>Equipamentos<input value={customEquipment} onChange={(event) => setCustomEquipment(event.target.value)} placeholder="dumbbells, bench" /></label><label>Instruções<textarea value={customInstructions} onChange={(event) => setCustomInstructions(event.target.value)} maxLength={5000} /></label>{message ? <p role="status">{message}</p> : null}<button type="button" className="pp-button pp-button--primary" disabled={pending || customName.trim().length < 2 || customInstructions.trim().length < 2} onClick={createCustom}>Criar exercício</button></div> : selected ? <>
            <ExerciseMedia exercise={selected} demoMode={demoMode} priority />
            <div className={styles.previewIdentity}><small>{selected.sourceType === "PPERFIL_LIBRARY" ? "Biblioteca PPerfil" : "Meu exercício"}</small><h3>{selected.name}</h3><p>{selected.primaryMuscleGroup} · {selected.equipment.join(" · ") || "Sem equipamento"}</p></div>
            <section><h4>Instruções</h4><p>{selected.instructions}</p></section>
            <section><h4>Pontos de atenção</h4>{selected.coachingCues.length ? <ul>{selected.coachingCues.map((cue) => <li key={cue}>{cue}</li>)}</ul> : <p>Sem dicas adicionais.</p>}</section>
            <button type="button" className="pp-button pp-button--primary" onClick={() => onChoose(selected)}>{mode === "ADD" ? "Adicionar ao treino" : "Usar este exercício"}</button>
          </> : null}
        </div>
      </div>
    </aside>
  </div>;
}
