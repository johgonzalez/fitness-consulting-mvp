import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const manifestPath = resolve(here, "../../data/exercises/media-pack-v1.json");
const rawManifest = readFileSync(manifestPath, "utf8");
const manifest = JSON.parse(rawManifest);
const checksum = createHash("sha256").update(rawManifest).digest("hex");
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const shaPattern = /^[0-9a-f]{64}$/;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function validateManifest() {
  const errors = [];
  if (manifest.schemaVersion !== "pperfil-exercise-media-pack-v1" || manifest.packVersion !== "1.0.0") errors.push("Unsupported media-pack version.");
  if (manifest.source?.commit !== "045845b61e4aefd9e684fa84518b84c665ea3cd3") errors.push("Unexpected RepDB source commit.");
  if (manifest.source?.commercialInAppUse !== true || manifest.source?.redistributionAsDataset !== false) errors.push("Commercial in-app license decision is incomplete.");
  if (manifest.source?.generativeAiUse !== false || manifest.source?.premiumSamplesAllowed !== false) errors.push("Forbidden source usage is not explicitly disabled.");
  if (manifest.source?.attributionText !== "Exercise data by RepDB (repdb.co)") errors.push("Required attribution text is missing.");
  if (manifest.storage?.bucket !== "trainer-public-media" || manifest.storage?.prefix !== "system/exercises/repdb-free-v1") errors.push("Unexpected controlled storage location.");
  if (!Array.isArray(manifest.mappings) || manifest.mappings.length < 40 || manifest.mappings.length > 50) errors.push("Media Pack V1 must map 40-50 exercises.");
  if (!Array.isArray(manifest.skippedPriority) || manifest.skippedPriority.length < 1) errors.push("Safe skips must remain documented.");

  const exerciseIds = new Set();
  const slugs = new Set();
  const repdbIds = new Set();
  const mediaIds = new Set();
  const slots = new Set();
  const storagePaths = new Set();
  let mediaRecordCount = 0;

  for (const [mappingIndex, mapping] of manifest.mappings.entries()) {
    const field = `mappings[${mappingIndex}]`;
    if (!uuidPattern.test(mapping.pperfilExerciseId)) errors.push(`${field}.pperfilExerciseId must be a stable UUIDv5.`);
    if (!slugPattern.test(mapping.pperfilSlug)) errors.push(`${field}.pperfilSlug is invalid.`);
    if (exerciseIds.has(mapping.pperfilExerciseId)) errors.push(`${field} duplicates a PPerfil exercise.`); else exerciseIds.add(mapping.pperfilExerciseId);
    if (slugs.has(mapping.pperfilSlug)) errors.push(`${field} duplicates a PPerfil slug.`); else slugs.add(mapping.pperfilSlug);
    if (repdbIds.has(mapping.repdbId)) errors.push(`${field} duplicates a RepDB source exercise.`); else repdbIds.add(mapping.repdbId);
    if (mapping.matchingConfidence !== "HIGH" || mapping.matchingRationale?.length < 20) errors.push(`${field} lacks high-confidence rationale.`);
    if (!mapping.sourceUrl?.startsWith(`https://exercise-dataset.com/exercise/${mapping.repdbId}/`)) errors.push(`${field}.sourceUrl is invalid.`);
    if (!Array.isArray(mapping.assets) || mapping.assets.length < 1 || mapping.assets.length > 2) errors.push(`${field} must contain one or two flat assets.`);
    for (const [assetIndex, asset] of mapping.assets.entries()) {
      const assetField = `${field}.assets[${assetIndex}]`;
      mediaRecordCount += 1;
      if (!uuidPattern.test(asset.id)) errors.push(`${assetField}.id must be a stable UUIDv5.`);
      if (mediaIds.has(asset.id)) errors.push(`${assetField}.id is duplicated.`); else mediaIds.add(asset.id);
      if (!new Set(["main", "start", "peak"]).has(asset.role)) errors.push(`${assetField}.role is invalid.`);
      if (asset.sortOrder !== assetIndex) errors.push(`${assetField}.sortOrder must be contiguous.`);
      const slot = `${mapping.pperfilExerciseId}:${asset.sortOrder}`;
      if (slots.has(slot)) errors.push(`${assetField} duplicates an exercise media slot.`); else slots.add(slot);
      if (!asset.sourcePath?.startsWith("images/flat/") || asset.sourcePath.includes("premium-samples") || asset.sourcePath.includes("..")) errors.push(`${assetField}.sourcePath is forbidden.`);
      if (!asset.storagePath?.startsWith("trainer-public-media/system/exercises/repdb-free-v1/") || !asset.storagePath.endsWith(".webp")) errors.push(`${assetField}.storagePath is invalid.`);
      if (storagePaths.has(asset.storagePath)) errors.push(`${assetField}.storagePath is duplicated.`); else storagePaths.add(asset.storagePath);
      if (!shaPattern.test(asset.sha256) || asset.byteSize < 2_000 || asset.byteSize > 250_000) errors.push(`${assetField} integrity metadata is invalid.`);
      if (asset.width !== 512 || asset.height !== 512) errors.push(`${assetField} must be a 512x512 WebP.`);
    }
  }

  if (manifest.mappedExerciseCount !== manifest.mappings.length) errors.push("mappedExerciseCount is inconsistent.");
  if (manifest.mediaRecordCount !== mediaRecordCount) errors.push("mediaRecordCount is inconsistent.");
  if (errors.length) throw new Error(`Media-pack validation failed:\n- ${errors.join("\n- ")}`);
  return {
    mappedExerciseCount: manifest.mappings.length,
    mediaRecordCount,
    skippedPriorityCount: manifest.skippedPriority.length,
    totalBytes: manifest.mappings.flatMap((mapping) => mapping.assets).reduce((total, asset) => total + asset.byteSize, 0),
    checksum,
  };
}

function sqlText(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function valuesSql() {
  return manifest.mappings.flatMap((mapping) => mapping.assets.map((asset) => `(
    ${sqlText(asset.id)}::uuid, ${sqlText(mapping.pperfilExerciseId)}::uuid, 'IMAGE',
    ${sqlText(asset.storagePath)}, ${sqlText(asset.storagePath)}, 'REPDB_FREE_V1',
    ${sqlText(mapping.sourceUrl)}, 'RepDB Free Tier License v1.0', 'RepDB', 'APPROVED', ${asset.sortOrder}
  )`)).join(",\n");
}

const columns = "id, exercise_id, media_type, url_or_storage_path, thumbnail_url_or_path, provider, source_url, license_type, creator_credit, production_status, sort_order";
const differingRows = `row(existing.media_type, existing.url_or_storage_path, existing.thumbnail_url_or_path, existing.provider, existing.source_url, existing.license_type, existing.creator_credit, existing.production_status, existing.sort_order)
      is distinct from row(input.media_type, input.url_or_storage_path, input.thumbnail_url_or_path, input.provider, input.source_url, input.license_type, input.creator_credit, input.production_status, input.sort_order)`;

function dryRunSql() {
  return `-- PPerfil Exercise Media Pack V1 dry-run
-- Manifest SHA-256: ${checksum}
begin transaction read only;

with input(${columns}) as (values
${valuesSql()}
), plan as (
  select input.*,
    case when existing.id is null then 'INSERT' when ${differingRows} then 'UPDATE' else 'SKIP' end as action
  from input left join public.exercise_media existing using (id)
)
select jsonb_build_object(
  'mapped_exercises', (select count(distinct exercise_id) from input),
  'media_records', (select count(*) from input),
  'inserts', (select count(*) from plan where action = 'INSERT'),
  'updates', (select count(*) from plan where action = 'UPDATE'),
  'skips', (select count(*) from plan where action = 'SKIP'),
  'missing_or_non_system_exercises', (select count(*) from input left join public.exercises exercise on exercise.id = input.exercise_id and exercise.source_type = 'PPERFIL_LIBRARY' and exercise.owner_trainer_id is null where exercise.id is null),
  'id_conflicts', (select count(*) from input join public.exercise_media existing using (id) where existing.exercise_id <> input.exercise_id),
  'slot_conflicts', (select count(*) from input join public.exercise_media existing on existing.exercise_id = input.exercise_id and existing.sort_order = input.sort_order and existing.id <> input.id),
  'trainer_owned_media_total', (select count(*) from public.exercise_media media join public.exercises exercise on exercise.id = media.exercise_id where exercise.source_type = 'TRAINER_CUSTOM'),
  'trainer_owned_media_would_change', 0,
  'system_media_outside_pack', (select count(*) from public.exercise_media media join public.exercises exercise on exercise.id = media.exercise_id where exercise.source_type = 'PPERFIL_LIBRARY' and not exists (select 1 from input where input.id = media.id))
) as media_pack_dry_run;

rollback;
`;
}

function applySql({ rollback }) {
  return `-- PPerfil Exercise Media Pack V1 ${rollback ? "rollback preflight" : "apply"}
-- Manifest SHA-256: ${checksum}
begin;
set local lock_timeout = '5s';
set local statement_timeout = '120s';

create temporary table media_pack_input on commit drop as
select * from (values
${valuesSql()}
) as input(${columns});

create temporary table media_pack_plan on commit drop as
select input.id,
  case when existing.id is null then 'INSERT' when ${differingRows} then 'UPDATE' else 'SKIP' end as action
from media_pack_input input left join public.exercise_media existing using (id);

do $$
begin
  if exists (
    select 1 from media_pack_input input
    left join public.exercises exercise on exercise.id = input.exercise_id
    where exercise.id is null or exercise.source_type <> 'PPERFIL_LIBRARY' or exercise.owner_trainer_id is not null
  ) then raise exception 'media_pack_missing_or_non_system_exercise'; end if;
  if exists (
    select 1 from media_pack_input input join public.exercise_media existing using (id)
    where existing.exercise_id <> input.exercise_id
  ) then raise exception 'media_pack_id_conflict'; end if;
  if exists (
    select 1 from media_pack_input input join public.exercise_media existing
      on existing.exercise_id = input.exercise_id and existing.sort_order = input.sort_order and existing.id <> input.id
  ) then raise exception 'media_pack_slot_conflict'; end if;
end;
$$;

insert into public.exercise_media(${columns})
select ${columns} from media_pack_input
on conflict (id) do update set
  media_type = excluded.media_type,
  url_or_storage_path = excluded.url_or_storage_path,
  thumbnail_url_or_path = excluded.thumbnail_url_or_path,
  provider = excluded.provider,
  source_url = excluded.source_url,
  license_type = excluded.license_type,
  creator_credit = excluded.creator_credit,
  production_status = excluded.production_status,
  sort_order = excluded.sort_order
where row(exercise_media.media_type, exercise_media.url_or_storage_path, exercise_media.thumbnail_url_or_path, exercise_media.provider, exercise_media.source_url, exercise_media.license_type, exercise_media.creator_credit, exercise_media.production_status, exercise_media.sort_order)
  is distinct from row(excluded.media_type, excluded.url_or_storage_path, excluded.thumbnail_url_or_path, excluded.provider, excluded.source_url, excluded.license_type, excluded.creator_credit, excluded.production_status, excluded.sort_order);

select jsonb_build_object(
  'inserts', (select count(*) from media_pack_plan where action = 'INSERT'),
  'updates', (select count(*) from media_pack_plan where action = 'UPDATE'),
  'skips', (select count(*) from media_pack_plan where action = 'SKIP'),
  'post_apply_exact_matches', (select count(*) from media_pack_input input join public.exercise_media media using (id) where not (${differingRows.replaceAll("existing.", "media.")})),
  'mapped_exercises_with_media', (select count(distinct media.exercise_id) from public.exercise_media media join media_pack_input input using (id) where media.production_status = 'APPROVED'),
  'approved_media_records', (select count(*) from public.exercise_media media join media_pack_input input using (id) where media.production_status = 'APPROVED'),
  'trainer_owned_media_after', (select count(*) from public.exercise_media media join public.exercises exercise on exercise.id = media.exercise_id where exercise.source_type = 'TRAINER_CUSTOM')
) as media_pack_result;

${rollback ? "rollback;" : "commit;"}
`;
}

const report = validateManifest();
const modeIndex = process.argv.indexOf("--mode");
const mode = modeIndex >= 0 ? process.argv[modeIndex + 1] : "validate";
const outputIndex = process.argv.indexOf("--output");
const output = outputIndex >= 0 ? process.argv[outputIndex + 1] : null;
if (!["validate", "dry-run", "preflight", "apply"].includes(mode)) throw new Error(`Unsupported mode: ${mode}`);
if (mode !== "validate" && !output) throw new Error(`Mode ${mode} requires --output.`);
if (mode === "apply" && !process.argv.includes("--acknowledge-licensed-media")) throw new Error("Apply requires --acknowledge-licensed-media.");
if (mode === "dry-run") writeFileSync(resolve(output), dryRunSql());
if (mode === "preflight") writeFileSync(resolve(output), applySql({ rollback: true }));
if (mode === "apply") writeFileSync(resolve(output), applySql({ rollback: false }));
process.stdout.write(`${JSON.stringify({ mode, output: output ? resolve(output) : null, ...report }, null, 2)}\n`);
