import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");

test("auth and invite surfaces keep a keyboard-safe mobile layout", async () => {
  const css = await read("src/app/premium-consumer-v1a.css");

  assert.match(css, /min-height:\s*100dvh/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /scroll-margin-block:\s*96px/);
  assert.match(css, /\.pc-auth-content\s*\{[^}]*margin:\s*0 auto/s);
});

test("student detail uses factual domain workspaces without changing mutations", async () => {
  const page = await read("src/app/dashboard/students/[id]/page.tsx");

  assert.match(page, /getWorkoutIndex/);
  assert.match(page, /getTrainerAssessmentIndex/);
  assert.match(page, /getTrainerProgressWorkspace/);
  assert.match(page, /Treino atual/);
  assert.match(page, /O que pede atenção/);
  assert.match(page, /deactivateStudentAction/);
});

test("workout execution separates prescription from optional actual reporting", async () => {
  const execution = await read("src/components/student/WorkoutExecutionExperience.tsx");

  assert.match(execution, /Registrar o que fiz/);
  assert.match(execution, /Concluir série/);
  assert.match(execution, /set\.execution\.actualRpe/);
  assert.doesNotMatch(execution, /set\.execution\.actualRpe \?\? set\.prescription\.targetRpe/);
  assert.match(execution, /Opcional · carga, repetições e percepção/);
});

test("student progress overview uses compact factual disclosure", async () => {
  const progress = await read("src/components/progress/ProgressContent.tsx");

  assert.match(progress, /progressPulse/);
  assert.match(progress, /progressDisclosure/);
  assert.match(progress, /ProgressPhotoPreview/);
  assert.match(progress, /series\.points/);
  assert.match(progress, /workspace\.measurements/);
  assert.match(progress, /workspace\.assessments/);
});

test("builder capability remains present while working layers are flattened", async () => {
  const [builderFiles, css] = await Promise.all([
    Promise.all([
      read("src/components/workouts/WorkoutBuilder.tsx"),
      read("src/components/workouts/SetEditor.tsx"),
      read("src/components/workouts/VersionHistoryPanel.tsx"),
      read("src/components/workouts/ExerciseLibraryDrawer.tsx"),
    ]),
    read("src/components/workouts/workouts.module.css"),
  ]);
  const builder = builderFiles.join("\n");

  for (const capability of [
    "RPE",
    "Descanso",
    "Tempo",
    "Superset",
    "Histórico",
    "Revisar treino",
    "Publicar",
  ]) {
    assert.match(builder, new RegExp(capability, "i"));
  }

  assert.match(builder, /customExercise/i);
  assert.match(css, /Premium Consumer V1B/);
  assert.match(css, /\.builderPage \.exerciseCard/);
});
