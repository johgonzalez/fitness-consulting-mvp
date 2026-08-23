import type { AssessmentRepository } from "@/lib/domain/assessment-repository";
import type {
  AssessmentAnswerValue,
  AssessmentDetail,
  AssessmentSummary,
  CreateAssessmentInput,
  UpdateDraftAssessmentInput,
} from "@/lib/domain/assessments";
import {
  assertFutureIsoTimestamp,
  assertQuestionKey,
  assertTrainerFeedback,
  assertUuid,
} from "@/lib/validation/assessments";

export class AssessmentService {
  constructor(private readonly repository: AssessmentRepository) {}

  listMine(): Promise<AssessmentSummary[]> {
    return this.repository.listMine();
  }

  getMine(assessmentId: string): Promise<AssessmentDetail> {
    assertUuid(assessmentId, "assessmentId");
    return this.repository.getMine(assessmentId);
  }

  createFromTemplate(input: CreateAssessmentInput): Promise<string> {
    assertUuid(input.relationshipId, "relationshipId");
    assertUuid(input.templateVersionId, "templateVersionId");
    if (input.title != null && (input.title.trim().length < 2 || input.title.trim().length > 160)) {
      throw new Error("title must contain 2-160 characters.");
    }
    assertFutureIsoTimestamp(input.dueAt, "dueAt");
    return this.repository.createFromTemplate(input);
  }

  updateDraftMetadata(input: UpdateDraftAssessmentInput): Promise<void> {
    assertUuid(input.assessmentId, "assessmentId");
    if (input.title.trim().length < 2 || input.title.trim().length > 160) {
      throw new Error("title must contain 2-160 characters.");
    }
    if (typeof input.isRequired !== "boolean") throw new Error("isRequired must be a boolean.");
    if (input.dueAt !== null && !Number.isFinite(Date.parse(input.dueAt))) {
      throw new Error("dueAt must be an ISO timestamp or null.");
    }
    return this.repository.updateDraftMetadata({ ...input, title: input.title.trim() });
  }

  send(assessmentId: string): Promise<void> {
    assertUuid(assessmentId, "assessmentId");
    return this.repository.send(assessmentId);
  }

  saveAnswer(assessmentId: string, questionKey: string, value: AssessmentAnswerValue): Promise<string> {
    assertUuid(assessmentId, "assessmentId");
    assertQuestionKey(questionKey);
    return this.repository.saveAnswer({ assessmentId, questionKey, value });
  }

  submit(assessmentId: string): Promise<void> {
    assertUuid(assessmentId, "assessmentId");
    return this.repository.submit(assessmentId);
  }

  startReview(assessmentId: string): Promise<void> {
    assertUuid(assessmentId, "assessmentId");
    return this.repository.startReview(assessmentId);
  }

  complete(assessmentId: string, trainerFeedback: string): Promise<void> {
    assertUuid(assessmentId, "assessmentId");
    assertTrainerFeedback(trainerFeedback);
    return this.repository.complete(assessmentId, trainerFeedback.trim());
  }
}
