# PPerfil Sprint 5A — Workout Execution Foundation

## Status and scope

Sprint 5A establishes the secure server/domain foundation for student workout execution. It does not implement the final Today, Active Workout, rest timer, completion, history, or trainer UI. It also does not add scheduling, IndexedDB, haptics, progress charts, or AI adaptation.

The exercise catalog/media dependency is resolved: the production-reviewed V1 pack contains **49 system exercises and 96 approved images**.

## Frozen boundary

```text
PUBLISHED WORKOUT (immutable prescription)
  -> WORKOUT EXECUTION
  -> EXERCISE EXECUTIONS
  -> SET EXECUTIONS
  -> ACTUALS (reps, load, RPE, duration, distance, skip)
  -> COMPLETION + FEEDBACK
  -> HISTORY
  -> TRAINER READ PROJECTION
  -> future AI context
```

Prescription and execution never share mutable state. `workout_plan_versions`, `workout_sessions`, `workout_sections`, `workout_exercises`, and `workout_sets` remain the versioned prescription source of truth. Actual performance is stored only in the four execution tables introduced by migration `202608220012`.

## Open decisions closed for V1

| Decision | V1 rule |
| --- | --- |
| Scheduling | Out of Sprint 5A. Today exposes `AVAILABLE_UNSCHEDULED`; it never fabricates a date or calendar occurrence. |
| Repeat attempts | No ad-hoc repeat after a session has a terminal execution. A future assignment/scheduling domain must authorize a new occurrence. |
| Archived versions | No new start. An already active execution pinned before archival may be resumed and finished while the relationship remains active. |
| Inactive/ended relationship | No new start or mutation. Existing completed history remains readable to the relationship parties. |
| Duration | Active duration is wall time minus explicit paused time. |
| Offline storage | Server contract is ready; IndexedDB and its local-privacy review are deferred to Sprint 5C. |
| Feedback | First submission is idempotent; corrections are accepted for 15 minutes from the first accepted feedback. |
| Extra sets / set type changes | Out of V1. Execution records actuals against a pinned prescribed set. |
| Skip reasons | Optional bounded values: pain, equipment unavailable, fatigue, time, or other. |
| Trainer behavior | Read projection only; trainer cannot mutate student execution facts. |
| Sound / haptics | Future opt-in client behavior; absent from this foundation. |

## Schema

### `workout_executions`

Pins the relationship, student, plan, exact version, and exact session. It owns lifecycle timestamps, accumulated pause seconds, monotonic `server_revision`, optional difficulty/note, and feedback timestamp.

Only one active execution (`IN_PROGRESS` or `PAUSED`) can exist for a student/session pair. The start RPC also rejects a new attempt after a terminal execution until a future occurrence model exists.

### `workout_exercise_executions`

Pins each exact `workout_exercise_id` and denormalized catalog `exercise_id`. It records order, lifecycle, skip, and student note. A database guard verifies the prescribed exercise belongs to the pinned execution session.

### `workout_set_executions`

Pins each exact `workout_set_id`. It stores actual reps, load/unit, duration, distance/unit, RPE, completion/skip timestamps, skip reason, note, rest deadline, and per-set revision. Database checks reject negative measurements, orphan units, invalid RPE, invalid units, and cross-execution prescription references.

### `workout_execution_events`

Append-only event stream. `(workout_execution_id, actor_user_id, client_mutation_id)` is unique when a mutation ID exists, and `(workout_execution_id, server_revision)` is always unique.

Events cover start/resume/pause, set completion/update/skip, exercise skip, completion/abandonment, and feedback. Execution-note sync uses `SET_UPDATED` with `metadata.scope = execution_note` so the V1 event vocabulary remains closed while retaining idempotency provenance.

## Lifecycle

```text
START -> IN_PROGRESS
IN_PROGRESS -> PAUSED
PAUSED -> IN_PROGRESS
IN_PROGRESS | PAUSED -> COMPLETED
IN_PROGRESS | PAUSED -> ABANDONED
```

`COMPLETED` and `ABANDONED` are terminal. Child execution rows cannot be updated or deleted after the parent becomes terminal. Completed execution feedback is the only deliberately bounded post-completion write.

## Server operations

| RPC | Contract |
| --- | --- |
| `start_or_resume_workout_execution` | Authorizes student/session, requires active relationship and PUBLISHED version for a new execution, resumes an existing paused execution, and atomically materializes exercises/sets. |
| `sync_workout_execution` | Accepts 1–25 bounded mutations, requires UUID mutation IDs and expected revision, validates all targets/actuals, commits atomically, and returns the canonical snapshot. |
| `pause_workout_execution` / `resume_workout_execution` | Idempotent convenience wrappers over sync. |
| `complete_workout_execution` | Requires every set to be completed or skipped, computes factual counts/active duration, freezes the execution, and returns the snapshot. |
| `abandon_workout_execution` | Freezes an active execution as abandoned without fabricating completion. |
| `record_workout_execution_feedback` | Records difficulty and optional note on a completed execution with a 15-minute correction window. |
| `get_student_workout_execution` | Student-owned canonical snapshot. |
| `get_trainer_workout_execution` | Owning-trainer read projection; no write authority. |
| `get_previous_exercise_performance` | Last completed actuals for the same catalog exercise and student, optionally before a current execution. |
| `get_student_today_workout` | Available PUBLISHED sessions plus active execution state, explicitly marked unscheduled. |
| `get_student_workout_overview` | Plan/version/session counts, first approved media, and active/terminal indicators. |
| `list_student_workout_execution_history` | Bounded terminal history list. |
| `list_trainer_workout_executions` | Bounded relationship-scoped trainer summary. |

## Idempotency and revision contract

Every sync/lifecycle mutation carries a client-generated UUID. A retry of a fully accepted batch returns the current canonical snapshot without adding an event or incrementing the revision. A batch containing new work must match `expected_server_revision`; otherwise it fails with `stale_server_revision`.

The client must:

1. persist the UUID with its queued mutation;
2. retry with the same UUID;
3. replace local state with the returned authoritative snapshot;
4. fetch/reconcile after a stale-revision response instead of overwriting server state.

There are no per-second writes.

## Actuals and measurement validation

- Repetition prescriptions require `actual_reps` on completion.
- Duration prescriptions require `actual_duration_seconds`.
- Distance prescriptions require `actual_distance` and a supported unit.
- Load and unit are supplied together.
- RPE is between 0 and 10.
- Actuals never update the prescribed set.
- Extra sets and prescription edits are intentionally unsupported in V1.

## Rest timer contract

The database never runs a countdown. Completing a set stores `rest_started_at` and `rest_ends_at = completed_at + prescribed rest_seconds`. The client derives remaining time from the absolute deadline and may recover it after navigation/reload. Sprint 5B owns the visible timer and interactions.

## Superset contract

The execution snapshot preserves section type, section order, exercise order, and `superset_group_key`. Exercise/set facts remain normal execution rows; no duplicate superset domain exists. The client can render round order such as A → B → rest from the prescription metadata.

## Completion and feedback

Completion records only observable facts: active duration, completed/skipped exercise counts, and completed/skipped set counts. It does not infer calories, training volume, progress, or AI recommendations.

Feedback values are `EASY`, `GOOD`, `CHALLENGING`, and `VERY_HARD`, with an optional note. The first accepted feedback timestamp anchors the correction window.

## Media integration

Execution/overview projections expose only approved media metadata and preserve ordering. Application rendering continues through the central media resolver. An exercise with no approved media remains valid and must use the 141-style graceful fallback in the future student UI; no image URL is fabricated by the execution domain.

## Offline readiness

The server supports stable mutation IDs, optimistic revisions, bounded atomic sync, exact-version pinning, resumable snapshots, absolute rest deadlines, and deterministic reconciliation. IndexedDB queue persistence, encryption/privacy decisions, online/offline indicators, conflict UX, and background retry are Sprint 5C work.

## Authorization and RLS

- RLS is enabled on all four execution tables.
- `anon` receives no table or RPC privileges.
- `authenticated` receives read access through relationship-scoped RLS only.
- Browser roles receive no direct insert/update/delete grants.
- Mutations use narrow `SECURITY DEFINER` RPCs owned by `postgres`, each with an empty `search_path`.
- Student ownership and active relationship are re-checked inside every mutation.
- Trainer ownership is read-only.
- Database guards reject cross-session/cross-version materialization and terminal child changes even outside RLS.

## Verification

`supabase/tests/workout_execution_security.sql` runs in a rollback transaction and verifies:

- own PUBLISHED start and exact materialization;
- DRAFT and APPROVED rejection;
- duplicate start and duplicate mutation behavior;
- monotonic revision/stale rejection;
- pause/resume/completion/feedback lifecycle;
- cross-version set and cross-session exercise rejection;
- Student A/B and Trainer A/B isolation;
- trainer mutation rejection;
- inactive relationship behavior and completed history retention;
- terminal immutability and append-only events;
- previous-performance projection;
- anonymous and direct-write surface closure.

The existing Workout, Assessment, and trainer/student RLS suites remain mandatory regressions before remote apply.

## Application boundaries

- `domain/workout-executions.ts`: execution language and projections.
- `domain/workout-execution-repository.ts`: transport-independent persistence boundary.
- `validation/workout-executions.ts`: runtime parsing and client-side input checks.
- `workouts/execution-service.ts`: orchestration without React dependencies.
- `supabase/workout-executions.ts`: explicit RPC request/response adapter.
- `data/demo/workout-executions.ts`: internally consistent local fixtures for not-started, in-progress superset, paused, completed/feedback, approved media, and fallback states.

## Sprint 5B dependencies

Sprint 5B may build the premium mobile-first student experience against these contracts: Today/overview, execution snapshot, previous performance, explicit pause/resume, set sync, rest deadlines, superset keys, completion, and feedback. Sprint 5B must not bypass the repository/service boundary or write execution tables directly.
