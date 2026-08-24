"use client";

import {
  BarChart3,
  Check,
  Copy,
  ExternalLink,
  Globe2,
  ImagePlus,
  LayoutTemplate,
  LockKeyhole,
  MessageCircle,
  Palette,
  Pencil,
  Plus,
  Settings2,
  Share2,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useActionState, useState, type ReactNode } from "react";
import {
  deleteService,
  deleteMethodologyItem,
  deleteTestimonial,
  registerPurchaseIntent,
  saveContact,
  saveIdentity,
  saveMethodologyItem,
  savePresentation,
  saveService,
  saveTestimonial,
  selectTemplate,
  setPublication,
  uploadIdentityImage,
  type SiteActionState,
} from "@/app/actions/site-builder";
import { TemplatePreview } from "@/components/dashboard/TemplatePreview";
import { HeadlineAssistant } from "@/components/dashboard/HeadlineAssistant";
import { AssistedTextField, SpecialtyAssistant } from "@/components/dashboard/AssistedTextField";
import { SiteSectionOrganizer } from "@/components/dashboard/SiteSectionOrganizer";
import { EmptyState, SectionHeader } from "@/components/ui/PPerfilPrimitives";
import { bioSuggestions, methodologySuggestions, serviceDescriptionSuggestions, specialtySuggestions, testimonialsIntroSuggestions } from "@/data/site/content-suggestions";
import { normalizeInstagramIdentity } from "@/lib/instagram";
import type {
  CommercialOffer,
  CustomSiteRequest,
  Testimonial,
  TrainerEntitlements,
  TrainerMethodologyItem,
  TrainerProfile,
  TrainerService,
} from "@/lib/domain/trainer";
import { getTemplateDefinition, templateCatalog, type TemplateDefinition } from "@/lib/domain/template-registry";

const initialState: SiteActionState = {};

type SiteSection = "overview" | "templates" | "personalize" | "contact" | "performance";
type PersonalizationSection = "identity" | "presentation" | "methodology" | "services" | "testimonials" | "organize";
type PersonalizationTab = "content" | "appearance" | "organize";

const siteNavigation: Array<{ id: SiteSection; label: string; icon: typeof Globe2 }> = [
  { id: "overview", label: "Visão geral", icon: Globe2 },
  { id: "templates", label: "Templates", icon: LayoutTemplate },
  { id: "personalize", label: "Personalizar", icon: Palette },
  { id: "contact", label: "Contato e conversão", icon: MessageCircle },
  { id: "performance", label: "Desempenho", icon: BarChart3 },
];

function ActionMessage({ state }: { state: SiteActionState }) {
  return state.message ? (
    <p className={`builder-message ${state.ok ? "success" : "error"}`} role="status">
      {state.message}
    </p>
  ) : null;
}

function Submit({ pending, children }: { pending: boolean; children: ReactNode }) {
  return (
    <button className="builder-primary" disabled={pending}>
      {pending ? "Salvando..." : children}
    </button>
  );
}

function PublicationStatus({ published }: { published: boolean }) {
  return (
    <span className={`pp-publication-status ${published ? "is-published" : "is-draft"}`}>
      <span aria-hidden="true" />
      {published ? "Publicado" : "Rascunho"}
    </span>
  );
}

function SitePreviewFrame({ profile, compact = false }: { profile: TrainerProfile; compact?: boolean }) {
  return (
    <div className={`pp-site-preview-frame${compact ? " is-compact" : ""}`}>
      <div className="pp-site-preview-toolbar" aria-hidden="true">
        <span className="pp-site-preview-dots"><i /><i /><i /></span>
        <span className="pp-site-preview-address">pperfil.pro/p/{profile.slug}</span>
      </div>
      <div className="pp-site-preview-canvas">
        <TemplatePreview profile={profile} templateId={profile.template_id} compact={compact} />
      </div>
    </div>
  );
}

function UploadForm({ kind, label }: { kind: "profile" | "hero" | "logo"; label: string }) {
  const [state, action, pending] = useActionState(uploadIdentityImage.bind(null, kind), initialState);
  return (
    <form action={action} className="pp-upload-row">
      <label>
        <ImagePlus aria-hidden="true" />
        <span>{label}<small>JPG, PNG ou WebP · até 5 MB</small></span>
        <input type="file" name="image" accept="image/jpeg,image/png,image/webp" required />
      </label>
      <button className="builder-secondary" disabled={pending}>{pending ? "Enviando..." : "Enviar"}</button>
      <ActionMessage state={state} />
    </form>
  );
}

function TemplateCatalogTile({
  definition,
  profile,
  entitlements,
  onCustomize,
}: {
  definition: TemplateDefinition;
  profile: TrainerProfile;
  entitlements: TrainerEntitlements;
  onCustomize: () => void;
}) {
  const [state, action, pending] = useActionState(selectTemplate.bind(null, definition.id), initialState);
  const selected = profile.template_id === definition.id;
  const allowed = entitlements[definition.entitlement];
  const available = definition.availability.production;
  const availabilityLabel = !available
    ? "Em preparação"
    : allowed
      ? "Disponível no seu plano"
      : "Não disponível no seu plano";

  return (
    <article className={`pp-template-tile${selected ? " is-selected" : ""}`}>
      <div className="pp-template-tile-preview">
        <TemplatePreview profile={profile} templateId={definition.id} compact />
        {selected ? <span className="pp-template-selected"><Check aria-hidden="true" /> Em uso</span> : null}
      </div>
      <div className="pp-template-tile-copy">
        <div><h3>{definition.name}</h3><span>{availabilityLabel}</span></div>
        <p>{definition.description}</p>
      </div>
      <div className="pp-template-tile-actions">
        <Link href={`/dashboard/preview?template=${definition.id}`}>Visualizar <ExternalLink aria-hidden="true" /></Link>
        {selected ? (
          <button type="button" className="pp-template-edit" onClick={onCustomize}>
            <Pencil aria-hidden="true" /> Editar
          </button>
        ) : available && allowed ? (
          <form action={action}>
            <button className="builder-secondary" disabled={pending}>{pending ? "Selecionando..." : "Usar template"}</button>
          </form>
        ) : <button type="button" className="builder-secondary" disabled title={available ? "Seu plano atual não libera este template." : "Este template ainda está em preparação."}>{available ? "Indisponível no plano" : "Em preparação"}</button>}
      </div>
      <ActionMessage state={state} />
    </article>
  );
}

function TemplateSelector({ profile, entitlements, onCustomize }: { profile: TrainerProfile; entitlements: TrainerEntitlements; onCustomize: () => void }) {
  return (
    <div className="pp-template-grid">
      {templateCatalog.filter(({ availability }) => availability.enabled).map((definition) => (
        <TemplateCatalogTile key={definition.id} definition={definition} profile={profile} entitlements={entitlements} onCustomize={onCustomize} />
      ))}
    </div>
  );
}

function ServiceForm({ service }: { service?: TrainerService }) {
  const [state, action, pending] = useActionState(saveService, initialState);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteService.bind(null, service?.id ?? ""), initialState);
  return (
    <div className="pp-collection-editor">
      <form action={action} className="builder-form">
        {service ? <input type="hidden" name="id" value={service.id} /> : null}
        <label>Nome do serviço<input name="title" required minLength={2} maxLength={120} defaultValue={service?.title} placeholder="Consultoria Online" /></label>
        <AssistedTextField name="description" label="Descrição do serviço" initialValue={service?.description ?? ""} suggestions={serviceDescriptionSuggestions} maxLength={1000} rows={3} />
        <label>Benefícios (opcional, um por linha)<textarea name="benefits" maxLength={2000} defaultValue={(service?.benefits ?? []).join("\n")} rows={4} /></label>
        <div className="builder-grid">
          <label>Modalidade<select name="service_mode" defaultValue={service?.service_mode ?? "both"}><option value="online">Online</option><option value="presencial">Presencial</option><option value="both">Ambos</option></select></label>
          <label>Cobrança<select name="billing_type" defaultValue={service?.billing_type ?? ""}><option value="">Não informar</option><option value="monthly">Mensal</option><option value="per_session">Por sessão</option><option value="package">Pacote</option><option value="starting_at">A partir de</option></select></label>
        </div>
        <label>Próxima ação<select name="conversion_mode" defaultValue={service?.conversion_mode ?? ""}><option value="">Usar contato padrão do perfil</option><option value="WHATSAPP">Conversar pelo WhatsApp</option><option value="INTEREST">Registrar interesse</option></select></label>
        <div className="builder-grid">
          <label>Preço em BRL (opcional)<input name="price" inputMode="decimal" defaultValue={service?.price ?? ""} placeholder="199,90" /></label>
          <label>Visibilidade<select name="price_visibility" defaultValue={service?.price_visibility ?? "hidden"}><option value="public">Mostrar no site</option><option value="match_only">Matching futuro</option><option value="hidden">Ocultar</option></select></label>
        </div>
        <label className="check-row"><input type="checkbox" name="active" defaultChecked={service?.active ?? true} /> Serviço ativo</label>
        <Submit pending={pending}>{service ? "Salvar serviço" : "Adicionar serviço"}</Submit>
        <ActionMessage state={state} />
      </form>
      {service ? <form action={deleteAction}><button className="danger-link" disabled={deletePending}><Trash2 aria-hidden="true" /> {deletePending ? "Removendo..." : "Remover serviço"}</button><ActionMessage state={deleteState} /></form> : null}
    </div>
  );
}

function MethodologyItemForm({ item, defaultPosition }: { item?: TrainerMethodologyItem; defaultPosition: number }) {
  const [state, action, pending] = useActionState(saveMethodologyItem, initialState);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteMethodologyItem.bind(null, item?.id ?? ""), initialState);
  return (
    <div className="pp-collection-editor">
      <form action={action} className="builder-form">
        {item ? <input type="hidden" name="id" value={item.id} /> : null}
        <label>Título da etapa<input name="title" required minLength={2} maxLength={120} defaultValue={item?.title} placeholder="Avaliação inicial" /></label>
        <label>Descrição<textarea name="description" required minLength={2} maxLength={1000} defaultValue={item?.description} rows={4} /></label>
        <label>Ordem<input name="position" type="number" min={0} max={999} step={1} defaultValue={item?.position ?? defaultPosition} /></label>
        <Submit pending={pending}>{item ? "Salvar etapa" : "Adicionar etapa"}</Submit>
        <ActionMessage state={state} />
      </form>
      {item ? <form action={deleteAction}><button className="danger-link" disabled={deletePending}><Trash2 aria-hidden="true" /> {deletePending ? "Removendo..." : "Remover etapa"}</button><ActionMessage state={deleteState} /></form> : null}
    </div>
  );
}

function TestimonialForm({ testimonial }: { testimonial?: Testimonial }) {
  const [state, action, pending] = useActionState(saveTestimonial, initialState);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteTestimonial.bind(null, testimonial?.id ?? ""), initialState);
  return (
    <div className="pp-collection-editor">
      <form action={action} className="builder-form">
        {testimonial ? <input type="hidden" name="id" value={testimonial.id} /> : null}
        <label>Nome do aluno<input name="student_name" required minLength={2} maxLength={100} defaultValue={testimonial?.student_name} /></label>
        <label>Depoimento<textarea name="content" required minLength={5} maxLength={2000} defaultValue={testimonial?.content} rows={4} /></label>
        <label>Resultado ou contexto (opcional)<textarea name="result_context" maxLength={500} defaultValue={testimonial?.result_context ?? ""} /></label>
        <div className="builder-grid">
          <label>Instagram do aluno (opcional)<input name="instagram_handle" maxLength={30} defaultValue={testimonial?.instagram_handle ?? ""} placeholder="usuario.do.aluno" /></label>
          <label>Link do Instagram (opcional)<input name="instagram_url" type="url" maxLength={300} defaultValue={testimonial?.instagram_url ?? ""} placeholder="https://www.instagram.com/usuario/" /></label>
        </div>
        <label>Foto opcional<input type="file" name="image" accept="image/jpeg,image/png,image/webp" /></label>
        <label className="check-row"><input type="checkbox" name="published" defaultChecked={testimonial?.published ?? false} /> Publicar no site</label>
        <Submit pending={pending}>{testimonial ? "Salvar depoimento" : "Adicionar depoimento"}</Submit>
        <ActionMessage state={state} />
      </form>
      {testimonial ? <form action={deleteAction}><button className="danger-link" disabled={deletePending}><Trash2 aria-hidden="true" /> {deletePending ? "Removendo..." : "Remover depoimento"}</button><ActionMessage state={deleteState} /></form> : null}
    </div>
  );
}

export function SiteBuilder({
  profile,
  services,
  testimonials,
  methodology,
  entitlements,
  offer,
  hasPurchaseIntent,
  demoMode = false,
}: {
  profile: TrainerProfile;
  services: TrainerService[];
  testimonials: Testimonial[];
  methodology: TrainerMethodologyItem[];
  entitlements: TrainerEntitlements;
  requests: CustomSiteRequest[];
  offer: CommercialOffer | null;
  hasPurchaseIntent: boolean;
  demoMode?: boolean;
}) {
  const [section, setSection] = useState<SiteSection>("overview");
  const [personalization, setPersonalization] = useState<PersonalizationSection>("identity");
  const [personalizationTab, setPersonalizationTab] = useState<PersonalizationTab>("appearance");
  const [presentationState, presentationAction, presentationPending] = useActionState(savePresentation, initialState);
  const [contactState, contactAction, contactPending] = useActionState(saveContact, initialState);
  const [identityState, identityAction, identityPending] = useActionState(saveIdentity, initialState);
  const [publishState, publishAction, publishPending] = useActionState(setPublication.bind(null, !profile.published), initialState);
  const [intentState, intentAction, intentPending] = useActionState(registerPurchaseIntent.bind(null, offer?.code ?? "unavailable"), initialState);
  const [addingService, setAddingService] = useState(false);
  const [addingMethodology, setAddingMethodology] = useState(false);
  const [addingTestimonial, setAddingTestimonial] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const publicPath = `/p/${profile.slug}/`;
  const offerPrice = offer ? offer.price.toLocaleString("pt-BR", { style: "currency", currency: offer.currency, maximumFractionDigits: 0 }) : null;
  const selectedTemplate = getTemplateDefinition(profile.template_id).name;
  const instagram = normalizeInstagramIdentity(profile.instagram_handle ?? profile.instagram, profile.instagram_url);

  function openEditor(next: PersonalizationSection = "identity") {
    setPersonalization(next);
    setPersonalizationTab(next === "identity" ? "appearance" : next === "organize" ? "organize" : "content");
    setSection("personalize");
  }

  async function share() {
    const url = `${window.location.origin}${publicPath}`;
    if (navigator.share) await navigator.share({ title: profile.display_name, url });
    else await navigator.clipboard.writeText(url);
  }

  return (
    <div className="pp-site-product" data-demo-workspace={demoMode || undefined}>
      <nav className="pp-site-navigation" aria-label="Seções do Meu site">
        {siteNavigation.map((item) => {
          const Icon = item.icon;
          return <button key={item.id} type="button" className={section === item.id ? "is-active" : ""} onClick={() => setSection(item.id)} aria-current={section === item.id ? "page" : undefined}><Icon aria-hidden="true" /><span>{item.label}</span></button>;
        })}
      </nav>

      {section === "overview" ? (
        <section className="pp-site-view" aria-labelledby="site-overview-title">
          <SectionHeader title="Visão geral" description="Revise como sua presença profissional aparece e mantenha o site pronto para converter visitas em contatos." />
          <div className="pp-site-overview-grid">
            <SitePreviewFrame profile={profile} />
            <aside className="pp-site-control-panel">
              <div className="pp-site-control-heading"><PublicationStatus published={profile.published} /><span>{selectedTemplate}</span></div>
              <div className="pp-site-public-address"><Globe2 aria-hidden="true" /><div><small>Endereço público</small><strong>pperfil.pro/p/{profile.slug}</strong></div></div>
              <button type="button" className="builder-primary" onClick={() => openEditor()}><Pencil aria-hidden="true" /> Editar site</button>
              <Link className="builder-secondary" href="/dashboard/preview">Visualizar <ExternalLink aria-hidden="true" /></Link>
              {profile.published ? <Link className="pp-site-text-action" href={publicPath} target="_blank">Abrir site publicado <ExternalLink aria-hidden="true" /></Link> : null}
              {entitlements.can_publish_site ? (
                <form action={publishAction}><button className={profile.published ? "builder-secondary danger" : "builder-primary"} disabled={publishPending}>{publishPending ? "Atualizando..." : profile.published ? "Tirar site do ar" : "Publicar meu site"}</button></form>
              ) : <button type="button" className="pp-site-text-action" onClick={() => setShowPaywall(true)}><LockKeyhole aria-hidden="true" /> Ver opções de publicação</button>}
              <ActionMessage state={publishState} />
              {profile.published ? <div className="pp-site-share-actions"><button type="button" onClick={() => navigator.clipboard.writeText(`${window.location.origin}${publicPath}`)}><Copy aria-hidden="true" /> Copiar</button><button type="button" onClick={share}><Share2 aria-hidden="true" /> Compartilhar</button></div> : null}
            </aside>
          </div>

          {showPaywall && !entitlements.can_publish_site ? (
            <section className="pp-publication-paywall">
              <button type="button" className="pp-paywall-close" onClick={() => setShowPaywall(false)} aria-label="Fechar">×</button>
              <p>Seu site está pronto para ir ao ar.</p><h2>Publique seu PPerfil</h2><p>Tenha uma presença profissional pronta para apresentar seus serviços e conquistar novos alunos.</p>
              {offer ? <><span>{offer.label}</span><strong>{offerPrice}</strong><small>{offer.payment_label}</small><ul>{["Site profissional", "Personalização", "Link público", "WhatsApp integrado", "Serviços", "Depoimentos", "Acesso antecipado ao PPerfil Leads Beta"].map((item) => <li key={item}><Check aria-hidden="true" /> {item}</li>)}</ul><form action={intentAction}><button className="builder-primary" disabled={intentPending || hasPurchaseIntent}>{intentPending ? "Registrando..." : hasPurchaseIntent ? "Interesse registrado" : "Quero publicar meu site"}</button></form><ActionMessage state={intentState} /><em>Pagamento online em breve. Registrar interesse não libera a publicação.</em></> : <p>A oferta está temporariamente indisponível.</p>}
            </section>
          ) : null}

          <div className="pp-site-overview-facts">
            <article><span>Contato e conversão</span><strong>{profile.whatsapp}</strong><p>{profile.instagram ? `Instagram: ${profile.instagram}` : "Instagram não informado"}</p><button type="button" onClick={() => setSection("contact")}>Revisar contato</button></article>
            <article><span>Conteúdo do site</span><strong>{services.length} serviço{services.length === 1 ? "" : "s"}</strong><p>{testimonials.length} depoimento{testimonials.length === 1 ? "" : "s"} cadastrado{testimonials.length === 1 ? "" : "s"}</p><button type="button" onClick={() => openEditor("services")}>Gerenciar conteúdo</button></article>
          </div>
        </section>
      ) : null}

      {section === "templates" ? (
        <section className="pp-site-view" aria-labelledby="site-templates-title">
          <SectionHeader title="Templates" description="Escolha a estrutura do seu site. Seus dados permanecem e você pode revisar a opção antes de trocar." />
          <TemplateSelector profile={profile} entitlements={entitlements} onCustomize={() => openEditor()} />
          <aside className="pp-site-inline-note"><LockKeyhole aria-hidden="true" /><div><strong>Templates são opções visuais do seu PPerfil</strong><p>Você pode visualizar todas as opções. A seleção depende da disponibilidade no seu plano, e a liberação comercial para publicação continua separada.</p></div></aside>
        </section>
      ) : null}

      {section === "personalize" ? (
        <section className="pp-site-view" aria-labelledby="site-personalize-title">
          <SectionHeader title={`Personalizar · ${selectedTemplate}`} description="Cuide do conteúdo, da aparência e da narrativa da página sem perder a qualidade do template." action={<Link href="/dashboard/preview">Visualizar <ExternalLink aria-hidden="true" /></Link>} />
          <nav className="pp-site-editor-tabs" aria-label="Modos de personalização">
            {([['content', 'Conteúdo'], ['appearance', 'Aparência'], ['organize', 'Organizar página']] as Array<[PersonalizationTab, string]>).map(([id, label]) => <button key={id} type="button" className={personalizationTab === id ? "is-active" : ""} aria-current={personalizationTab === id ? "page" : undefined} onClick={() => { setPersonalizationTab(id); if (id === "appearance") setPersonalization("identity"); if (id === "organize") setPersonalization("organize"); if (id === "content" && ["identity", "organize"].includes(personalization)) setPersonalization("presentation"); }}>{label}</button>)}
          </nav>

          {personalizationTab === "content" ? <div className="pp-site-editor-layout">
            <nav className="pp-site-editor-navigation" aria-label="Conteúdo do site">
              {([
                ["presentation", "Apresentação", "Textos e especialidades"],
                ["methodology", "Metodologia", `${methodology.length} etapas`],
                ["services", "Serviços", `${services.length} cadastrados`],
                ["testimonials", "Depoimentos", `${testimonials.length} cadastrados`],
              ] as Array<[PersonalizationSection, string, string]>).map(([id, label, detail]) => <button key={id} type="button" className={personalization === id ? "is-active" : ""} onClick={() => setPersonalization(id)}><span>{label}</span><small>{detail}</small></button>)}
            </nav>
            <div className="pp-site-editor-panel">
              {personalization === "presentation" ? <><header><Settings2 aria-hidden="true" /><div><h2>Apresentação</h2><p>Use sugestões ou escreva com suas palavras. Tudo continua editável.</p></div></header><form action={presentationAction} className="builder-form"><label>Nome profissional<input name="display_name" required minLength={2} maxLength={100} defaultValue={profile.display_name} /></label><HeadlineAssistant initialValue={profile.headline} /><AssistedTextField name="bio" label="Bio" initialValue={profile.bio} suggestions={bioSuggestions} maxLength={2000} rows={5} /><SpecialtyAssistant initialValue={profile.specialty} suggestions={specialtySuggestions} /><AssistedTextField name="methodology_description" label="Introdução da metodologia" initialValue={profile.methodology_description ?? ""} suggestions={methodologySuggestions} maxLength={1000} rows={4} /><AssistedTextField name="testimonials_intro" label="Introdução dos depoimentos" initialValue={profile.testimonials_intro ?? ""} suggestions={testimonialsIntroSuggestions} maxLength={500} rows={3} /><label className="check-row"><input type="checkbox" name="profile_status_enabled" defaultChecked={profile.profile_status_enabled ?? false} /> Exibir status público no site</label><div className="builder-grid"><label>Texto do status<input name="profile_status_text" maxLength={40} defaultValue={profile.profile_status_text ?? ""} placeholder="Agenda aberta" /></label><label>Tom do status<select name="profile_status_semantic_tone" defaultValue={profile.profile_status_semantic_tone ?? ""}><option value="">Selecione</option><option value="availability">Disponibilidade</option><option value="online">Online</option><option value="announcement">Anúncio</option><option value="attention">Atenção</option><option value="neutral">Neutro</option></select></label></div><input type="hidden" name="city" value={profile.city ?? ""} /><input type="hidden" name="cref" value={profile.cref ?? ""} /><label>Modalidade<select name="service_mode" defaultValue={profile.service_mode}><option value="online">Online</option><option value="presencial">Presencial</option><option value="both">Online e presencial</option></select></label><Submit pending={presentationPending}>Salvar conteúdo</Submit><ActionMessage state={presentationState} /></form></> : null}
              {personalization === "methodology" ? <><header><Settings2 aria-hidden="true" /><div><h2>Metodologia</h2><p>Cadastre somente etapas reais. A ordem menor aparece primeiro.</p></div></header><div className="pp-collection-list">{methodology.map((item) => <details key={item.id}><summary><span><strong>{item.title}</strong><small>Ordem {item.position}</small></span><Pencil aria-hidden="true" /></summary><MethodologyItemForm item={item} defaultPosition={item.position} /></details>)}{addingMethodology ? <MethodologyItemForm defaultPosition={(methodology[methodology.length - 1]?.position ?? 0) + 10} /> : <button type="button" className="builder-secondary" onClick={() => setAddingMethodology(true)}><Plus aria-hidden="true" /> Adicionar etapa</button>}</div></> : null}
              {personalization === "services" ? <><header><Settings2 aria-hidden="true" /><div><h2>Serviços</h2><p>Organize as ofertas apresentadas no seu site.</p></div></header><div className="pp-collection-list">{services.map((service) => <details key={service.id}><summary><span><strong>{service.title}</strong><small>{service.active ? "Ativo" : "Inativo"} · {service.price_visibility === "public" ? "preço público" : "preço privado"}</small></span><Pencil aria-hidden="true" /></summary><ServiceForm service={service} /></details>)}{addingService ? <ServiceForm /> : <button type="button" className="builder-secondary" onClick={() => setAddingService(true)}><Plus aria-hidden="true" /> Adicionar serviço</button>}</div></> : null}
              {personalization === "testimonials" ? <><header><Settings2 aria-hidden="true" /><div><h2>Depoimentos</h2><p>Gerencie relatos reais e, quando autorizado, conecte a identidade do aluno no Instagram.</p></div></header><div className="pp-collection-list"><p className="section-help">Instagram é opcional. Google Reviews permanece como integração futura.</p>{testimonials.map((testimonial) => <details key={testimonial.id}><summary><span><strong>{testimonial.student_name}</strong><small>{testimonial.published ? "Publicado" : "Rascunho"}{testimonial.instagram_handle ? ` · @${testimonial.instagram_handle}` : ""}</small></span><Pencil aria-hidden="true" /></summary><TestimonialForm testimonial={testimonial} /></details>)}{addingTestimonial ? <TestimonialForm /> : <button type="button" className="builder-secondary" onClick={() => setAddingTestimonial(true)}><Plus aria-hidden="true" /> Adicionar depoimento</button>}</div></> : null}
            </div>
          </div> : null}

          {personalizationTab === "appearance" ? <div className="pp-site-editor-panel pp-site-editor-panel--standalone"><header><Settings2 aria-hidden="true" /><div><h2>Aparência</h2><p>Atualize as imagens e a cor aplicada ao template.</p></div></header><div className="pp-upload-stack"><UploadForm kind="profile" label="Foto de perfil" /><UploadForm kind="hero" label="Imagem principal" /><UploadForm kind="logo" label="Logo opcional" /></div><form action={identityAction} className="builder-form pp-color-form"><label>Cor da marca<input type="color" name="primary_color" defaultValue={profile.primary_color} /></label><p className="section-help">A cor é aplicada como acento; a composição original do template permanece protegida.</p><Submit pending={identityPending}>Salvar aparência</Submit><ActionMessage state={identityState} /></form></div> : null}

          {personalizationTab === "organize" ? <SiteSectionOrganizer key={profile.template_id} profile={profile} /> : null}
        </section>
      ) : null}

      {section === "contact" ? (
        <section className="pp-site-view" aria-labelledby="site-contact-title">
          <SectionHeader title="Contato e conversão" description="Mantenha os canais usados pelos visitantes para falar com você." />
          <div className="pp-site-contact-layout">
            <form action={contactAction} className="builder-form pp-site-contact-form"><label>WhatsApp<input name="whatsapp" required inputMode="tel" defaultValue={profile.whatsapp} /></label><label>Instagram — usuário<input name="instagram_handle" maxLength={30} defaultValue={instagram.handle ?? ""} placeholder="seu.usuario" /><small>Informe sem o @.</small></label><label>Instagram — link<input name="instagram_url" type="url" maxLength={300} defaultValue={instagram.url ?? ""} placeholder="https://www.instagram.com/seu.usuario/" /></label><Submit pending={contactPending}>Salvar contato</Submit><ActionMessage state={contactState} /></form>
            <aside><MessageCircle aria-hidden="true" /><h2>Link do seu site</h2><p>pperfil.pro/p/{profile.slug}</p><div><button type="button" onClick={() => navigator.clipboard.writeText(`${window.location.origin}${publicPath}`)}><Copy aria-hidden="true" /> Copiar link</button><button type="button" onClick={share}><Share2 aria-hidden="true" /> Compartilhar</button></div></aside>
          </div>
        </section>
      ) : null}

      {section === "performance" ? (
        <section className="pp-site-view" aria-labelledby="site-performance-title">
          <SectionHeader title="Desempenho" description="Acompanhe os dados reais do seu site quando as métricas estiverem disponíveis." />
          <EmptyState icon={BarChart3} title="Métricas ainda não disponíveis" description="Assim que o acompanhamento de visitas e conversões estiver ativo, os dados aparecerão aqui — sem estimativas ou informações fictícias." />
        </section>
      ) : null}
    </div>
  );
}
