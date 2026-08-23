import type {
  AssessmentDetail,
  AssessmentStatus,
  AssessmentSummary,
  StudentMeasurement,
} from "@/lib/domain/assessments";

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
const completedAssessmentSummary = fixture(
  "d3100000-0000-4000-8000-000000000004",
  "a3100000-0000-4000-8000-000000000002",
  "Check-in concluído",
  "COMPLETED",
  3,
);

export const assessmentDemoFixtures: AssessmentSummary[] = [
  fixture("d3100000-0000-4000-8000-000000000001", "a3100000-0000-4000-8000-000000000001", "Avaliação inicial", "DRAFT", 0),
  fixture("d3100000-0000-4000-8000-000000000002", "a3100000-0000-4000-8000-000000000002", "Check-in mensal", "SENT", 1),
  fixture("d3100000-0000-4000-8000-000000000003", "a3100000-0000-4000-8000-000000000003", "Reavaliação", "ANSWERED", 2),
  completedAssessmentSummary,
];

export const completedAssessmentDemoFixture: {
  assessment: AssessmentDetail;
  measurements: StudentMeasurement[];
} = {
  assessment: {
    ...completedAssessmentSummary,
    trainerFeedback: "Boa consistência neste ciclo. Vamos manter a frequência e acompanhar a evolução do peso sem alterar o histórico.",
    templateSchema: {
      metadata: { fixture: true, locale: "pt-BR" },
      questions: [
        {
          key: "sessions_completed",
          type: "NUMBER",
          required: true,
          label: { "pt-BR": "Quantos treinos você realizou neste período?" },
        },
        {
          key: "optional_weight",
          type: "MEASUREMENT",
          required: false,
          label: { "pt-BR": "Peso atual (opcional)" },
          measurement: { code: "body_weight", unitCodes: ["kg"] },
        },
      ],
    },
    answers: [
      {
        id: "d3200000-0000-4000-8000-000000000001",
        questionKey: "sessions_completed",
        value: 11,
        createdAt: "2026-08-15T12:00:00.000Z",
        updatedAt: "2026-08-15T12:00:00.000Z",
      },
      {
        id: "d3200000-0000-4000-8000-000000000002",
        questionKey: "optional_weight",
        value: { value: 78.4, unitCode: "kg", measuredAt: "2026-08-15T12:00:00.000Z" },
        createdAt: "2026-08-15T12:00:00.000Z",
        updatedAt: "2026-08-15T12:00:00.000Z",
      },
    ],
  },
  measurements: [
    {
      id: "d3300000-0000-4000-8000-000000000001",
      studentProfileId: "d3400000-0000-4000-8000-000000000001",
      trainerStudentRelationshipId: FIXTURE_RELATIONSHIP_ID,
      sourceAssessmentId: completedAssessmentSummary.id,
      measurementCode: "body_weight",
      value: 78.4,
      unitCode: "kg",
      measuredAt: "2026-08-15T12:00:00.000Z",
      createdAt: "2026-08-15T12:00:00.000Z",
    },
  ],
};
