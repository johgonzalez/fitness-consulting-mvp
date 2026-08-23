# PPerfil Sprint 4B — Workout Builder and AI Draft

## Scope

Sprint 4B turns the Sprint 4A prescription foundation into the trainer-facing Workout Builder. It adds the workout index, two-step creation flow, manual editing, visual exercise library, AI-assisted Draft experience, student context, review, approval, publication, and version history. It does not add workout execution, change the lifecycle, create a migration, modify RLS, or seed the hosted project.

## UX architecture

The authenticated navigation now exposes **Treinos**. The experience uses three routes:

- `/dashboard/workouts`: operational index with status filters and one primary creation action;
- `/dashboard/workouts/new`: student selection followed by Manual or AI creation;
- `/dashboard/workouts/[id]`: persistent editor with `?view=review`, `?view=history`, and `?view=library` views.

The builder keeps session navigation, the current workout structure, and student context visible together on desktop. Small edits remain in place and use the Sprint 4A service/RPC boundary. Mobile retains the same hierarchy but converts dense set editing into stacked, touch-sized fields and keeps the contextual action above the app navigation.

## Benchmark translation

The implementation translates the requested benchmarks into PPerfil rather than copying them:

- Apple and Linear: restrained hierarchy, precise spacing, low-noise status treatment, and one dominant action;
- Trainerize and Everfit: persistent training structure, exercise search, and student context;
- Fitbod: guided generation with a structured, reviewable result;
- Hevy and Strong: fast set duplication, inherited defaults, explicit units, and compact desktop editing;
- Future: human student identity and coaching context close to the prescription.

Light mode is the canonical Apple Clean surface system. Dark mode is the same geometry translated through existing graphite semantic tokens; purple remains an accent. The cards contain training identity and media, avoiding a generic form or wide spreadsheet composition.

## Builder component map

| Component | Responsibility |
| --- | --- |
| `NewWorkoutFlow` | Student selection, Manual/AI choice, generation states, and Draft result |
| `WorkoutBuilder` | Session/section/exercise orchestration, autosave, review, and lifecycle actions |
| `ExerciseLibraryDrawer` | Search, filters, detail preview, replacement/addition, and custom exercise entry |
| `ExerciseMedia` | Central-resolver-backed image or an intentional fallback |
| `SetEditor` | Typed targets, load/units, duration/distance, rest, RPE, notes, duplicate/remove/add |
| `StudentWorkoutContext` | Compact real assessment and measurement context without interpretation |
| `VersionHistoryPanel` | Read-only version provenance and dates |
| `WorkoutStatusBadge` | Shared lifecycle presentation |

## Exercise library and media

The drawer searches by exercise name and filters muscle group, equipment, and system/custom ownership. The selected exercise exposes approved/development media, instructions, and coaching cues before add or replace. Trainer-created exercises use the Sprint 4A custom exercise operation.

Components never hardcode remote URLs. `src/data/demo/workout-media.ts` maps demo exercise media to the existing PPerfil development catalog, while `src/lib/exercises/media-resolver.ts` remains the safety boundary. Missing or rejected media renders a designed fallback instead of a broken image. Upload, licensing review, and production media administration remain separate work.

## Set editor

Each prescribed exercise supports `STANDARD`, `WARMUP`, `DROP`, `FAILURE`, and `AMRAP` sets. Targets can be exact reps, rep ranges, duration, or distance. Load and distance units remain explicit; rest, RPE, and optional notes are directly editable. A new set inherits the previous set's safe values, and Duplicate creates the same fast path without changing existing trainer-entered values.

Desktop aligns the fields as a compact editor. Mobile uses stacked touch targets and does not compress the fields into a table. All mutations remain Draft-only on the server.

## Superset UX

`SUPERSET` is a semantic section type. Exercises in the section expose a group key and receive a connected accent treatment. Adding, changing, or clearing the group uses the existing exercise update operation. The Sprint 4A approval validator remains authoritative and rejects incomplete groups.

## AI workflow and provider abstraction

The sequence is READY → GENERATING → SUCCESS or ERROR:

1. select an active student relationship;
2. review only available goal, experience, availability, equipment, latest completed assessment, and measurements;
3. enter free text or use a suggestion;
4. send an allowlisted, server-built context to a `WorkoutAiProvider`;
5. validate the provider output against the versioned Sprint 4A schema and authorized exercise IDs;
6. materialize only a private `AI_DRAFT`;
7. require trainer review, approval, and publication as separate operations.

The client is not coupled to an AI vendor and never receives provider secrets. Production currently selects an explicit unavailable adapter, so the UI never pretends that AI generation is configured. Demo mode selects a deterministic, local, schema-validated provider so Product Owner QA can traverse the complete experience without remote writes.

## Failure recovery and autosave

Manual mutations show `Salvando`, `Salvo`, or an error with **Tentar novamente**. A failed request never leaves an indefinite loading state. Server errors are translated into actionable authentication, relationship, Draft-only, lifecycle, exercise, network, and generic recovery messages. Route loading, not-found, and retryable load-error states are also explicit.

AI validation happens before persistence. A generation/provider failure keeps the prompt and generation action available for retry. Sprint 4A materialization uses several authorized RPCs; if a later RPC fails, any partial record remains a private Draft and cannot pass approval validation or become student-visible. Atomic materialization or persisted `INCOMPLETE`/`ERROR` orchestration would require a future database command/state and was not introduced without authorization.

## Review, approval, publication, and history

Review mode removes edit affordances and trainer-private notes while showing sessions, semantic sections, media, sets, student instructions, and duration. `DRAFT → APPROVED` and `APPROVED → PUBLISHED` are distinct server lifecycle actions. Publication confirmation names both student and plan.

Published structure is read-only. **Criar nova versão** uses the Sprint 4A clone operation, preserving published history. The history panel shows version number, status, source (`MANUAL`/`AI_DRAFT`), creation date, and publication date.

## Demo and visual QA

All demo screens consume the existing local fixture workspace. Mutations and lifecycle transitions are simulated locally and never write hosted Supabase data. The demo covers Manual Draft, AI Draft, Approved, Published, Archived/history, library, review, Light, and Dark states.

Rendered QA was performed in system Chrome through Playwright because the Browser plugin was unavailable. Captures use real localhost content at 1440×900 and 390×844. Both themes had zero horizontal overflow, theme preference persisted across reload, and the final matrix produced no console errors or warnings.

## Known limitations

- Production AI remains intentionally unavailable until a reviewed server-side provider adapter is configured.
- AI materialization is not atomic; approval validation contains any partial Draft, but a bulk transaction or persisted orchestration state is still desirable.
- Demo edits are ephemeral and reset on navigation/reload; there is no remote demo seed.
- Plan name and goal are set at creation. Sprint 4A exposes no safe metadata-update RPC for an existing plan.
- Session duplication is omitted because Sprint 4A has no atomic clone-session operation; add, rename, reorder, and remove are supported.
- Exercise reordering uses accessible move buttons plus a visual drag handle; pointer drag-and-drop is not implemented.
- Exercise media upload and production review/licensing workflow are not part of Sprint 4B.
- Recent workout feedback, favorites, movement-pattern filters, and custom-exercise media upload are future enhancements.

## Sprint 5 dependencies

Sprint 5 must introduce a separate student execution/logging model. It may consume stable published version/session/section/exercise/set IDs, student-safe instructions, and resolved media, but must not mutate prescription history. Execution should separately define assignment delivery, scheduled sessions, set logs, previous performance, timers, completion, perceived difficulty, feedback, offline/retry behavior, analytics, and trainer visibility. None of those domains starts in Sprint 4B.
