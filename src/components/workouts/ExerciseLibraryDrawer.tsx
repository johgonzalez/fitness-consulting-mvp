"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Check, ChevronLeft, Dumbbell, Filter, Plus, Search, X } from "lucide-react";
import { createCustomExerciseAction, searchExerciseLibraryAction } from "@/app/actions/workouts";
import { ExerciseMedia } from "@/components/workouts/ExerciseMedia";
import type { Exercise } from "@/lib/domain/workouts";
import { exerciseEquipmentOptions, exerciseMuscleGroupOptions } from "@/lib/workouts/presentation";
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
  const searchRef = useRef<HTMLInputElement>(null);
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
  const [customYoutube, setCustomYoutube] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [searchResult, setSearchResult] = useState<{ signature: string; exercises: Exercise[]; message: string | null }>({
    signature: "",
    exercises: [],
    message: null,
  });
  const [searchPending, startSearchTransition] = useTransition();
  const normalizedQuery = deferredQuery.trim();
  const remoteSearch = normalizedQuery.length > 0 || muscle !== "all" || equipment !== "all";
  const searchSignature = `${normalizedQuery}\u0000${muscle}\u0000${equipment}\u0000${source}`;
  const catalogExercises = useMemo(() => remoteSearch
    ? searchResult.signature === searchSignature ? searchResult.exercises : []
    : exercises, [exercises, remoteSearch, searchResult, searchSignature]);

  useEffect(() => {
    if (!remoteSearch) return;
    let ignore = false;
    startSearchTransition(async () => {
      const result = await searchExerciseLibraryAction({ query: normalizedQuery, muscle, equipment, source });
      if (!ignore) {
        setSearchResult({ signature: searchSignature, exercises: result.exercises, message: result.message });
      }
    });
    return () => { ignore = true; };
  }, [equipment, muscle, normalizedQuery, remoteSearch, searchSignature, source]);

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, open]);

  const filtered = useMemo(() => {
    const normalized = normalizedQuery.toLocaleLowerCase("pt-BR");
    return catalogExercises.filter((exercise) => {
      const matchesQuery = !normalized || `${exercise.name} ${exercise.primaryMuscleGroup} ${exercise.equipment.join(" ")}`.toLocaleLowerCase("pt-BR").includes(normalized);
      return matchesQuery
        && (muscle === "all" || exercise.primaryMuscleGroup === muscle)
        && (equipment === "all" || exercise.equipment.includes(equipment))
        && (source === "all" || exercise.sourceType === source);
    });
  }, [catalogExercises, equipment, muscle, normalizedQuery, source]);
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
        youtubeUrl: customYoutube,
      });
      setMessage(result.message);
      if (result.ok && result.exercise) {
        const created = result.exercise;
        onCustomCreated(created);
        setSelectedId(created.id);
        setCreating(false);
        setCustomName("");
        setCustomInstructions("");
        setCustomEquipment("");
        setCustomYoutube("");
      }
    });
  }

  if (!open) return null;
  return <div className={styles.libraryBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <aside className={styles.libraryDrawer} role="dialog" aria-modal="true" aria-labelledby="exercise-library-title">
      <header className={styles.libraryHeader}><div><span><Dumbbell aria-hidden="true" /></span><div><h2 id="exercise-library-title">Biblioteca de exercícios</h2><p>{mode === "ADD" ? "Escolha o próximo exercício" : "Substitua sem perder a prescrição"}</p></div></div><button type="button" className="pp-icon-button" onClick={onClose} aria-label="Fechar biblioteca"><X aria-hidden="true" /></button></header>
      <div className={styles.librarySearch}><Search aria-hidden="true" /><input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar exercício" aria-label="Buscar exercício" />{query ? <button type="button" onClick={() => setQuery("")} aria-label="Limpar busca"><X aria-hidden="true" /></button> : null}</div>
      <div className={styles.libraryFilters}><Filter aria-hidden="true" /><select value={muscle} onChange={(event) => setMuscle(event.target.value)} aria-label="Filtrar por grupo muscular"><option value="all">Todos os músculos</option>{exerciseMuscleGroupOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><select value={equipment} onChange={(event) => setEquipment(event.target.value)} aria-label="Filtrar por equipamento"><option value="all">Todos os equipamentos</option>{exerciseEquipmentOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><select value={source} onChange={(event) => setSource(event.target.value)} aria-label="Filtrar por origem"><option value="all">Sistema + meus</option><option value="PPERFIL_LIBRARY">Cheipi</option><option value="TRAINER_CUSTOM">Meus exercícios</option></select></div>
      <p className={styles.librarySearchStatus} role="status" aria-live="polite">{searchPending ? "Consultando catálogo…" : remoteSearch ? searchResult.signature === searchSignature ? searchResult.message : "Consultando catálogo…" : `${exercises.length} exercícios carregados. Use a busca para consultar todo o catálogo.`}</p>

      <div className={styles.libraryContent}>
        <div className={styles.libraryList}>
          {filtered.length ? filtered.map((exercise) => <div className={`${styles.libraryCard}${selected?.id === exercise.id ? ` ${styles.libraryCardSelected}` : ""}`} key={exercise.id}>
            <button type="button" className={styles.libraryCardSelect} onClick={() => setSelectedId(exercise.id)} aria-label={`Ver detalhes de ${exercise.name}`}>
              <ExerciseMedia exercise={exercise} demoMode={demoMode} />
              <span><strong>{exercise.name}</strong><small>{exercise.primaryMuscleGroup} · {exercise.equipment.join(" · ") || "Sem equipamento"}</small></span>
              {selected?.id === exercise.id ? <Check aria-hidden="true" /> : null}
            </button>
            <button type="button" className={styles.libraryCardAdd} onClick={() => onChoose(exercise)} aria-label={`${mode === "ADD" ? "Adicionar" : "Usar"} ${exercise.name}`}>{mode === "ADD" ? "Adicionar" : "Usar"}</button>
          </div>) : <div className={styles.libraryEmpty}><Dumbbell aria-hidden="true" /><strong>{searchPending ? "Consultando exercícios" : "Nenhum exercício encontrado"}</strong><p>{searchPending ? "Aguarde um instante." : "Limpe um filtro ou crie um exercício personalizado."}</p></div>}
          <button type="button" className={styles.createExerciseButton} onClick={() => setCreating(true)}><Plus aria-hidden="true" />Criar exercício personalizado</button>
        </div>
        <div className={styles.exercisePreview}>
          {creating ? <div className={styles.customExerciseForm}><button type="button" onClick={() => setCreating(false)}><ChevronLeft aria-hidden="true" />Voltar à biblioteca</button><h3>Novo exercício</h3><label>Nome<input value={customName} onChange={(event) => setCustomName(event.target.value)} maxLength={160} /></label><label>Grupo muscular <small>opcional</small><select value={customMuscle} onChange={(event) => setCustomMuscle(event.target.value)}>{exerciseMuscleGroupOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label>Equipamentos <small>opcional</small><input value={customEquipment} onChange={(event) => setCustomEquipment(event.target.value)} placeholder="dumbbell, bench" /></label><label>Instruções <small>opcional</small><textarea value={customInstructions} onChange={(event) => setCustomInstructions(event.target.value)} maxLength={5000} /></label><label>URL do YouTube <small>opcional</small><input type="url" value={customYoutube} onChange={(event) => setCustomYoutube(event.target.value)} placeholder="https://www.youtube.com/watch?v=..." /></label>{message ? <p role="status">{message}</p> : null}<button type="button" className="pp-button pp-button--primary" disabled={pending || customName.trim().length < 2} onClick={createCustom}>Criar exercício</button></div> : selected ? <>
            <ExerciseMedia exercise={selected} demoMode={demoMode} priority />
          <div className={styles.previewIdentity}><small>{selected.sourceType === "PPERFIL_LIBRARY" ? "Biblioteca Cheipi" : "Meu exercício"}</small><h3>{selected.name}</h3><p>{selected.primaryMuscleGroup} · {selected.equipment.join(" · ") || "Sem equipamento"}</p></div>
            <section><h4>Instruções</h4><p>{selected.instructions}</p></section>
            <section><h4>Pontos de atenção</h4>{selected.coachingCues.length ? <ul>{selected.coachingCues.map((cue) => <li key={cue}>{cue}</li>)}</ul> : <p>Sem dicas adicionais.</p>}</section>
            <button type="button" className="pp-button pp-button--primary" onClick={() => onChoose(selected)}>{mode === "ADD" ? "Adicionar ao treino" : "Usar este exercício"}</button>
          </> : null}
        </div>
      </div>
    </aside>
  </div>;
}
