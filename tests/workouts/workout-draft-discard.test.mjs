import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");

test("discard is owner-only, Draft-only and audit preserving", async () => {
  const migration = await read("supabase/migrations/20260902012147_discard_workout_draft.sql");
  assert.match(migration, /function public\.discard_workout_draft/);
  assert.match(migration, /target\.status <> 'DRAFT'/);
  assert.match(migration, /private\.owns_trainer\(relationship\.trainer_profile_id\)/);
  assert.match(migration, /'reason', 'DRAFT_DISCARDED'/);
  assert.match(migration, /revoke all on function public\.discard_workout_draft\(uuid\) from public, anon, authenticated/);
  assert.match(migration, /grant execute on function public\.discard_workout_draft\(uuid\) to authenticated/);
});

test("discarded Drafts never enter Student projections", async () => {
  const migration = await read("supabase/migrations/20260902012147_discard_workout_draft.sql");
  assert.match(migration, /version\.published_at is not null/);
  assert.match(migration, /target\.published_at is null/);
  assert.match(migration, /function public\.list_student_published_workouts/);
  assert.match(migration, /function public\.get_student_workout_overview/);
});

test("Trainer can discard from both list and Builder with confirmation", async () => {
  const [page, button, builder, action] = await Promise.all([
    read("src/app/dashboard/workouts/page.tsx"),
    read("src/components/workouts/WorkoutDraftDiscardButton.tsx"),
    read("src/components/workouts/WorkoutBuilder.tsx"),
    read("src/app/actions/workouts.ts"),
  ]);
  assert.match(page, /WorkoutDraftDiscardButton/);
  assert.match(button, /Excluir este rascunho\?/);
  assert.match(button, /action: "DISCARD"/);
  assert.match(builder, /setDiscardConfirm\(true\)/);
  assert.match(builder, /lifecycle\("DISCARD"\)/);
  assert.match(action, /service\.discardDraft/);
});

test("active index falls back to a prior published version", async () => {
  const workspace = await read("src/lib/workouts/workspace.ts");
  assert.match(workspace, /find\(\(version\) => version\.status !== "ARCHIVED"\) \?\?/);
});
