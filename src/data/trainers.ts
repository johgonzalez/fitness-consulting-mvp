import type { TrainerPageData } from "@/lib/domain/trainer";
import { demoWorkspaceFixture } from "@/lib/demo/fixture";

const rafaelId = "10000000-0000-4000-8000-000000000001";
const marinaId = "10000000-0000-4000-8000-000000000002";

export const mockTrainers: readonly TrainerPageData[] = [
  {
    profile: {
      id: rafaelId,
      slug: "rafael-martins",
      display_name: "Rafael Martins",
      headline: "Pare de seguir treinos genéricos. Tenha um treino feito para você.",
      bio: "Rafael Martins é Personal Trainer e trabalha com consultoria online personalizada para quem quer evoluir com um plano estruturado, acompanhamento próximo e ajustes ao longo do processo.",
      specialty: "Consultoria fitness online",
      cref: "000000-G/SP",
      city: "São Paulo, SP",
      service_mode: "online",
      profile_image_url: null,
      hero_image_url: "/images/personal-trainer-demo-hero-v1.webp",
      logo_url: null,
      whatsapp: "https://wa.me/message/EZPUTABJWNZKP1",
      instagram: null,
      template_id: "template_01",
      primary_color: "#c7ff36",
      published: true,
    },
    services: [
      { id: "30000000-0000-4000-8000-000000000001", trainer_id: rafaelId, title: "Consultoria de 90 dias", description: "Avaliação, treino personalizado, suporte e ajustes periódicos.", service_mode: "online", price: null, currency: "BRL", billing_type: null, price_visibility: "hidden", price_visible: false, active: true },
    ],
    testimonials: [],
    methodology: [],
  },
  {
    profile: {
      id: marinaId,
      slug: "marina-costa",
      display_name: "Marina Costa",
      headline: "Movimento consistente para uma rotina mais forte.",
      bio: "Marina acompanha mulheres que buscam força, autonomia e uma rotina de treino possível, com orientação individual e evolução sustentável.",
      specialty: "Força e condicionamento feminino",
      cref: "000000-G/RJ",
      city: "Rio de Janeiro, RJ",
      service_mode: "both",
      profile_image_url: null,
      hero_image_url: "/images/resultado-ia-feminino-v1.jpg",
      logo_url: null,
      whatsapp: "",
      instagram: null,
      template_id: "template_02",
      primary_color: "#e85d3f",
      published: true,
    },
    services: [
      { id: "30000000-0000-4000-8000-000000000002", trainer_id: marinaId, title: "Acompanhamento individual", description: "Treino ajustado à rotina, suporte próximo e revisões de progresso.", service_mode: "online", price: null, currency: "BRL", billing_type: null, price_visibility: "hidden", price_visible: false, active: true },
      { id: "30000000-0000-4000-8000-000000000003", trainer_id: marinaId, title: "Treino presencial", description: "Sessões individuais no Rio de Janeiro, mediante disponibilidade.", service_mode: "presencial", price: null, currency: "BRL", billing_type: null, price_visibility: "hidden", price_visible: false, active: true },
    ],
    testimonials: [],
    methodology: [],
  },
  demoWorkspaceFixture.trainerPage,
] as const;
