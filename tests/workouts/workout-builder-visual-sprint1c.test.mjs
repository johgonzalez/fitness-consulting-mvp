import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");

test("exercise completion is a visual editing state and preserves immediate persistence", async () => {
  const builder = await read("src/components/workouts/WorkoutBuilder.tsx");
  assert.match(builder, /exerciseValidationMessage/);
  assert.match(builder, />Concluir<\/button>/);
  assert.match(builder, /setExpandedExerciseId\(null\)/);
  assert.match(builder, /onBlur=\{\(\) => onUpdateSet|onBlur=\{\(\) => onUpdateDetails/);
  assert.match(builder, /mutateWorkoutAction/);
  assert.doesNotMatch(builder, /confirmExercise[\s\S]{0,1200}changeWorkoutLifecycleAction/);
});

test("collapsed prescription uses factual fields and can be reopened without a refetch", async () => {
  const builder = await read("src/components/workouts/WorkoutBuilder.tsx");
  assert.match(builder, /exerciseSummary\(prescribed\)/);
  assert.match(builder, /targetRepsMin/);
  assert.match(builder, /targetLoad/);
  assert.match(builder, /restSeconds/);
  assert.match(builder, /aria-label=\{`Editar \$\{prescribed\.exercise\.name\}`\}/);
  assert.match(builder, /onExpand=\{\(\) => \{ setExpandedExerciseId\(exercise\.id\)/);
});

test("mobile flow keeps one editor expanded and exposes accessible reorder controls", async () => {
  const [builder, styles] = await Promise.all([
    read("src/components/workouts/WorkoutBuilder.tsx"),
    read("src/components/workouts/workouts.module.css"),
  ]);
  assert.match(builder, /expandedExerciseId === exercise\.id/);
  assert.match(builder, /Mover exercício para cima/);
  assert.match(builder, /Mover exercício para baixo/);
  assert.match(builder, /prefers-reduced-motion: reduce/);
  assert.match(styles, /\.exerciseEditorFooter/);
  assert.match(styles, /@media\(max-width:560px\)/);
});

test("exercise library provides quiet search, clearing and direct row addition", async () => {
  const library = await read("src/components/workouts/ExerciseLibraryDrawer.tsx");
  assert.match(library, /aria-label="Limpar busca"/);
  assert.match(library, /className=\{styles\.libraryCardAdd\}/);
  assert.match(library, /onClick=\{\(\) => onChoose\(exercise\)\}/);
  assert.match(library, /searchRef\.current\?\.focus\(\)/);
  assert.match(library, /event\.key === "Escape"/);
});

test("draft archive and workout lifecycle remain separate from exercise completion", async () => {
  const builder = await read("src/components/workouts/WorkoutBuilder.tsx");
  assert.match(builder, /Excluir este rascunho\?/);
  assert.match(builder, /lifecycle\("DISCARD"\)/);
  assert.match(builder, /lifecycle\("APPROVE"\)/);
  assert.match(builder, /lifecycle\("PUBLISH"\)/);
});
