# PPerfil Sprint 5C — Durable Offline Workout Recovery

## Outcome

Sprint 5C adds a browser outbox for Student Workout Execution. Supported execution mutations are written to IndexedDB before the optimistic UI advances. The existing Supabase workout execution RPC remains authoritative and receives the original `clientMutationId` values in ordered batches.

No database, migration, RLS, RPC, workout lifecycle, or prescription model changed.

## IndexedDB schema

- Database: `pperfil-workout-recovery-v1`
- Version: `1`
- Object store: `execution-recovery`
- Key path: `executionId`
- Maximum pending mutations per execution: `200`
- Server batch size: `25`, matching the existing RPC limit

Each record contains only:

| Field | Purpose |
| --- | --- |
| `schemaVersion` | Supports safe local schema validation. |
| `executionId` | Identifies the authoritative server execution. |
| `workoutSessionId` | Prevents applying recovery data to a different session. |
| `expectedServerRevision` | Preserves optimistic-concurrency context for the next server batch. |
| `queuedMutations[]` | Ordered supported mutations with their original `clientMutationId`. |
| `queuedMutations[].queuedAt` | Replays optimistic state and absolute timestamps deterministically. |
| `restDeadline` | Absolute millisecond deadline for a visible recovery timer; no per-second ticks are persisted. |
| `createdAt`, `updatedAt` | Retention and diagnostics. |
| `lastRecoveredAt`, `recoveryCount` | Recovery metadata. |
| `lastSyncAttemptAt`, `syncFailureCount` | Retry metadata without request or auth data. |

The outbox does not persist a workout prescription or full server snapshot. On route load, the current authorized server/demo projection is the base and queued mutations are replayed over that base for the local recovery view.

## Privacy review

Persisted actuals are limited to the values already present in a supported workout mutation: reps, load/unit, duration, distance/unit, RPE, skip reason, and the optional execution note associated with that mutation. These values are required to recover a set that has not reached the server.

The store does not contain:

- auth tokens, passwords, cookies, or Supabase credentials;
- progress photos or other private media;
- assessment content;
- student or trainer profile records;
- unrelated routes, navigation, or analytics state.

IndexedDB is origin- and browser-profile-scoped, but it is not application-level encrypted. Shared-device users should sign out; the authenticated logout path clears the workout recovery store before invoking the existing server logout. If browser storage is unavailable, server logout still proceeds.

## Retention and deletion

- A record expires after seven days without an update and is deleted when that execution is next opened.
- After all queued mutations synchronize, the record is deleted unless a still-active absolute rest deadline must survive a reload.
- A rest-only record is deleted when the deadline expires or the student skips/closes that rest.
- A terminal `COMPLETED` or `ABANDONED` execution deletes recovery metadata when no pending local mutation exists.
- If a terminal server snapshot conflicts with a still-pending local mutation, the record is retained instead of silently discarding user input, and the UI reports a synchronization conflict.
- Logout clears every PPerfil workout recovery record for the browser origin.

## Recovery algorithm

1. Load the current authorized execution snapshot through the existing server route.
2. Read the IndexedDB record keyed by `executionId` and verify `workoutSessionId`, schema version, and retention.
3. Replay ordered queued mutations over the authorized snapshot for the local recovery view.
4. Restore an active rest timer by computing `restDeadline - Date.now()`.
5. Show `Treino recuperado · Salvo neste dispositivo` without claiming a server save.
6. When online, send up to 25 mutations through the existing `sync_workout_execution` path.
7. Replace optimistic state with the returned authoritative snapshot and advance the local queue atomically.
8. Continue until the outbox is empty, then clear recovery data unless an active rest deadline remains.

Network failure after a server commit is safe: the same batch remains local and is retried with the same mutation IDs. The existing RPC recognizes a fully accepted retry before its stale-revision check and returns the authoritative snapshot without adding duplicate events or revisions.

## Stale revision behavior

When `serverRevision` is stale:

1. Fetch the latest authoritative student execution snapshot.
2. Inspect only the next queued batch against the affected server facts.
3. Rebase automatically when targets remain pending or the authoritative values already match the queued mutation.
4. Retry with the latest revision and the original mutation IDs.
5. If a newer server fact would be overwritten, retain the IndexedDB queue, replace the visible base with the authoritative snapshot, and show an explicit conflict. No newer server value is overwritten silently.

The V1 conflict UI intentionally does not offer field-by-field merging. The recoverable input remains in IndexedDB for support/review rather than being discarded.

## Connectivity UX

The execution UI uses the existing Student Workout visual system and adds only compact status feedback:

- `Sem conexão · Salvo neste dispositivo`
- `Sincronizando · Enviando alterações protegidas`
- `Falha na sincronização · Alterações preservadas neste dispositivo`
- `Treino recuperado · Salvo neste dispositivo`
- `Sincronizado · Servidor atualizado`

The final workout action remains disabled until queued set facts reach the server. Offline-safe set entry, pause, and resume use the durable mutation path.

## Rest timer

Only one absolute deadline is persisted. The visible countdown is derived in memory once per second. `+15`, `-15`, close, and skip update the absolute local deadline; they never alter the immutable prescribed rest duration and never create per-second writes.

## PWA and browser boundary

Sprint 5C does not install a service worker and does not cache the authenticated Next.js application shell. This keeps the change inside durable execution recovery rather than broadening PPerfil into a full offline-first application.

An already loaded workout continues offline. After tab/browser close, recovery occurs as soon as the protected execution route can load again (for example, after connectivity returns or when the browser can satisfy the shell from its normal cache). A guaranteed cold start with no network remains outside V1 because it requires an explicitly reviewed authenticated-shell/service-worker strategy.

## Known limitations

- IndexedDB durability depends on browser storage availability and user/browser eviction policies.
- V1 stores the minimum actuals in origin-scoped IndexedDB without application-level encryption.
- Unsafe multi-device conflicts are preserved and surfaced but require manual support/review; no field-level merge UI exists.
- There is no background sync after every PPerfil tab is closed. The outbox flushes when the execution route is open and online.
- A fully offline cold start is not supported because no service worker or authenticated shell cache was introduced.
