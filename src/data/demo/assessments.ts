import type {
  AssessmentAnswer,
  AssessmentDetail,
  AssessmentStatus,
  AssessmentSummary,
  AssessmentTemplateSchema,
  AssessmentTemplateSummary,
  StudentMeasurement,
} from "@/lib/domain/assessments";

const RELATIONSHIPS = {
  juliana: "75000000-0000-4000-8000-000000000001",
  bruno: "75000000-0000-4000-8000-000000000002",
  mariana: "75000000-0000-4000-8000-000000000003",
} as const;

const VERSION_IDS = {
  initial: "a3100000-0000-4000-8000-000000000001",
  monthly: "a3100000-0000-4000-8000-000000000002",
  reassessment: "a3100000-0000-4000-8000-000000000003",
} as const;

const initialSchema: AssessmentTemplateSchema = {
  metadata: { when_to_use: { "pt-BR": "Ao iniciar o acompanhamento com um aluno." } },
  questions: [
    { key: "primary_goal", type: "LONG_TEXT", required: true, label: { "pt-BR": "Qual é o seu principal objetivo?" } },
    { key: "training_experience", type: "SINGLE_CHOICE", required: true, label: { "pt-BR": "Como você descreve sua experiência com treinos?" }, options: [
      { value: "beginner", label: { "pt-BR": "Iniciante" } },
      { value: "intermediate", label: { "pt-BR": "Intermediária" } },
      { value: "advanced", label: { "pt-BR": "Avançada" } },
    ] },
    { key: "weekly_availability", type: "NUMBER", required: true, label: { "pt-BR": "Quantos dias por semana você pode treinar?" } },
    { key: "routine_availability", type: "LONG_TEXT", required: true, label: { "pt-BR": "Conte como é sua rotina e quais horários estão disponíveis." } },
    { key: "training_context", type: "MULTI_CHOICE", required: true, label: { "pt-BR": "Onde e com quais recursos pretende treinar?" }, options: [
      { value: "gym", label: { "pt-BR": "Academia" } },
      { value: "home_equipment", label: { "pt-BR": "Em casa com equipamentos" } },
      { value: "home_no_equipment", label: { "pt-BR": "Em casa sem equipamentos" } },
      { value: "outdoor", label: { "pt-BR": "Ao ar livre" } },
    ] },
    { key: "reported_limitations", type: "LONG_TEXT", required: false, label: { "pt-BR": "Informe limitações, desconfortos ou orientações profissionais relevantes." }, description: { "pt-BR": "Este campo não realiza diagnóstico médico." } },
    { key: "body_weight", type: "MEASUREMENT", required: false, label: { "pt-BR": "Peso atual (opcional)" }, measurement: { code: "body_weight", unitCodes: ["kg"] } },
    { key: "additional_notes", type: "LONG_TEXT", required: false, label: { "pt-BR": "Há mais alguma informação que queira compartilhar?" } },
  ],
};

const monthlySchema: AssessmentTemplateSchema = {
  metadata: { when_to_use: { "pt-BR": "Ao final de um ciclo mensal de acompanhamento." } },
  questions: [
    { key: "sessions_completed", type: "NUMBER", required: true, label: { "pt-BR": "Quantos treinos você realizou neste período?" } },
    { key: "difficulty_level", type: "SCALE", required: true, label: { "pt-BR": "Como avalia o nível de dificuldade?" }, scale: { min: 1, max: 10 } },
    { key: "energy_level", type: "SCALE", required: true, label: { "pt-BR": "Como esteve sua energia e disposição?" }, scale: { min: 1, max: 10 } },
    { key: "sleep_quality", type: "SCALE", required: false, label: { "pt-BR": "Como avalia a qualidade do sono?" }, scale: { min: 1, max: 10 } },
    { key: "perceived_discomfort", type: "LONG_TEXT", required: false, label: { "pt-BR": "Percebeu algum desconforto durante o período?" }, description: { "pt-BR": "Descreva sua percepção; este campo não realiza diagnóstico médico." } },
    { key: "training_satisfaction", type: "SCALE", required: true, label: { "pt-BR": "Qual foi sua satisfação com os treinos?" }, scale: { min: 1, max: 10 } },
    { key: "main_obstacles", type: "LONG_TEXT", required: false, label: { "pt-BR": "Quais foram os principais obstáculos?" } },
    { key: "next_period_goal", type: "LONG_TEXT", required: true, label: { "pt-BR": "Qual é o foco para o próximo período?" } },
    { key: "optional_weight", type: "MEASUREMENT", required: false, label: { "pt-BR": "Peso atual (opcional)" }, measurement: { code: "body_weight", unitCodes: ["kg"] } },
    { key: "optional_progress_photo", type: "PHOTO_REQUEST", required: false, label: { "pt-BR": "Deseja registrar uma foto de progresso?" } },
  ],
};

const reassessmentSchema: AssessmentTemplateSchema = {
  metadata: { when_to_use: { "pt-BR": "Ao revisar objetivos e progresso após um ciclo." } },
  questions: [
    { key: "perceived_changes", type: "LONG_TEXT", required: true, label: { "pt-BR": "Quais mudanças você percebeu desde a avaliação anterior?" } },
    { key: "goal_progress", type: "SCALE", required: true, label: { "pt-BR": "Como avalia sua evolução em relação ao objetivo?" }, scale: { min: 1, max: 10 } },
    { key: "consistency", type: "SCALE", required: true, label: { "pt-BR": "Como avalia sua consistência?" }, scale: { min: 1, max: 10 } },
    { key: "goal_review", type: "LONG_TEXT", required: true, label: { "pt-BR": "O que deseja manter ou ajustar nas próximas metas?" } },
    { key: "body_weight", type: "MEASUREMENT", required: false, label: { "pt-BR": "Peso atual (opcional)" }, measurement: { code: "body_weight", unitCodes: ["kg"] } },
    { key: "waist_circumference", type: "MEASUREMENT", required: false, label: { "pt-BR": "Circunferência da cintura (opcional)" }, measurement: { code: "waist_circumference", unitCodes: ["cm"] } },
    { key: "progress_photo", type: "PHOTO_REQUEST", required: false, label: { "pt-BR": "Deseja registrar fotos de progresso?" } },
    { key: "coaching_feedback", type: "LONG_TEXT", required: false, label: { "pt-BR": "Que feedback você daria sobre o acompanhamento?" } },
  ],
};

function template(
  id: string,
  systemKey: string,
  assessmentType: AssessmentTemplateSummary["assessmentType"],
  name: string,
  description: string,
  defaultRequired: boolean,
  versionId: string,
  schema: AssessmentTemplateSchema,
): AssessmentTemplateSummary {
  return {
    id,
    systemKey,
    ownerTrainerId: null,
    assessmentType,
    name,
    description,
    locale: "pt-BR",
    status: "ACTIVE",
    defaultRequired,
    versions: [{ id: versionId, templateId: id, versionNumber: 1, schema, createdAt: "2026-08-22T12:00:00.000Z" }],
  };
}

export const assessmentDemoTemplates: AssessmentTemplateSummary[] = [
  template("a3000000-0000-4000-8000-000000000001", "INITIAL_V1", "INITIAL", "Avaliação inicial", "Objetivos, rotina, experiência, disponibilidade e medidas iniciais.", true, VERSION_IDS.initial, initialSchema),
  template("a3000000-0000-4000-8000-000000000002", "MONTHLY_CHECKIN_V1", "MONTHLY_CHECKIN", "Check-in mensal", "Consistência, dificuldade, energia, rotina e obstáculos do período.", false, VERSION_IDS.monthly, monthlySchema),
  template("a3000000-0000-4000-8000-000000000003", "REASSESSMENT_V1", "REASSESSMENT", "Reavaliação", "Progresso, medidas, objetivos e percepção após um ciclo.", false, VERSION_IDS.reassessment, reassessmentSchema),
];

function summary(
  id: string,
  relationshipId: string,
  templateVersionId: string,
  title: string,
  status: AssessmentStatus,
  index: number,
): AssessmentSummary {
  const createdAt = `2026-08-${String(10 + index).padStart(2, "0")}T12:00:00.000Z`;
  const sentAt = status === "DRAFT" ? null : `2026-08-${String(11 + index).padStart(2, "0")}T12:00:00.000Z`;
  const answeredAt = ["ANSWERED", "IN_REVIEW", "COMPLETED"].includes(status) ? `2026-08-${String(12 + index).padStart(2, "0")}T12:00:00.000Z` : null;
  const reviewStartedAt = ["IN_REVIEW", "COMPLETED"].includes(status) ? `2026-08-${String(13 + index).padStart(2, "0")}T12:00:00.000Z` : null;
  const completedAt = status === "COMPLETED" ? `2026-08-${String(14 + index).padStart(2, "0")}T12:00:00.000Z` : null;
  return {
    id,
    trainerStudentRelationshipId: relationshipId,
    templateVersionId,
    status,
    title,
    isRequired: index === 0 || index === 2,
    dueAt: status === "DRAFT" || status === "SENT" ? "2026-09-01T12:00:00.000Z" : null,
    sentAt,
    answeredAt,
    reviewStartedAt,
    completedAt,
    createdAt,
    updatedAt: completedAt ?? reviewStartedAt ?? answeredAt ?? sentAt ?? createdAt,
  };
}

const summaries = [
  summary("d3100000-0000-4000-8000-000000000001", RELATIONSHIPS.juliana, VERSION_IDS.initial, "Avaliação inicial da Juliana", "DRAFT", 0),
  summary("d3100000-0000-4000-8000-000000000002", RELATIONSHIPS.bruno, VERSION_IDS.monthly, "Check-in de agosto", "SENT", 1),
  summary("d3100000-0000-4000-8000-000000000003", RELATIONSHIPS.mariana, VERSION_IDS.reassessment, "Reavaliação — ciclo 2", "ANSWERED", 2),
  summary("d3100000-0000-4000-8000-000000000004", RELATIONSHIPS.juliana, VERSION_IDS.monthly, "Check-in de julho", "COMPLETED", 3),
  summary("d3100000-0000-4000-8000-000000000005", RELATIONSHIPS.mariana, VERSION_IDS.initial, "Avaliação de retorno", "IN_REVIEW", 4),
];

function answer(id: number, questionKey: string, value: AssessmentAnswer["value"]): AssessmentAnswer {
  return { id: `d3200000-0000-4000-8000-${String(id).padStart(12, "0")}`, questionKey, value, createdAt: "2026-08-18T14:20:00.000Z", updatedAt: "2026-08-18T14:20:00.000Z" };
}

const reassessmentAnswers: AssessmentAnswer[] = [
  answer(1, "perceived_changes", "Tenho mais disposição e consigo manter a rotina mesmo nas semanas mais corridas."),
  answer(2, "goal_progress", 8),
  answer(3, "consistency", 9),
  answer(4, "goal_review", "Quero manter três treinos e melhorar a execução dos exercícios de força."),
  answer(5, "body_weight", { value: 64.8, unitCode: "kg", measuredAt: "2026-08-17T08:30:00.000Z" }),
  answer(6, "waist_circumference", { value: 72, unitCode: "cm", measuredAt: "2026-08-17T08:30:00.000Z" }),
  answer(7, "progress_photo", { skipped: true }),
  answer(8, "coaching_feedback", "Os ajustes semanais estão ajudando bastante."),
];

const monthlyAnswers: AssessmentAnswer[] = [
  answer(9, "sessions_completed", 11),
  answer(10, "difficulty_level", 7),
  answer(11, "energy_level", 8),
  answer(12, "sleep_quality", 7),
  answer(13, "perceived_discomfort", "Sem desconfortos relevantes neste ciclo."),
  answer(14, "training_satisfaction", 9),
  answer(15, "main_obstacles", "Duas viagens curtas mudaram os horários."),
  answer(16, "next_period_goal", "Manter regularidade e progredir carga com boa execução."),
  answer(17, "optional_weight", { value: 67.2, unitCode: "kg", measuredAt: "2026-07-18T08:00:00.000Z" }),
  answer(18, "optional_progress_photo", { skipped: true }),
];

const initialAnswers: AssessmentAnswer[] = [
  answer(19, "primary_goal", "Retomar a rotina e ganhar força sem sobrecarregar meus horários."),
  answer(20, "training_experience", "intermediate"),
  answer(21, "weekly_availability", 3),
  answer(22, "routine_availability", "Consigo treinar no início da manhã às segundas, quartas e sextas."),
  answer(23, "training_context", ["gym", "outdoor"]),
  answer(24, "reported_limitations", "Tenho orientação profissional para evitar impacto alto por enquanto."),
  answer(25, "body_weight", { value: 65.1, unitCode: "kg", measuredAt: "2026-08-19T07:45:00.000Z" }),
  answer(26, "additional_notes", "Prefiro uma progressão gradual e explicações objetivas."),
];

export const assessmentDemoDetails: AssessmentDetail[] = [
  { ...summaries[0], trainerFeedback: null, templateSchema: initialSchema, answers: [] },
  { ...summaries[1], trainerFeedback: null, templateSchema: monthlySchema, answers: [] },
  { ...summaries[2], trainerFeedback: null, templateSchema: reassessmentSchema, answers: reassessmentAnswers },
  { ...summaries[3], trainerFeedback: "Boa consistência neste ciclo. Vamos manter a frequência e progredir de forma gradual.", templateSchema: monthlySchema, answers: monthlyAnswers },
  { ...summaries[4], trainerFeedback: null, templateSchema: initialSchema, answers: initialAnswers },
];

export const assessmentDemoFixtures: AssessmentSummary[] = assessmentDemoDetails.map((item) => ({
  id: item.id,
  trainerStudentRelationshipId: item.trainerStudentRelationshipId,
  templateVersionId: item.templateVersionId,
  status: item.status,
  title: item.title,
  isRequired: item.isRequired,
  dueAt: item.dueAt,
  sentAt: item.sentAt,
  answeredAt: item.answeredAt,
  reviewStartedAt: item.reviewStartedAt,
  completedAt: item.completedAt,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
}));

export const assessmentDemoMeasurements: StudentMeasurement[] = [
  { id: "d3300000-0000-4000-8000-000000000001", studentProfileId: "75100000-0000-4000-8000-000000000003", trainerStudentRelationshipId: RELATIONSHIPS.mariana, sourceAssessmentId: summaries[2].id, measurementCode: "body_weight", value: 64.8, unitCode: "kg", measuredAt: "2026-08-17T08:30:00.000Z", createdAt: "2026-08-18T14:20:00.000Z" },
  { id: "d3300000-0000-4000-8000-000000000002", studentProfileId: "75100000-0000-4000-8000-000000000003", trainerStudentRelationshipId: RELATIONSHIPS.mariana, sourceAssessmentId: summaries[2].id, measurementCode: "waist_circumference", value: 72, unitCode: "cm", measuredAt: "2026-08-17T08:30:00.000Z", createdAt: "2026-08-18T14:20:00.000Z" },
  { id: "d3300000-0000-4000-8000-000000000003", studentProfileId: "75100000-0000-4000-8000-000000000001", trainerStudentRelationshipId: RELATIONSHIPS.juliana, sourceAssessmentId: summaries[3].id, measurementCode: "body_weight", value: 67.2, unitCode: "kg", measuredAt: "2026-07-18T08:00:00.000Z", createdAt: "2026-07-18T12:00:00.000Z" },
  { id: "d3300000-0000-4000-8000-000000000004", studentProfileId: "75100000-0000-4000-8000-000000000003", trainerStudentRelationshipId: RELATIONSHIPS.mariana, sourceAssessmentId: summaries[4].id, measurementCode: "body_weight", value: 65.1, unitCode: "kg", measuredAt: "2026-08-19T07:45:00.000Z", createdAt: "2026-08-20T12:00:00.000Z" },
];

export const completedAssessmentDemoFixture = {
  assessment: assessmentDemoDetails[3],
  measurements: assessmentDemoMeasurements.filter((measurement) => measurement.sourceAssessmentId === summaries[3].id),
};
