import "server-only";

import {
  assessmentDemoFixtures,
  assessmentDemoMeasurements,
} from "@/data/demo/assessments";
import { workoutExecutionDemoCompleted } from "@/data/demo/workout-executions";
import { demoWorkspaceFixture } from "@/lib/demo/fixture";
import { isDemoWorkspaceRequest } from "@/lib/demo/workspace";
import type { AssessmentSummary, StudentPrivateMediaMetadata } from "@/lib/domain/assessments";
import {
  buildMeasurementSeries,
  type ProgressAssessmentItem,
  type ProgressExerciseSeries,
  type ProgressPhoto,
  type ProgressWorkoutItem,
  type ProgressWorkspace,
} from "@/lib/domain/progress";
import type { ManagedStudent, RelationshipState } from "@/lib/domain/students";
import type { StudentWorkoutHistoryItem, TrainerWorkoutExecutionSummary, WorkoutExecutionSnapshot } from "@/lib/domain/workout-executions";
import { SupabaseAssessmentRepository } from "@/lib/supabase/assessments";
import { SupabaseWorkoutExecutionRepository } from "@/lib/supabase/workout-executions";
import { createClient } from "@/lib/supabase/server";
import { WorkoutExecutionService } from "@/lib/workouts/execution-service";

type RelationshipContext = NonNullable<ProgressWorkspace["relationship"]>;

type RelationshipRow = {
  id: string;
  status: RelationshipState;
  trainer_profile_id: string;
  started_at: string;
};

function assessmentDate(assessment: AssessmentSummary): string {
  return assessment.completedAt ?? assessment.answeredAt ?? assessment.sentAt ?? assessment.createdAt;
}

function projectAssessments(assessments: AssessmentSummary[], relationshipId: string): ProgressAssessmentItem[] {
  return assessments
    .filter((assessment) => assessment.trainerStudentRelationshipId === relationshipId)
    .map((assessment) => ({
      id: assessment.id,
      title: assessment.title,
      status: assessment.status,
      happenedAt: assessmentDate(assessment),
    }))
    .toSorted((left, right) => Date.parse(right.happenedAt) - Date.parse(left.happenedAt));
}

function projectStudentWorkouts(history: StudentWorkoutHistoryItem[]): ProgressWorkoutItem[] {
  return history.map((item) => ({
    id: item.id,
    status: item.status,
    planName: item.planName,
    sessionName: item.sessionName,
    happenedAt: item.completedAt ?? item.abandonedAt ?? item.startedAt,
    activeDurationSeconds: item.activeDurationSeconds,
    difficulty: item.difficulty,
    completedSets: null,
    skippedSets: null,
  }));
}

function projectTrainerWorkouts(history: TrainerWorkoutExecutionSummary[]): ProgressWorkoutItem[] {
  return history.flatMap((item) => {
    if (item.status !== "COMPLETED" && item.status !== "ABANDONED") return [];
    return [{
      id: item.id,
      status: item.status,
      planName: item.planName,
      sessionName: item.sessionName,
      happenedAt: item.completedAt ?? item.abandonedAt ?? item.startedAt,
      activeDurationSeconds: null,
      difficulty: item.difficulty,
      completedSets: item.completedSets,
      skippedSets: item.skippedSets,
    }];
  });
}

function projectExerciseProgress(snapshots: Array<WorkoutExecutionSnapshot | null>): ProgressExerciseSeries[] {
  const groups = new Map<string, Array<{ exerciseId: string; exerciseName: string; value: number; unit: string; happenedAt: string }>>();

  for (const snapshot of snapshots) {
    if (!snapshot || snapshot.execution.status !== "COMPLETED" || !snapshot.execution.completedAt) continue;
    for (const exercise of snapshot.sections.flatMap((section) => section.exercises)) {
      const completedLoads = exercise.sets.flatMap((set) => {
        const execution = set.execution;
        return execution.status === "COMPLETED" && execution.actualLoad !== null && execution.loadUnit
          ? [{ value: execution.actualLoad, unit: execution.loadUnit }]
          : [];
      });
      for (const unit of new Set(completedLoads.map((item) => item.unit))) {
        const values = completedLoads.filter((item) => item.unit === unit).map((item) => item.value);
        if (!values.length) continue;
        const key = `${exercise.exercise.id}:${unit}`;
        const record = {
          exerciseId: exercise.exercise.id,
          exerciseName: exercise.exercise.name,
          value: Math.max(...values),
          unit,
          happenedAt: snapshot.execution.completedAt,
        };
        const group = groups.get(key);
        if (group) group.push(record);
        else groups.set(key, [record]);
      }
    }
  }

  return [...groups.values()].flatMap((records) => {
    const ordered = records.toSorted((left, right) => Date.parse(left.happenedAt) - Date.parse(right.happenedAt));
    const first = ordered[0];
    const latest = ordered.at(-1);
    if (!first || !latest || ordered.length < 2) return [];
    return [{
      exerciseId: first.exerciseId,
      exerciseName: first.exerciseName,
      metric: "load" as const,
      unit: first.unit,
      first: { value: first.value, happenedAt: first.happenedAt },
      latest: { value: latest.value, happenedAt: latest.happenedAt },
      delta: latest.value - first.value,
      recordCount: ordered.length,
    }];
  }).toSorted((left, right) => Math.abs(right.delta) - Math.abs(left.delta));
}

async function authorizePhotos(
  repository: SupabaseAssessmentRepository,
  metadata: StudentPrivateMediaMetadata[],
): Promise<ProgressPhoto[]> {
  return Promise.all(metadata.map(async (media) => {
    try {
      return { ...media, signedUrl: await repository.createPrivateMediaSignedUrl(media.storagePath) };
    } catch {
      return { ...media, signedUrl: null };
    }
  }));
}

function demoRelationship(student: ManagedStudent): RelationshipContext {
  return {
    id: student.id,
    status: student.status,
    studentName: student.name,
    trainerName: demoWorkspaceFixture.identity.name,
    trainerImageUrl: demoWorkspaceFixture.profile.profile_image_url,
    trainerCredential: demoWorkspaceFixture.profile.cref,
  };
}

function demoWorkoutHistory(relationshipId: string): ProgressWorkoutItem[] {
  if (workoutExecutionDemoCompleted.execution.trainerStudentRelationshipId !== relationshipId) return [];
  const dates = ["2026-07-30", "2026-08-02", "2026-08-06", "2026-08-09", "2026-08-13", "2026-08-17", "2026-08-20", "2026-08-23"];
  return dates.toReversed().map((date, index) => ({
    id: `5b600000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    status: "COMPLETED" as const,
    planName: workoutExecutionDemoCompleted.plan.name,
    sessionName: index % 2 === 0 ? "Inferiores" : "Superiores",
    happenedAt: `${date}T12:52:00.000Z`,
    activeDurationSeconds: 2_700 + (index % 3) * 300,
    difficulty: index % 3 === 0 ? "CHALLENGING" as const : "GOOD" as const,
    completedSets: 8,
    skippedSets: 0,
  }));
}

function demoExerciseProgress(): ProgressExerciseSeries[] {
  const earlier = structuredClone(workoutExecutionDemoCompleted);
  earlier.execution.id = "5b500000-0000-4000-8000-000000000010";
  earlier.execution.completedAt = "2026-07-30T12:52:00.000Z";
  for (const set of earlier.sections.flatMap((section) => section.exercises).flatMap((exercise) => exercise.sets)) {
    if (set.execution.actualLoad !== null) set.execution.actualLoad = Math.max(0, set.execution.actualLoad - 12);
  }
  return projectExerciseProgress([earlier, workoutExecutionDemoCompleted]);
}

function demoPhotos(relationshipId: string): ProgressPhoto[] {
  return [{
    id: "5b700000-0000-4000-8000-000000000001",
    studentProfileId: "75100000-0000-4000-8000-000000000001",
    trainerStudentRelationshipId: relationshipId,
    sourceAssessmentId: null,
    storagePath: "demo-only/progress/front-comparison.jpg",
    mediaType: "PROGRESS_PHOTO",
    viewType: "FRONT",
    mimeType: "image/jpeg",
    fileSize: 384_000,
    consentVersion: "demo-simulation-v1",
    consentedAt: "2026-08-23T12:00:00.000Z",
    createdAt: "2026-08-23T12:00:00.000Z",
    signedUrl: "/images/resultado-ia-feminino-v1.jpg",
    demoSimulation: true,
  }];
}

type ProgressDemoVariant = "rich" | "sparse" | "no-photos";

function demoWorkspace(student: ManagedStudent, viewer: ProgressWorkspace["viewer"], variant: ProgressDemoVariant = "rich"): ProgressWorkspace {
  const relationship = demoRelationship(student);
  const sparse = variant === "sparse";
  return {
    viewer,
    demoMode: true,
    relationship,
    measurements: sparse ? [] : buildMeasurementSeries(assessmentDemoMeasurements.filter((item) => item.trainerStudentRelationshipId === student.id)),
    workouts: sparse ? [] : demoWorkoutHistory(student.id),
    exerciseProgress: sparse ? [] : demoExerciseProgress(),
    assessments: sparse ? [] : projectAssessments(assessmentDemoFixtures, student.id),
    photos: sparse || variant === "no-photos" ? [] : demoPhotos(student.id),
    photoUploadAvailable: false,
  };
}

async function resolveStudentRelationship(): Promise<RelationshipContext | null> {
  const supabase = await createClient();
  const [{ data: appUser }, { data: student, error: studentError }] = await Promise.all([
    supabase.from("app_users").select("display_name").maybeSingle(),
    supabase.from("student_profiles").select("id,preferred_name").maybeSingle(),
  ]);
  if (studentError) throw new Error("Unable to load the student profile.");
  if (!student?.id) return null;

  const { data: relationshipRows, error: relationshipError } = await supabase
    .from("trainer_student_relationships")
    .select("id,status,trainer_profile_id,started_at")
    .eq("student_profile_id", student.id)
    .order("started_at", { ascending: false });
  if (relationshipError) throw new Error("Unable to load the student relationship.");
  const relationships = (relationshipRows ?? []) as RelationshipRow[];
  const relationship = relationships.find((item) => item.status === "active") ?? relationships[0];
  if (!relationship) return null;

  const { data: trainer } = await supabase
    .from("trainer_profiles")
    .select("display_name,profile_image_url,cref")
    .eq("id", relationship.trainer_profile_id)
    .maybeSingle();

  return {
    id: relationship.id,
    status: relationship.status,
    studentName: (student.preferred_name as string | null) || (appUser?.display_name as string | null) || "Aluno",
    trainerName: (trainer?.display_name as string | null) || "Seu Personal",
    trainerImageUrl: (trainer?.profile_image_url as string | null) || null,
    trainerCredential: (trainer?.cref as string | null) || null,
  };
}

export async function getStudentProgressWorkspace(demoVariant: ProgressDemoVariant = "rich"): Promise<ProgressWorkspace> {
  if (await isDemoWorkspaceRequest()) {
    const student = demoWorkspaceFixture.students.students.find((item) => item.id === "75000000-0000-4000-8000-000000000001");
    if (!student) throw new Error("Demo student is missing.");
    return demoWorkspace(student, "student", demoVariant);
  }

  const relationship = await resolveStudentRelationship();
  if (!relationship) return {
    viewer: "student",
    demoMode: false,
    relationship: null,
    measurements: [],
    workouts: [],
    exerciseProgress: [],
    assessments: [],
    photos: [],
    photoUploadAvailable: false,
  };

  const assessments = new SupabaseAssessmentRepository();
  const executions = new WorkoutExecutionService(new SupabaseWorkoutExecutionRepository());
  const [measurementRows, mediaRows, assessmentRows, workoutRows] = await Promise.all([
    assessments.listMeasurements(relationship.id),
    assessments.listPrivateMediaMetadata(relationship.id),
    assessments.listMine(),
    executions.listStudentHistory(50),
  ]);

  const executionSnapshots = await Promise.all(workoutRows.slice(0, 20).map((item) => executions.getStudentExecution(item.id).catch(() => null)));
  return {
    viewer: "student",
    demoMode: false,
    relationship,
    measurements: buildMeasurementSeries(measurementRows),
    workouts: projectStudentWorkouts(workoutRows),
    exerciseProgress: projectExerciseProgress(executionSnapshots),
    assessments: projectAssessments(assessmentRows, relationship.id),
    photos: await authorizePhotos(assessments, mediaRows),
    photoUploadAvailable: relationship.status === "active",
  };
}

export async function getTrainerProgressWorkspace(student: ManagedStudent): Promise<ProgressWorkspace> {
  if (await isDemoWorkspaceRequest()) return demoWorkspace(student, "trainer");

  const assessments = new SupabaseAssessmentRepository();
  const executions = new WorkoutExecutionService(new SupabaseWorkoutExecutionRepository());
  const [measurementRows, mediaRows, assessmentRows, workoutRows] = await Promise.all([
    assessments.listMeasurements(student.id),
    assessments.listPrivateMediaMetadata(student.id),
    assessments.listMine(),
    executions.listTrainerExecutions(student.id, 50),
  ]);

  const terminalRows = workoutRows.filter((item) => item.status === "COMPLETED").slice(0, 20);
  const executionSnapshots = await Promise.all(terminalRows.map((item) => executions.getTrainerExecution(item.id).catch(() => null)));
  return {
    viewer: "trainer",
    demoMode: false,
    relationship: {
      id: student.id,
      status: student.status,
      studentName: student.name,
      trainerName: "Personal",
      trainerImageUrl: null,
      trainerCredential: null,
    },
    measurements: buildMeasurementSeries(measurementRows),
    workouts: projectTrainerWorkouts(workoutRows),
    exerciseProgress: projectExerciseProgress(executionSnapshots),
    assessments: projectAssessments(assessmentRows, student.id),
    photos: await authorizePhotos(assessments, mediaRows),
    photoUploadAvailable: false,
  };
}
