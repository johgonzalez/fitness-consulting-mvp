import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");
const migration = await read("supabase/migrations/20260904160658_product_owner_qa_fixes_v1.sql");
const execution = await read("src/components/student/WorkoutExecutionExperience.tsx");
const overview = await read("src/components/student/StudentWorkoutOverview.tsx");
const community = await read("src/components/community/CommunityGroupViews.tsx");
const studentGroupRoute = await read("src/app/student/community/groups/new/page.tsx");
const composer = await read("src/components/community/CommunityComposer.tsx");
const dashboard = await read("src/app/dashboard/page.tsx");
const templates = await read("src/lib/domain/template-registry.ts");
const profilePrefill = await read("src/lib/auth/profile-prefill.ts");
const profileImage = await read("src/lib/images/profile-image.ts");

test("workout initialization is bounded, retryable and terminal history can repeat", () => {
  assert.match(execution, /WORKOUT_INITIALIZATION_TIMEOUT_MS = 15_000/);
  assert.match(execution, /Promise\.race/);
  assert.match(execution, /Tentar novamente/);
  assert.match(overview, /Fazer novamente/);
  assert.doesNotMatch(migration, /workout_session_already_executed/);
  assert.match(migration, /status in \('IN_PROGRESS','PAUSED'\)/);
});

test("student group ownership and member capacity are transactionally enforced", () => {
  assert.match(migration, /trainer_communities_student_one_owned_idx/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /student_owned_group_limit_reached/);
  assert.match(migration, /active_count>=50/);
  assert.match(migration, /for update/);
  assert.match(studentGroupRoute, /audience="student"/);
});

test("join requests are deduplicated, actionable and visible on dashboard", () => {
  assert.match(migration, /'JOIN_REQUEST','join-request:'/);
  assert.match(migration, /on conflict\(recipient_user_id,dedupe_key\) do update/);
  assert.match(migration, /read_at=coalesce\(read_at,now\(\)\)/);
  assert.match(dashboard, /communityRequests/);
  assert.match(dashboard, /\/manage/);
});

test("community challenges reuse published workout sessions and complete from execution", () => {
  assert.match(migration, /workout_session_id uuid references public\.workout_sessions/);
  assert.match(migration, /unique\(challenge_id,app_user_id\)/);
  assert.match(migration, /list_my_community_challenge_workouts/);
  assert.match(migration, /complete_community_challenge_from_workout/);
  assert.match(community, /Aceitar desafio/);
  assert.match(community, /Ver treino/);
});

test("profile bootstrap never overwrites stored values and image pipeline strips metadata", () => {
  assert.match(profilePrefill, /draft\?\.full_name \|\| draft\?\.display_name \|\| prefill\.fullName/);
  assert.match(profilePrefill, /draft\?\.preferred_name \|\| prefill\.preferredName/);
  assert.match(profileImage, /rotate\(\)/);
  assert.match(profileImage, /webp\(\{ quality: 82, effort: 3 \}\)/);
  assert.match(profileImage, /HEIC/);
});

test("community photos expose real multi-phase progress and avoid parallel source decoding", () => {
  for (const phase of ["PREPARING", "UPLOADING", "PROCESSING", "PUBLISHED"]) assert.match(composer, new RegExp(phase));
  assert.match(composer, /for \(const file of files\) prepared\.push\(await prepareImage\(file\)\)/);
  assert.doesNotMatch(composer, /Promise\.all\(files\.map/);
  assert.match(composer, /xhr\.timeout = 45_000/);
});

test("public template labels are numeric while canonical IDs remain stable", () => {
  for (const [id, label] of [["template_01", "Template 01"], ["template_02", "Template 02"], ["template_03", "Template 03"], ["template_04", "Template 04"]]) {
    assert.match(templates, new RegExp(`${id}:[\\s\\S]*name: \"${label}\"`));
  }
});
