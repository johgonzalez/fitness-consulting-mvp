import "server-only";

import {
  assessmentDemoDetails,
  assessmentDemoMeasurements,
} from "@/data/demo/assessments";
import {
  workoutDemoExerciseLibrary,
  workoutDemoVersions,
} from "@/data/demo/workouts";
import { getTrainerAssessmentIndex } from "@/lib/assessments/workspace";
import { isDemoWorkspaceRequest } from "@/lib/demo/workspace";
import type { AssessmentDetail, AssessmentSummary, StudentMeasurement } from "@/lib/domain/assessments";
import type { ManagedStudent } from "@/lib/domain/students";
import type {
  Exercise,
  WorkoutPlanSummary,
  WorkoutVersionProjection,
} from "@/lib/domain/workouts";
import { SupabaseAssessmentRepository } from "@/lib/supabase/assessments";
import { getStudentsWorkspace } from "@/lib/supabase/students";
import { SupabaseWorkoutRepository } from "@/lib/supabase/workouts";

export type WorkoutStudentContext = {
  student: ManagedStudent;
  goal: string | null;
  experienceLevel: string | null;
  availableTrainingDays: number | null;
  availableEquipment: string[];
  latestCompletedAssessment: {
    id: string;
    title: string;
    completedAt: string;
    updatedAt: string;
  } | null;
  relevantContext: Array<{ label: string; value: string }>;
  measurements: StudentMeasurement[];
};

export type WorkoutIndexItem = {
  plan: WorkoutVersionProjection["plan"];
  currentVersion: WorkoutVersionProjection["version"];
  sessionCount: number;
  totalDurationMinutes: number;
  student: ManagedStudent | null;
};

export type TrainerWorkoutRecord = {
  projection: WorkoutVersionProjection;
  planSummary: WorkoutPlanSummary;
  studentContext: WorkoutStudentContext | null;
  exerciseLibrary: Exercise[];
  demoMode: boolean;
};

function answerFor(detail: AssessmentDetail | null, key: string) {
  return detail?.answers.find((answer) => answer.questionKey === key)?.value;
}

function textAnswer(detail: AssessmentDetail | null, key: string) {
  const value = answerFor(detail, key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberAnswer(detail: AssessmentDetail | null, key: string) {
  const value = answerFor(detail, key);
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function listAnswer(detail: AssessmentDetail | null, key: string) {
  const value = answerFor(detail, key);
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : [];
}

const experienceLabels: Record<string, string> = {
  beginner: "Iniciante",
  intermediate: "Intermediária",
  advanced: "Avançada",
};

const equipmentLabels: Record<string, string> = {
  gym: "Academia",
  home_equipment: "Equipamentos em casa",
  home_no_equipment: "Peso corporal",
  outdoor: "Ao ar livre",
};

function latestCompletedForStudent(items: Array<{ assessment: AssessmentSummary }>, relationshipId: string) {
  return items
    .map((item) => item.assessment)
    .filter((assessment) => assessment.trainerStudentRelationshipId === relationshipId && assessment.status === "COMPLETED")
    .toSorted((left, right) => Date.parse(right.completedAt ?? right.updatedAt) - Date.parse(left.completedAt ?? left.updatedAt))[0] ?? null;
}

function contextFromData(
  student: ManagedStudent,
  summary: AssessmentSummary | null,
  detail: AssessmentDetail | null,
  measurements: StudentMeasurement[],
): WorkoutStudentContext {
  const rawExperience = textAnswer(detail, "training_experience");
  const rawEquipment = listAnswer(detail, "training_context");
  const relevantContext: Array<{ label: string; value: string }> = [];
  const routine = textAnswer(detail, "routine_availability");
  const limitations = textAnswer(detail, "reported_limitations");
  if (routine) relevantContext.push({ label: "Rotina informada", value: routine });
  if (limitations) relevantContext.push({ label: "Observação informada pelo aluno", value: limitations });

  return {
    student,
    goal: textAnswer(detail, "primary_goal"),
    experienceLevel: rawExperience ? experienceLabels[rawExperience] ?? rawExperience : null,
    availableTrainingDays: numberAnswer(detail, "weekly_availability"),
    availableEquipment: rawEquipment.map((item) => equipmentLabels[item] ?? item),
    latestCompletedAssessment: summary && summary.completedAt ? {
      id: summary.id,
      title: summary.title,
      completedAt: summary.completedAt,
      updatedAt: summary.updatedAt,
    } : null,
    relevantContext,
    measurements: measurements.toSorted((left, right) => Date.parse(right.measuredAt) - Date.parse(left.measuredAt)).slice(0, 3),
  };
}

export async function getWorkoutStudentContexts(): Promise<{ contexts: WorkoutStudentContext[]; demoMode: boolean }> {
  const [assessmentIndex, demoMode] = await Promise.all([getTrainerAssessmentIndex(), isDemoWorkspaceRequest()]);
  const students = assessmentIndex.students.filter((student) => student.status === "active");
  const repository = demoMode ? null : new SupabaseAssessmentRepository();
  const contexts = await Promise.all(students.map(async (student) => {
    const summary = latestCompletedForStudent(assessmentIndex.items, student.id);
    if (!summary) return contextFromData(student, null, null, []);
    if (demoMode) {
      return contextFromData(
        student,
        summary,
        assessmentDemoDetails.find((item) => item.id === summary.id) ?? null,
        assessmentDemoMeasurements.filter((item) => item.trainerStudentRelationshipId === student.id),
      );
    }
    try {
      const [detail, measurements] = await Promise.all([
        repository!.getMine(summary.id),
        repository!.listMeasurements(student.id),
      ]);
      return contextFromData(student, summary, detail, measurements);
    } catch {
      return contextFromData(student, summary, null, []);
    }
  }));
  return { contexts, demoMode };
}

function demoPlanSummaries(): WorkoutPlanSummary[] {
  const byPlan = new Map<string, WorkoutVersionProjection[]>();
  for (const projection of workoutDemoVersions) {
    byPlan.set(projection.plan.id, [...(byPlan.get(projection.plan.id) ?? []), projection]);
  }
  return [...byPlan.values()].map((versions) => ({
    ...versions[0].plan,
    versions: versions
      .map(({ version }) => ({
        id: version.id,
        versionNumber: version.versionNumber,
        status: version.status,
        sourceType: version.sourceType ?? "MANUAL",
        sourceAssessmentId: version.sourceAssessmentId ?? null,
        approvedAt: version.approvedAt,
        publishedAt: version.publishedAt,
        archivedAt: version.archivedAt,
        createdAt: version.createdAt,
      }))
      .toSorted((left, right) => right.versionNumber - left.versionNumber),
  }));
}

export async function getWorkoutIndex(): Promise<{ items: WorkoutIndexItem[]; demoMode: boolean }> {
  const demoMode = await isDemoWorkspaceRequest();
  const studentsPromise = getStudentsWorkspace();
  if (demoMode) {
    const students = (await studentsPromise).students;
    const items = demoPlanSummaries().map((planSummary) => {
      const current = planSummary.versions.find((version) => version.status !== "ARCHIVED") ?? planSummary.versions[0];
      const projection = workoutDemoVersions.find((item) => item.version.id === current.id)!;
      return {
        plan: projection.plan,
        currentVersion: projection.version,
        sessionCount: projection.sessions.length,
        totalDurationMinutes: projection.sessions.reduce((sum, session) => sum + (session.estimatedDurationMinutes ?? 0), 0),
        student: students.find((student) => student.id === projection.plan.trainerStudentRelationshipId) ?? null,
      };
    });
    return { items, demoMode };
  }

  const repository = new SupabaseWorkoutRepository();
  const [plans, students] = await Promise.all([repository.listTrainerPlans(), studentsPromise]);
  const projections = await Promise.all(plans.map(async (planSummary) => {
    const ordered = planSummary.versions.toSorted((left, right) => right.versionNumber - left.versionNumber);
    const current = ordered.find((version) => version.status !== "ARCHIVED") ?? ordered[0];
    return current ? repository.getTrainerVersion(current.id) : null;
  }));
  return {
    items: projections.flatMap((projection) => projection ? [{
      plan: projection.plan,
      currentVersion: projection.version,
      sessionCount: projection.sessions.length,
      totalDurationMinutes: projection.sessions.reduce((sum, session) => sum + (session.estimatedDurationMinutes ?? 0), 0),
      student: students.students.find((student) => student.id === projection.plan.trainerStudentRelationshipId) ?? null,
    }] : []),
    demoMode,
  };
}

export async function getWorkoutRecord(versionId: string): Promise<TrainerWorkoutRecord | null> {
  const demoMode = await isDemoWorkspaceRequest();
  const { contexts } = await getWorkoutStudentContexts();
  if (demoMode) {
    const projection = workoutDemoVersions.find((item) => item.version.id === versionId);
    if (!projection) return null;
    const planSummary = demoPlanSummaries().find((item) => item.id === projection.plan.id)!;
    return {
      projection,
      planSummary,
      studentContext: contexts.find((context) => context.student.id === projection.plan.trainerStudentRelationshipId) ?? null,
      exerciseLibrary: workoutDemoExerciseLibrary,
      demoMode,
    };
  }

  const repository = new SupabaseWorkoutRepository();
  try {
    const [projection, plans, exerciseLibrary] = await Promise.all([
      repository.getTrainerVersion(versionId),
      repository.listTrainerPlans(),
      repository.search(null, 100),
    ]);
    const planSummary = plans.find((item) => item.id === projection.plan.id);
    if (!planSummary) return null;
    return {
      projection,
      planSummary,
      studentContext: contexts.find((context) => context.student.id === projection.plan.trainerStudentRelationshipId) ?? null,
      exerciseLibrary,
      demoMode,
    };
  } catch {
    return null;
  }
}

export async function getWorkoutCreationWorkspace() {
  const [{ contexts, demoMode }, exerciseLibrary] = await Promise.all([
    getWorkoutStudentContexts(),
    isDemoWorkspaceRequest().then((isDemo) => isDemo ? workoutDemoExerciseLibrary : new SupabaseWorkoutRepository().search(null, 100)),
  ]);
  return { contexts, exerciseLibrary, demoMode };
}
