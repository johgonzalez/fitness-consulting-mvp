import { Activity, ChartNoAxesCombined, CircleGauge, Dumbbell, HeartPulse, MessageCircle, Play, Smartphone } from "lucide-react";

export const painPoints = [
  "Você treina, mas não sabe se está fazendo o exercício corretamente.",
  "Não consegue manter uma rotina consistente.",
  "Usa treinos genéricos que não consideram seus objetivos.",
  "Fica sem saber quando aumentar cargas ou mudar o planejamento.",
];

export const steps = [
  ["01", "Avaliação inicial", "Entendemos rotina, nível, disponibilidade e objetivo."],
  ["02", "Planejamento personalizado", "Estruturamos um plano adequado à sua realidade."],
  ["03", "Treino no celular", "Você recebe exercícios, séries e cargas de forma organizada."],
  ["04", "Acompanhamento e ajustes", "O plano evolui de acordo com seu desempenho e feedback."],
] as const;

export const benefits = [
  { icon: Dumbbell, title: "Treino individual", text: "Planejamento desenvolvido para o seu corpo, nível e objetivos." },
  { icon: Play, title: "Execução orientada", text: "Referências para entender e executar cada exercício com segurança." },
  { icon: ChartNoAxesCombined, title: "Progressão clara", text: "Séries, repetições, cargas e progressões organizadas." },
  { icon: CircleGauge, title: "Ajustes estratégicos", text: "O plano acompanha seu desempenho, feedback e evolução." },
  { icon: MessageCircle, title: "Suporte próximo", text: "Um canal direto para tirar dúvidas durante o acompanhamento." },
  { icon: Smartphone, title: "Treino no celular", text: "Acesso simples para treinar com autonomia onde estiver." },
];

export const mvpBenefits = [
  { icon: Dumbbell, title: "Treino feito para você", text: "Um plano alinhado ao seu objetivo e à sua rotina." },
  { icon: MessageCircle, title: "Acompanhamento direto", text: "Suporte próximo para você não treinar no escuro." },
  { icon: ChartNoAxesCombined, title: "Ajustes na evolução", text: "O planejamento muda conforme seu desempenho." },
  { icon: Smartphone, title: "Treino no celular", text: "Exercícios, séries e cargas sempre acessíveis." },
];

export const audiences = [
  "Quer começar a treinar com segurança",
  "Já treina, mas não consegue evoluir",
  "Busca emagrecimento com estratégia",
  "Deseja aumentar massa muscular",
  "Precisa de flexibilidade para treinar",
  "Quer acompanhamento mesmo estando longe",
];

export const offerItems = [
  "Avaliação inicial",
  "Treino personalizado",
  "Acesso ao treino pelo celular",
  "Suporte via WhatsApp",
  "Revisões periódicas",
  "Ajustes de acordo com sua evolução",
];

export const trustItems = [
  { icon: HeartPulse, label: "Emagrecimento" }, { icon: Dumbbell, label: "Hipertrofia" },
  { icon: Activity, label: "Condicionamento" }, { icon: CircleGauge, label: "Retorno ao treino" },
];
