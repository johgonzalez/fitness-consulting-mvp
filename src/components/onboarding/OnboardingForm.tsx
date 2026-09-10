"use client";

import { ArrowLeft, Check, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { logout } from "@/app/actions/auth";
import { checkOnboardingSlugAvailability, requestOnboardingPublication, saveOnboardingIdentity, saveOnboardingProfessional, saveOnboardingSlug, saveOnboardingSocial, saveOnboardingTemplate, type OnboardingActionState } from "@/app/actions/onboarding";
import { BillingCheckoutButton } from "@/components/billing/BillingCheckoutButton";
import { SiteShareActions } from "@/components/onboarding/SiteShareActions";
import { InviteStudentForm } from "@/components/students/InviteStudentForm";
import { templateCatalog } from "@/lib/domain/template-registry";
import { curatedSiteTemplates, getSiteTemplatePresentation } from "@/lib/domain/site-template-presentation";
import type { TrainerProfile } from "@/lib/domain/trainer";
import { stageOf, type OnboardingStage } from "@/lib/onboarding/stages";
import { normalizeTrainerSlug, TRAINER_SLUG_MAX_LENGTH } from "@/lib/validation/trainer-slug";

export type OnboardingDraft={display_name?:string|null;full_name?:string|null;birth_date?:string|null;preferred_name?:string|null;pronouns?:string|null;professional_name?:string|null;profile_image_url?:string|null;specialty_code?:string|null;specialty_label?:string|null;service_mode?:string|null;city?:string|null;cref?:string|null;whatsapp?:string|null;instagram?:string|null;tiktok?:string|null;youtube?:string|null;requested_slug?:string|null;template_id?:string|null;identity_completed_at?:string|null;professional_completed_at?:string|null;social_completed_at?:string|null;slug_completed_at?:string|null;template_completed_at?:string|null};
type Props={draft:OnboardingDraft|null;profile:TrainerProfile|null;billing:{billing_state?:string;product_code?:string}|null;canPublish:boolean;studentActivation:"none"|"pending"|"active";publicUrl:string|null;step?:string;checkout?:string};
type EditableStage=Extract<OnboardingStage,"identity"|"professional"|"social"|"slug"|"template">;
const initial:OnboardingActionState={};

function useOnboardingStepFocus<T extends HTMLElement>(step: string | null) {
  const containerRef = useRef<T>(null);
  const previousStep = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (previousStep.current === step) return;
    previousStep.current = step;
    if (step === null) return;
    const heading = Array.from(containerRef.current?.querySelectorAll<HTMLElement>("h1") ?? [])
      .find((candidate) => !candidate.closest("[hidden]"));
    if (!heading) return;
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
    // Immediate positioning also respects reduced motion and keeps the progress visible.
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [step]);
  return containerRef;
}



function OnboardingProgress({stage,phase="specialty"}:{stage:OnboardingStage;phase?:"specialty"|"service"}) {
  const requiredStep = stage === "identity" ? 1 : stage === "professional" ? (phase === "specialty" ? 2 : 3) : stage === "social" ? 4 : stage === "slug" ? 5 : stage === "template" ? 6 : null;
  return <div className="pc-entry-progress">
    <div><span>{requiredStep ? "Seu perfil de personal" : <><Check aria-hidden="true"/>Perfil pronto</>}</span><small>{requiredStep ? `${requiredStep} de 6` : stage === "publication" ? "Publicação opcional" : stage === "student" ? "Convite opcional" : "Tudo pronto"}</small></div>
    {requiredStep ? <progress aria-label={`Configuração do perfil, etapa ${requiredStep} de 6`} max={6} value={requiredStep} /> : null}
  </div>;
}

function OptionalFields({title,description,hasValues,children}:{title:string;description:string;hasValues:boolean;children:React.ReactNode}) {
  return <details className="pc-entry-optional" open={hasValues || undefined}>
    <summary><span><strong>{title}</strong><small>{description}</small></span><ChevronDown aria-hidden="true"/></summary>
    <div>{children}</div>
  </details>;
}

function TemplateChoices({draft,profile}:Pick<Props,"draft"|"profile">) {
  const curated = curatedSiteTemplates();
  const selectedId = draft?.template_id ?? profile?.template_id ?? "template_01";
  const previousTemplate = templateCatalog.find(template => template.id === selectedId && !curated.some(option => option.id === template.id));
  return <fieldset className="pc-entry-templates"><legend>Escolha o estilo do seu site</legend>
    {previousTemplate ? <label className="pc-entry-current-template"><input type="radio" name="template_id" value={previousTemplate.id} defaultChecked/><span><strong>Manter meu modelo atual</strong><small>{getSiteTemplatePresentation(previousTemplate.id).name}</small></span><Check aria-hidden="true"/></label> : null}
    <div className="pc-template-options">{curated.map((template,index)=> {
      const presentation = getSiteTemplatePresentation(template.id);
      return <label key={template.id} className="pc-template-choice" data-template={template.id}>
        <input type="radio" name="template_id" value={template.id} defaultChecked={selectedId===template.id}/>
        <span className="pc-entry-template-number" aria-hidden="true">{String(index+1).padStart(2,"0")}</span>
        <span className="pc-entry-template-copy"><small>{presentation.purpose}</small><strong>{presentation.name}</strong><span>{presentation.description}</span></span>
        <span className="pc-entry-template-check" aria-hidden="true"><Check/></span>
      </label>;
    })}</div>
  </fieldset>;
}

function BackButton({onClick}:{onClick:()=>void}){return <button type="button" className="pc-onboarding-back" onClick={onClick}><ArrowLeft aria-hidden="true"/>Voltar</button>}
function ExitButton(){return <button type="submit" form="onboarding-exit" formAction={logout} formNoValidate className="pc-onboarding-exit">Sair</button>}

function SubmitForm({action,children,submit,onBack}:{action:(state:OnboardingActionState,data:FormData)=>Promise<OnboardingActionState>;children:React.ReactNode;submit:string;onBack?:()=>void}){const[state,formAction,pending]=useActionState(action,initial);return <form action={formAction} className="pc-onboarding-step" aria-busy={pending}>{children}{state.message?<p className="form-message" role="status">{state.message}</p>:null}<div className="pc-onboarding-actions">{onBack?<BackButton onClick={onBack}/>:null}<ExitButton/><button className="pc-onboarding-primary" disabled={pending}>{pending?"Salvando…":submit}</button></div></form>}

function ProfessionalForm({draft,onBack,initialPhase="specialty"}:{draft:OnboardingDraft|null;onBack:()=>void;initialPhase?:"specialty"|"service"}){const[state,formAction,pending]=useActionState(saveOnboardingProfessional,initial);const[phase,setPhase]=useState<"specialty"|"service">(initialPhase);const[custom,setCustom]=useState(draft?.specialty_code==="custom");const stepRef=useOnboardingStepFocus<HTMLFormElement>(phase);return <form ref={stepRef} action={formAction} onSubmit={event=>{if(phase==="specialty"){event.preventDefault();setPhase("service")}}} className="pc-onboarding-step" aria-busy={pending}><OnboardingProgress stage="professional" phase={phase}/>
  <section hidden={phase!=="specialty"} className="pc-onboarding-substep"><header><span>Seu trabalho</span><h1>Qual é sua especialidade?</h1><p>Escolha a área que melhor representa seu trabalho hoje.</p></header><label>Especialidade principal<select name="specialty_code" defaultValue={draft?.specialty_code??"hypertrophy"} onChange={e=>setCustom(e.target.value==="custom")}><option value="hypertrophy">Hipertrofia</option><option value="weight_loss">Emagrecimento</option><option value="strength">Força</option><option value="conditioning">Condicionamento</option><option value="running">Corrida</option><option value="mobility">Mobilidade</option><option value="custom">Outra especialidade</option></select></label>{custom?<label>Qual especialidade? *<input name="custom_specialty" defaultValue={draft?.specialty_label??""} required minLength={2} maxLength={120}/></label>:null}</section>
  <section hidden={phase!=="service"} className="pc-onboarding-substep"><header><span>Seu atendimento</span><h1>Como você atende seus alunos?</h1></header><fieldset className="pc-mode-fieldset"><legend>Formato de atendimento</legend><div>{[["online","Online"],["presencial","Presencial"],["both","Híbrido"]].map(([value,label])=><label key={value}><input type="radio" name="service_mode" value={value} defaultChecked={(draft?.service_mode??"both")===value} required/><span>{label}</span></label>)}</div></fieldset><OptionalFields title="Cidade e registro profissional" description="Você pode completar depois" hasValues={Boolean(draft?.city||draft?.cref)}><label>Cidade <input name="city" defaultValue={draft?.city??""} maxLength={120} autoComplete="address-level2"/></label><label>CREF <input name="cref" defaultValue={draft?.cref??""} maxLength={60}/></label></OptionalFields></section>
  {state.message?<p className="form-message" role="status">{state.message}</p>:null}<div className="pc-onboarding-actions">{phase==="specialty"?<BackButton onClick={onBack}/>:<BackButton onClick={()=>setPhase("specialty")}/>}<ExitButton/><button type="submit" className="pc-onboarding-primary" disabled={pending}>{pending?"Salvando…":"Continuar"}</button></div>
</form>}

function SlugForm({draft,onBack,onSaved}:{draft:OnboardingDraft|null;onBack:()=>void;onSaved:()=>void}) {
  const initialValue = draft?.requested_slug ?? normalizeTrainerSlug(draft?.professional_name ?? draft?.display_name ?? "");
  const [value,setValue] = useState(initialValue);
  const [availability,setAvailability] = useState<OnboardingActionState>({});
  const [checking,startChecking] = useTransition();
  const [state,formAction,pending] = useActionState(saveOnboardingSlug,initial);
  const requestSequence = useRef(0);
  const normalized = normalizeTrainerSlug(value);

  useEffect(()=>{if(state.ok)onSaved()},[state.ok,onSaved]);
  useEffect(()=>{
    const sequence=++requestSequence.current;
    if(!value.trim())return;
    const timer=window.setTimeout(()=>startChecking(async()=>{
      const result=await checkOnboardingSlugAvailability(value);
      if(sequence===requestSequence.current)setAvailability(result);
    }),350);
    return()=>window.clearTimeout(timer);
  },[value]);

  return <form action={formAction} className="pc-onboarding-step pc-slug-step">
    <header><span>Seu endereço público</span><h1>Escolha o link do seu site</h1><p>Use um endereço curto e fácil de compartilhar. Você pode editá-lo até publicar.</p></header>
    <label htmlFor="trainer-public-slug">Endereço do site *</label>
    <div className="pc-slug-field" data-available={availability.ok===true||undefined} data-unavailable={availability.ok===false||undefined}>
      <span aria-hidden="true">cheipi.com/p/</span>
      <input id="trainer-public-slug" value={value} onChange={event=>{setValue(event.target.value);setAvailability({})}} onBlur={()=>setValue(normalized)} autoCapitalize="none" autoCorrect="off" spellCheck={false} maxLength={120} required aria-describedby="trainer-public-slug-status" />
    </div>
    <input type="hidden" name="requested_slug" value={normalized}/>
    <p id="trainer-public-slug-status" className="pc-slug-status" role="status" aria-live="polite">{checking?"Verificando…":availability.message??`Entre 3 e ${TRAINER_SLUG_MAX_LENGTH} caracteres.`}</p>
    {state.message&&!state.ok?<p className="form-message" role="alert">{state.message}</p>:null}
    <div className="pc-onboarding-actions"><BackButton onClick={onBack}/><ExitButton/><button className="pc-onboarding-primary" disabled={pending||checking||availability.ok!==true}>{pending?"Salvando…":"Escolher estilo"}</button></div>
  </form>;
}

function FirstStudent({studentActivation}:Pick<Props,"studentActivation">){return <div className="pc-first-student">
  {studentActivation==="active"?<><h2>Seu primeiro aluno já está aqui</h2><p>Acompanhe seus alunos na tela de início.</p></>:studentActivation==="pending"?<><h2>Convite criado</h2><p>Você pode acompanhar a aceitação em Alunos.</p></>:<><h2>Convide seu primeiro aluno</h2><p>Envie um convite para começar. Você também pode fazer isso depois.</p><InviteStudentForm/></>}
  <Link className={studentActivation==="none"?"pc-onboarding-secondary":"pc-onboarding-primary"} href="/dashboard">{studentActivation==="none"?"Pular e ir para o início":"Ir para o início"}</Link>
</div>}

export function OnboardingForm({draft,profile,billing,canPublish,studentActivation,publicUrl,step,checkout}:Props){const authoritativeStage=stageOf(draft,profile,step);const[editingStage,setEditingStage]=useState<EditableStage|null>(null);const stage=editingStage??authoritativeStage;const[publishState,publishAction,publishPending]=useActionState(requestOnboardingPublication,initial);const activeBilling=billing?.billing_state==="ACTIVE"||billing?.billing_state==="GRACE";
  const router=useRouter();
  const stepRef=useOnboardingStepFocus<HTMLDivElement>(stage==="professional"?null:stage);
  const awaitingActivation=checkout==="returned"&&!canPublish&&!profile?.published;
  useEffect(()=>{
    if(!awaitingActivation)return;
    let attempts=0;
    const timer=window.setInterval(()=>{router.refresh();if(++attempts>=10)window.clearInterval(timer)},3000);
    return()=>window.clearInterval(timer);
  },[awaitingActivation,router]);
  return <div ref={stepRef} className="pc-onboarding-form" data-stage={stage}>
    {/* Exit has its own form so Enter in a profile field always continues onboarding. */}
    <form id="onboarding-exit" action={logout} hidden />
    {stage!=="professional"?<OnboardingProgress stage={stage}/>:null}
    {stage==="identity"?<SubmitForm action={saveOnboardingIdentity} submit="Continuar"><header><span>Seu site começa por você</span><h1>Primeiro, vamos conhecer você</h1><p>Use seus dados reais. Você precisa ter 18 anos ou mais.</p></header><label>Nome completo *<input name="full_name" defaultValue={draft?.full_name??draft?.display_name??""} required minLength={2} maxLength={160} autoComplete="name"/></label><label>Data de nascimento *<input name="birth_date" type="date" defaultValue={draft?.birth_date??""} required autoComplete="bday"/></label><OptionalFields title="Deixe com a sua cara" description="Foto, nome profissional e preferências · opcional" hasValues={Boolean(draft?.preferred_name||draft?.pronouns||draft?.professional_name)}><label>Nome profissional<input name="professional_name" defaultValue={draft?.professional_name??""} maxLength={100}/></label><label>Como prefere ser chamado?<input name="preferred_name" defaultValue={draft?.preferred_name??""} maxLength={100}/></label><label>Pronomes<input name="pronouns" defaultValue={draft?.pronouns??""} maxLength={40}/></label><label className="pc-photo-input">Foto profissional<input name="image" type="file" accept="image/jpeg,image/png,image/webp"/><small>{draft?.profile_image_url?"Você já tem uma foto salva. Envie outra para trocar. ":""}JPG, PNG ou WebP · até 5 MB</small></label></OptionalFields></SubmitForm>:null}
    {stage==="professional"?<ProfessionalForm draft={draft} initialPhase={authoritativeStage==="professional"?"specialty":"service"} onBack={()=>setEditingStage("identity")}/>:null}
    {stage==="social"?<SubmitForm action={saveOnboardingSocial} submit="Criar meu endereço" onBack={()=>setEditingStage("professional")}><header><span>Contato direto</span><h1>Vamos facilitar o contato</h1><p>WhatsApp é necessário. Os demais canais podem ficar para depois.</p></header><label>WhatsApp *<input name="whatsapp" type="tel" inputMode="tel" autoComplete="tel" defaultValue={draft?.whatsapp??""} required placeholder="55 11 99999-9999"/></label><OptionalFields title="Adicionar redes sociais" description="Instagram, TikTok e YouTube · opcional" hasValues={Boolean(draft?.instagram||draft?.tiktok||draft?.youtube)}><label>Instagram <input name="instagram" defaultValue={draft?.instagram??""} placeholder="@seuperfil" maxLength={120} autoCapitalize="none" autoCorrect="off"/></label><label>TikTok <input name="tiktok" defaultValue={draft?.tiktok??""} placeholder="@seuperfil" maxLength={160} autoCapitalize="none" autoCorrect="off"/></label><label>YouTube <input name="youtube" type="text" defaultValue={draft?.youtube??""} placeholder="@seucanal ou URL" maxLength={360} autoCapitalize="none" autoCorrect="off"/></label></OptionalFields></SubmitForm>:null}
    {stage==="slug"?<SlugForm draft={draft} onBack={()=>setEditingStage("social")} onSaved={()=>setEditingStage("template")}/>:null}
    {stage==="template"?<SubmitForm action={saveOnboardingTemplate} submit="Gerar meu site" onBack={()=>setEditingStage("slug")}><header><span>Seu estilo</span><h1>Um site com a sua cara</h1><p>Três estilos, cada um com um foco. Depois você personaliza seu conteúdo.</p></header><TemplateChoices draft={draft} profile={profile}/></SubmitForm>:null}
    {stage==="publication"&&profile?<section className="pc-onboarding-step pc-onboarding-ready">
      <header><span>Seu site está pronto</span><h1>Quer publicar agora?</h1><p>Você pode publicar agora ou continuar e decidir depois. Seu site fica salvo como rascunho privado até a publicação.</p></header>
      <div className="pc-real-preview"><iframe title="Prévia real do seu site" src={`/site-preview?template=${profile.template_id}`}/></div>
      {canPublish?<><p>Seu acesso já inclui a publicação.</p><form action={publishAction}><button className="pc-onboarding-primary" disabled={publishPending}>{publishPending?"Publicando…":"Publicar agora"}</button></form></>:awaitingActivation?<div role="status"><p>Estamos aguardando a confirmação da sua assinatura. Você pode continuar enquanto ela é processada.</p><button type="button" className="pc-onboarding-secondary" onClick={()=>router.refresh()}>Verificar ativação</button></div>:<><p>Experimente o Cheipi Pro por 7 dias. Depois, R$ 59,90/mês. Cartão necessário; cancele antes do fim do teste para não ser cobrado.</p><BillingCheckoutButton flow="onboarding" label="Publicar agora" className="pc-onboarding-primary"/></>}
      {checkout==="canceled"?<p role="status">Você pode continuar e publicar depois.</p>:null}
      {publishState.message?<p role="status" className="form-message">{publishState.message}</p>:null}
      <div className="pc-onboarding-actions"><BackButton onClick={()=>setEditingStage("template")}/><Link className="pc-onboarding-secondary" href="/onboarding?step=student">Depois</Link></div>
    </section>:null}
    {stage==="student"&&profile?<section className="pc-onboarding-step"><header><span>Primeiro aluno</span><h1>Vamos começar?</h1></header><FirstStudent studentActivation={studentActivation}/><Link className="pc-onboarding-back" href="/onboarding"><ArrowLeft aria-hidden="true"/>Voltar</Link></section>:null}
    {stage==="published"&&profile&&publicUrl?<section className="pc-onboarding-step pc-published"><header><span>{activeBilling?"PRO ativo":"Publicação disponível"}</span><h1>Seu site está no ar</h1><p>Agora seus alunos já podem encontrar você.</p></header><SiteShareActions publicUrl={publicUrl}/><FirstStudent studentActivation={studentActivation}/><Link className="pc-onboarding-back" href="/dashboard/site"><ArrowLeft aria-hidden="true"/>Editar site</Link></section>:null}
  </div>;
}
