import { workoutDemoVersions } from "@/data/demo/workouts";
import type {
  StudentWorkoutOverview,
  WorkoutExecutionSnapshot,
  WorkoutExecutionStatus,
} from "@/lib/domain/workout-executions";
import type { WorkoutSession, WorkoutVersionProjection } from "@/lib/domain/workouts";

const STARTED_AT = "2026-08-23T12:00:00.000Z";
const LAST_ACTIVITY_AT = "2026-08-23T12:18:00.000Z";

function requiredProjection(status: "PUBLISHED" | "ARCHIVED"): WorkoutVersionProjection {
  const projection = workoutDemoVersions.find((item) => item.version.status === status);
  if (!projection) throw new Error(`Demo ${status} workout is missing.`);
  return projection;
}

function buildSnapshot(
  projection: WorkoutVersionProjection,
  session: WorkoutSession,
  executionId: string,
  status: WorkoutExecutionStatus,
  completedSetCount: number,
): WorkoutExecutionSnapshot {
  let setCursor = 0;
  let completedExercises = 0;
  const sections = session.sections.map((section) => ({
    id: section.id,
    sectionType: section.sectionType,
    name: section.name,
    sortOrder: section.sortOrder,
    exercises: section.exercises.map((prescribed, exerciseIndex) => {
      const sets = prescribed.sets.map((set) => {
        const completed = status === "COMPLETED" || setCursor < completedSetCount;
        setCursor += 1;
        return {
          ...set,
          execution: {
            id: `${executionId.slice(0, 8)}-${String(setCursor).padStart(4, "0")}-4000-8000-000000000001`,
            status: completed ? "COMPLETED" as const : "PENDING" as const,
            actualReps: completed ? set.targetReps ?? set.targetRepsMin : null,
            actualLoad: completed ? set.targetLoad : null,
            loadUnit: completed ? set.loadUnit : null,
            actualDurationSeconds: completed ? set.durationSeconds : null,
            actualDistance: completed ? set.distanceValue : null,
            distanceUnit: completed ? set.distanceUnit : null,
            actualRpe: completed ? set.targetRpe ?? 7 : null,
            studentNote: null,
            completedAt: completed ? "2026-08-23T12:15:00.000Z" : null,
            skippedAt: null,
            skipReason: null,
            restStartedAt: completed && set.restSeconds ? "2026-08-23T12:15:00.000Z" : null,
            restEndsAt: completed && set.restSeconds ? "2026-08-23T12:16:00.000Z" : null,
            restSkippedAt: null,
            revision: completed ? 1 : 0,
          },
        };
      });
      const allCompleted = sets.every((set) => set.execution.status === "COMPLETED");
      const someCompleted = sets.some((set) => set.execution.status === "COMPLETED");
      if (allCompleted) completedExercises += 1;
      const approvedMedia = prescribed.exercise.media.filter((media) => media.productionStatus === "APPROVED");
      return {
        id: prescribed.id,
        sortOrder: prescribed.sortOrder,
        supersetGroupKey: prescribed.supersetGroupKey,
        studentInstruction: prescribed.studentInstruction,
        tempo: prescribed.tempo,
        exercise: {
          id: prescribed.exercise.id,
          name: prescribed.exercise.name,
          description: prescribed.exercise.description,
          primaryMuscleGroup: prescribed.exercise.primaryMuscleGroup,
          secondaryMuscleGroups: prescribed.exercise.secondaryMuscleGroups,
          equipment: prescribed.exercise.equipment,
          movementPattern: prescribed.exercise.movementPattern,
          instructions: prescribed.exercise.instructions,
          coachingCues: prescribed.exercise.coachingCues,
          locale: prescribed.exercise.locale,
        },
        media: approvedMedia.map((media) => ({
          id: media.id,
          mediaType: media.mediaType,
          urlOrStoragePath: media.urlOrStoragePath,
          thumbnailUrlOrPath: media.thumbnailUrlOrPath,
          provider: media.provider,
          sourceUrl: media.sourceUrl,
          licenseType: media.licenseType,
          creatorCredit: media.creatorCredit,
          productionStatus: "APPROVED" as const,
          sortOrder: media.sortOrder,
        })),
        execution: {
          id: `${executionId.slice(0, 8)}-${String(exerciseIndex + 100).padStart(4, "0")}-4000-8000-000000000001`,
          status: allCompleted ? "COMPLETED" as const : someCompleted ? "IN_PROGRESS" as const : "PENDING" as const,
          startedAt: someCompleted ? STARTED_AT : null,
          completedAt: allCompleted ? "2026-08-23T12:15:00.000Z" : null,
          skippedAt: null,
          skipReason: null,
          studentNote: null,
        },
        sets,
      };
    }),
  }));
  const totalSets = session.sections.reduce((sum, section) => sum + section.exercises.reduce((exerciseSum, exercise) => exerciseSum + exercise.sets.length, 0), 0);
  const isCompleted = status === "COMPLETED";
  const isPaused = status === "PAUSED";
  return {
    execution: {
      id: executionId,
      trainerStudentRelationshipId: projection.plan.trainerStudentRelationshipId,
      studentProfileId: "5b200000-0000-4000-8000-000000000001",
      workoutPlanId: projection.plan.id,
      workoutPlanVersionId: projection.version.id,
      workoutSessionId: session.id,
      status,
      startedAt: STARTED_AT,
      pausedAt: isPaused ? LAST_ACTIVITY_AT : null,
      pausedSeconds: isCompleted ? 120 : 0,
      completedAt: isCompleted ? "2026-08-23T12:52:00.000Z" : null,
      abandonedAt: null,
      lastActivityAt: LAST_ACTIVITY_AT,
      serverRevision: isCompleted ? totalSets + 3 : completedSetCount + 1,
      difficulty: isCompleted ? "GOOD" : null,
      studentNote: isCompleted ? "Boa sessão, carga adequada." : null,
      feedbackRecordedAt: isCompleted ? "2026-08-23T12:54:00.000Z" : null,
      createdAt: STARTED_AT,
      updatedAt: LAST_ACTIVITY_AT,
    },
    plan: {
      id: projection.plan.id,
      name: projection.plan.name,
      goal: projection.plan.goal,
      status: projection.plan.status,
    },
    version: {
      id: projection.version.id,
      versionNumber: projection.version.versionNumber,
      status: projection.version.status as "PUBLISHED" | "ARCHIVED",
      publishedAt: projection.version.publishedAt ?? "2026-08-20T15:00:00.000Z",
      archivedAt: projection.version.archivedAt,
    },
    session: {
      id: session.id,
      name: session.name,
      description: session.description,
      estimatedDurationMinutes: session.estimatedDurationMinutes,
      sortOrder: session.sortOrder,
    },
    sections,
    metrics: {
      completedExercises,
      skippedExercises: 0,
      completedSets: isCompleted ? totalSets : completedSetCount,
      skippedSets: 0,
      totalSets,
      activeDurationSeconds: isCompleted ? 3000 : 1080,
    },
  };
}

const published = requiredProjection("PUBLISHED");
const archived = requiredProjection("ARCHIVED");
const publishedLower = published.sessions[0];
const publishedSuperset = published.sessions[1];
const publishedNotStarted = published.sessions[2];
const archivedCompleted = archived.sessions[0];
if (!publishedLower || !publishedSuperset || !publishedNotStarted || !archivedCompleted) {
  throw new Error("Workout execution demo sessions are incomplete.");
}

export const workoutExecutionDemoInProgress = buildSnapshot(
  published,
  publishedSuperset,
  "5b500000-0000-4000-8000-000000000001",
  "IN_PROGRESS",
  2,
);

export const workoutExecutionDemoPaused = buildSnapshot(
  published,
  publishedLower,
  "5b500000-0000-4000-8000-000000000002",
  "PAUSED",
  1,
);

export const workoutExecutionDemoCompleted = buildSnapshot(
  archived,
  archivedCompleted,
  "5b500000-0000-4000-8000-000000000003",
  "COMPLETED",
  Number.MAX_SAFE_INTEGER,
);

const notStartedExerciseCount = publishedNotStarted.sections.reduce((sum, section) => sum + section.exercises.length, 0);
const notStartedSetCount = publishedNotStarted.sections.reduce((sum, section) => sum + section.exercises.reduce((inner, exercise) => inner + exercise.sets.length, 0), 0);
const firstNotStartedMedia = publishedNotStarted.sections.flatMap((section) => section.exercises).flatMap((exercise) => exercise.exercise.media).find((media) => media.productionStatus === "APPROVED") ?? null;

export const workoutExecutionDemoNotStarted: StudentWorkoutOverview = {
  kind: "AVAILABLE_UNSCHEDULED",
  plan: { id: published.plan.id, name: published.plan.name, goal: published.plan.goal },
  version: {
    id: published.version.id,
    versionNumber: published.version.versionNumber,
    status: "PUBLISHED",
    publishedAt: published.version.publishedAt ?? "2026-08-20T15:00:00.000Z",
    archivedAt: null,
  },
  session: {
    id: publishedNotStarted.id,
    name: publishedNotStarted.name,
    description: publishedNotStarted.description,
    estimatedDurationMinutes: publishedNotStarted.estimatedDurationMinutes,
    sortOrder: publishedNotStarted.sortOrder,
    sectionCount: publishedNotStarted.sections.length,
    exerciseCount: notStartedExerciseCount,
    setCount: notStartedSetCount,
  },
  firstApprovedMedia: firstNotStartedMedia && {
    id: firstNotStartedMedia.id,
    mediaType: firstNotStartedMedia.mediaType,
    urlOrStoragePath: firstNotStartedMedia.urlOrStoragePath,
    thumbnailUrlOrPath: firstNotStartedMedia.thumbnailUrlOrPath,
    provider: firstNotStartedMedia.provider,
    creatorCredit: firstNotStartedMedia.creatorCredit,
    sortOrder: firstNotStartedMedia.sortOrder,
  },
  activeExecution: null,
  hasTerminalHistory: false,
};

export const workoutExecutionDemoFixtures = {
  notStarted: workoutExecutionDemoNotStarted,
  inProgress: workoutExecutionDemoInProgress,
  paused: workoutExecutionDemoPaused,
  completed: workoutExecutionDemoCompleted,
  supersetExecutionId: workoutExecutionDemoInProgress.execution.id,
  approvedMediaExerciseId: workoutExecutionDemoInProgress.sections[0]?.exercises.find((exercise) => exercise.media.length > 0)?.exercise.id ?? null,
  fallbackExerciseId: workoutExecutionDemoInProgress.sections[0]?.exercises.find((exercise) => exercise.media.length === 0)?.exercise.id ?? null,
} as const;
