import "server-only";

import type {
  AssessmentRepository,
  AssessmentTemplateRepository,
  StudentProgressRepository,
} from "@/lib/domain/assessment-repository";
import type {
  AssessmentAnswerValue,
  AssessmentDetail,
  AssessmentEvent,
  AssessmentSummary,
  AssessmentTemplateSummary,
  AssessmentTemplateVersionSummary,
  CreateAssessmentInput,
  SaveAssessmentAnswerInput,
  StudentMeasurement,
  StudentPrivateMediaMetadata,
  UpdateDraftAssessmentInput,
} from "@/lib/domain/assessments";
import { createClient } from "@/lib/supabase/server";
import {
  parseAssessmentStatus,
  parseAssessmentTemplateSchema,
  parseAssessmentType,
  serializeAnswerValue,
} from "@/lib/validation/assessments";

type SummaryRpc = {
  id: string;
  trainer_student_relationship_id: string;
  template_version_id: string;
  status: unknown;
  title: string;
  is_required: boolean;
  due_at: string | null;
  sent_at: string | null;
  answered_at: string | null;
  review_started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

type DetailRpc = SummaryRpc & {
  trainer_feedback: string | null;
  template_schema: unknown;
  answers: Array<{
    id: string;
    question_key: string;
    value: unknown;
    created_at: string;
    updated_at: string;
  }>;
};

type TemplateVersionRow = {
  id: string;
  template_id: string;
  version_number: number;
  schema: unknown;
  created_at: string;
};

type TemplateRow = {
  id: string;
  system_key: string | null;
  owner_trainer_id: string | null;
  assessment_type: unknown;
  name: string;
  description: string;
  locale: string;
  status: "ACTIVE" | "ARCHIVED";
  default_required: boolean;
  assessment_template_versions: TemplateVersionRow[] | null;
};

function mapSummary(row: SummaryRpc): AssessmentSummary {
  return {
    id: row.id,
    trainerStudentRelationshipId: row.trainer_student_relationship_id,
    templateVersionId: row.template_version_id,
    status: parseAssessmentStatus(row.status),
    title: row.title,
    isRequired: row.is_required,
    dueAt: row.due_at,
    sentAt: row.sent_at,
    answeredAt: row.answered_at,
    reviewStartedAt: row.review_started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAnswerValue(value: unknown): AssessmentAnswerValue {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value) && value.every((entry) => typeof entry === "string")) return value;
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    if (typeof record.value === "number" && typeof record.unit_code === "string" && typeof record.measured_at === "string") {
      return { value: record.value, unitCode: record.unit_code, measuredAt: record.measured_at };
    }
    if (record.skipped === true) return { skipped: true };
    if (typeof record.media_id === "string") return { mediaId: record.media_id };
  }
  throw new Error("Assessment answer payload is invalid.");
}

function mapVersion(row: TemplateVersionRow): AssessmentTemplateVersionSummary {
  return {
    id: row.id,
    templateId: row.template_id,
    versionNumber: row.version_number,
    schema: parseAssessmentTemplateSchema(row.schema),
    createdAt: row.created_at,
  };
}

async function requireAuthenticatedClient() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Authentication required.");
  return supabase;
}

export class SupabaseAssessmentRepository
implements AssessmentRepository, AssessmentTemplateRepository, StudentProgressRepository {
  async listMine(): Promise<AssessmentSummary[]> {
    const supabase = await requireAuthenticatedClient();
    const { data, error } = await supabase.rpc("list_my_assessments");
    if (error || !Array.isArray(data)) throw new Error("Unable to load assessments.");
    return (data as SummaryRpc[]).map(mapSummary);
  }

  async getMine(assessmentId: string): Promise<AssessmentDetail> {
    const supabase = await requireAuthenticatedClient();
    const { data, error } = await supabase.rpc("get_my_assessment", { p_assessment_id: assessmentId });
    if (error || !data || typeof data !== "object") throw new Error("Unable to load the assessment.");
    const row = data as DetailRpc;
    return {
      ...mapSummary(row),
      trainerFeedback: row.trainer_feedback,
      templateSchema: parseAssessmentTemplateSchema(row.template_schema),
      answers: row.answers.map((answer) => ({
        id: answer.id,
        questionKey: answer.question_key,
        value: mapAnswerValue(answer.value),
        createdAt: answer.created_at,
        updatedAt: answer.updated_at,
      })),
    };
  }

  async createFromTemplate(input: CreateAssessmentInput): Promise<string> {
    const supabase = await requireAuthenticatedClient();
    const { data, error } = await supabase.rpc("create_assessment_from_template", {
      p_relationship_id: input.relationshipId,
      p_template_version_id: input.templateVersionId,
      p_title: input.title ?? null,
      p_is_required: input.isRequired ?? null,
      p_due_at: input.dueAt ?? null,
    });
    if (error || typeof data !== "string") throw new Error("Unable to create the assessment.");
    return data;
  }

  async updateDraftMetadata(input: UpdateDraftAssessmentInput): Promise<void> {
    const supabase = await requireAuthenticatedClient();
    const { error } = await supabase.rpc("update_draft_assessment", {
      p_assessment_id: input.assessmentId,
      p_title: input.title,
      p_is_required: input.isRequired,
      p_due_at: input.dueAt,
    });
    if (error) throw new Error(error.message);
  }

  async send(assessmentId: string): Promise<void> {
    const supabase = await requireAuthenticatedClient();
    const { error } = await supabase.rpc("send_assessment", { p_assessment_id: assessmentId });
    if (error) throw new Error("Unable to send the assessment.");
  }

  async saveAnswer(input: SaveAssessmentAnswerInput): Promise<string> {
    const supabase = await requireAuthenticatedClient();
    const { data, error } = await supabase.rpc("save_assessment_answer", {
      p_assessment_id: input.assessmentId,
      p_question_key: input.questionKey,
      p_value: serializeAnswerValue(input.value),
    });
    if (error || typeof data !== "string") throw new Error("Unable to save the assessment answer.");
    return data;
  }

  async submit(assessmentId: string): Promise<void> {
    const supabase = await requireAuthenticatedClient();
    const { error } = await supabase.rpc("submit_assessment", { p_assessment_id: assessmentId });
    if (error) throw new Error("Unable to submit the assessment.");
  }

  async startReview(assessmentId: string): Promise<void> {
    const supabase = await requireAuthenticatedClient();
    const { error } = await supabase.rpc("start_assessment_review", { p_assessment_id: assessmentId });
    if (error) throw new Error("Unable to start the assessment review.");
  }

  async complete(assessmentId: string, trainerFeedback: string): Promise<void> {
    const supabase = await requireAuthenticatedClient();
    const { error } = await supabase.rpc("complete_assessment", {
      p_assessment_id: assessmentId,
      p_trainer_feedback: trainerFeedback,
    });
    if (error) throw new Error("Unable to complete the assessment.");
  }

  async listEvents(assessmentId: string): Promise<AssessmentEvent[]> {
    const supabase = await requireAuthenticatedClient();
    const { data, error } = await supabase
      .from("assessment_events")
      .select("id,assessment_id,event_type,actor_user_id,metadata,created_at")
      .eq("assessment_id", assessmentId)
      .order("created_at", { ascending: false });
    if (error) throw new Error("Unable to load assessment history.");
    return (data ?? []).map((row) => ({
      id: row.id as string,
      assessmentId: row.assessment_id as string,
      eventType: row.event_type as AssessmentEvent["eventType"],
      actorUserId: row.actor_user_id as string,
      metadata: (row.metadata ?? {}) as Record<string, unknown>,
      createdAt: row.created_at as string,
    }));
  }

  async listAvailable(): Promise<AssessmentTemplateSummary[]> {
    const supabase = await requireAuthenticatedClient();
    const { data, error } = await supabase
      .from("assessment_templates")
      .select("id,system_key,owner_trainer_id,assessment_type,name,description,locale,status,default_required,assessment_template_versions(id,template_id,version_number,schema,created_at)")
      .order("name");
    if (error) throw new Error("Unable to load assessment templates.");
    return ((data ?? []) as TemplateRow[]).map((row) => ({
      id: row.id,
      systemKey: row.system_key,
      ownerTrainerId: row.owner_trainer_id,
      assessmentType: parseAssessmentType(row.assessment_type),
      name: row.name,
      description: row.description,
      locale: row.locale,
      status: row.status,
      defaultRequired: row.default_required,
      versions: (row.assessment_template_versions ?? []).map(mapVersion),
    }));
  }

  async listMeasurements(relationshipId: string): Promise<StudentMeasurement[]> {
    const supabase = await requireAuthenticatedClient();
    const { data, error } = await supabase
      .from("student_measurements")
      .select("id,student_profile_id,trainer_student_relationship_id,source_assessment_id,measurement_code,value,unit_code,measured_at,created_at")
      .eq("trainer_student_relationship_id", relationshipId)
      .order("measured_at", { ascending: false });
    if (error) throw new Error("Unable to load student measurements.");
    return (data ?? []).map((row) => ({
      id: row.id as string,
      studentProfileId: row.student_profile_id as string,
      trainerStudentRelationshipId: row.trainer_student_relationship_id as string,
      sourceAssessmentId: row.source_assessment_id as string | null,
      measurementCode: row.measurement_code as string,
      value: Number(row.value),
      unitCode: row.unit_code as string,
      measuredAt: row.measured_at as string,
      createdAt: row.created_at as string,
    }));
  }

  async listPrivateMediaMetadata(relationshipId: string): Promise<StudentPrivateMediaMetadata[]> {
    const supabase = await requireAuthenticatedClient();
    const { data, error } = await supabase
      .from("student_private_media")
      .select("id,student_profile_id,trainer_student_relationship_id,source_assessment_id,storage_path,media_type,view_type,mime_type,file_size,consent_version,consented_at,created_at")
      .eq("trainer_student_relationship_id", relationshipId)
      .order("created_at", { ascending: false });
    if (error) throw new Error("Unable to load private media metadata.");
    return (data ?? []).map((row) => ({
      id: row.id as string,
      studentProfileId: row.student_profile_id as string,
      trainerStudentRelationshipId: row.trainer_student_relationship_id as string,
      sourceAssessmentId: row.source_assessment_id as string | null,
      storagePath: row.storage_path as string,
      mediaType: row.media_type as StudentPrivateMediaMetadata["mediaType"],
      viewType: row.view_type as StudentPrivateMediaMetadata["viewType"],
      mimeType: row.mime_type as StudentPrivateMediaMetadata["mimeType"],
      fileSize: Number(row.file_size),
      consentVersion: row.consent_version as string,
      consentedAt: row.consented_at as string,
      createdAt: row.created_at as string,
    }));
  }
}
