# PPerfil Exercise Media Pack V1

## Status and scope

Media Pack V1 maps 49 existing PPerfil system exercises to 96 production-approved, flat 512 × 512 WebP images. It does not create exercises, mutate the 190 canonical exercise records, alter the database schema, or touch trainer-owned custom exercises.

The repository stores the deterministic manifest and import tooling, not the licensed image binaries. Runtime assets live in PPerfil-controlled Supabase Storage.

## Source

- Dataset: [RepDB exercise-dataset](https://github.com/RepDB/exercise-dataset)
- Pinned commit: `045845b61e4aefd9e684fa84518b84c665ea3cd3`
- Dataset snapshot: 250 exercises
- Dataset SHA-256: `03d8061189448f78ee05dbea3e65f98501fc4486340f86f6e78eaacd89cfa7ec`
- Manifest SHA-256: `fed61280a7b68e58d08fe7f7e23f9d352ce5cb7bdd178ed2f73a8de1fbafc8a7`

The source repository moved from `sergei-argutin/exercise-dataset` to the RepDB organization. The pinned commit and file hashes make the reviewed input reproducible even if the upstream default branch changes.

## License review

Reviewed source documents:

- [RepDB Free Tier License v1.0](https://github.com/RepDB/exercise-dataset/blob/045845b61e4aefd9e684fa84518b84c665ea3cd3/LICENSE-DATA.md), SHA-256 `8f736a4d3cc1aca05c25fdba69fb131d927a187ae5b3a6b370876d8de013abc9`
- [RepDB attribution requirements](https://github.com/RepDB/exercise-dataset/blob/045845b61e4aefd9e684fa84518b84c665ea3cd3/ATTRIBUTION.md), SHA-256 `baa24a7c685d308ccfe28fe2fccbf12403ad6537d56c0b6189c4bcb0268f38b4`

Decision for this pack:

- Commercial and personal in-app use of the free-tier JSON and associated 512px flat WebP images is permitted with attribution.
- In-app resizing/cropping is permitted. PPerfil uses `object-fit: contain` to preserve the full movement pose.
- Redistribution, resale, repackaging, or exposing the source as a standalone dataset/API is not permitted.
- RepDB images must never be used as input, reference, conditioning, or training data for generative AI.
- `premium-samples/` animation files are evaluation-only and are excluded from the builder, manifest, staging, storage, and importer.
- The material is reference content, not medical advice; trainer judgment remains required.

The existing `exercise_media.production_status = 'APPROVED'` is the schema's technical equivalent of the requested production-approved state.

## Attribution

Required visible text: **Exercise data by RepDB (repdb.co)**, linking to [repdb.co](https://repdb.co).

It is present in:

- the global public footer;
- the repository `README.md` credits section;
- this license record.

Each imported row also preserves `provider = REPDB_FREE_V1`, the source exercise URL, `license_type = RepDB Free Tier License v1.0`, and `creator_credit = RepDB`.

## Selected exercises

All mappings are high-confidence semantic matches to existing Portuguese PPerfil records. Start/peak pairs are stored when both flat images exist; static exercises use one main image.

| Group | PPerfil exercises |
| --- | --- |
| Lower body | Agachamento livre; Leg press 45°; Leg press horizontal; Cadeira extensora; Mesa flexora; Levantamento terra romeno; Terra romeno com halteres; Hip thrust; Afundo; Avanço reverso com halteres; Agachamento búlgaro; Panturrilha em pé; Panturrilha sentada; Ponte de glúteos; Levantamento terra sumo |
| Chest | Supino reto com barra; Supino com halteres; Supino inclinado com barra; Supino inclinado com halteres; Crucifixo com halteres; Crucifixo no cabo; Flexão de braço; Supino fechado |
| Back | Puxada frontal; Barra fixa assistida; Barra fixa; Chin-up; Remada curvada; Remada unilateral com halter; Remada apoiada no banco; Remada invertida |
| Shoulders | Desenvolvimento com halteres; Desenvolvimento militar com barra; Elevação lateral; Elevação frontal; Face pull; Mobilidade de ombro |
| Arms | Rosca direta; Rosca martelo; Rosca concentrada; Rosca Scott; Tríceps na polia; Tríceps francês; Tríceps testa |
| Core and conditioning | Prancha; Abdominal; Dead bug; Mountain climber; Polichinelo |

## Skipped priority exercises

| Exercise | Safe-skip reason |
| --- | --- |
| Agachamento goblet | The free image uses a kettlebell, while the PPerfil V1 record specifies a dumbbell. |
| Remada baixa | The available image is a wide-grip variation and would overstate the generic PPerfil record. |
| Rosca alternada | The available curl image does not establish alternating-arm execution. |
| Pallof press | No semantically equivalent free-tier item exists in the pinned snapshot. |
| Burpee | The free-tier asset contains only the bottom pose and does not communicate the full dynamic movement safely. |
| Mobilidade de quadril | Available images represent specific stretches, not the generic PPerfil mobility record. |

These exercises intentionally retain the existing premium fallback. No lower-confidence image was imported merely to reach a count.

## Mapping strategy

`scripts/exercises/build-media-pack-v1.mjs` validates the exact upstream commit and source-document hashes, requires assets under `images/flat/`, rejects premium/evaluation paths, validates each WebP and emits deterministic UUIDv5 media IDs. The generated `data/exercises/media-pack-v1.json` maps external media to existing PPerfil exercise UUIDs without changing canonical names, instructions, equipment, or localization.

`scripts/exercises/import-media-pack-v1.mjs` provides `validate`, read-only `dry-run`, rollback `preflight`, and explicit `apply` modes. It rejects missing/non-system exercises, media ID conflicts, occupied sort slots, and any attempt to affect trainer custom media. Re-running the apply is idempotent; unchanged rows are skipped and there are no deletions.

## Storage strategy

- Bucket: `trainer-public-media` (existing public PPerfil-controlled bucket)
- Prefix: `system/exercises/repdb-free-v1/`
- Content type: `image/webp`
- Cache policy: `public, max-age=31536000, immutable`
- Asset count: 96
- Total bytes: 1,584,326

Licensed binaries are downloaded from the reviewed pinned source into a temporary staging directory, hash-checked, uploaded to exact allow-listed object paths, verified again through their public HTTPS responses, and removed from local staging. They are not served from GitHub and are not committed to Git.

`scripts/exercises/upload-media-pack-v1.mjs` accepts the service-role key only from the process environment, validates every staged byte against the manifest, rejects unexpected objects in the controlled prefix, uploads only missing files, and never logs the credential. It is an administrative deployment tool and must not be bundled into or called from the application runtime.

## Media resolver integration

The existing `exercise_media` projection remains authoritative. The UI:

1. accepts only `APPROVED` media outside development demo mode;
2. accepts only HTTPS URLs or exact allow-listed PPerfil storage paths;
3. renders up to two ordered frames for start/peak guidance;
4. uses a consistent contained 512 × 512 presentation on cards and detail views;
5. removes failed images client-side and returns to the existing fallback when none remain.

No workout prescription, set, lifecycle, or authorization behavior changed.

## Reproduction and verification

From a clean checkout of the pinned RepDB source:

```powershell
node scripts/exercises/build-media-pack-v1.mjs --source-dir C:\path\to\exercise-dataset
pnpm exercise-media:validate
node scripts/exercises/import-media-pack-v1.mjs --mode dry-run --output $env:TEMP\pperfil-media-pack-v1-dry-run.sql
node scripts/exercises/import-media-pack-v1.mjs --mode preflight --output $env:TEMP\pperfil-media-pack-v1-preflight.sql
```

Apply generation is intentionally explicit:

```powershell
node scripts/exercises/import-media-pack-v1.mjs --mode apply --acknowledge-licensed-media --output $env:TEMP\pperfil-media-pack-v1-apply.sql
```

After storage upload, verify every public object byte-for-byte:

```powershell
node scripts/exercises/verify-media-pack-v1.mjs --supabase-url https://YOUR_PROJECT.supabase.co
```

## Future full-catalog roadmap

1. Review remaining system exercises by usage analytics and student-execution risk.
2. Add only high-confidence mappings from reviewed production-licensed sources.
3. Preserve versioned pack manifests and immutable storage prefixes per source/license version.
4. Add video only after codec, accessibility, bandwidth, autoplay, and mobile execution review.
5. Keep explicit fallbacks where a safe semantic match is unavailable.
6. Re-review the upstream license and attribution text before each new pack; never assume this V1 decision covers future source versions.
