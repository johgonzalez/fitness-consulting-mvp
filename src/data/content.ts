import { Activity, ChartNoAxesCombined, CircleGauge, Dumbbell, HeartPulse, MessageCircle, Play, Smartphone } from "lucide-react";
import { siteConfig } from "@/config/site";

export const painPoints = [
  "Você treina, mas não sabe se está fazendo o exercício corretamente.",
  "Não consegue manter uma rotina consistente.",
  "Usa treinos genéricos que não consideram seus objetivos.",
  "Fica sem saber quando aumentar cargas ou mudar o planejamento.",
];

export const steps = [
  ["01", "Avaliação inicial", "Entendimento de rotina, objetivos, limitações, histórico e disponibilidade."],
  ["02", "Planejamento personalizado", "Criação de um treino compatível com sua realidade e seu nível."],
  ["03", "Acompanhamento", "Contato pelo aplicativo e WhatsApp para orientações e suporte."],
  ["04", "Ajustes e evolução", "Revisões estratégicas conforme desempenho, feedback e progresso."],
] as const;

export const benefits = [
  { icon: Dumbbell, title: "Treino individual", text: "Planejamento desenvolvido para o seu corpo, nível e objetivos." },
  { icon: Play, title: "Execução orientada", text: "Referências para entender e executar cada exercício com segurança." },
  { icon: ChartNoAxesCombined, title: "Progressão clara", text: "Séries, repetições, cargas e progressões organizadas." },
  { icon: CircleGauge, title: "Ajustes estratégicos", text: "O plano acompanha seu desempenho, feedback e evolução." },
  { icon: MessageCircle, title: "Suporte próximo", text: "Um canal direto para tirar dúvidas durante o acompanhamento." },
  { icon: Smartphone, title: "Treino no celular", text: "Acesso simples para treinar com autonomia onde estiver." },
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
  "Avaliação inicial", "Treino totalmente personalizado", "Acesso ao treino pelo aplicativo",
  "Orientações de execução", "Acompanhamento por WhatsApp", "Revisões periódicas",
  "Ajustes estratégicos de treino", `Acompanhamento por ${siteConfig.durationDays} dias`,
];

export const trustItems = [
  { icon: HeartPulse, label: "Emagrecimento" }, { icon: Dumbbell, label: "Hipertrofia" },
  { icon: Activity, label: "Condicionamento" }, { icon: CircleGauge, label: "Retorno ao treino" },
];
