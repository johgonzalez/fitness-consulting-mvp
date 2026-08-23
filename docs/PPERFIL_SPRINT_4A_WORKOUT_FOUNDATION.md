# PPerfil Sprint 4A — Workout Foundation

## Scope and benchmark decisions

Sprint 4A establishes the prescription domain only. It deliberately separates workout programming from the future execution/logging domain. Trainerize and Everfit informed the structured builder model; Fitbod informed the AI-draft boundary; Hevy and Strong informed the set prescription shape; Apple Fitness+ and Future informed the media-first student projection. No proprietary layout, content, or implementation was copied.

The main architectural decisions are:

- plans belong to an authorized `trainer_student_relationship`;
- core workout structure is relational, not one mutable JSON document;
- every editable prescription lives in a version;
- published prescriptions are immutable and retained as history;
- AI can propose only a validated `DRAFT` and cannot approve or publish;
- trainer-private content and student-readable content use different projections;
- future workout execution records will not mutate prescription records.

## Schema

Migration `202608220011_workout_foundation.sql` adds nine application tables:

| Table | Responsibility |
| --- | --- |
| `exercises` | PPerfil and trainer-owned exercise definitions |
| `exercise_media` | Instructional media metadata, provenance, license, and review status |
| `workout_plans` | Relationship-scoped logical plan |
| `workout_plan_versions` | Version, lifecycle, source assessment, and AI provenance |
| `workout_sessions` | Ordered training days/sessions |
| `workout_sections` | Ordered semantic blocks inside a session |
| `workout_exercises` | Ordered exercise prescriptions and trainer/student notes |
| `workout_sets` | Typed set targets with explicit units |
| `workout_events` | Append-only audit stream |

Foreign keys, uniqueness rules, partial indexes, and explicit foreign-key indexes support tenant-scoped reads and ordered hierarchy traversal. `generation_metadata` is limited to a JSON object of at most 64 KiB; the workout structure itself is never stored in JSONB.

## Exercise library

System exercises use `owner_trainer_id = null`. Trainer-created exercises are owner-scoped. Search uses normalized names and can later add filters for muscle group, equipment, movement, favorites, and ownership without changing the workout hierarchy.

The application exposes an `ExerciseLibraryRepository` for search, custom-exercise creation, and custom-media registration. Custom exercises referenced by a published or historical plan can be resolved by the assigned student, but unrelated trainers and students cannot read them.

## Exercise media

`exercise_media` supports `IMAGE` and `VIDEO`, storage paths or reviewed HTTPS locations, thumbnails, provider/source/license metadata, creator credit, sort order, and the lifecycle `DEVELOPMENT`, `REVIEW`, `APPROVED`, `ARCHIVED`.

The central resolver in `src/lib/exercises/media-resolver.ts` rejects unsafe locations, resolves storage paths through an injected function, and hides non-approved media unless development access is explicitly enabled. Development media therefore cannot silently become production-visible.

## Workout hierarchy

```text
workout_plan
└── workout_plan_version
    └── workout_session
        └── workout_section
            └── workout_exercise
                └── workout_set
```

This shape supports an ergonomic card/list builder rather than forcing a spreadsheet UI. Sessions, sections, and exercises have transactionally normalized sort orders. A superset group is valid only inside a `SUPERSET` section and must contain at least two exercises in the same section.

## Lifecycle

The server-enforced transitions are:

```text
DRAFT → APPROVED → PUBLISHED → ARCHIVED
```

Only an active owning trainer can create, change, approve, or publish. Structural RPCs accept only a `DRAFT`. Approval validates the complete hierarchy. Publication accepts only `APPROVED`, validates again, archives any previous published version atomically, and exposes the new version to the student. Invalid transitions fail in PostgreSQL.

AI output can create only a version with `source_type = AI_DRAFT` and `status = DRAFT`. There is no function that lets AI approve or publish.

## Versioning

Published versions cannot be changed in place, including by privileged direct table mutation. `create_new_draft_from_published_version` clones sessions, sections, prescribed exercises, and sets into the next version number while recording `source_version_id`. The prior version remains read-only history. One logical plan can have one current published version and multiple archived historical versions.

## Sections and sets

Section types are `WARMUP`, `MAIN`, `SUPERSET`, `CONDITIONING`, `COOLDOWN`, and `CUSTOM`.

Set types are `STANDARD`, `WARMUP`, `DROP`, `FAILURE`, and `AMRAP`. A set can prescribe exact reps, a rep range, duration, or distance. Reps, load, duration, distance, and rest cannot be negative. RPE is restricted to 0–10. Set numbers are unique inside one prescribed exercise.

## AI draft contract

`src/lib/workouts/ai-contract.ts` defines a versioned, strict input/output boundary. The output validator:

- rejects unknown and malformed fields;
- limits sessions, sections, exercises, and sets;
- validates every set with the same domain rules as manual input;
- permits only exercise IDs visible through the authorized exercise repository;
- requires unknown exercises to be explicitly marked unresolved;
- blocks persistence while any exercise remains unresolved;
- enforces valid superset grouping;
- records schema version and validation time as provenance.

Sprint 4A contains no external AI provider invocation. The trainer must review, edit, approve, and publish through separate authorized lifecycle operations.

## Assessment integration

A workout version may reference `source_assessment_id` only when that assessment belongs to the same relationship and has status `COMPLETED`. Assessment answers are not copied into workout tables.

`buildWorkoutAiContext` creates an application-level training context from an explicitly allowlisted subset of completed answers and relevant measurements. It performs no diagnosis or medical inference, and the trainer remains responsible for the prescription.

## Authorization and RLS

Role alone never grants access. Every policy and security-definer mutation derives access from the authenticated identity and the trainer-student relationship.

- Trainer: private drafts, approved versions, published/history, and owner exercise library.
- Student: only own `PUBLISHED` and `ARCHIVED` prescription projection.
- Inactive/ended relationship: no creation, mutation, approval, or publication; both parties retain permitted read-only history.
- Anonymous: no workout or exercise access.
- Cross-tenant access: denied in both trainer and student directions.

All nine tables have RLS enabled. `authenticated` receives no direct mutation grant on workout tables. Mutations use narrowly granted `SECURITY DEFINER` RPCs owned by `postgres` with an empty `search_path`. Trainer-only fields (`trainer_prompt`, AI provenance, and `trainer_note`) are omitted from the student projection and are not directly granted to the shared authenticated role.

## Audit events

`workout_events` records `WORKOUT_CREATED`, `DRAFT_CREATED`, `DRAFT_UPDATED`, `AI_DRAFT_CREATED`, `APPROVED`, `PUBLISHED`, `ARCHIVED`, and `NEW_DRAFT_FROM_PUBLISHED`. The event table is append-only: application roles cannot mutate it, and a trigger blocks update/delete attempts.

## Demo fixtures

`src/data/demo/workouts.ts` is local-only and uses the existing Thiago demo relationship IDs. It contains:

- eight varied system exercises and media metadata;
- one manual draft;
- one AI-shaped draft with a completed assessment reference;
- one approved version;
- one published multi-session version;
- one archived historical version;
- a student published/history summary projection.

These fixtures are never seeded into the linked Supabase project.

## Global-ready units

All timestamps are timezone-safe PostgreSQL `timestamptz` values and all text supports Unicode. Load uses explicit `kg` or `lb`; distance uses explicit `m`, `km`, or `mi`. No application or database rule assumes kilograms. Exercise content carries a locale and trainer notes remain locale-independent free text.

## Sprint 4B UI contract

The Trainer Builder can be implemented against the current service/repository boundary and projections. It can support student context, manual and AI draft entry, exercise search/media, ordered sessions and sections, supersets, set types, reps/ranges, load and units, duration, distance, rest, RPE, private trainer notes, student instructions, review, approval, and publication.

Sprint 4B must not bypass these service/RPC boundaries or infer lifecycle state in React components.

## Sprint 5 execution contract

Execution will create separate immutable workout-session and set-log records. The prescription hierarchy already provides stable version, session, section, exercise, and set identifiers for large exercise media, sequence position, previous-performance lookup, fast set logging, rest timers, completion, notes, and difficulty feedback. Execution data must never edit a published prescription.

## Known limitations

- No Workout Builder UI is included in Sprint 4A.
- No AI provider is called; only the safe contract, validation, provenance, and draft materialization boundary exist.
- AI materialization currently performs several authorized RPC calls. A failure can leave an incomplete but private `DRAFT`; approval validation prevents it from becoming approved or published. A future bulk-draft command may make this application orchestration atomic.
- Exercise media upload/storage provisioning and media review workflow are not included. The metadata and resolver boundaries are ready for them.
- System exercise samples are local demo fixtures only; there is no remote demo seed.
- Workout execution, previous-performance data, rest timers, completion, feedback, analytics, chat, payments, and notifications remain out of scope.
