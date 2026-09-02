import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");

test("workout rows expose status-safe contextual actions", async () => {
  const [page, actions] = await Promise.all([
    read("src/app/dashboard/workouts/page.tsx"),
    read("src/components/workouts/WorkoutDraftDiscardButton.tsx"),
  ]);
  assert.match(page, /status=\{item\.currentVersion\.status\}/);
  assert.match(page, /currentVersion\.status === "PUBLISHED"/);
  assert.match(actions, /aria-haspopup="menu"/);
  assert.match(actions, /role="menuitem"/);
  assert.match(actions, /Editar/);
  assert.match(actions, /Excluir rascunho/);
  assert.match(actions, /Arquivar/);
  assert.match(actions, /event\.key !== "Escape"/);
  assert.match(actions, /triggerRef\.current\?\.focus/);
});

test("Draft discard and published archive preserve history and tenant authorization", async () => {
  const [draftMigration, workoutMigration, action] = await Promise.all([
    read("supabase/migrations/20260902012147_discard_workout_draft.sql"),
    read("supabase/migrations/202608220011_workout_foundation.sql"),
    read("src/app/actions/workouts.ts"),
  ]);
  assert.match(draftMigration, /target\.status <> 'DRAFT'/);
  assert.match(draftMigration, /private\.owns_trainer\(relationship\.trainer_profile_id\)/);
  assert.match(draftMigration, /'DRAFT_DISCARDED'/);
  assert.match(workoutMigration, /function public\.archive_workout_version/);
  assert.match(workoutMigration, /target\.status <> 'PUBLISHED'/);
  assert.match(workoutMigration, /private\.owns_trainer\(relationship\.trainer_profile_id\)/);
  assert.match(workoutMigration, /version\.status in \('PUBLISHED', 'ARCHIVED'\)/);
  assert.doesNotMatch(action, /delete.*workout_plan_versions|\.delete\(\).*workout/i);
});
