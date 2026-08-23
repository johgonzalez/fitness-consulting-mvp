export const siteConfig = {
  name: "Rafael Martins",
  shortName: "Rafael",
  initials: "RM",
  descriptor: "Personal Trainer",
  serviceName: "Consultoria Fitness Online",
  durationDays: 90,
  siteUrl: "",
  whatsappUrl: "https://wa.me/message/EZPUTABJWNZKP1",
  whatsappNumber: "",
  whatsappMessage:
    "Olá! Conheci a consultoria pelo site demonstrativo e gostaria de entender melhor como funciona.",
  instagramUrl: "",
  perfilProUrl: "https://perfil.pro",
  location: "São Paulo, SP",
  about:
    "Rafael Martins é Personal Trainer e trabalha com consultoria online personalizada para quem quer evoluir com um plano estruturado, acompanhamento próximo e ajustes ao longo do processo.",
  professionalData: {
    cref: "000000-G/SP",
    education: "Educação Física — dado demonstrativo",
    registration: "CREF 000000-G/SP",
    credentials: "Perfil profissional demonstrativo",
  },
  seo: {
    title: "Consultoria Online Personal Trainer | Site Demonstrativo",
    description:
      "Exemplo de landing page profissional para Personal Trainers divulgarem consultoria online, serviços e captação de novos alunos.",
  },
} as const;

export const productConfig = {
  customSiteStartingPrice: "aproximadamente R$ 100–R$ 150",
  founderOfferCode: "founder_offer",
} as const;

export const leadsConfig = {
  goals: [
    { value: "weight_loss", label: "Emagrecimento" }, { value: "hypertrophy", label: "Ganho de massa / hipertrofia" },
    { value: "conditioning", label: "Condicionamento físico" }, { value: "health", label: "Saúde e qualidade de vida" },
    { value: "performance", label: "Performance" }, { value: "other", label: "Outro" },
  ],
  budgetBands: [
    { value: "up_to_150", label: "Até R$ 150", min: 0, max: 150 }, { value: "from_150_to_250", label: "R$ 150–250", min: 150, max: 250 },
    { value: "from_250_to_400", label: "R$ 250–400", min: 250, max: 400 }, { value: "from_400_to_600", label: "R$ 400–600", min: 400, max: 600 },
    { value: "above_600", label: "Acima de R$ 600", min: 600, max: null }, { value: "unknown", label: "Ainda não sei", min: null, max: null },
  ],
  timings: [
    { value: "now", label: "Agora" }, { value: "seven_days", label: "Nos próximos 7 dias" },
    { value: "this_month", label: "Neste mês" }, { value: "researching", label: "Estou apenas pesquisando" },
  ],
} as const;

export const navigation = [
  { label: "Como funciona", href: "#como-funciona" },
  { label: "Benefícios", href: "#beneficios" },
  { label: "Consultoria", href: "#oferta" },
  { label: "Dúvidas", href: "#duvidas" },
] as const;
