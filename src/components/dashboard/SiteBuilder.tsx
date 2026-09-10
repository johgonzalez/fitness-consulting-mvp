"use client";

import {
  BarChart3,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  Copy,
  ExternalLink,
  Globe2,
  ImagePlus,
  LockKeyhole,
  MessageCircle,
  Pencil,
  Plus,
  Settings2,
  Share2,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState, useEffect, useRef, useState, type FormHTMLAttributes, type ReactNode } from "react";
import {
  deleteService,
  deleteMethodologyItem,
  deleteTestimonial,
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
import { EmptyState, SectionHeader, FeedbackMessage } from "@/components/ui/PPerfilPrimitives";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { AIAssistButton } from "@/components/dashboard/AIAssistButton";
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
import { type TemplateDefinition } from "@/lib/domain/template-registry";
import { curatedSiteTemplates, getSiteTemplatePresentation } from "@/lib/domain/site-template-presentation";
import { normalizeSiteEditorSection, siteEditorTab, type SiteEditorSection } from "@/lib/navigation/site-editor";

import styles from "./SiteEditorNavigation.module.css";

const initialState: SiteActionState = {};

type EditorDestination = SiteEditorSection | "contact";
const editorDestinations: Array<{ id: EditorDestination; label: string; detail: string }> = [
  { id: "presentation", label: "Apresentação", detail: "Textos e especialidades" },
  { id: "methodology", label: "Metodologia", detail: "Etapas do seu acompanhamento" },
  { id: "services", label: "Serviços", detail: "Ofertas e valores" },
  { id: "testimonials", label: "Depoimentos", detail: "Relatos dos seus alunos" },
  { id: "identity", label: "Aparência", detail: "Imagens e cor da marca" },
  { id: "organize", label: "Seções", detail: "Ordem e visibilidade" },
  { id: "contact", label: "Contato", detail: "WhatsApp e Instagram" },
];

function EditorNavigation({ active, onSelect }: { active: EditorDestination; onSelect: (destination: EditorDestination) => void }) {
  const disclosure = useRef<HTMLDetailsElement>(null);
  const current = editorDestinations.find(({ id }) => id === active)!;
  return <details ref={disclosure} className={styles.navigation}>
    <summary><span>Editar: <strong>{current.label}</strong></span><ChevronDown aria-hidden="true" /></summary>
    <nav aria-label="Editar site">
      {editorDestinations.map(({ id, label, detail }) => <button key={id} type="button" aria-current={active === id ? "page" : undefined} onClick={() => {
        if (disclosure.current) disclosure.current.open = false;
        onSelect(id);
      }}><span><strong>{label}</strong><small>{detail}</small></span>{active === id ? <Check aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}</button>)}
    </nav>
  </details>;
}

type SiteSection = "overview" | "templates" | "personalize" | "contact" | "performance" | "publication";
const siteSections: SiteSection[] = ["overview", "templates", "personalize", "contact", "performance", "publication"];

function ActionMessage({ state }: { state: SiteActionState }) {
  return state.message ? <FeedbackMessage tone={state.ok ? "success" : "danger"}>{state.message}</FeedbackMessage> : null;
}

function Submit({ pending, children }: { pending: boolean; children: ReactNode }) {
  return (
    <button className="builder-primary" disabled={pending}>
      {pending ? "Salvando..." : children}
    </button>
  );
}

function DestructiveAction({ action, pending, state, label, title, description }: {
  action: NonNullable<FormHTMLAttributes<HTMLFormElement>["action"]>;
  pending: boolean;
  state: SiteActionState;
  label: string;
  title: string;
  description: string;
}) {
  const [open, setOpen] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  return <><form ref={form} action={action}><button type="button" className="danger-link" disabled={pending} onClick={() => setOpen(true)}><Trash2 aria-hidden="true" /> {pending ? "Removendo..." : label}</button><ActionMessage state={state} /></form><ConfirmationDialog open={open} title={title} description={description} confirmLabel="Remover" pending={pending} onCancel={() => setOpen(false)} onConfirm={() => { setOpen(false); form.current?.requestSubmit(); }} /></>;
}

function PublicationStatus({ published }: { published: boolean }) {
  return (
    <span className={`pp-publication-status ${published ? "is-published" : "is-draft"}`}>
      <span aria-hidden="true" />
      {published ? "Publicado" : "Rascunho"}
    </span>
  );
}

function SitePreviewFrame({ profile }: { profile: TrainerProfile }) {
  return <Link href="/dashboard/preview?returnView=overview" className="cheipi-site-cover" aria-label="Visualizar seu site completo">
    <TemplatePreview profile={profile} templateId={profile.template_id} />
    <span>Ver meu site <ChevronRight aria-hidden="true" /></span>
  </Link>;
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
  const [state, action, pending] = useActionState(async (previous: SiteActionState) => {
    const result = await selectTemplate(definition.id, previous);
    if (result.ok) onCustomize();
    return result;
  }, initialState);
  const selected = profile.template_id === definition.id;
  const display = getSiteTemplatePresentation(definition.id);
  const allowed = entitlements[definition.entitlement];
  const available = definition.availability.production;
  const availabilityLabel = !available
    ? "Em preparação"
    : allowed
      ? "Disponível no seu plano"
      : "Não disponível no seu plano";

  return (
    <article className={`pp-template-tile${selected ? " is-selected" : ""}`} data-template={definition.id}>
      <div className="pp-template-tile-preview">
        <iframe src={`/site-preview?template=${definition.id}`} title={`Prévia de ${display.name}`} loading="lazy" tabIndex={-1} inert />
        {selected ? <span className="pp-template-selected"><Check aria-hidden="true" /> Em uso</span> : null}
      </div>
      <div className="pp-template-tile-copy">
        <div><h3>{display.name}</h3><span>{availabilityLabel}</span></div>
        <strong className="pp-template-positioning">{display.purpose}</strong>
        <p>{display.description}</p>
      </div>
      <div className="pp-template-tile-actions">
        <Link href={`/dashboard/preview?template=${definition.id}&returnView=templates`}>Visualizar <ExternalLink aria-hidden="true" /></Link>
        {selected ? (
          <button type="button" className="pp-template-edit" onClick={onCustomize}>
            <Pencil aria-hidden="true" /> Editar
          </button>
        ) : available && allowed ? (
          <form action={action}>
            <button className="builder-secondary" disabled={pending}>{pending ? "Selecionando..." : "Escolher este modelo"}</button>
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
      {curatedSiteTemplates().map((definition) => (
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
      {service ? <DestructiveAction action={deleteAction} pending={deletePending} state={deleteState} label="Remover serviço" title="Remover este serviço?" description="O serviço deixará de aparecer no editor e no site publicado. Esta ação não pode ser desfeita." /> : null}
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
        <label>Descrição<textarea name="description" required minLength={2} maxLength={1000} defaultValue={item?.description} rows={4} /></label><AIAssistButton compact />
        <label>Ordem<input name="position" type="number" min={0} max={999} step={1} defaultValue={item?.position ?? defaultPosition} /></label>
        <Submit pending={pending}>{item ? "Salvar etapa" : "Adicionar etapa"}</Submit>
        <ActionMessage state={state} />
      </form>
      {item ? <DestructiveAction action={deleteAction} pending={deletePending} state={deleteState} label="Remover etapa" title="Remover esta etapa?" description="A etapa será removida da metodologia apresentada no seu site. Esta ação não pode ser desfeita." /> : null}
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
      {testimonial ? <DestructiveAction action={deleteAction} pending={deletePending} state={deleteState} label="Remover depoimento" title="Remover este depoimento?" description="O relato será removido do editor e do site publicado. Esta ação não pode ser desfeita." /> : null}
    </div>
  );
}

export function SiteBuilder({
  profile,
  services,
  testimonials,
  methodology,
  entitlements,
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
  const searchParams = useSearchParams();
  const requestedSection = searchParams.get("view") as SiteSection;
  const section = siteSections.includes(requestedSection) ? requestedSection : "overview";
  const personalization = normalizeSiteEditorSection(searchParams.get("editor"));
  const personalizationTab = siteEditorTab(personalization);
  const activeEditor: EditorDestination = section === "contact" ? "contact" : personalization;
  const editorLabel = editorDestinations.find(({ id }) => id === activeEditor)!.label;
  const editorContent = useRef<HTMLDivElement>(null);
  const previousEditor = useRef(`${section}:${personalization}`);
  useEffect(() => {
    const destination = `${section}:${personalization}`;
    if (previousEditor.current === destination) return;
    previousEditor.current = destination;
    if (section === "personalize" || section === "contact") editorContent.current?.focus({ preventScroll: true });
  }, [section, personalization]);
  function setSection(next: SiteSection, editor: SiteEditorSection = personalization) {
    const url = new URL(window.location.href);
    if (next === "overview") url.searchParams.delete("view");
    else url.searchParams.set("view", next);
    if (next === "personalize") url.searchParams.set("editor", editor);
    else url.searchParams.delete("editor");
    window.history.pushState(null, "", url.pathname + url.search);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function chooseEditor(next: EditorDestination) {
    if (next === activeEditor) {
      editorContent.current?.focus({ preventScroll: true });
      return;
    }
    if (next === "contact") setSection("contact");
    else setSection("personalize", next);
  }
  const [presentationState, presentationAction, presentationPending] = useActionState(savePresentation, initialState);
  const [contactState, contactAction, contactPending] = useActionState(saveContact, initialState);
  const [identityState, identityAction, identityPending] = useActionState(saveIdentity, initialState);
  const [publishState, publishAction, publishPending] = useActionState(setPublication.bind(null, !profile.published), initialState);
  const [addingService, setAddingService] = useState(false);
  const [addingMethodology, setAddingMethodology] = useState(false);
  const [addingTestimonial, setAddingTestimonial] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const publicPath = `/p/${profile.slug}/`;
  const selectedTemplate = getSiteTemplatePresentation(profile.template_id).name;
  const [shareMessage, setShareMessage] = useState("");
  const instagram = normalizeInstagramIdentity(profile.instagram_handle ?? profile.instagram, profile.instagram_url);

  function openEditor(next: SiteEditorSection = "presentation") {
    setSection("personalize", next);
  }

  async function copyLink() {
    try { await navigator.clipboard.writeText(`${window.location.origin}${publicPath}`); setShareMessage("Link copiado."); }
    catch { setShareMessage("Não foi possível copiar. Selecione o endereço do seu site para copiá-lo."); }
  }

  async function share() {
    const url = `${window.location.origin}${publicPath}`;
    try {
      if (navigator.share) await navigator.share({ title: profile.display_name, url });
      else await copyLink();
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) setShareMessage("Não foi possível compartilhar. Tente copiar o link.");
    }
  }

  return (
    <div className={`pp-site-product cheipi-site-builder ${styles.root}`} data-view={section} data-demo-workspace={demoMode || undefined}>
      {section !== "overview" ? <button type="button" className="cheipi-back" onClick={() => setSection(section === "contact" ? "personalize" : "overview")}><ChevronLeft aria-hidden="true" />{section === "contact" ? "Editor do site" : "Meu site"}</button> : null}
      {shareMessage ? <p role="status" className="builder-message">{shareMessage}</p> : null}

      {section === "overview" ? (
        <section className="pp-site-view" aria-label="Seu site">
          <div className="cheipi-site-summary"><PublicationStatus published={profile.published} /><span>cheipi.com/p/{profile.slug}</span></div>
          <SitePreviewFrame profile={profile} />
          <nav className="cheipi-task-list cheipi-site-steps" aria-label="Preparar seu site">
            <button type="button" onClick={() => setSection("templates")}><i>1</i><span><strong>Modelo</strong><small>{selectedTemplate}</small></span><ChevronRight aria-hidden="true" /></button>
            <button type="button" onClick={() => openEditor()}><i>2</i><span><strong>Conteúdo e aparência</strong><small>Apresentação, serviços e contato</small></span><ChevronRight aria-hidden="true" /></button>
            <button type="button" onClick={() => setSection("publication")}><i>3</i><span><strong>{profile.published ? "Publicação e link" : "Publicar"}</strong><small>{profile.published ? "Seu site está no ar" : "Confira antes de compartilhar"}</small></span><ChevronRight aria-hidden="true" /></button>
          </nav>
          <Link className="builder-primary cheipi-site-preview-action" href="/dashboard/preview?returnView=overview">Visualizar meu site<ExternalLink aria-hidden="true" /></Link>
          <button type="button" className="cheipi-site-metrics" onClick={() => setSection("performance")}><BarChart3 aria-hidden="true" />Desempenho do site</button>
        </section>
      ) : null}

      {section === "publication" ? (
        <section className="pp-site-view" aria-label="Publicação">
          <SectionHeader title={profile.published ? "Seu site está no ar" : "Pronto para compartilhar?"} description={profile.published ? "Compartilhe seu link ou continue editando." : "Confira a prévia e publique quando estiver pronto."} />
          <div className="pp-site-overview-grid">
            <aside className="pp-site-control-panel">
              <div className="pp-site-control-heading"><PublicationStatus published={profile.published} /><span>{selectedTemplate}</span></div>
              <div className="pp-site-public-address"><Globe2 aria-hidden="true" /><div><small>Endereço público</small><strong>cheipi.com/p/{profile.slug}</strong></div></div>
              <button type="button" className="builder-primary" onClick={() => openEditor()}><Pencil aria-hidden="true" /> Editar site</button>
              <Link className="builder-secondary" href="/dashboard/preview?returnView=publication">Visualizar <ExternalLink aria-hidden="true" /></Link>
              {profile.published ? <Link className="pp-site-text-action" href={publicPath} target="_blank">Abrir site publicado <ExternalLink aria-hidden="true" /></Link> : null}
              {entitlements.can_publish_site ? (
                <form action={publishAction}><button className={profile.published ? "builder-secondary danger" : "builder-primary"} disabled={publishPending}>{publishPending ? "Atualizando..." : profile.published ? "Tirar site do ar" : "Publicar meu site"}</button></form>
              ) : <button type="button" className="pp-site-text-action" onClick={() => setShowPaywall(true)}><LockKeyhole aria-hidden="true" /> Ver opções de publicação</button>}
              <ActionMessage state={publishState} />
              {profile.published ? <div className="pp-site-share-actions"><button type="button" onClick={copyLink}><Copy aria-hidden="true" /> Copiar</button><button type="button" onClick={share}><Share2 aria-hidden="true" /> Compartilhar</button></div> : null}
            </aside>
          </div>

          {showPaywall && !entitlements.can_publish_site ? (
            <section className="pp-publication-paywall">
              <h2>Publicação com Cheipi Pro</h2>
              <p>Veja seu plano e as opções disponíveis para publicar. Seu rascunho continua salvo.</p>
              <Link className="builder-primary" href="/dashboard/settings/billing">Ver plano e cobrança</Link>
              <button type="button" className="pp-site-text-action" onClick={() => setShowPaywall(false)}>Continuar editando depois</button>
            </section>
          ) : null}

        </section>
      ) : null}

      {section === "templates" ? (
        <section className="pp-site-view" aria-label="Modelos do site">
          <SectionHeader title="Escolha seu modelo" description="Três formas de apresentar seu trabalho. Explore antes de escolher." />
          <TemplateSelector profile={profile} entitlements={entitlements} onCustomize={() => openEditor()} />
          <p className="cheipi-site-note">Seus textos e serviços são mantidos ao trocar de modelo. Confira a prévia para revisar a apresentação.</p>
        </section>
      ) : null}

      {section === "personalize" ? (
        <section className="pp-site-view" aria-label="Personalização do site">
          <SectionHeader title="Do seu jeito" description="Salve as alterações e confira como ficam no seu site." action={<Link href={`/dashboard/preview?returnView=personalize&returnEditor=${personalization}`}>Visualizar <ExternalLink aria-hidden="true" /></Link>} />
          <EditorNavigation active={activeEditor} onSelect={chooseEditor} />
          <div ref={editorContent} className={styles.editorContent} tabIndex={-1} role="region" aria-label={`Editor de ${editorLabel}`}>
          {personalizationTab === "content" ? <div className={styles.contentLayout}>
            <div className="pp-site-editor-panel">
              {personalization === "presentation" ? <><header><Settings2 aria-hidden="true" /><div><h2>Apresentação</h2><p>Use sugestões ou escreva com suas palavras. Tudo continua editável.</p></div></header><form action={presentationAction} className="builder-form"><label>Nome profissional<input name="display_name" required minLength={2} maxLength={100} defaultValue={profile.display_name} /></label><HeadlineAssistant initialValue={profile.headline} /><AssistedTextField name="bio" label="Bio" initialValue={profile.bio} suggestions={bioSuggestions} maxLength={2000} rows={5} /><SpecialtyAssistant initialValue={profile.specialty} suggestions={specialtySuggestions} /><AssistedTextField name="methodology_description" label="Introdução da metodologia" initialValue={profile.methodology_description ?? ""} suggestions={methodologySuggestions} maxLength={1000} rows={4} /><AssistedTextField name="testimonials_intro" label="Introdução dos depoimentos" initialValue={profile.testimonials_intro ?? ""} suggestions={testimonialsIntroSuggestions} maxLength={500} rows={3} /><label className="check-row"><input type="checkbox" name="profile_status_enabled" defaultChecked={profile.profile_status_enabled ?? false} /> Exibir status público no site</label><div className="builder-grid"><label>Texto do status<input name="profile_status_text" maxLength={40} defaultValue={profile.profile_status_text ?? ""} placeholder="Agenda aberta" /></label><label>Tom do status<select name="profile_status_semantic_tone" defaultValue={profile.profile_status_semantic_tone ?? ""}><option value="">Selecione</option><option value="availability">Disponibilidade</option><option value="online">Online</option><option value="announcement">Anúncio</option><option value="attention">Atenção</option><option value="neutral">Neutro</option></select></label></div><input type="hidden" name="city" value={profile.city ?? ""} /><input type="hidden" name="cref" value={profile.cref ?? ""} /><label>Modalidade<select name="service_mode" defaultValue={profile.service_mode}><option value="online">Online</option><option value="presencial">Presencial</option><option value="both">Online e presencial</option></select></label><Submit pending={presentationPending}>Salvar conteúdo</Submit><ActionMessage state={presentationState} /></form></> : null}
              {personalization === "methodology" ? <><header><Settings2 aria-hidden="true" /><div><h2>Metodologia</h2><p>Cadastre de 1 a 5 etapas reais. A ordem menor aparece primeiro.</p></div></header><div className="pp-collection-list">{methodology.map((item) => <details key={item.id}><summary><span><strong>{item.title}</strong><small>Ordem {item.position}</small></span><Pencil aria-hidden="true" /></summary><MethodologyItemForm item={item} defaultPosition={item.position} /></details>)}{addingMethodology ? <MethodologyItemForm defaultPosition={(methodology[methodology.length - 1]?.position ?? 0) + 10} /> : methodology.length < 5 ? <button type="button" className="builder-secondary" onClick={() => setAddingMethodology(true)}><Plus aria-hidden="true" /> Adicionar etapa</button> : <p className="section-help">Limite de 5 etapas atingido.</p>}</div></> : null}
              {personalization === "services" ? <><header><Settings2 aria-hidden="true" /><div><h2>Serviços</h2><p>Organize as ofertas apresentadas no seu site.</p></div></header><div className="pp-collection-list">{services.map((service) => <details key={service.id}><summary><span><strong>{service.title}</strong><small>{service.active ? "Ativo" : "Inativo"} · {service.price_visibility === "public" ? "preço público" : "preço privado"}</small></span><Pencil aria-hidden="true" /></summary><ServiceForm service={service} /></details>)}{addingService ? <ServiceForm /> : <button type="button" className="builder-secondary" onClick={() => setAddingService(true)}><Plus aria-hidden="true" /> Adicionar serviço</button>}</div></> : null}
              {personalization === "testimonials" ? <><header><Settings2 aria-hidden="true" /><div><h2>Depoimentos</h2><p>Gerencie relatos reais e, quando autorizado, conecte a identidade do aluno no Instagram.</p></div></header><div className="pp-collection-list"><p className="section-help">Instagram é opcional. Google Reviews permanece como integração futura.</p>{testimonials.map((testimonial) => <details key={testimonial.id}><summary><span><strong>{testimonial.student_name}</strong><small>{testimonial.published ? "Publicado" : "Rascunho"}{testimonial.instagram_handle ? ` · @${testimonial.instagram_handle}` : ""}</small></span><Pencil aria-hidden="true" /></summary><TestimonialForm testimonial={testimonial} /></details>)}{addingTestimonial ? <TestimonialForm /> : <button type="button" className="builder-secondary" onClick={() => setAddingTestimonial(true)}><Plus aria-hidden="true" /> Adicionar depoimento</button>}</div></> : null}
            </div>
          </div> : null}

          {personalizationTab === "appearance" ? <div className="pp-site-editor-panel pp-site-editor-panel--standalone"><header><Settings2 aria-hidden="true" /><div><h2>Aparência</h2><p>Atualize as imagens e a cor aplicada ao template.</p></div></header><div className="pp-upload-stack"><UploadForm kind="profile" label="Foto de perfil" /><UploadForm kind="hero" label="Imagem principal" /><UploadForm kind="logo" label="Logo opcional" /></div><form action={identityAction} className="builder-form pp-color-form"><label>Cor da marca<input type="color" name="primary_color" defaultValue={profile.primary_color} /></label><p className="section-help">A cor é aplicada como acento; a composição original do template permanece protegida.</p><Submit pending={identityPending}>Salvar aparência</Submit><ActionMessage state={identityState} /></form></div> : null}

          {personalizationTab === "organize" ? <SiteSectionOrganizer key={profile.template_id} profile={profile} /> : null}
          </div>
        </section>
      ) : null}

      {section === "contact" ? (
        <section className="pp-site-view" aria-label="Contato e conversão">
          <SectionHeader title="Contato e conversão" description="Mantenha os canais usados pelos visitantes para falar com você." />
          <EditorNavigation active="contact" onSelect={chooseEditor} />
          <div ref={editorContent} className={`pp-site-contact-layout ${styles.editorContent}`} tabIndex={-1} role="region" aria-label="Editor de contato">
            <form action={contactAction} className="builder-form pp-site-contact-form"><label>WhatsApp<input name="whatsapp" required inputMode="tel" defaultValue={profile.whatsapp} /></label><label>Instagram — usuário<input name="instagram_handle" maxLength={30} defaultValue={instagram.handle ?? ""} placeholder="seu.usuario" /><small>Informe sem o @.</small></label><label>Instagram — link<input name="instagram_url" type="url" maxLength={300} defaultValue={instagram.url ?? ""} placeholder="https://www.instagram.com/seu.usuario/" /></label><Submit pending={contactPending}>Salvar contato</Submit><ActionMessage state={contactState} /></form>
        <aside><MessageCircle aria-hidden="true" /><h2>Link do seu site</h2><p>cheipi.com/p/{profile.slug}</p><div><button type="button" onClick={copyLink}><Copy aria-hidden="true" /> Copiar link</button><button type="button" onClick={share}><Share2 aria-hidden="true" /> Compartilhar</button></div></aside>
          </div>
        </section>
      ) : null}

      {section === "performance" ? (
        <section className="pp-site-view" aria-label="Desempenho do site">
          <SectionHeader title="Desempenho" description="Acompanhe os dados reais do seu site quando as métricas estiverem disponíveis." />
          <EmptyState icon={BarChart3} title="Métricas ainda não disponíveis" description="O acompanhamento de visitas e conversões ainda não está disponível." />
        </section>
      ) : null}
    </div>
  );
}
