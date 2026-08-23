# PPerfil Sprint 5B — Premium Student Workout UX

## Outcome

Sprint 5B adds a mobile-first student workout experience on top of the secure Sprint 5A execution contract. Prescription remains immutable and separate from execution actuals. No migration, RLS change, remote demo seed, or direct table mutation was introduced.

Canonical review viewport: `390x844`.

## Routes

| Route | Responsibility |
| --- | --- |
| `/student/today` | Greeting, trainer presence, available unscheduled sessions, active/paused state, and primary next action. |
| `/student/workouts` | Published session library, factual terminal history, and development-only QA state shortcuts. |
| `/student/workouts/[id]` | Published workout overview with sections, exercise media, instructions, and start/resume action. |
| `/student/workouts/[id]/execute` | Immersive set execution, rest, pause/resume, completion, and feedback. |

The authenticated student shell provides Hoje, Treinos, Progresso, Chat, and Perfil navigation. Domains outside Sprint 5B remain visibly unavailable instead of routing to fabricated product areas. Normal navigation is removed during active execution.

## Data architecture

- `student-workspace.ts` composes identity, the Sprint 5A overview/execution projections, and the existing published workout version projection.
- Live reads and writes remain behind the existing Supabase repositories and `WorkoutExecutionService`.
- Student mutations use Server Actions that authenticate again through the repository and call only the narrow Sprint 5A RPC surface.
- Development demo mode uses one consistent local fixture workspace and never writes to the hosted Supabase project.
- The production demo kill switch remains enforced by `NODE_ENV !== "production" && PPERFIL_DEMO_MODE === "true"`.

## Visual system

The implementation reuses PPerfil V2 semantic tokens and their Light/Dark translations. The student-specific layer adds only semantic composition for:

- compact app chrome and safe-area bottom navigation;
- editorial workout media and intentional media fallback;
- fast numeric set controls;
- immersive execution progress;
- linear superset relationship;
- rest, pause, completion, feedback, and connectivity states;
- bottom sheets for details and leaving the workout.

Light is canonical. Dark is a graphite semantic translation, not a separate component tree.

## Execution behavior

### Set order

Normal sections execute exercise sets in prescription order. A `SUPERSET` section is projected into round order:

`A1 → B1 → rest → A2 → B2 → rest`

The UI does not create a second superset domain or alter the prescription.

### Logging

- Reps, load, duration, distance, units, and RPE are rendered only when supported by the prescribed set.
- Actual values start from safe prescription targets and remain editable with numeric keyboards and large increment/decrement controls.
- Previous performance is read through `get_previous_exercise_performance` and does not mutate the current workout.
- Every accepted mutation receives a browser-generated UUID and the current server revision.

### Rest

The countdown derives from Sprint 5A `rest_ends_at`. The browser updates the visible clock locally and never performs per-second writes. `+15`, `-15`, and skip affect the current visible rest flow without changing prescription data.

### Pause, resume, and completion

- Pausing and resuming replace local state with the authoritative returned snapshot.
- Leaving offers explicit continue/pause semantics.
- Completion is allowed only after the Sprint 5A server contract accepts all sets as completed or skipped.
- The completion screen displays only factual duration, completed exercises, and completed sets.
- Feedback uses the existing `EASY`, `GOOD`, `CHALLENGING`, and `VERY_HARD` values plus an optional student note.

## Sync and recovery

The active page keeps a recoverable mutation in memory after a network failure and retries with the same `clientMutationId`. A stale revision causes an authoritative snapshot refresh instead of overwriting newer state. The UI exposes offline, reconnecting, and retry states without discarding the entered actuals.

IndexedDB was not added in Sprint 5B. The approved Sprint 5A plan explicitly assigns persistent offline queues, encryption/privacy decisions, and background retry to Sprint 5C. Adding a persistent store here would expand the approved scope and privacy surface. The server remains authoritative.

## Media

Approved exercise media continues through the centralized storage resolver. The current exercise is loaded eagerly, the next useful image is warmed in the browser, and nonessential media stays lazy. Invalid or unavailable media renders an intentional movement fallback; broken empty containers are never shown.

## Development demo

Enable local demo mode:

```powershell
$env:PPERFIL_DEMO_MODE = "true"
pnpm dev
```

Open the student workspace directly:

`http://localhost:3000/demo?next=/student/today`

The Treinos screen contains a development-only “Cenários para QA visual” disclosure with direct states for execution, superset, rest, detail, fallback, last exercise, completion, offline, and paused review.

## Verification evidence

Rendered browser coverage included:

- Today, workouts, overview, active execution, rest, exercise detail, paused, last exercise, completion/feedback, media fallback, and offline/reconnect;
- Light and Dark at `390x844`;
- desktop expansion at `1440x900`;
- zero horizontal overflow in every captured mobile route;
- persisted theme after reload;
- no console or page errors;
- interactive quick edit, previous performance, A/B superset order, rest transition, pause/resume, same-ID reconnect retry, start, and feedback.

Security and regression gates:

- local/remote migration parity: PASS through `202608220012`;
- `workout_execution_security.sql`: PASS in rollback;
- `workout_foundation_security.sql`: PASS in rollback;
- `rls_isolation.sql`: PASS in rollback;
- TypeScript: PASS;
- ESLint: PASS;
- Next production build with demo mode disabled: PASS.

Browser QA screenshots are intentionally excluded from Git and stored only in the local Codex visualization area.

## Known boundaries

- Persistent offline outbox/IndexedDB remains Sprint 5C.
- Progresso, Billing, Chat, and Perfil product domains were not implemented.
- Adjusting the visible rest countdown does not rewrite the prescribed rest value or the Sprint 5A historical deadline.
- Product Owner visual approval is still required; implementation self-approval is not claimed.
