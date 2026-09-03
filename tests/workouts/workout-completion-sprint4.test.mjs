import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const [migration, executionUi, shareUi, dashboard, executionSecurity] = await Promise.all([
  read("../../supabase/migrations/20260828031136_sprint4_workout_completion_notifications.sql"),
  read("../../src/components/student/WorkoutExecutionExperience.tsx"),
  read("../../src/components/student/WorkoutCompletionShare.tsx"),
  read("../../src/app/dashboard/page.tsx"),
  read("../../supabase/tests/workout_execution_security.sql"),
]);

test("completion produces one authoritative Trainer-only notification", () => {
  assert.match(migration, /after update of status on public\.workout_executions/);
  assert.match(migration, /new\.status = 'COMPLETED'/);
  assert.match(migration, /unique \(workout_execution_id, notification_type\)/);
  assert.match(migration, /on conflict \(workout_execution_id, notification_type\) do nothing/);
  assert.match(migration, /using \(\(select private\.owns_trainer\(trainer_profile_id\)\)\)/);
  assert.match(migration, /trainer_notification_access_denied/);
  assert.match(migration, /set search_path = ''/);
  assert.match(executionSecurity, /Student cannot read Trainer completion notification/);
  assert.match(executionSecurity, /Trainer A notification hidden from Trainer B/);
});

test("Trainer dashboard surfaces factual workout completion events", () => {
  assert.match(dashboard, /listTrainerNotifications\(3\)/);
  assert.match(dashboard, /concluiu \$\{notification\.sessionName\}/);
  assert.match(dashboard, /dashboard\/students\/\$\{notification\.trainerStudentRelationshipId\}/);
});

test("student completion remains explicit and uses the authoritative snapshot", () => {
  assert.match(executionUi, /completeStudentWorkoutAction/);
  assert.match(executionUi, /setSnapshot\(result\.snapshot\)/);
  assert.match(executionUi, /Finalizar treino/);
  assert.match(executionUi, /WorkoutCompletionShare/);
});

test("sharing exposes only aggregate workout facts with honest fallbacks", () => {
  assert.match(shareUi, /navigator\.share/);
  assert.match(shareUi, /https:\/\/wa\.me\/\?text=/);
  assert.match(shareUi, /navigator\.clipboard\.writeText/);
  assert.match(shareUi, /Instagram ou TikTok/);
  assert.match(shareUi, /Concluí meu treino no Cheipi/);
  assert.doesNotMatch(shareUi, /studentNote|actualLoad|difficulty|trainerName|studentName/);
});
