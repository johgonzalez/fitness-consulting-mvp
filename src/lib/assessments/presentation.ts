import type {
  AssessmentAnswerValue,
  AssessmentQuestion,
  AssessmentStatus,
  AssessmentType,
  LocalizedText,
} from "@/lib/domain/assessments";

export const assessmentStatusLabels: Record<AssessmentStatus, string> = {
  DRAFT: "Draft",
  SENT: "Aguardando aluno",
  ANSWERED: "Para revisar",
  IN_REVIEW: "Em revisão",
  COMPLETED: "Concluída",
};

export const assessmentStatusTones = {
  DRAFT: "neutral",
  SENT: "warning",
  ANSWERED: "info",
  IN_REVIEW: "accent",
  COMPLETED: "success",
} as const;

export const assessmentTypeLabels: Record<AssessmentType, string> = {
  INITIAL: "Avaliação inicial",
  MONTHLY_CHECKIN: "Check-in mensal",
  REASSESSMENT: "Reavaliação",
  CUSTOM: "Personalizada",
};

export const assessmentNextActions: Record<AssessmentStatus, string> = {
  DRAFT: "Revisar e enviar",
  SENT: "Acompanhar resposta",
  ANSWERED: "Iniciar revisão",
  IN_REVIEW: "Concluir revisão",
  COMPLETED: "Consultar histórico",
};

export function localText(value: LocalizedText | undefined, locale = "pt-BR") {
  if (!value) return "";
  return value[locale] ?? value[Object.keys(value)[0]] ?? "";
}

export function formatAssessmentDate(value: string | null, fallback = "—") {
  if (!value) return fallback;
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
    .format(new Date(value))
    .replace(" de ", " ")
    .replace(" de ", " ");
}

export function formatAssessmentDateTime(value: string | null, fallback = "—") {
  if (!value) return fallback;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatAnswer(question: AssessmentQuestion, value: AssessmentAnswerValue | undefined) {
  if (value === undefined) return "Não respondida";
  if (question.type === "SINGLE_CHOICE" && typeof value === "string") {
    return localText(question.options.find((option) => option.value === value)?.label) || value;
  }
  if (question.type === "MULTI_CHOICE" && Array.isArray(value)) {
    return value.map((entry) => localText(question.options.find((option) => option.value === entry)?.label) || entry).join(", ");
  }
  if (question.type === "BOOLEAN" && typeof value === "boolean") return value ? "Sim" : "Não";
  if (question.type === "MEASUREMENT" && typeof value === "object" && value !== null && "unitCode" in value) {
    return `${value.value.toLocaleString("pt-BR")} ${value.unitCode}`;
  }
  if (question.type === "PHOTO_REQUEST") {
    return typeof value === "object" && value !== null && "skipped" in value ? "Não registrada" : "Registro protegido";
  }
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

export function estimateAssessmentMinutes(questionCount: number) {
  return Math.max(3, Math.ceil(questionCount * 0.75));
}
