import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");
const migrationPath = "supabase/migrations/20260904220500_product_owner_qa_patch_03.sql";

test("Trainer student resolvers expose only relationship-scoped image paths and sign them briefly", async () => {
  const [migration, resolver, domain, action] = await Promise.all([
    read(migrationPath), read("src/lib/supabase/students.ts"), read("src/lib/domain/students.ts"), read("src/app/actions/student-profile.ts"),
  ]);
  assert.match(migration, /create or replace function public\.get_my_students\(\)/);
  assert.match(migration, /create or replace function public\.get_my_student_detail\(p_relationship_id uuid\)/);
  assert.match(migration, /'profile_image_path', case when relationship\.status = 'active' then student\.profile_image_path else null end/);
  assert.match(migration, /private\.owns_trainer\(relationship\.trainer_profile_id\)/);
  assert.match(resolver, /signStudentProfileImagePaths/);
  assert.match(resolver, /profileImagePath/);
  assert.match(resolver, /profileImageUrl/);
  assert.match(domain, /profileImagePath\?: string \| null/);
  assert.match(action, /revalidatePath\("\/dashboard", "layout"\)/);
});

test("all required Trainer surfaces consume the canonical signed student avatar", async () => {
  const sources = await Promise.all([
    "src/app/dashboard/page.tsx", "src/app/dashboard/students/page.tsx",
    "src/components/students/StudentRecordChrome.tsx", "src/app/dashboard/assessments/page.tsx",
    "src/app/dashboard/assessments/[id]/page.tsx", "src/components/assessments/NewAssessmentWizard.tsx",
    "src/app/dashboard/workouts/page.tsx", "src/components/workouts/NewWorkoutFlow.tsx",
    "src/components/workouts/StudentWorkoutContext.tsx",
  ].map(read));
  for (const source of sources) assert.match(source, /profileImageUrl/);
});

test("public address is a dedicated resumable step before template selection", async () => {
  const [migration, component, actions, validation] = await Promise.all([
    read(migrationPath), read("src/components/onboarding/OnboardingForm.tsx"),
    read("src/app/actions/onboarding.ts"), read("src/lib/validation/trainer-slug.ts"),
  ]);
  assert.match(migration, /add column if not exists requested_slug text/);
  assert.match(migration, /add column if not exists slug_completed_at timestamptz/);
  assert.match(component, /if\(!draft\.slug_completed_at\)return"slug"/);
  assert.ok(component.indexOf('stage==="slug"') < component.indexOf('stage==="template"'));
  assert.match(component, /cheipi\.com\/p\//);
  assert.match(component, /checkOnboardingSlugAvailability/);
  assert.match(component, /350/);
  assert.match(actions, /save_my_onboarding_slug/);
  assert.match(validation, /TRAINER_SLUG_MIN_LENGTH = 3/);
  assert.match(validation, /TRAINER_SLUG_MAX_LENGTH = 70/);
  for (const word of ["admin", "api", "auth", "dashboard", "community", "cheipi", "www"]) assert.match(validation, new RegExp(`"${word}"`));
});

test("explicit slug finalization never falls back to a UUID suffix", async () => {
  const migration = await read(migrationPath);
  const finalization = migration.slice(migration.indexOf("create or replace function public.finalize_my_onboarding"), migration.indexOf("create or replace function public.get_my_students"));
  assert.match(finalization, /draft\.requested_slug/);
  assert.match(finalization, /raise exception 'slug_unavailable'/);
  assert.match(finalization, /when unique_violation then raise exception 'slug_unavailable'/);
  assert.doesNotMatch(finalization, /replace\(current_user_id::text/);
  assert.doesNotMatch(migration, /update public\.trainer_profiles\s+set requested_slug/i);
});

test("active Cheipi surfaces retain internal identifiers but no visible legacy brand copy", async () => {
  const sources = await Promise.all([
    "src/app/onboarding/page.tsx", "src/components/onboarding/SiteShareActions.tsx",
    "src/components/templates/EditorialMediaLabel.tsx", "src/components/templates/MotionExperience.tsx",
    "src/components/templates/LegacyTemplate01.tsx", "src/components/templates/LegacyTemplate02.tsx",
    "src/components/templates/Template01.tsx", "src/components/templates/Template03.tsx",
    "src/components/templates/atelier/AtelierFinalCTASection.tsx",
  ].map(read));
  for (const source of sources) {
    assert.match(source, /Cheipi/);
    assert.doesNotMatch(source, />[^<]*PPerfil|"[^"\n]*PPerfil[^"\n]*"/);
  }
});
