import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const [actions, aiProvider, aiContract, creationPage, creationFlow, dashboard, studentDetail, migration, workoutSecurity, studentMedia, exerciseMedia, environment, workoutParser] = await Promise.all([
  read("../../src/app/actions/workouts.ts"),
  read("../../src/lib/workouts/ai-provider.ts"),
  read("../../src/lib/workouts/ai-contract.ts"),
  read("../../src/app/dashboard/workouts/new/page.tsx"),
  read("../../src/components/workouts/NewWorkoutFlow.tsx"),
  read("../../src/app/dashboard/page.tsx"),
  read("../../src/app/dashboard/students/[id]/page.tsx"),
  read("../../supabase/migrations/202608280002_custom_exercise_youtube_reference.sql"),
  read("../../supabase/tests/workout_foundation_security.sql"),
  read("../../src/components/student/StudentWorkoutMedia.tsx"),
  read("../../src/components/workouts/ExerciseMedia.tsx"),
  read("../../.env.example"),
  read("../../src/lib/validation/workouts.ts"),
]);

test("Dashboard and Student Detail converge on the canonical creation route", () => {
  assert.match(dashboard, /href="\/dashboard\/workouts\/new"[^>]*>[\s\S]*?Criar treino/);
  assert.match(studentDetail, /dashboard\/workouts\/new\?student=\$\{student\.id\}/);
  assert.match(creationPage, /requestedStudent/);
  assert.match(creationPage, /workspace\.contexts\.length === 1/);
  assert.match(creationFlow, /Você precisa adicionar um aluno antes de criar um treino\./);
  assert.match(creationFlow, /Convidar aluno/);
});

test("Production AI is server-only, configurable, structured and fully validated", () => {
  assert.match(aiProvider, /^import "server-only";/);
  assert.match(aiProvider, /WORKOUT_AI_API_KEY/);
  assert.match(aiProvider, /WORKOUT_AI_MODEL/);
  assert.match(aiProvider, /response_format: \{ type: "json_schema"/);
  assert.match(aiProvider, /validateWorkoutAiDraftOutput\(JSON\.parse\(content\), visibleIds\)/);
  assert.match(aiProvider, /AbortController/);
  assert.match(aiContract, /exerciseId: string \| null/);
  assert.match(aiContract, /unresolvedExerciseName: string \| null/);
  assert.match(environment, /WORKOUT_AI_API_KEY=/);
  assert.doesNotMatch(environment, /NEXT_PUBLIC_WORKOUT_AI/);
});

test("AI output remains an explicit Trainer-reviewed draft", () => {
  const generateBody = actions.slice(actions.indexOf("export async function generateWorkoutAiDraftAction"), actions.indexOf("export async function materializeWorkoutAiDraftAction"));
  assert.doesNotMatch(generateBody, /\.publish\(/);
  assert.doesNotMatch(generateBody, /materializeAiDraft/);
  assert.match(creationFlow, /Revise o treino antes de publicar\. A IA gera um rascunho e não substitui sua avaliação profissional\./);
  assert.match(creationFlow, /Abrir no Builder/);
  assert.match(creationFlow, /Descartar e gerar novamente/);
});

test("Unresolved exercises require existing, custom or remove resolution", () => {
  assert.match(creationFlow, /Exercícios não encontrados/);
  assert.match(creationFlow, /Usar exercício/);
  assert.match(creationFlow, /Criar personalizado/);
  assert.match(creationFlow, />Remover</);
  assert.match(actions, /Resolva todos os exercícios não encontrados/);
});

test("Custom exercises support a narrowly validated YouTube reference", () => {
  assert.match(actions, /normalizeYoutubeUrl/);
  assert.match(actions, /addCustomExerciseMedia/);
  assert.match(migration, /security definer/);
  assert.match(migration, /set search_path = ''/);
  assert.match(migration, /owner_trainer_id = trainer_profile_id/);
  assert.match(migration, /youtube\[\.\]com\/watch/);
  assert.match(migration, /case when is_safe_youtube then 'APPROVED' else 'DEVELOPMENT' end/);
  assert.match(workoutSecurity, /Trainer B cannot attach media to Trainer A custom exercise/);
  assert.match(workoutSecurity, /Assigned student sees approved Trainer YouTube reference/);
});

test("Student gets a safe external video reference and images never render video URLs", () => {
  assert.match(studentMedia, /target="_blank" rel="noreferrer"/);
  assert.match(studentMedia, /normalizeYoutubeUrl/);
  assert.match(studentMedia, /item\.mediaType !== "IMAGE"/);
  assert.match(exerciseMedia, /item\.mediaType === "IMAGE"/);
});

test("Hosted workout projection accepts exercise media from the canonical RPC shape", () => {
  assert.match(workoutParser, /Array\.isArray\(prescribedValue\.media\)/);
  assert.match(workoutParser, /exercise: parseExercise\(exerciseWithMedia/);
});
