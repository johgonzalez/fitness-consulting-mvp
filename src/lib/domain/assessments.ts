export const ASSESSMENT_TYPES = ["INITIAL", "MONTHLY_CHECKIN", "REASSESSMENT", "CUSTOM"] as const;
export type AssessmentType = (typeof ASSESSMENT_TYPES)[number];

export const ASSESSMENT_STATUSES = ["DRAFT", "SENT", "ANSWERED", "IN_REVIEW", "COMPLETED"] as const;
export type AssessmentStatus = (typeof ASSESSMENT_STATUSES)[number];

export const QUESTION_TYPES = [
  "SHORT_TEXT",
  "LONG_TEXT",
  "SINGLE_CHOICE",
  "MULTI_CHOICE",
  "NUMBER",
  "BOOLEAN",
  "SCALE",
  "DATE",
  "MEASUREMENT",
  "PHOTO_REQUEST",
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export type LocalizedText = Record<string, string>;

type BaseQuestion<TType extends QuestionType> = {
  key: string;
  type: TType;
  required: boolean;
  label: LocalizedText;
  description?: LocalizedText;
};

export type ChoiceOption = { value: string; label: LocalizedText };
export type ShortTextQuestion = BaseQuestion<"SHORT_TEXT">;
export type LongTextQuestion = BaseQuestion<"LONG_TEXT">;
export type NumberQuestion = BaseQuestion<"NUMBER">;
export type BooleanQuestion = BaseQuestion<"BOOLEAN">;
export type DateQuestion = BaseQuestion<"DATE">;
export type PhotoRequestQuestion = BaseQuestion<"PHOTO_REQUEST">;
export type SingleChoiceQuestion = BaseQuestion<"SINGLE_CHOICE"> & { options: ChoiceOption[] };
export type MultiChoiceQuestion = BaseQuestion<"MULTI_CHOICE"> & { options: ChoiceOption[] };
export type ScaleQuestion = BaseQuestion<"SCALE"> & { scale: { min: number; max: number } };
export type MeasurementQuestion = BaseQuestion<"MEASUREMENT"> & {
  measurement: { code: string; unitCodes: string[] };
};

export type AssessmentQuestion =
  | ShortTextQuestion
  | LongTextQuestion
  | SingleChoiceQuestion
  | MultiChoiceQuestion
  | NumberQuestion
  | BooleanQuestion
  | ScaleQuestion
  | DateQuestion
  | MeasurementQuestion
  | PhotoRequestQuestion;

export type AssessmentTemplateSchema = {
  questions: AssessmentQuestion[];
  metadata?: Record<string, unknown>;
};

export type MeasurementAnswer = {
  value: number;
  unitCode: string;
  measuredAt: string;
};

export type PhotoRequestAnswer =
  | { skipped: true }
  | { mediaId: string };

export type AssessmentAnswerValue =
  | string
  | string[]
  | number
  | boolean
  | MeasurementAnswer
  | PhotoRequestAnswer;

export type AssessmentAnswer = {
  id: string;
  questionKey: string;
  value: AssessmentAnswerValue;
  createdAt: string;
  updatedAt: string;
};

export type AssessmentEvent = {
  id: string;
  assessmentId: string;
  eventType: "CREATED" | "DRAFT_UPDATED" | "SENT" | "ANSWER_SAVED" | "SUBMITTED" | "REVIEW_STARTED" | "COMPLETED";
  actorUserId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type AssessmentSummary = {
  id: string;
  trainerStudentRelationshipId: string;
  templateVersionId: string;
  status: AssessmentStatus;
  title: string;
  isRequired: boolean;
  dueAt: string | null;
  sentAt: string | null;
  answeredAt: string | null;
  reviewStartedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AssessmentDetail = AssessmentSummary & {
  trainerFeedback: string | null;
  templateSchema: AssessmentTemplateSchema;
  answers: AssessmentAnswer[];
};

export type AssessmentTemplateVersionSummary = {
  id: string;
  templateId: string;
  versionNumber: number;
  schema: AssessmentTemplateSchema;
  createdAt: string;
};

export type AssessmentTemplateSummary = {
  id: string;
  systemKey: string | null;
  ownerTrainerId: string | null;
  assessmentType: AssessmentType;
  name: string;
  description: string;
  locale: string;
  status: "ACTIVE" | "ARCHIVED";
  defaultRequired: boolean;
  versions: AssessmentTemplateVersionSummary[];
};

export type CreateAssessmentInput = {
  relationshipId: string;
  templateVersionId: string;
  title?: string | null;
  isRequired?: boolean | null;
  dueAt?: string | null;
};

export type UpdateDraftAssessmentInput = {
  assessmentId: string;
  title: string;
  isRequired: boolean;
  dueAt: string | null;
};

export type SaveAssessmentAnswerInput = {
  assessmentId: string;
  questionKey: string;
  value: AssessmentAnswerValue;
};

export type StudentMeasurement = {
  id: string;
  studentProfileId: string;
  trainerStudentRelationshipId: string;
  sourceAssessmentId: string | null;
  measurementCode: string;
  value: number;
  unitCode: string;
  measuredAt: string;
  createdAt: string;
};

export type StudentPrivateMediaMetadata = {
  id: string;
  studentProfileId: string;
  trainerStudentRelationshipId: string;
  sourceAssessmentId: string | null;
  storagePath: string;
  mediaType: "ASSESSMENT_PHOTO" | "PROGRESS_PHOTO";
  viewType: "FRONT" | "SIDE" | "BACK" | "OTHER" | null;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  fileSize: number;
  consentVersion: string;
  consentedAt: string;
  createdAt: string;
};

export type PrivateMediaAccessContext =
  | { actor: "student"; ownsStudentProfile: boolean }
  | { actor: "trainer"; ownsTrainerProfile: boolean; relationshipStatus: "active" | "inactive" | "ended" };

/** Advisory application check only. PostgreSQL RLS remains the authorization boundary. */
export function canRequestPrivateMediaAccess(context: PrivateMediaAccessContext): boolean {
  return context.actor === "student"
    ? context.ownsStudentProfile
    : context.ownsTrainerProfile && context.relationshipStatus === "active";
}
