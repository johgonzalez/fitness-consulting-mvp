"use client";

import { Copy, Plus, Trash2 } from "lucide-react";
import type { WorkoutSetInput, WorkoutSetPrescription } from "@/lib/domain/workouts";
import { workoutSetTypeLabels } from "@/lib/workouts/presentation";
import styles from "./workouts.module.css";

type SetPatch = Partial<Omit<WorkoutSetInput, "id" | "setNumber">>;

function modeFor(set: WorkoutSetPrescription) {
  if (set.durationSeconds != null) return "DURATION";
  if (set.distanceValue != null) return "DISTANCE";
  if (set.targetRepsMin != null) return "RANGE";
  return "REPS";
}

function numeric(value: string) {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function SetEditor({
  sets,
  editable,
  onUpdate,
  onDuplicate,
  onRemove,
  onAdd,
}: {
  sets: WorkoutSetPrescription[];
  editable: boolean;
  onUpdate: (setId: string, patch: SetPatch, persist?: boolean) => void;
  onDuplicate: (set: WorkoutSetPrescription) => void;
  onRemove: (setId: string) => void;
  onAdd: () => void;
}) {
  return <div className={styles.setEditor}>
    <div className={styles.setHeader} aria-hidden="true"><span>Série</span><span>Tipo</span><span>Alvo</span><span>Carga</span><span>Descanso</span><span>RPE</span><span /></div>
    {sets.toSorted((left, right) => left.setNumber - right.setNumber).map((set) => {
      const mode = modeFor(set);
      return <div className={styles.setRow} key={set.id}>
        <span className={styles.setNumber}>{set.setNumber}</span>
        <label><span>Tipo</span><select value={set.setType} disabled={!editable} onChange={(event) => onUpdate(set.id, { setType: event.target.value as WorkoutSetInput["setType"] }, true)}>{Object.entries(workoutSetTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <div className={styles.targetEditor}>
          <label><span>Alvo</span><select value={mode} disabled={!editable} onChange={(event) => {
            const next = event.target.value;
            onUpdate(set.id, {
              targetReps: next === "REPS" ? 10 : null,
              targetRepsMin: next === "RANGE" ? 8 : null,
              targetRepsMax: next === "RANGE" ? 12 : null,
              durationSeconds: next === "DURATION" ? 30 : null,
              distanceValue: next === "DISTANCE" ? 1 : null,
              distanceUnit: next === "DISTANCE" ? "km" : null,
            }, true);
          }}><option value="REPS">Reps</option><option value="RANGE">Faixa</option><option value="DURATION">Tempo</option><option value="DISTANCE">Distância</option></select></label>
          {mode === "REPS" ? <label><span>Reps</span><input aria-label={`Repetições da série ${set.setNumber}`} inputMode="numeric" value={set.targetReps ?? ""} disabled={!editable} onChange={(event) => onUpdate(set.id, { targetReps: numeric(event.target.value) })} onBlur={() => onUpdate(set.id, {}, true)} /></label> : null}
          {mode === "RANGE" ? <span className={styles.rangeInputs}><label><span>Mín.</span><input aria-label={`Repetições mínimas da série ${set.setNumber}`} inputMode="numeric" value={set.targetRepsMin ?? ""} disabled={!editable} onChange={(event) => onUpdate(set.id, { targetRepsMin: numeric(event.target.value) })} onBlur={() => onUpdate(set.id, {}, true)} /></label><i>–</i><label><span>Máx.</span><input aria-label={`Repetições máximas da série ${set.setNumber}`} inputMode="numeric" value={set.targetRepsMax ?? ""} disabled={!editable} onChange={(event) => onUpdate(set.id, { targetRepsMax: numeric(event.target.value) })} onBlur={() => onUpdate(set.id, {}, true)} /></label></span> : null}
          {mode === "DURATION" ? <label><span>Segundos</span><input aria-label={`Duração da série ${set.setNumber}`} inputMode="numeric" value={set.durationSeconds ?? ""} disabled={!editable} onChange={(event) => onUpdate(set.id, { durationSeconds: numeric(event.target.value) })} onBlur={() => onUpdate(set.id, {}, true)} /></label> : null}
          {mode === "DISTANCE" ? <span className={styles.rangeInputs}><label><span>Distância</span><input aria-label={`Distância da série ${set.setNumber}`} inputMode="decimal" value={set.distanceValue ?? ""} disabled={!editable} onChange={(event) => onUpdate(set.id, { distanceValue: numeric(event.target.value) })} onBlur={() => onUpdate(set.id, {}, true)} /></label><label><span>Unidade</span><select value={set.distanceUnit ?? "km"} disabled={!editable} onChange={(event) => onUpdate(set.id, { distanceUnit: event.target.value as "m" | "km" | "mi" }, true)}><option value="m">m</option><option value="km">km</option><option value="mi">mi</option></select></label></span> : null}
        </div>
        <span className={styles.valueWithUnit}><label><span>Carga</span><input aria-label={`Carga da série ${set.setNumber}`} inputMode="decimal" value={set.targetLoad ?? ""} disabled={!editable} onChange={(event) => onUpdate(set.id, { targetLoad: numeric(event.target.value), loadUnit: numeric(event.target.value) == null ? null : set.loadUnit ?? "kg" })} onBlur={() => onUpdate(set.id, {}, true)} /></label><select aria-label={`Unidade de carga da série ${set.setNumber}`} value={set.loadUnit ?? "kg"} disabled={!editable || set.targetLoad == null} onChange={(event) => onUpdate(set.id, { loadUnit: event.target.value as "kg" | "lb" }, true)}><option value="kg">kg</option><option value="lb">lb</option></select></span>
        <label><span>Descanso</span><span className={styles.inputSuffix}><input aria-label={`Descanso da série ${set.setNumber}`} inputMode="numeric" value={set.restSeconds ?? ""} disabled={!editable} onChange={(event) => onUpdate(set.id, { restSeconds: numeric(event.target.value) })} onBlur={() => onUpdate(set.id, {}, true)} /><i>s</i></span></label>
        <label><span>RPE</span><input aria-label={`RPE da série ${set.setNumber}`} inputMode="decimal" value={set.targetRpe ?? ""} disabled={!editable} onChange={(event) => onUpdate(set.id, { targetRpe: numeric(event.target.value) })} onBlur={() => onUpdate(set.id, {}, true)} /></label>
        {editable ? <span className={styles.setActions}><button type="button" onClick={() => onDuplicate(set)} aria-label={`Duplicar série ${set.setNumber}`}><Copy aria-hidden="true" /></button><button type="button" onClick={() => onRemove(set.id)} aria-label={`Remover série ${set.setNumber}`}><Trash2 aria-hidden="true" /></button></span> : null}
        <label className={styles.setNotes}><span>Nota da série</span><input value={set.notes ?? ""} disabled={!editable} placeholder="Nota opcional" maxLength={1000} onChange={(event) => onUpdate(set.id, { notes: event.target.value || null })} onBlur={() => onUpdate(set.id, {}, true)} /></label>
      </div>;
    })}
    {editable ? <button type="button" className={styles.addSet} onClick={onAdd}><Plus aria-hidden="true" />Adicionar série <small>herda valores da anterior</small></button> : null}
  </div>;
}
