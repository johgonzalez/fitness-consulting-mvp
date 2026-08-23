import type { AssessmentStatus, AssessmentSummary } from "@/lib/domain/assessments";

const FIXTURE_RELATIONSHIP_ID = "d3000000-0000-4000-8000-000000000001";

function fixture(
  id: string,
  templateVersionId: string,
  title: string,
  status: AssessmentStatus,
  index: number,
): AssessmentSummary {
  const createdAt = `2026-08-${String(10 + index).padStart(2, "0")}T12:00:00.000Z`;
  return {
    id,
    trainerStudentRelationshipId: FIXTURE_RELATIONSHIP_ID,
    templateVersionId,
    status,
    title,
    isRequired: status === "DRAFT",
    dueAt: status === "DRAFT" || status === "SENT" ? "2026-09-01T12:00:00.000Z" : null,
    sentAt: status === "DRAFT" ? null : `2026-08-${String(11 + index).padStart(2, "0")}T12:00:00.000Z`,
    answeredAt: status === "ANSWERED" || status === "COMPLETED" ? `2026-08-${String(12 + index).padStart(2, "0")}T12:00:00.000Z` : null,
    reviewStartedAt: status === "COMPLETED" ? `2026-08-${String(13 + index).padStart(2, "0")}T12:00:00.000Z` : null,
    completedAt: status === "COMPLETED" ? `2026-08-${String(14 + index).padStart(2, "0")}T12:00:00.000Z` : null,
    createdAt,
    updatedAt: createdAt,
  };
}

/** Development-only examples. They are not imported by remote seed or migration paths. */
export const assessmentDemoFixtures: AssessmentSummary[] = [
  fixture("d3100000-0000-4000-8000-000000000001", "a3100000-0000-4000-8000-000000000001", "Avaliação inicial", "DRAFT", 0),
  fixture("d3100000-0000-4000-8000-000000000002", "a3100000-0000-4000-8000-000000000002", "Check-in mensal", "SENT", 1),
  fixture("d3100000-0000-4000-8000-000000000003", "a3100000-0000-4000-8000-000000000003", "Reavaliação", "ANSWERED", 2),
  fixture("d3100000-0000-4000-8000-000000000004", "a3100000-0000-4000-8000-000000000002", "Check-in concluído", "COMPLETED", 3),
];
