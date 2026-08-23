# PPerfil Exercise Catalog V1

## Status

Catalog V1 contains 190 active, system-owned (`PPERFIL_LIBRARY`) exercises in `pt-BR`. It was applied to the linked hosted project on 2026-08-23. The hosted catalog contained zero system and zero trainer-owned exercises before the import; after the import it contains 190 system exercises, zero trainer-owned exercises and zero media records.

Catalog file SHA-256:

```text
bff5e233032e2fa72ca646666c37694f19fb35bb6419bc465e6602a2fb770c3e
```

No database migration, schema, RLS policy, grant or function was changed for this catalog release.

## Coverage

Primary muscle groups:

| Group | Exercises |
| --- | ---: |
| Back | 20 |
| Biceps | 14 |
| Calves | 12 |
| Chest | 16 |
| Core | 20 |
| Forearms | 10 |
| Full body | 19 |
| Glutes | 15 |
| Hamstrings | 14 |
| Quadriceps | 18 |
| Shoulders | 18 |
| Triceps | 14 |

Equipment coverage (an exercise may use more than one item):

| Equipment | Exercises |
| --- | ---: |
| Barbell | 31 |
| Bench | 42 |
| Bodyweight | 45 |
| Cable | 21 |
| Cardio machine | 3 |
| Dumbbell | 48 |
| Kettlebell | 8 |
| Machine | 25 |
| Pull-up bar | 5 |
| Resistance band | 8 |

Categories: strength 83, hypertrophy 70, bodyweight 19, conditioning 11, mobility 5 and warm-up 2.

## Source, license and translation

The catalog uses the public `yuhonas/free-exercise-db` dataset as a taxonomy and exercise-selection reference, pinned to commit `b0eed061e1c832b3ed815fbaa4b45b3cdc14df49`. Its dataset is published under the Unlicense/public-domain dedication.

PPerfil does not redistribute the upstream JSON. The versioned PPerfil catalog contains stable PPerfil IDs and slugs plus PPerfil-curated Portuguese names, descriptions, execution instructions and coaching cues. The per-record `provenance` object and top-level `source` block preserve the reference dataset, pinned commit and catalog version.

References:

- <https://github.com/yuhonas/free-exercise-db>
- <https://github.com/yuhonas/free-exercise-db/blob/main/LICENSE.md>

## Media policy

Catalog V1 imports no third-party photos, GIFs or videos. The upstream dataset license is sufficient for the dataset text, but PPerfil has not classified the bundled exercise-image rights as production-approved. Every V1 exercise therefore has an empty `media` array and uses the existing graceful no-media fallback in the Builder.

Future media may be added only through the existing exercise-media model after source, creator credit, license type and production approval have been reviewed. Media enrichment must remain separable from exercise identity so stable IDs, workout references and search behavior do not change.

## Files and deterministic generation

- `data/exercises/catalog-v1.json` is the reviewable source of truth.
- `scripts/exercises/build-catalog-v1.mjs` deterministically generates all 190 records and stable UUIDv5 identifiers.
- `scripts/exercises/import-catalog-v1.mjs` validates the catalog and emits dry-run, rollback-preflight or apply SQL.
- `supabase/tests/exercise_catalog_security.sql` verifies hosted search, Builder operations, tenant isolation, mutation restrictions and media fallback.

Regenerate and validate:

```powershell
pnpm exercise-catalog:build
pnpm exercise-catalog:validate
```

The generator uses a fixed timestamp and namespace. Regenerating without an intentional catalog change must produce the same JSON and checksum.

## Safe import workflow

The importer operates only on rows with `source_type = 'PPERFIL_LIBRARY'` and `owner_trainer_id is null`. It never deletes rows, never changes trainer-owned exercises and rejects stable-ID conflicts. The upsert is keyed by the existing system-library slug constraint and updates only changed values.

Use a temporary output path so generated SQL cannot be committed accidentally:

```powershell
$dryRun = Join-Path $env:TEMP "pperfil-exercise-catalog-dry-run.sql"
$preflight = Join-Path $env:TEMP "pperfil-exercise-catalog-preflight.sql"
$apply = Join-Path $env:TEMP "pperfil-exercise-catalog-apply.sql"

node scripts/exercises/import-catalog-v1.mjs --mode dry-run --output $dryRun
pnpm exec supabase db query --linked --file $dryRun

node scripts/exercises/import-catalog-v1.mjs --mode preflight --output $preflight
pnpm exec supabase db query --linked --file $preflight

node scripts/exercises/import-catalog-v1.mjs --mode apply --acknowledge-system-only --output $apply
pnpm exec supabase db query --linked --file $apply
```

The `preflight` mode executes the complete upsert inside a transaction and rolls it back. The `apply` mode requires the explicit `--acknowledge-system-only` flag. Running the dry-run after a successful apply must report `inserts: 0`, `updates: 0`, `skips: 190`.

## Search and Builder behavior

The existing RPC returns at most 100 results. The Builder keeps its fast initial page and now performs authenticated server-side catalog searches whenever the Personal types a query or selects a muscle/equipment filter. This makes all 190 exercises discoverable without weakening RLS or exposing an anonymous catalog endpoint.

Validated sample searches: `agach`, `peito`, `quadriceps`, `halter`, `cabo` and `costas`. The security regression also verifies that an owning trainer can add and replace catalog exercises in a Draft while another trainer, a student and an anonymous user cannot mutate the workout or system catalog.

## Future catalog releases

Future changes should be forward-only catalog versions: preserve stable IDs for existing exercises, add new IDs for new exercises, archive rather than delete retired records, run validate/dry-run/preflight, review the generated diff and run the complete security regression before remote apply. A future database provenance column may mirror the versioned JSON if operational catalog administration requires it; V1 does not need a schema change.
