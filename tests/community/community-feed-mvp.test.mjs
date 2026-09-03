import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const [migration, feed, studentShell, trainerNav, completion, upload, workspace] = await Promise.all([
  read("../../supabase/migrations/202609030002_community_feed_mvp.sql"), read("../../src/components/community/CommunityFeed.tsx"), read("../../src/components/student/StudentAppShell.tsx"), read("../../src/components/dashboard/BottomNavigation.tsx"), read("../../src/components/student/WorkoutCompletionShare.tsx"), read("../../src/app/api/community/photos/route.ts"), read("../../src/lib/community/workspace.ts"),
]);

test("Community is one private Trainer-led workspace with relationship-derived access", () => {
  assert.match(migration, /trainer_profile_id uuid not null unique/);
  assert.match(migration, /on conflict\(trainer_profile_id\) do nothing/);
  assert.match(migration, /relationship\.status = 'active'/);
  assert.match(migration, /private\.trainer_has_full_access/);
  assert.match(migration, /can_use_community_feed/);
  assert.match(migration, /enable row level security/g);
  assert.match(migration, /revoke all on public\.trainer_communities/);
  assert.match(migration, /community_access_denied/);
});

test("MVP interactions, limits, moderation and race protection are authoritative", () => {
  for (const token of ["TEXT", "PHOTO", "WORKOUT_COMPLETION", "TRAINER_ANNOUNCEMENT", "set_community_post_like", "create_community_comment", "delete_my_community_comment", "delete_my_community_post", "moderate_community_content", "report_community_content", "set_community_announcement_pin"]) assert.match(migration, new RegExp(token));
  assert.match(migration, /between 1 and 2000/);
  assert.match(migration, /between 1 and 1000/);
  assert.match(migration, /community_posts_one_pinned_announcement_idx/);
  assert.match(migration, /on conflict\(workout_execution_id,author_user_id\)/);
  assert.match(migration, /community_rate_limited/);
  assert.doesNotMatch(feed, /dangerouslySetInnerHTML/);
});

test("workout Community publishing is explicit, private and separate from external share", () => {
  assert.match(completion, /Publicar na comunidade/);
  assert.match(completion, /navigator\.share/);
  assert.match(completion, /https:\/\/wa\.me/);
  assert.match(migration, /execution\.status='COMPLETED'/);
  assert.match(migration, /student\.user_id=actor/);
  assert.match(migration, /completed_exercises/);
  assert.match(migration, /completed_sets/);
  assert.doesNotMatch(migration, /actual_load|actual_reps|student_note/);
});

test("private media validates signatures and gates Student photos on the server", () => {
  assert.match(migration, /'community-post-media','community-post-media',false/);
  assert.match(migration, /community members read private post media/);
  assert.match(upload, /COMMUNITY_STUDENT_PHOTO_POSTS_ENABLED/);
  assert.match(upload, /bytes\[0\] === 0xff/);
  assert.match(upload, /RIFF/);
  assert.match(upload, /MAX_FILES = 4/);
  assert.match(upload, /8 \* 1024 \* 1024/);
  assert.match(upload, /create_community_photo_post_as/);
  assert.match(migration, /to service_role/);
  assert.match(migration, /authenticated','public\.create_community_photo_post_as/);
});

test("navigation and production data boundaries expose the functional Community only", () => {
  assert.match(studentShell, /Hoje/); assert.match(studentShell, /Treinos/); assert.match(studentShell, /Comunidade/); assert.match(studentShell, /Progresso/); assert.match(studentShell, /Perfil/);
  assert.match(trainerNav, /\/dashboard\/community/);
  assert.doesNotMatch(trainerNav, /Mensagens/);
  assert.match(workspace, /isDemoWorkspaceRequest/);
  assert.match(workspace, /listCommunityPosts/);
  assert.match(feed, /Todos/); assert.match(feed, /Treinos/); assert.match(feed, /Avisos/);
});
