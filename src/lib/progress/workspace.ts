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
  type ProgressPhoto,
  type ProgressWorkoutItem,
  type ProgressWorkspace,
} from "@/lib/domain/progress";
import type { ManagedStudent, RelationshipState } from "@/lib/domain/students";
import type { StudentWorkoutHistoryItem, TrainerWorkoutExecutionSummary } from "@/lib/domain/workout-executions";
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
  return projectStudentWorkouts([{
    id: workoutExecutionDemoCompleted.execution.id,
    status: "COMPLETED",
    startedAt: workoutExecutionDemoCompleted.execution.startedAt,
    completedAt: workoutExecutionDemoCompleted.execution.completedAt,
    abandonedAt: null,
    difficulty: workoutExecutionDemoCompleted.execution.difficulty,
    planName: workoutExecutionDemoCompleted.plan.name,
    sessionName: workoutExecutionDemoCompleted.session.name,
    activeDurationSeconds: workoutExecutionDemoCompleted.metrics.activeDurationSeconds,
  }]);
}

function demoWorkspace(student: ManagedStudent, viewer: ProgressWorkspace["viewer"]): ProgressWorkspace {
  const relationship = demoRelationship(student);
  return {
    viewer,
    demoMode: true,
    relationship,
    measurements: buildMeasurementSeries(assessmentDemoMeasurements.filter((item) => item.trainerStudentRelationshipId === student.id)),
    workouts: demoWorkoutHistory(student.id),
    assessments: projectAssessments(assessmentDemoFixtures, student.id),
    photos: [],
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

export async function getStudentProgressWorkspace(): Promise<ProgressWorkspace> {
  if (await isDemoWorkspaceRequest()) {
    const student = demoWorkspaceFixture.students.students.find((item) => item.id === "75000000-0000-4000-8000-000000000001");
    if (!student) throw new Error("Demo student is missing.");
    return demoWorkspace(student, "student");
  }

  const relationship = await resolveStudentRelationship();
  if (!relationship) return {
    viewer: "student",
    demoMode: false,
    relationship: null,
    measurements: [],
    workouts: [],
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

  return {
    viewer: "student",
    demoMode: false,
    relationship,
    measurements: buildMeasurementSeries(measurementRows),
    workouts: projectStudentWorkouts(workoutRows),
    assessments: projectAssessments(assessmentRows, relationship.id),
    photos: await authorizePhotos(assessments, mediaRows),
    photoUploadAvailable: false,
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
    assessments: projectAssessments(assessmentRows, student.id),
    photos: await authorizePhotos(assessments, mediaRows),
    photoUploadAvailable: false,
  };
}
