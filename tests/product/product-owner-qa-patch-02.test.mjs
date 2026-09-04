import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");

test("Student avatar uses one persisted private path and refreshes every live context", async () => {
  const [action, profile, shell, workspace, community, resolver, migration] = await Promise.all([
    read("src/app/actions/student-profile.ts"),
    read("src/components/student/StudentProfileForm.tsx"),
    read("src/components/student/StudentAppShell.tsx"),
    read("src/lib/workouts/student-workspace.ts"),
    read("src/lib/supabase/community.ts"),
    read("src/lib/supabase/student-profile-media.ts"),
    read("supabase/migrations/20260904194403_product_owner_qa_patch_02.sql"),
  ]);

  assert.match(action, /update_my_student_profile/);
  assert.match(action, /p_profile_image_path: imagePath/);
  for (const route of ["/student/profile", "/student/today", "/student/community", "/dashboard/community"]) {
    assert.match(action, new RegExp(route.replaceAll("/", "\\/")));
  }
  assert.match(profile, /Alterar sua foto/);
  assert.match(profile, /URL\.createObjectURL/);
  assert.match(profile, /router\.refresh\(\)/);
  assert.match(shell, /identity\.studentImageUrl/);
  assert.match(workspace, /resolveStudentProfileImageUrl/);
  assert.match(community, /signStudentProfileImagePaths/);
  assert.match(resolver, /student-private-media/);
  assert.match(migration, /student\.profile_image_path = p_storage_path/);
  assert.match(migration, /relationship\.status = 'active'/);
  assert.match(migration, /viewer\.status = 'ACTIVE'/);
  assert.doesNotMatch(migration, /grant execute on function private\.can_read_student_private_storage_object\(text\) to anon/);
});

test("Student Community exposes the one-owned-group lifecycle without granting Trainer role", async () => {
  const [feed, views, migration] = await Promise.all([
    read("src/components/community/CommunityFeed.tsx"),
    read("src/components/community/CommunityGroupViews.tsx"),
    read("supabase/migrations/20260904160658_product_owner_qa_fixes_v1.sql"),
  ]);

  assert.match(feed, /ownerProductRole === "STUDENT" && group\.membershipRole === "OWNER"/);
  assert.match(feed, /"Seu grupo" : "Crie seu grupo"/);
  assert.match(views, /Criar grupo/);
  assert.match(views, /Editar grupo/);
  assert.match(views, /Convidar alunos/);
  assert.match(views, /Solicitações/);
  assert.match(views, /Excluir este grupo\?/);
  assert.match(views, /archiveCommunityGroupAction/);
  assert.match(migration, /student_owned_group_limit_reached/);
  assert.match(migration, /active_count>=50/);
  assert.match(migration, /owner_product_role='STUDENT'/);
  assert.doesNotMatch(views, /insert into public\.trainer_profiles/i);
});

test("catalog preserves four existing renderers and adds the two approved designs as 05 and 06", async () => {
  const [domain, registry, dispatcher, migration, entitlements, previewRoute] = await Promise.all([
    read("src/lib/domain/trainer.ts"),
    read("src/lib/domain/template-registry.ts"),
    read("src/components/templates/TrainerTemplate.tsx"),
    read("supabase/migrations/20260904194403_product_owner_qa_patch_02.sql"),
    read("src/lib/supabase/trainers.ts"),
    read("src/app/template-preview/[template]/page.tsx"),
  ]);

  for (const id of ["01", "02", "03", "04", "05", "06"]) {
    assert.match(domain, new RegExp(`template_${id}`));
    assert.match(registry, new RegExp(`template_${id}: \{`));
    assert.match(registry, new RegExp(`name: "Template ${id}"`));
  }
  assert.match(registry, /template_01:[\s\S]*renderer: "LegacyTemplate01"/);
  assert.match(registry, /template_02:[\s\S]*renderer: "LegacyTemplate02"/);
  assert.match(registry, /template_05:[\s\S]*renderer: "Template01"/);
  assert.match(registry, /template_06:[\s\S]*renderer: "Template02"/);
  for (const renderer of ["LegacyTemplate01", "LegacyTemplate02", "Template01", "Template02", "Template03", "AtelierTemplate"]) {
    assert.match(dispatcher, new RegExp(renderer));
  }
  assert.match(migration, /add value if not exists 'template_05'/);
  assert.match(migration, /add value if not exists 'template_06'/);
  assert.match(migration, /can_use_template_05 := true/);
  assert.match(migration, /can_use_template_06 := true/);
  assert.match(entitlements, /can_use_template_05,can_use_template_06/);
  assert.match(previewRoute, /"template_05", "template_06"/);
});

test("Community photo selection has immediate local previews and deterministic cleanup", async () => {
  const [composer, styles] = await Promise.all([
    read("src/components/community/CommunityComposer.tsx"),
    read("src/app/community.css"),
  ]);

  assert.match(composer, /URL\.createObjectURL/);
  assert.match(composer, /URL\.revokeObjectURL/);
  assert.match(composer, /community-photo-previews/);
  assert.match(composer, /removePhoto/);
  assert.match(composer, /Substituir fotos/);
  assert.match(composer, /slice\(0, 4\)/);
  assert.match(composer, /Tentar novamente/);
  assert.match(styles, /\.community-photo-previews--1/);
  assert.match(styles, /min-height:220px/);
});
