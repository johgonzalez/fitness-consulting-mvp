import type {
  AssessmentDetail,
  AssessmentEvent,
  AssessmentSummary,
  AssessmentTemplateSummary,
  CreateAssessmentInput,
  SaveAssessmentAnswerInput,
  StudentMeasurement,
  StudentPrivateMediaMetadata,
  UpdateDraftAssessmentInput,
} from "@/lib/domain/assessments";

export interface AssessmentRepository {
  listMine(): Promise<AssessmentSummary[]>;
  getMine(assessmentId: string): Promise<AssessmentDetail>;
  createFromTemplate(input: CreateAssessmentInput): Promise<string>;
  updateDraftMetadata(input: UpdateDraftAssessmentInput): Promise<void>;
  send(assessmentId: string): Promise<void>;
  saveAnswer(input: SaveAssessmentAnswerInput): Promise<string>;
  submit(assessmentId: string): Promise<void>;
  startReview(assessmentId: string): Promise<void>;
  complete(assessmentId: string, trainerFeedback: string): Promise<void>;
  listEvents(assessmentId: string): Promise<AssessmentEvent[]>;
}

export interface AssessmentTemplateRepository {
  listAvailable(): Promise<AssessmentTemplateSummary[]>;
}

export interface StudentProgressRepository {
  listMeasurements(relationshipId: string): Promise<StudentMeasurement[]>;
  listPrivateMediaMetadata(relationshipId: string): Promise<StudentPrivateMediaMetadata[]>;
}
