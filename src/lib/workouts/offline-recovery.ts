import type {
  WorkoutExecutionMutation,
  WorkoutExecutionSnapshot,
  WorkoutSetActuals,
} from "@/lib/domain/workout-executions";

const DATABASE_NAME = "pperfil-workout-recovery-v1";
const DATABASE_VERSION = 1;
const STORE_NAME = "execution-recovery";
const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RECOVERABLE_OPERATIONS = new Set([
  "complete_set",
  "edit_completed_set_actuals",
  "skip_set",
  "skip_exercise",
  "add_student_note",
  "pause",
  "resume",
]);
export const WORKOUT_SYNC_BATCH_SIZE = 25;
export const WORKOUT_RECOVERY_QUEUE_LIMIT = 200;

export type QueuedWorkoutMutation = {
  mutation: WorkoutExecutionMutation;
  queuedAt: string;
};

export type WorkoutRecoveryRecord = {
  schemaVersion: 1;
  executionId: string;
  workoutSessionId: string;
  expectedServerRevision: number;
  queuedMutations: QueuedWorkoutMutation[];
  restDeadline: number | null;
  createdAt: string;
  updatedAt: string;
  lastRecoveredAt: string | null;
  recoveryCount: number;
  lastSyncAttemptAt: string | null;
  syncFailureCount: number;
};

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("indexeddb_unavailable"));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME, { keyPath: "executionId" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("indexeddb_open_failed"));
    request.onblocked = () => reject(new Error("indexeddb_open_blocked"));
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("indexeddb_request_failed"));
  });
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("indexeddb_transaction_failed"));
    transaction.onabort = () => reject(transaction.error ?? new Error("indexeddb_transaction_aborted"));
  });
}

function isQueuedMutation(value: unknown): value is QueuedWorkoutMutation {
  if (!value || typeof value !== "object") return false;
  const queued = value as Partial<QueuedWorkoutMutation>;
  if (typeof queued.queuedAt !== "string" || !Number.isFinite(Date.parse(queued.queuedAt))) return false;
  if (!queued.mutation || typeof queued.mutation !== "object") return false;
  const mutation = queued.mutation as Partial<WorkoutExecutionMutation>;
  if (!mutation.operation || !RECOVERABLE_OPERATIONS.has(mutation.operation) || !mutation.clientMutationId || !UUID.test(mutation.clientMutationId)) return false;
  if (mutation.operation === "complete_set" || mutation.operation === "edit_completed_set_actuals") {
    return typeof mutation.workoutSetExecutionId === "string"
      && UUID.test(mutation.workoutSetExecutionId)
      && Boolean(mutation.actuals)
      && typeof mutation.actuals === "object";
  }
  if (mutation.operation === "skip_set") return typeof mutation.workoutSetExecutionId === "string" && UUID.test(mutation.workoutSetExecutionId);
  if (mutation.operation === "skip_exercise") return typeof mutation.workoutExerciseExecutionId === "string" && UUID.test(mutation.workoutExerciseExecutionId);
  return true;
}

function isRecoveryRecord(value: unknown): value is WorkoutRecoveryRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<WorkoutRecoveryRecord>;
  return record.schemaVersion === 1
    && typeof record.executionId === "string"
    && typeof record.workoutSessionId === "string"
    && Number.isInteger(record.expectedServerRevision)
    && (record.expectedServerRevision ?? -1) >= 0
    && UUID.test(record.executionId)
    && UUID.test(record.workoutSessionId)
    && Array.isArray(record.queuedMutations)
    && record.queuedMutations.length <= WORKOUT_RECOVERY_QUEUE_LIMIT
    && record.queuedMutations.every(isQueuedMutation)
    && (record.restDeadline === null || typeof record.restDeadline === "number")
    && typeof record.createdAt === "string"
    && typeof record.updatedAt === "string";
}

function isExpired(record: WorkoutRecoveryRecord, now = Date.now()) {
  const updatedAt = Date.parse(record.updatedAt);
  return !Number.isFinite(updatedAt) || now - updatedAt > RETENTION_MS;
}

export async function readWorkoutRecovery(executionId: string, workoutSessionId: string): Promise<WorkoutRecoveryRecord | null> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const value = await requestResult(store.get(executionId));
    if (!isRecoveryRecord(value) || value.workoutSessionId !== workoutSessionId || isExpired(value)) {
      if (value !== undefined) store.delete(executionId);
      await transactionComplete(transaction);
      return null;
    }
    await transactionComplete(transaction);
    return value;
  } finally {
    database.close();
  }
}

export async function writeWorkoutRecovery(record: WorkoutRecoveryRecord): Promise<void> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(record);
    await transactionComplete(transaction);
  } finally {
    database.close();
  }
}

export async function deleteWorkoutRecovery(executionId: string): Promise<void> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(executionId);
    await transactionComplete(transaction);
  } finally {
    database.close();
  }
}

export async function clearWorkoutRecoveryStorage(): Promise<void> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).clear();
    await transactionComplete(transaction);
  } finally {
    database.close();
  }
}

export function createWorkoutRecovery(input: {
  executionId: string;
  workoutSessionId: string;
  expectedServerRevision: number;
  restDeadline?: number | null;
  now?: Date;
}): WorkoutRecoveryRecord {
  const now = (input.now ?? new Date()).toISOString();
  return {
    schemaVersion: 1,
    executionId: input.executionId,
    workoutSessionId: input.workoutSessionId,
    expectedServerRevision: input.expectedServerRevision,
    queuedMutations: [],
    restDeadline: input.restDeadline ?? null,
    createdAt: now,
    updatedAt: now,
    lastRecoveredAt: null,
    recoveryCount: 0,
    lastSyncAttemptAt: null,
    syncFailureCount: 0,
  };
}

export function queueWorkoutMutation(record: WorkoutRecoveryRecord, mutation: WorkoutExecutionMutation, now = new Date()): WorkoutRecoveryRecord {
  if (record.queuedMutations.some((item) => item.mutation.clientMutationId === mutation.clientMutationId)) return record;
  if (record.queuedMutations.length >= WORKOUT_RECOVERY_QUEUE_LIMIT) throw new Error("workout_recovery_queue_full");
  const timestamp = now.toISOString();
  return {
    ...record,
    queuedMutations: [...record.queuedMutations, { mutation, queuedAt: timestamp }],
    updatedAt: timestamp,
  };
}

export function markWorkoutRecoveryLoaded(record: WorkoutRecoveryRecord, now = new Date()): WorkoutRecoveryRecord {
  const timestamp = now.toISOString();
  return {
    ...record,
    lastRecoveredAt: timestamp,
    recoveryCount: record.recoveryCount + 1,
    updatedAt: timestamp,
  };
}

export function markWorkoutSyncAttempt(record: WorkoutRecoveryRecord, failed: boolean, now = new Date()): WorkoutRecoveryRecord {
  const timestamp = now.toISOString();
  return {
    ...record,
    lastSyncAttemptAt: timestamp,
    syncFailureCount: failed ? record.syncFailureCount + 1 : record.syncFailureCount,
    updatedAt: timestamp,
  };
}

export function withWorkoutRecoveryRestDeadline(record: WorkoutRecoveryRecord, restDeadline: number | null, now = new Date()): WorkoutRecoveryRecord {
  return { ...record, restDeadline, updatedAt: now.toISOString() };
}

export function advanceWorkoutRecoveryQueue(
  record: WorkoutRecoveryRecord,
  acceptedCount: number,
  expectedServerRevision: number,
  now = new Date(),
): WorkoutRecoveryRecord {
  return {
    ...record,
    expectedServerRevision,
    queuedMutations: record.queuedMutations.slice(acceptedCount),
    updatedAt: now.toISOString(),
    lastSyncAttemptAt: now.toISOString(),
  };
}

function allExercises(snapshot: WorkoutExecutionSnapshot) {
  return snapshot.sections.flatMap((section) => section.exercises);
}

function findSet(snapshot: WorkoutExecutionSnapshot, setExecutionId: string) {
  return allExercises(snapshot).flatMap((exercise) => exercise.sets).find((set) => set.execution.id === setExecutionId);
}

function findExercise(snapshot: WorkoutExecutionSnapshot, exerciseExecutionId: string) {
  return allExercises(snapshot).find((exercise) => exercise.execution.id === exerciseExecutionId);
}

function updateOptimisticMetrics(snapshot: WorkoutExecutionSnapshot, now: string) {
  const exercises = allExercises(snapshot);
  for (const exercise of exercises) {
    const done = exercise.sets.every((set) => set.execution.status !== "PENDING");
    const started = exercise.sets.some((set) => set.execution.status !== "PENDING");
    exercise.execution.status = done
      ? exercise.sets.some((set) => set.execution.status === "COMPLETED") ? "COMPLETED" : "SKIPPED"
      : started ? "IN_PROGRESS" : "PENDING";
    exercise.execution.startedAt = started ? exercise.execution.startedAt ?? now : null;
    exercise.execution.completedAt = exercise.execution.status === "COMPLETED" ? exercise.execution.completedAt ?? now : null;
    exercise.execution.skippedAt = exercise.execution.status === "SKIPPED" ? exercise.execution.skippedAt ?? now : null;
  }
  const sets = exercises.flatMap((exercise) => exercise.sets);
  snapshot.metrics.completedSets = sets.filter((set) => set.execution.status === "COMPLETED").length;
  snapshot.metrics.skippedSets = sets.filter((set) => set.execution.status === "SKIPPED").length;
  snapshot.metrics.completedExercises = exercises.filter((exercise) => exercise.execution.status === "COMPLETED").length;
  snapshot.metrics.skippedExercises = exercises.filter((exercise) => exercise.execution.status === "SKIPPED").length;
  snapshot.execution.lastActivityAt = now;
  snapshot.execution.updatedAt = now;
}

export function applyWorkoutMutationOptimistically(
  snapshot: WorkoutExecutionSnapshot,
  mutation: WorkoutExecutionMutation,
  nowDate = new Date(),
): WorkoutExecutionSnapshot {
  const next = structuredClone(snapshot);
  const now = nowDate.toISOString();
  if (mutation.operation === "complete_set" || mutation.operation === "edit_completed_set_actuals") {
    const set = findSet(next, mutation.workoutSetExecutionId);
    if (!set) return next;
    set.execution = {
      ...set.execution,
      ...mutation.actuals,
      status: "COMPLETED",
      completedAt: mutation.operation === "complete_set" ? now : set.execution.completedAt,
      skippedAt: null,
      skipReason: null,
      restStartedAt: mutation.operation === "complete_set" && set.restSeconds ? now : set.execution.restStartedAt,
      restEndsAt: mutation.operation === "complete_set" && set.restSeconds
        ? new Date(nowDate.getTime() + set.restSeconds * 1000).toISOString()
        : set.execution.restEndsAt,
      revision: set.execution.revision + 1,
    };
  } else if (mutation.operation === "skip_set") {
    const set = findSet(next, mutation.workoutSetExecutionId);
    if (!set) return next;
    set.execution.status = "SKIPPED";
    set.execution.skippedAt = now;
    set.execution.skipReason = mutation.skipReason;
    set.execution.studentNote = mutation.studentNote;
    set.execution.revision += 1;
  } else if (mutation.operation === "skip_exercise") {
    const exercise = findExercise(next, mutation.workoutExerciseExecutionId);
    if (!exercise) return next;
    exercise.execution.status = "SKIPPED";
    exercise.execution.skippedAt = now;
    exercise.execution.skipReason = mutation.skipReason;
    exercise.execution.studentNote = mutation.studentNote;
    for (const set of exercise.sets) {
      if (set.execution.status !== "PENDING") continue;
      set.execution.status = "SKIPPED";
      set.execution.skippedAt = now;
      set.execution.skipReason = mutation.skipReason;
      set.execution.revision += 1;
    }
  } else if (mutation.operation === "add_student_note") {
    next.execution.studentNote = mutation.studentNote;
  } else if (mutation.operation === "pause") {
    next.execution.status = "PAUSED";
    next.execution.pausedAt = now;
  } else if (mutation.operation === "resume") {
    next.execution.status = "IN_PROGRESS";
    next.execution.pausedAt = null;
  }
  next.execution.serverRevision += 1;
  updateOptimisticMetrics(next, now);
  return next;
}

export function applyWorkoutMutationsOptimistically(
  snapshot: WorkoutExecutionSnapshot,
  mutations: QueuedWorkoutMutation[],
): WorkoutExecutionSnapshot {
  return mutations.reduce(
    (current, queued) => applyWorkoutMutationOptimistically(current, queued.mutation, new Date(queued.queuedAt)),
    snapshot,
  );
}

function actualsMatch(actuals: WorkoutSetActuals, snapshot: WorkoutExecutionSnapshot, setId: string) {
  const set = findSet(snapshot, setId)?.execution;
  return Boolean(set)
    && set?.actualReps === actuals.actualReps
    && set?.actualLoad === actuals.actualLoad
    && set?.loadUnit === actuals.loadUnit
    && set?.actualDurationSeconds === actuals.actualDurationSeconds
    && set?.actualDistance === actuals.actualDistance
    && set?.distanceUnit === actuals.distanceUnit
    && set?.actualRpe === actuals.actualRpe
    && set?.studentNote === actuals.studentNote;
}

export function canSafelyRebaseWorkoutMutations(snapshot: WorkoutExecutionSnapshot, queued: QueuedWorkoutMutation[]): boolean {
  return queued.every(({ mutation }) => {
    if (mutation.operation === "complete_set") {
      const set = findSet(snapshot, mutation.workoutSetExecutionId)?.execution;
      return set?.status === "PENDING" || (set?.status === "COMPLETED" && actualsMatch(mutation.actuals, snapshot, mutation.workoutSetExecutionId));
    }
    if (mutation.operation === "edit_completed_set_actuals") {
      return actualsMatch(mutation.actuals, snapshot, mutation.workoutSetExecutionId);
    }
    if (mutation.operation === "skip_set") {
      const set = findSet(snapshot, mutation.workoutSetExecutionId)?.execution;
      return set?.status === "PENDING"
        || (set?.status === "SKIPPED" && set.skipReason === mutation.skipReason && set.studentNote === mutation.studentNote);
    }
    if (mutation.operation === "skip_exercise") {
      const exercise = findExercise(snapshot, mutation.workoutExerciseExecutionId)?.execution;
      return exercise?.status === "PENDING" || exercise?.status === "IN_PROGRESS"
        || (exercise?.status === "SKIPPED" && exercise.skipReason === mutation.skipReason && exercise.studentNote === mutation.studentNote);
    }
    if (mutation.operation === "add_student_note") return snapshot.execution.studentNote === mutation.studentNote;
    if (mutation.operation === "pause") return snapshot.execution.status === "IN_PROGRESS" || snapshot.execution.status === "PAUSED";
    return snapshot.execution.status === "PAUSED" || snapshot.execution.status === "IN_PROGRESS";
  });
}

export function shouldRetainWorkoutRecovery(record: WorkoutRecoveryRecord, now = Date.now()) {
  return record.queuedMutations.length > 0 || (record.restDeadline !== null && record.restDeadline > now);
}
