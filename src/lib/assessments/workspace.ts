import "server-only";

import {
  assessmentDemoDetails,
  assessmentDemoMeasurements,
  assessmentDemoTemplates,
} from "@/data/demo/assessments";
import { demoWorkspaceFixture } from "@/lib/demo/fixture";
import { getDemoAssessments, getDemoStudents } from "@/lib/demo/product-workspace";
import { isDemoWorkspaceRequest } from "@/lib/demo/workspace";
import type {
  AssessmentDetail,
  AssessmentEvent,
  AssessmentSummary,
  AssessmentTemplateSummary,
  StudentMeasurement,
} from "@/lib/domain/assessments";
import type { ManagedStudent } from "@/lib/domain/students";
import { SupabaseAssessmentRepository } from "@/lib/supabase/assessments";
import { createClient } from "@/lib/supabase/server";
import { getStudentsWorkspace } from "@/lib/supabase/students";

export type TrainerAssessmentListItem = {
  assessment: AssessmentSummary;
  student: ManagedStudent | null;
  template: AssessmentTemplateSummary | null;
};

export type TrainerAssessmentRecord = {
  assessment: AssessmentDetail;
  student: ManagedStudent | null;
  template: AssessmentTemplateSummary | null;
  measurements: StudentMeasurement[];
  events: AssessmentEvent[];
  demoMode: boolean;
};

export type StudentAssessmentRecord = {
  assessment: AssessmentDetail;
  measurements: StudentMeasurement[];
  trainer: { name: string; imageUrl: string | null; credential: string | null };
  demoMode: boolean;
};

function templateForVersion(templates: AssessmentTemplateSummary[], versionId: string) {
  return templates.find((template) => template.versions.some((version) => version.id === versionId)) ?? null;
}

function studentForRelationship(students: ManagedStudent[], relationshipId: string) {
  return students.find((student) => student.id === relationshipId) ?? null;
}

function demoEvents(assessment: AssessmentDetail): AssessmentEvent[] {
  const events: Array<[AssessmentEvent["eventType"], string | null]> = [
    ["CREATED", assessment.createdAt],
    ["SENT", assessment.sentAt],
    ["SUBMITTED", assessment.answeredAt],
    ["REVIEW_STARTED", assessment.reviewStartedAt],
    ["COMPLETED", assessment.completedAt],
  ];
  return events.filter((event): event is [AssessmentEvent["eventType"], string] => Boolean(event[1])).toReversed().map(([eventType, createdAt], index) => ({
    id: `d3500000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    assessmentId: assessment.id,
    eventType,
    actorUserId: "70000000-0000-4000-8000-000000000001",
    metadata: {},
    createdAt,
  }));
}

export async function getTrainerAssessmentIndex() {
  const demoMode = await isDemoWorkspaceRequest();
  if (demoMode) {
    const demoAssessments = getDemoAssessments();
    const demoStudents = getDemoStudents();
    return {
      items: demoAssessments.map((assessment) => ({
        assessment,
        student: studentForRelationship(demoStudents, assessment.trainerStudentRelationshipId),
        template: templateForVersion(assessmentDemoTemplates, assessment.templateVersionId),
      })),
      templates: assessmentDemoTemplates,
      students: demoStudents.filter((student) => student.status === "active"),
      demoMode,
    };
  }

  const repository = new SupabaseAssessmentRepository();
  const [assessments, templates, studentWorkspace] = await Promise.all([
    repository.listMine(),
    repository.listAvailable(),
    getStudentsWorkspace(),
  ]);
  return {
    items: assessments.map((assessment) => ({
      assessment,
      student: studentForRelationship(studentWorkspace.students, assessment.trainerStudentRelationshipId),
      template: templateForVersion(templates, assessment.templateVersionId),
    })),
    templates,
    students: studentWorkspace.students.filter((student) => student.status === "active"),
    demoMode,
  };
}

export async function getTrainerAssessmentRecord(assessmentId: string): Promise<TrainerAssessmentRecord | null> {
  const demoMode = await isDemoWorkspaceRequest();
  if (demoMode) {
    const assessment = getDemoAssessments().find((item) => item.id === assessmentId);
    if (!assessment) return null;
    return {
      assessment,
      student: studentForRelationship(getDemoStudents(), assessment.trainerStudentRelationshipId),
      template: templateForVersion(assessmentDemoTemplates, assessment.templateVersionId),
      measurements: assessmentDemoMeasurements.filter((measurement) => measurement.sourceAssessmentId === assessment.id),
      events: demoEvents(assessment),
      demoMode,
    };
  }

  const repository = new SupabaseAssessmentRepository();
  try {
    const assessment = await repository.getMine(assessmentId);
    const [templates, studentWorkspace, measurements, events] = await Promise.all([
      repository.listAvailable(),
      getStudentsWorkspace(),
      repository.listMeasurements(assessment.trainerStudentRelationshipId),
      repository.listEvents(assessment.id),
    ]);
    return {
      assessment,
      student: studentForRelationship(studentWorkspace.students, assessment.trainerStudentRelationshipId),
      template: templateForVersion(templates, assessment.templateVersionId),
      measurements: measurements.filter((measurement) => measurement.sourceAssessmentId === assessment.id),
      events,
      demoMode,
    };
  } catch {
    return null;
  }
}

async function findTrainerIdentity(relationshipId: string) {
  try {
    const supabase = await createClient();
    const { data: relationship, error: relationshipError } = await supabase
      .from("trainer_student_relationships")
      .select("trainer_profile_id")
      .eq("id", relationshipId)
      .single();
    if (relationshipError || !relationship?.trainer_profile_id) throw relationshipError;
    const { data: trainer, error: trainerError } = await supabase
      .from("trainer_profiles")
      .select("display_name,profile_image_url,cref")
      .eq("id", relationship.trainer_profile_id)
      .maybeSingle();
    if (trainerError || !trainer) throw trainerError;
    return { name: trainer.display_name as string, imageUrl: trainer.profile_image_url as string | null, credential: trainer.cref as string | null };
  } catch {
    return { name: "Seu Personal", imageUrl: null, credential: null };
  }
}

export async function getStudentAssessmentRecord(assessmentId: string): Promise<StudentAssessmentRecord | null> {
  const demoMode = await isDemoWorkspaceRequest();
  if (demoMode) {
    const assessment = assessmentDemoDetails.find((item) => item.id === assessmentId);
    if (!assessment) return null;
    return {
      assessment,
      measurements: assessmentDemoMeasurements.filter((measurement) => measurement.sourceAssessmentId === assessment.id),
      trainer: {
        name: demoWorkspaceFixture.identity.name,
        imageUrl: demoWorkspaceFixture.profile.profile_image_url,
        credential: demoWorkspaceFixture.profile.cref,
      },
      demoMode,
    };
  }

  const repository = new SupabaseAssessmentRepository();
  try {
    const assessment = await repository.getMine(assessmentId);
    const [trainer, measurements] = await Promise.all([
      findTrainerIdentity(assessment.trainerStudentRelationshipId),
      repository.listMeasurements(assessment.trainerStudentRelationshipId),
    ]);
    return {
      assessment,
      measurements: measurements.filter((measurement) => measurement.sourceAssessmentId === assessment.id),
      trainer,
      demoMode,
    };
  } catch {
    return null;
  }
}
