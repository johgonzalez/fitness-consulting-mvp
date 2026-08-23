export type HeadlineSuggestionSource = "CURATED" | "TRAINER_CUSTOM" | "FUTURE_AI_GENERATED";

export interface HeadlineSuggestion {
  id: string;
  text: string;
  source: HeadlineSuggestionSource;
}

export interface FutureHeadlineGenerationRequest {
  trainerId: string;
  specialty: string;
  tone: "DIRECT" | "HUMAN" | "PERFORMANCE" | "WELLNESS";
  currentHeadline: string | null;
}

export const curatedHeadlineSuggestions: readonly HeadlineSuggestion[] = [
  {
    id: "evolve-for-real",
    text: "Treinamento personalizado para evoluir de verdade.",
    source: "CURATED",
  },
  {
    id: "your-rhythm",
    text: "Seu objetivo. Seu ritmo. Um plano feito para você.",
    source: "CURATED",
  },
  {
    id: "strategy-consistency-result",
    text: "Mais estratégia. Mais consistência. Mais resultado.",
    source: "CURATED",
  },
  {
    id: "purpose-and-support",
    text: "Treine com propósito. Evolua com acompanhamento.",
    source: "CURATED",
  },
  {
    id: "performance-plan",
    text: "Performance começa com um plano feito para você.",
    source: "CURATED",
  },
  {
    id: "built-around-you",
    text: "Um acompanhamento construído em torno de você.",
    source: "CURATED",
  },
] as const;
