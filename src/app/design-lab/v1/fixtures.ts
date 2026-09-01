export type EvidenceCategory = "STANDARD" | "BENCHMARK" | "PRODUCT" | "BRAND";
export type SupportStatus = "SUPPORTED" | "PARTIAL" | "NOT_SUPPORTED" | "LEGACY" | "UNKNOWN";
export type DecisionStatus = "RECOMMENDED_AWAITING_PRODUCT_OWNER";
export type DesignOption = "A" | "B" | "C";
export type MotionMode = "quiet" | "spatial" | "expressive";

export const decisionGate = [
  {
    id: "VF-01",
    title: "Canvas e superfícies",
    variable: "Separação entre canvas e conteúdo",
    recommendation: "B",
  },
  {
    id: "VF-02",
    title: "CTA primária",
    variable: "Tratamento visual do preenchimento",
    recommendation: "B",
  },
  {
    id: "VF-03",
    title: "Campo de formulário",
    variable: "Tratamento da borda em repouso",
    recommendation: "B",
  },
  {
    id: "VF-04",
    title: "Personalidade de movimento",
    variable: "Curva de easing, preservando distância e duração",
    recommendation: "A",
  },
] as const;

export const operationalRows = [
  {
    name: "Mariana Oliveira",
    context: "Avaliação mensal respondida",
    meta: "Hoje, 09:42",
    status: "Revisar",
    tone: "attention",
  },
  {
    name: "Lucas Pereira",
    context: "Treino de inferiores concluído",
    meta: "Hoje, 08:18",
    status: "Concluído",
    tone: "success",
  },
  {
    name: "Beatriz Carvalho",
    context: "Convite de aluno aguardando aceite",
    meta: "Enviado ontem",
    status: "Pendente",
    tone: "neutral",
  },
] as const;

export const workoutRows = [
  { exercise: "Agachamento livre", prescription: "4 × 8", load: "60 kg", rest: "120 s" },
  { exercise: "Levantamento romeno", prescription: "4 × 10", load: "48 kg", rest: "90 s" },
  { exercise: "Mesa flexora", prescription: "3 × 12", load: "32 kg", rest: "75 s" },
] as const;

export const evidenceSummary: Array<{
  category: EvidenceCategory;
  statement: string;
  source: string;
}> = [
  {
    category: "PRODUCT",
    statement: "O site profissional é o primeiro momento de ativação do Personal.",
    source: "PRODUCT.md",
  },
  {
    category: "BRAND",
    statement: "Performance Serena: premium pela precisão, humana, fitness e contida.",
    source: "DESIGN.md",
  },
  {
    category: "STANDARD",
    statement: "Campos têm labels persistentes, foco visível e feedback programático.",
    source: "WCAG 2.2 e WAI Forms",
  },
  {
    category: "BENCHMARK",
    statement: "Ferramentas densas preservam capacidade com hierarquia e progressive disclosure.",
    source: "Trainerize, Everfit, TrueCoach e My PT Hub",
  },
];
