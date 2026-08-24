import type {
  CommercialOffer,
  CustomSiteRequest,
  DashboardMetrics,
  LeadSettings,
  TrainerEntitlements,
  TrainerMethodologyItem,
  TrainerPageData,
  TrainerProfile,
} from "@/lib/domain/trainer";
import type { ManagedInvitation, ManagedLead, ManagedStudent } from "@/lib/domain/students";

const trainerId = "71000000-0000-4000-8000-000000000001";
const userId = "70000000-0000-4000-8000-000000000001";
const demoMethodology: TrainerMethodologyItem[] = [
  { id: "assessment", trainer_id: trainerId, position: 10, title: "Avaliação inicial", description: "Rotina, histórico e objetivos dão contexto ao ponto de partida." },
  { id: "strategy", trainer_id: trainerId, position: 20, title: "Estratégia personalizada", description: "O plano nasce das suas prioridades, disponibilidade e momento." },
  { id: "execution", trainer_id: trainerId, position: 30, title: "Execução com acompanhamento", description: "Orientação próxima transforma o planejamento em uma rotina possível." },
  { id: "evolution", trainer_id: trainerId, position: 40, title: "Ajustes e evolução", description: "O percurso é revisto com consistência para continuar fazendo sentido." },
];

const trainerPage: TrainerPageData = {
  profile: {
    id: trainerId,
    slug: "thiago-costa",
    display_name: "Thiago Costa",
    headline: "Treino personalizado para hipertrofia, emagrecimento e performance.",
    bio: "Personal Trainer com foco em acompanhamento individual, evolução sustentável e estratégia de treino para resultados reais. Há 8 anos transformando objetivos em uma rotina de movimento possível.",
    specialty: "Hipertrofia · Emagrecimento · Condicionamento físico · Performance",
    cref: "123456-G/SP",
    cep: "01310100",
    city: "São Paulo, SP",
    service_mode: "both",
    profile_image_url: null,
    hero_image_url: "/images/motion/thiago-motion-hero.png",
    logo_url: null,
    whatsapp: "5511999999999",
    instagram: "@thiagocosta.movimento",
    instagram_handle: "thiagocosta.movimento",
    instagram_url: "https://www.instagram.com/thiagocosta.movimento/",
    methodology_description: "Uma jornada clara, com avaliação, estratégia, execução acompanhada e ajustes consistentes.",
    testimonials_intro: "Alunos que encontraram constância, clareza e acompanhamento de verdade.",
    profile_status_enabled: true,
    profile_status_text: "Agenda aberta",
    profile_status_semantic_tone: "availability",
    site_layouts: {},
    template_id: "template_02",
    primary_color: "#6e42f5",
    published: true,
  },
  services: [
    { id: "72000000-0000-4000-8000-000000000001", trainer_id: trainerId, title: "Acompanhamento Online", description: "Treino personalizado, ajustes recorrentes e acompanhamento de evolução.", service_mode: "online", price: 199, currency: "BRL", billing_type: "monthly", price_visibility: "public", price_visible: true, active: true, benefits: ["Treino personalizado", "Ajustes recorrentes", "Acompanhamento de evolução"], conversion_mode: "INTEREST" },
    { id: "72000000-0000-4000-8000-000000000002", trainer_id: trainerId, title: "Consultoria Premium", description: "Plano individual com acompanhamento próximo e avaliação frequente.", service_mode: "online", price: 349, currency: "BRL", billing_type: "monthly", price_visibility: "public", price_visible: true, active: true, benefits: ["Plano individual", "Avaliações frequentes", "Contato direto"], conversion_mode: "WHATSAPP" },
    { id: "72000000-0000-4000-8000-000000000003", trainer_id: trainerId, title: "Personal Presencial", description: "Treinamento presencial individual em São Paulo.", service_mode: "presencial", price: 499, currency: "BRL", billing_type: "monthly", price_visibility: "public", price_visible: true, active: true, benefits: ["Sessões individuais", "Correção presencial", "Planejamento contínuo"], conversion_mode: "INTEREST" },
  ],
  testimonials: [
    { id: "73000000-0000-4000-8000-000000000001", trainer_id: trainerId, student_name: "Mariana S.", content: "Consegui voltar a treinar com consistência e me senti muito acompanhada durante todo o processo.", image_url: null, before_image_url: null, after_image_url: null, result_context: "Mais constância, melhor rotina e maior adesão ao treino.", instagram_handle: "mariana.semove", instagram_url: "https://www.instagram.com/mariana.semove/", published: true },
    { id: "73000000-0000-4000-8000-000000000002", trainer_id: trainerId, student_name: "Lucas P.", content: "O treino ficou muito mais organizado e prático. Evoluí bastante em poucos meses.", image_url: null, before_image_url: null, after_image_url: null, result_context: "Plano estruturado com progressão e acompanhamento.", instagram_handle: null, instagram_url: null, published: true },
    { id: "73000000-0000-4000-8000-000000000003", trainer_id: trainerId, student_name: "Fernanda R.", content: "Gostei muito da atenção aos detalhes e do acompanhamento constante.", image_url: null, before_image_url: null, after_image_url: null, result_context: "Acompanhamento próximo e ajustes coerentes com a rotina.", instagram_handle: "fernanda.ativa", instagram_url: "https://www.instagram.com/fernanda.ativa/", published: true },
  ],
  methodology: demoMethodology,
};

const profile: TrainerProfile = { ...trainerPage.profile, user_id: userId };

const entitlements: TrainerEntitlements = {
  trainer_id: trainerId,
  can_build_site: true,
  can_preview_site: true,
  can_use_template_01: true,
  can_use_template_02: true,
  can_use_template_03: false,
  can_use_free_template: true,
  can_use_premium_templates: true,
  can_publish_site: true,
  can_receive_leads: true,
  can_use_matching: true,
};

const leadSettings: LeadSettings = {
  trainer_id: trainerId,
  objectives: ["weight_loss", "hypertrophy", "conditioning", "performance"],
  service_mode: "both",
  city: "São Paulo",
  state: "SP",
  service_ids: trainerPage.services.map((service) => service.id),
  accepting_new_clients: true,
};

const leads: ManagedLead[] = [
  { id: "74000000-0000-4000-8000-000000000001", leadId: "74100000-0000-4000-8000-000000000001", trainerId, score: 96, status: "new", state: "new", reservedUntil: "2026-08-25T18:00:00.000Z", createdAt: "2026-08-22T12:10:00.000Z", lead: { firstName: "Ana Beatriz Lima", whatsapp: "5511988881001", email: "ana.lima@example.test", goal: "weight_loss", serviceMode: "online", city: "São Paulo", state: "SP", budgetBand: "from_250_to_400", startTiming: "now" } },
  { id: "74000000-0000-4000-8000-000000000002", leadId: "74100000-0000-4000-8000-000000000002", trainerId, score: 92, status: "pending", state: "pending", reservedUntil: "2026-08-24T18:00:00.000Z", createdAt: "2026-08-21T15:30:00.000Z", lead: { firstName: "Carlos Eduardo", whatsapp: "5511988881002", email: "carlos.eduardo@example.test", goal: "hypertrophy", serviceMode: "presencial", city: "São Paulo", state: "SP", budgetBand: "from_400_to_600", startTiming: "seven_days" } },
  { id: "74000000-0000-4000-8000-000000000003", leadId: "74100000-0000-4000-8000-000000000003", trainerId, score: 90, status: "converted", state: "converted", reservedUntil: "2026-08-18T18:00:00.000Z", createdAt: "2026-08-15T09:20:00.000Z", lead: { firstName: "Juliana Mendes", whatsapp: "5511988881003", email: "juliana.mendes@example.test", goal: "conditioning", serviceMode: "online", city: "Campinas", state: "SP", budgetBand: "from_250_to_400", startTiming: "this_month" } },
  { id: "74000000-0000-4000-8000-000000000004", leadId: "74100000-0000-4000-8000-000000000004", trainerId, score: 84, status: "rejected", state: "rejected", reservedUntil: "2026-08-16T18:00:00.000Z", createdAt: "2026-08-13T14:05:00.000Z", lead: { firstName: "Rafael Santos", whatsapp: "5511988881004", email: "rafael.santos@example.test", goal: "performance", serviceMode: "presencial", city: "São Paulo", state: "SP", budgetBand: "up_to_150", startTiming: "researching" } },
  { id: "74000000-0000-4000-8000-000000000005", leadId: "74100000-0000-4000-8000-000000000005", trainerId, score: 82, status: "pending", state: "expired", reservedUntil: "2026-08-10T18:00:00.000Z", createdAt: "2026-08-07T11:45:00.000Z", lead: { firstName: "Beatriz Carvalho", whatsapp: "5511988881005", email: "beatriz.carvalho@example.test", goal: "health", serviceMode: "online", city: "Santos", state: "SP", budgetBand: "from_150_to_250", startTiming: "researching" } },
  { id: "74000000-0000-4000-8000-000000000006", leadId: "74100000-0000-4000-8000-000000000006", trainerId, score: 88, status: "new", state: "new", reservedUntil: "2026-08-26T18:00:00.000Z", createdAt: "2026-08-22T08:40:00.000Z", lead: { firstName: "Amanda Rocha", whatsapp: "5511988881006", email: "amanda.rocha@example.test", goal: "weight_loss", serviceMode: "both", city: "Osasco", state: "SP", budgetBand: "from_250_to_400", startTiming: "seven_days" } },
  { id: "74000000-0000-4000-8000-000000000007", leadId: "74100000-0000-4000-8000-000000000007", trainerId, score: 86, status: "converted", state: "converted", reservedUntil: "2026-08-08T18:00:00.000Z", createdAt: "2026-08-05T16:15:00.000Z", lead: { firstName: "Bruno Almeida", whatsapp: "5511988881007", email: "bruno.almeida@example.test", goal: "hypertrophy", serviceMode: "online", city: "Guarulhos", state: "SP", budgetBand: "from_400_to_600", startTiming: "now" } },
  { id: "74000000-0000-4000-8000-000000000008", leadId: "74100000-0000-4000-8000-000000000008", trainerId, score: 78, status: "rejected", state: "rejected", reservedUntil: "2026-08-04T18:00:00.000Z", createdAt: "2026-08-01T10:25:00.000Z", lead: { firstName: "Camila Nunes", whatsapp: "5511988881008", email: "camila.nunes@example.test", goal: "other", serviceMode: "online", city: "São Bernardo do Campo", state: "SP", budgetBand: "unknown", startTiming: "researching" } },
];

const students: ManagedStudent[] = [
  { id: "75000000-0000-4000-8000-000000000001", studentProfileId: "75100000-0000-4000-8000-000000000001", name: "Juliana Mendes", email: "juliana.mendes@example.test", status: "active", origin: "lead_conversion", startedAt: "2026-08-17T10:00:00.000Z", inactiveAt: null, endedAt: null },
  { id: "75000000-0000-4000-8000-000000000002", studentProfileId: "75100000-0000-4000-8000-000000000002", name: "Bruno Almeida", email: "bruno.almeida@example.test", status: "active", origin: "lead_conversion", startedAt: "2026-08-08T10:00:00.000Z", inactiveAt: null, endedAt: null },
  { id: "75000000-0000-4000-8000-000000000003", studentProfileId: "75100000-0000-4000-8000-000000000003", name: "Mariana Oliveira", email: "mariana.oliveira@example.test", status: "active", origin: "invitation", startedAt: "2026-06-12T10:00:00.000Z", inactiveAt: null, endedAt: null },
  { id: "75000000-0000-4000-8000-000000000004", studentProfileId: "75100000-0000-4000-8000-000000000004", name: "Lucas Pereira", email: "lucas.pereira@example.test", status: "inactive", origin: "invitation", startedAt: "2026-03-04T10:00:00.000Z", inactiveAt: "2026-08-02T10:00:00.000Z", endedAt: null },
];

const invitations: ManagedInvitation[] = [
  { id: "76000000-0000-4000-8000-000000000001", name: "Fernanda Ribeiro", email: "fernanda.ribeiro@example.test", status: "pending", expiresAt: "2026-09-01T18:00:00.000Z", createdAt: "2026-08-20T13:00:00.000Z" },
  { id: "76000000-0000-4000-8000-000000000002", name: "Paulo Henrique", email: "paulo.henrique@example.test", status: "pending", expiresAt: "2026-09-03T18:00:00.000Z", createdAt: "2026-08-22T10:00:00.000Z" },
];

const dashboardMetrics: DashboardMetrics = { profile_views: 1264, whatsapp_clicks: 186, leads: leads.length };

const requests: CustomSiteRequest[] = [];
const offer: CommercialOffer = { code: "founder_offer", label: "Publicação PPerfil", price: 149, currency: "BRL", payment_label: "pagamento único", enabled: true };

export const demoWorkspaceFixture = {
  identity: { name: "Thiago Costa", brand: "Thiago Training", email: "thiago.demo@pperfil.local", role: "TRAINER" as const },
  profile,
  trainerPage,
  entitlements,
  dashboardMetrics,
  leads: { profile, entitlements, settings: leadSettings, services: trainerPage.services, matches: leads },
  students: { students, invitations },
  siteBuilder: { profile, services: trainerPage.services, testimonials: trainerPage.testimonials, methodology: trainerPage.methodology, entitlements, requests, offer, hasPurchaseIntent: false, demoMode: true },
  siteContent: {
    specialties: [
      { id: "hypertrophy", label: "Hipertrofia" },
      { id: "weight-loss", label: "Emagrecimento" },
      { id: "conditioning", label: "Condicionamento físico" },
      { id: "performance", label: "Performance" },
    ],
    methodology: demoMethodology.map(({ id, title, description }) => ({ id, title, description })),
    results: [
      { id: "conditioning-progress", title: "Evolução de condicionamento", description: "Mais constância, melhor rotina e maior adesão ao treino.", image: null },
      { id: "hypertrophy-consistency", title: "Hipertrofia com consistência", description: "Plano estruturado com progressão e acompanhamento.", image: null },
    ],
    serviceConversionModes: {
      "Acompanhamento Online": "INTEREST" as const,
      "Consultoria Premium": "WHATSAPP" as const,
      "Personal Presencial": "INTEREST" as const,
    },
    mediaSelection: {
      hero: "pperfil-motion-performance-male",
      about: "pperfil-motion-coaching-mixed",
      coaching: "pperfil-motion-coaching-mixed",
      movement_primary: "pperfil-motion-lateral-male",
      movement_secondary: "pperfil-motion-performance-male",
      services: "pperfil-motion-coaching-mixed",
      student_experience: "pperfil-motion-coaching-mixed",
    },
  },
};
