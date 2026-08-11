import { Activity, ChartNoAxesCombined, CircleGauge, Dumbbell, HeartPulse, MessageCircle, Play, Smartphone } from "lucide-react";
import { siteConfig } from "@/config/site";

export const painPoints = [
  "Você treina, mas não sabe se está fazendo o exercício corretamente.",
  "Não consegue manter uma rotina consistente.",
  "Usa treinos genéricos que não consideram seus objetivos.",
  "Fica sem saber quando aumentar cargas ou mudar o planejamento.",
];

export const steps = [
  ["01", "Entendemos seu objetivo", "Rotina, nível, disponibilidade e objetivo."],
  ["02", "Criamos seu treino", "Planejamento personalizado para sua realidade."],
  ["03", "Acompanhamos sua evolução", "Suporte, revisões e ajustes durante o processo."],
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
  "Acompanhamento por WhatsApp",
  `Revisões e ajustes durante ${siteConfig.durationDays} dias`,
];

export const trustItems = [
  { icon: HeartPulse, label: "Emagrecimento" }, { icon: Dumbbell, label: "Hipertrofia" },
  { icon: Activity, label: "Condicionamento" }, { icon: CircleGauge, label: "Retorno ao treino" },
];
