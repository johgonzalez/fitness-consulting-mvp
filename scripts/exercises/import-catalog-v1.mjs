import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const catalogPath = resolve(here, "../../data/exercises/catalog-v1.json");
const rawCatalog = readFileSync(catalogPath, "utf8");
const catalog = JSON.parse(rawCatalog);
const checksum = createHash("sha256").update(rawCatalog).digest("hex");

const allowedMuscles = new Set(["quadriceps", "hamstrings", "glutes", "calves", "chest", "back", "shoulders", "biceps", "triceps", "forearms", "core", "full_body"]);
const allowedEquipment = new Set(["bodyweight", "barbell", "dumbbell", "machine", "cable", "resistance_band", "kettlebell", "bench", "pullup_bar", "cardio_machine"]);
const requiredCategories = new Set(["strength", "hypertrophy", "conditioning", "mobility", "warmup", "bodyweight"]);
const requiredExamples = [
  "Agachamento livre", "Agachamento goblet", "Leg press", "Cadeira extensora", "Mesa flexora",
  "Levantamento terra romeno", "Hip thrust", "Afundo", "Bulgarian split squat", "Panturrilha em pé",
  "Supino reto com barra", "Supino com halteres", "Supino inclinado", "Crucifixo", "Flexão de braço",
  "Puxada frontal", "Barra fixa", "Remada curvada", "Remada baixa", "Remada unilateral",
  "Desenvolvimento com halteres", "Elevação lateral", "Face pull", "Rosca direta", "Rosca alternada",
  "Rosca martelo", "Tríceps na polia", "Tríceps francês", "Prancha", "Abdominal", "Dead bug",
  "Pallof press", "Burpee", "Mountain climber", "Polichinelo", "Mobilidade de quadril", "Mobilidade de ombro",
];
const searchQueries = ["agach", "peito", "quadriceps", "halter", "cabo", "costas"];
const keyPattern = /^[a-z][a-z0-9_]{1,63}$/;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function normalized(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]+/g, " ").trim();
}

function validateCatalog() {
  const errors = [];
  if (catalog.schemaVersion !== "pperfil-exercise-catalog-v1") errors.push("Unsupported catalog schema version.");
  if (catalog.catalogVersion !== "1.0.0") errors.push("Unexpected catalog version.");
  if (catalog.locale !== "pt-BR") errors.push("Catalog locale must be pt-BR.");
  if (!Array.isArray(catalog.exercises) || catalog.exercises.length < 150 || catalog.exercises.length > 200) errors.push("Catalog must contain 150-200 exercises.");
  if (catalog.mediaPolicy?.imported !== false) errors.push("Catalog V1 must not import third-party media.");

  const uniqueIds = new Set();
  const uniqueCanonicalIds = new Set();
  const uniqueSlugs = new Set();
  const uniqueNames = new Set();
  const muscles = new Set();
  const equipment = new Set();
  const categories = new Set();

  for (const [index, exercise] of catalog.exercises.entries()) {
    const field = `exercises[${index}]`;
    if (!uuidPattern.test(exercise.id)) errors.push(`${field}.id must be a stable UUIDv5.`);
    if (uniqueIds.has(exercise.id)) errors.push(`${field}.id is duplicated.`); else uniqueIds.add(exercise.id);
    if (!exercise.canonicalId?.startsWith("pperfil.exercise.")) errors.push(`${field}.canonicalId is invalid.`);
    if (uniqueCanonicalIds.has(exercise.canonicalId)) errors.push(`${field}.canonicalId is duplicated.`); else uniqueCanonicalIds.add(exercise.canonicalId);
    if (!slugPattern.test(exercise.slug)) errors.push(`${field}.slug is invalid.`);
    if (uniqueSlugs.has(exercise.slug)) errors.push(`${field}.slug is duplicated.`); else uniqueSlugs.add(exercise.slug);
    const normalizedName = normalized(exercise.name ?? "");
    if (exercise.name?.trim().length < 2 || exercise.name.length > 160) errors.push(`${field}.name is invalid.`);
    if (uniqueNames.has(normalizedName)) errors.push(`${field}.name is duplicated.`); else uniqueNames.add(normalizedName);
    if (exercise.sourceType !== "PPERFIL_LIBRARY") errors.push(`${field}.sourceType must be PPERFIL_LIBRARY.`);
    if (!allowedMuscles.has(exercise.primaryMuscleGroup)) errors.push(`${field}.primaryMuscleGroup is unsupported.`); else muscles.add(exercise.primaryMuscleGroup);
    if (!Array.isArray(exercise.secondaryMuscleGroups)) errors.push(`${field}.secondaryMuscleGroups must be an array.`);
    if (!Array.isArray(exercise.equipment) || exercise.equipment.length < 1) errors.push(`${field}.equipment must not be empty.`);
    for (const item of exercise.equipment ?? []) {
      if (!allowedEquipment.has(item)) errors.push(`${field}.equipment contains unsupported value ${item}.`); else equipment.add(item);
    }
    if (!keyPattern.test(exercise.movementPattern)) errors.push(`${field}.movementPattern is invalid.`);
    if (!requiredCategories.has(exercise.category)) errors.push(`${field}.category is unsupported.`); else categories.add(exercise.category);
    if (exercise.description?.trim().length < 20 || exercise.description.length > 2000) errors.push(`${field}.description is invalid.`);
    if (exercise.instructions?.trim().length < 40 || exercise.instructions.length > 5000) errors.push(`${field}.instructions are not publication quality.`);
    if (!Array.isArray(exercise.coachingCues) || exercise.coachingCues.length < 1 || exercise.coachingCues.length > 4) errors.push(`${field}.coachingCues are invalid.`);
    if (exercise.locale !== "pt-BR" || exercise.status !== "ACTIVE") errors.push(`${field} locale/status is invalid.`);
    if (exercise.provenance?.kind !== "PPERFIL_CURATED_ADAPTATION" || exercise.provenance?.referenceCommit !== catalog.source?.snapshotCommit) errors.push(`${field}.provenance is incomplete.`);
    if (exercise.media?.length !== 0) errors.push(`${field}.media must remain empty in Catalog V1.`);
  }

  for (const muscle of allowedMuscles) if (!muscles.has(muscle)) errors.push(`Missing muscle coverage: ${muscle}.`);
  for (const item of allowedEquipment) if (!equipment.has(item)) errors.push(`Missing equipment coverage: ${item}.`);
  for (const category of requiredCategories) if (!categories.has(category)) errors.push(`Missing category coverage: ${category}.`);
  const names = catalog.exercises.map((exercise) => normalized(exercise.name));
  for (const example of requiredExamples) if (!names.some((name) => name.includes(normalized(example)))) errors.push(`Missing required example: ${example}.`);
  const searchReport = Object.fromEntries(searchQueries.map((query) => [query, catalog.exercises.filter((exercise) => {
    const normalizedQuery = normalized(query);
    return normalized(exercise.name).includes(normalizedQuery)
      || exercise.primaryMuscleGroup === normalizedQuery
      || exercise.equipment.includes(normalizedQuery);
  }).length]));
  for (const [query, count] of Object.entries(searchReport)) if (count < 1) errors.push(`Search query ${query} has no result.`);
  if (errors.length) throw new Error(`Catalog validation failed:\n- ${errors.join("\n- ")}`);

  return {
    catalogSize: catalog.exercises.length,
    muscles: Object.fromEntries([...muscles].sort().map((muscle) => [muscle, catalog.exercises.filter((exercise) => exercise.primaryMuscleGroup === muscle).length])),
    equipment: Object.fromEntries([...equipment].sort().map((item) => [item, catalog.exercises.filter((exercise) => exercise.equipment.includes(item)).length])),
    categories: Object.fromEntries([...categories].sort().map((category) => [category, catalog.exercises.filter((exercise) => exercise.category === category).length])),
    searchReport,
    checksum,
  };
}

function sqlText(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function sqlNullable(value) {
  return value == null ? "null" : sqlText(value);
}

function sqlArray(values) {
  return values.length ? `array[${values.map(sqlText).join(",")}]::text[]` : "'{}'::text[]";
}

function inputValuesSql() {
  return catalog.exercises.map((exercise) => `(
    ${sqlText(exercise.id)}::uuid, ${sqlText(exercise.sourceType)}, ${sqlText(exercise.name)}, ${sqlText(exercise.name.trim().toLocaleLowerCase("pt-BR"))},
    ${sqlText(exercise.slug)}, ${sqlText(exercise.description)}, ${sqlText(exercise.primaryMuscleGroup)}, ${sqlArray(exercise.secondaryMuscleGroups)},
    ${sqlArray(exercise.equipment)}, ${sqlNullable(exercise.movementPattern)}, ${sqlText(exercise.instructions)}, ${sqlArray(exercise.coachingCues)},
    ${sqlText(exercise.locale)}, ${sqlText(exercise.status)}
  )`).join(",\n");
}

const columns = "id, source_type, name, normalized_name, slug, description, primary_muscle_group, secondary_muscle_groups, equipment, movement_pattern, instructions, coaching_cues, locale, status";
const differingRows = `row(existing.name, existing.normalized_name, existing.description, existing.primary_muscle_group, existing.secondary_muscle_groups, existing.equipment, existing.movement_pattern, existing.instructions, existing.coaching_cues, existing.locale, existing.status)
      is distinct from row(input.name, input.normalized_name, input.description, input.primary_muscle_group, input.secondary_muscle_groups, input.equipment, input.movement_pattern, input.instructions, input.coaching_cues, input.locale, input.status)`;

function dryRunSql() {
  return `-- PPerfil Exercise Catalog V1 dry-run\n-- SHA-256: ${checksum}\nbegin transaction read only;

with input(${columns}) as (values
${inputValuesSql()}
), compared as (
  select input.*,
    case when existing.id is null then 'INSERT' when ${differingRows} then 'UPDATE' else 'SKIP' end as action
  from input
  left join public.exercises existing
    on existing.source_type = 'PPERFIL_LIBRARY' and existing.owner_trainer_id is null and existing.slug = input.slug
)
select jsonb_build_object(
  'catalog_size', (select count(*) from input),
  'inserts', (select count(*) from compared where action = 'INSERT'),
  'updates', (select count(*) from compared where action = 'UPDATE'),
  'skips', (select count(*) from compared where action = 'SKIP'),
  'id_conflicts', (select count(*) from input join public.exercises existing using (id) where existing.source_type <> 'PPERFIL_LIBRARY' or existing.owner_trainer_id is not null or existing.slug <> input.slug),
  'trainer_owned_total', (select count(*) from public.exercises where source_type = 'TRAINER_CUSTOM' and owner_trainer_id is not null),
  'trainer_owned_would_change', 0,
  'system_outside_catalog', (select count(*) from public.exercises existing where existing.source_type = 'PPERFIL_LIBRARY' and not exists (select 1 from input where input.slug = existing.slug))
) as catalog_dry_run;

rollback;
`;
}

function applySql({ rollback }) {
  return `-- PPerfil Exercise Catalog V1 idempotent SYSTEM-only ${rollback ? "rollback preflight" : "apply"}\n-- SHA-256: ${checksum}\nbegin;
set local lock_timeout = '5s';
set local statement_timeout = '120s';

create temporary table catalog_import_input on commit drop as
select * from (values
${inputValuesSql()}
) as input(${columns});

create temporary table catalog_import_plan on commit drop as
select input.id, input.slug,
  case when existing.id is null then 'INSERT' when ${differingRows} then 'UPDATE' else 'SKIP' end as action
from catalog_import_input input
left join public.exercises existing
  on existing.source_type = 'PPERFIL_LIBRARY' and existing.owner_trainer_id is null and existing.slug = input.slug;

do $$
begin
  if exists (
    select 1 from catalog_import_input input
    join public.exercises existing using (id)
    where existing.source_type <> 'PPERFIL_LIBRARY' or existing.owner_trainer_id is not null or existing.slug <> input.slug
  ) then
    raise exception 'exercise_catalog_id_conflict';
  end if;
end;
$$;

insert into public.exercises(
  id, owner_trainer_id, source_type, name, normalized_name, slug, description,
  primary_muscle_group, secondary_muscle_groups, equipment, movement_pattern,
  instructions, coaching_cues, locale, status
)
select id, null, source_type, name, normalized_name, slug, description,
  primary_muscle_group, secondary_muscle_groups, equipment, movement_pattern,
  instructions, coaching_cues, locale, status
from catalog_import_input
on conflict (slug) where source_type = 'PPERFIL_LIBRARY' and slug is not null
do update set
  name = excluded.name,
  normalized_name = excluded.normalized_name,
  description = excluded.description,
  primary_muscle_group = excluded.primary_muscle_group,
  secondary_muscle_groups = excluded.secondary_muscle_groups,
  equipment = excluded.equipment,
  movement_pattern = excluded.movement_pattern,
  instructions = excluded.instructions,
  coaching_cues = excluded.coaching_cues,
  locale = excluded.locale,
  status = excluded.status,
  updated_at = now()
where row(exercises.name, exercises.normalized_name, exercises.description, exercises.primary_muscle_group, exercises.secondary_muscle_groups, exercises.equipment, exercises.movement_pattern, exercises.instructions, exercises.coaching_cues, exercises.locale, exercises.status)
  is distinct from row(excluded.name, excluded.normalized_name, excluded.description, excluded.primary_muscle_group, excluded.secondary_muscle_groups, excluded.equipment, excluded.movement_pattern, excluded.instructions, excluded.coaching_cues, excluded.locale, excluded.status);

select jsonb_build_object(
  'catalog_size', (select count(*) from catalog_import_input),
  'inserts', (select count(*) from catalog_import_plan where action = 'INSERT'),
  'updates', (select count(*) from catalog_import_plan where action = 'UPDATE'),
  'skips', (select count(*) from catalog_import_plan where action = 'SKIP'),
  'system_after', (select count(*) from public.exercises where source_type = 'PPERFIL_LIBRARY' and owner_trainer_id is null),
  'trainer_owned_after', (select count(*) from public.exercises where source_type = 'TRAINER_CUSTOM' and owner_trainer_id is not null),
  'post_upsert_exact_matches', (select count(*) from catalog_import_input input join public.exercises existing on existing.source_type = 'PPERFIL_LIBRARY' and existing.owner_trainer_id is null and existing.slug = input.slug where not (${differingRows})),
  'media_inserted', 0
) as catalog_apply;

${rollback ? "rollback" : "commit"};
`;
}

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

const report = validateCatalog();
const mode = argumentValue("--mode") ?? "validate";
const output = argumentValue("--output");
if (!new Set(["validate", "dry-run", "preflight", "apply"]).has(mode)) throw new Error(`Unsupported mode ${mode}.`);
if (mode === "apply" && !process.argv.includes("--acknowledge-system-only")) throw new Error("Apply SQL generation requires --acknowledge-system-only.");
if (mode !== "validate" && !output) throw new Error(`${mode} requires --output.`);

if (mode === "dry-run") writeFileSync(resolve(output), dryRunSql(), "utf8");
if (mode === "preflight") writeFileSync(resolve(output), applySql({ rollback: true }), "utf8");
if (mode === "apply") writeFileSync(resolve(output), applySql({ rollback: false }), "utf8");
process.stdout.write(`${JSON.stringify({ mode, output: output ? resolve(output) : null, ...report }, null, 2)}\n`);
