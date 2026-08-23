import type { AssessmentRepository } from "@/lib/domain/assessment-repository";
import type {
  AssessmentAnswerValue,
  AssessmentDetail,
  AssessmentSummary,
  CreateAssessmentInput,
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
