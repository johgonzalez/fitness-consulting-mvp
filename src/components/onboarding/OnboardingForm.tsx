"use client";

import { ArrowLeft, AtSign, Camera, Check, CirclePlay, Globe2, Smartphone } from "lucide-react";
import { useActionState, useState } from "react";
import { completeOnboarding } from "@/app/actions/onboarding";

const steps = ["Identidade", "Atuação", "Canais", "Estilo", "Prévia", "Ativar"] as const;
const specialties = ["Hipertrofia", "Emagrecimento", "Força", "Condicionamento", "Corrida", "Mobilidade"];

export function OnboardingForm() {
  const [state, action, pending] = useActionState(completeOnboarding, {});
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [specialtyChoice, setSpecialtyChoice] = useState("Hipertrofia");
  const [customSpecialty, setCustomSpecialty] = useState("");
  const [template, setTemplate] = useState("Essencial");
  const specialty = specialtyChoice === "other" ? customSpecialty : specialtyChoice;

  function nextStep(event: React.MouseEvent<HTMLButtonElement>) {
    const group = event.currentTarget.closest("fieldset");
    const fields = group?.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input, select");
    if (fields && Array.from(fields).some((field) => !field.reportValidity())) return;
    setStep((value) => Math.min(value + 1, steps.length - 1));
  }

  return <form action={action} className="onboarding-form pc-onboarding-form">
    <nav className="pc-onboarding-progress" aria-label="Progresso do perfil">{steps.map((label, index) => <span key={label} data-active={index === step || undefined} data-complete={index < step || undefined}><i>{index < step ? <Check aria-hidden="true" /> : index + 1}</i><small>{label}</small></span>)}</nav>

    <fieldset hidden={step !== 0} className="pc-onboarding-step"><legend className="sr-only">Identidade profissional</legend><header><span>Comece pelo essencial</span><h1>Sua identidade profissional</h1><p>Essas informações formam a primeira versão do seu site.</p></header><div className="pc-photo-moment"><span><Camera aria-hidden="true" /></span><div><strong>Sua foto profissional</strong><p>Você poderá adicionar e ajustar a foto em Configurações.</p></div></div><label>Nome completo *<input name="display_name" required minLength={2} maxLength={100} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} /></label>{state.errors?.display_name ? <p className="field-error">{state.errors.display_name}</p> : null}<label>Nome profissional<input name="professional_name" maxLength={100} /></label><button type="button" className="pc-onboarding-primary" onClick={nextStep}>Continuar</button></fieldset>

    <fieldset hidden={step !== 1} className="pc-onboarding-step"><legend className="sr-only">Atuação profissional</legend><header><span>Seu trabalho</span><h1>Como você atende?</h1><p>Escolha uma especialidade principal. Você pode complementar depois.</p></header><label>Especialidade principal *<select value={specialtyChoice} onChange={(event) => setSpecialtyChoice(event.target.value)}>{specialties.map((item) => <option key={item}>{item}</option>)}<option value="other">Outra especialidade</option></select></label>{specialtyChoice === "other" ? <label>Outra especialidade *<input required minLength={2} maxLength={120} value={customSpecialty} onChange={(event) => setCustomSpecialty(event.target.value)} /></label> : null}<input type="hidden" name="specialty" value={specialty} /><label>Cidade *<input name="city" required minLength={2} maxLength={120} autoComplete="address-level2" /></label><label>CREF<input name="cref" maxLength={60} /></label><fieldset className="pc-mode-fieldset"><legend>Formato de atendimento *</legend><div>{[["online","Online"],["presencial","Presencial"],["both","Presencial e online"]].map(([value,label]) => <label key={value}><input type="radio" name="service_mode" value={value} required /><span>{label}</span></label>)}</div></fieldset><div className="pc-step-actions"><button type="button" onClick={() => setStep(0)}><ArrowLeft aria-hidden="true" />Voltar</button><button type="button" className="pc-onboarding-primary" onClick={nextStep}>Continuar</button></div></fieldset>

    <fieldset hidden={step !== 2} className="pc-onboarding-step"><legend className="sr-only">Canais de contato</legend><header><span>Seus canais</span><h1>Onde alunos encontram você?</h1><p>WhatsApp é essencial. Os demais canais são opcionais.</p></header><label>WhatsApp *<span className="pc-input-icon"><Smartphone aria-hidden="true" /><input name="whatsapp" type="tel" inputMode="tel" required autoComplete="tel" placeholder="55 11 99999-9999" /></span></label><label>Instagram<span className="pc-input-icon"><AtSign aria-hidden="true" /><input name="instagram" placeholder="@seuperfil" maxLength={120} /></span></label><div className="pc-channel-placeholder"><span><CirclePlay aria-hidden="true" />YouTube</span><small>Conexão ainda não disponível</small></div><div className="pc-channel-placeholder"><span><Globe2 aria-hidden="true" />TikTok</span><small>Conexão ainda não disponível</small></div><div className="pc-step-actions"><button type="button" onClick={() => setStep(1)}><ArrowLeft aria-hidden="true" />Voltar</button><button type="button" className="pc-onboarding-primary" onClick={nextStep}>Continuar</button></div></fieldset>

    <fieldset hidden={step !== 3} className="pc-onboarding-step"><legend className="sr-only">Estilo do site</legend><header><span>Seu site</span><h1>Escolha um estilo</h1><p>A escolha visual será confirmada no editor depois da criação do perfil.</p></header><div className="pc-template-options">{["Essencial", "Motion", "Conversion"].map((item) => <button key={item} type="button" data-selected={template === item || undefined} onClick={() => setTemplate(item)}><i aria-hidden="true" /><strong>{item}</strong><small>{item === "Essencial" ? "Claro e direto" : item === "Motion" ? "Fitness e visual" : "Serviços em foco"}</small></button>)}</div><p className="pc-honest-note">A seleção ainda não é persistida nesta etapa. O template poderá ser escolhido em Meu Site.</p><div className="pc-step-actions"><button type="button" onClick={() => setStep(2)}><ArrowLeft aria-hidden="true" />Voltar</button><button type="button" className="pc-onboarding-primary" onClick={nextStep}>Ver meu site</button></div></fieldset>

    <fieldset hidden={step !== 4} className="pc-onboarding-step pc-onboarding-preview"><legend className="sr-only">Prévia do site</legend><header><span>Primeiro momento de valor</span><h1>Seu site está pronto para revisar</h1><p>Esta prévia usa os dados informados. A publicação acontece depois da criação do perfil.</p></header><div className="pc-site-preview"><div><small>PERSONAL TRAINER</small><h2>{name || "Seu nome profissional"}</h2><strong>{specialty || "Sua especialidade"}</strong><p>Atendimento personalizado para seus objetivos.</p><span>Falar no WhatsApp</span></div></div><div className="pc-step-actions"><button type="button" onClick={() => setStep(3)}><ArrowLeft aria-hidden="true" />Voltar</button><button type="button" className="pc-onboarding-primary" onClick={nextStep}>Continuar</button></div></fieldset>

    <fieldset hidden={step !== 5} className="pc-onboarding-step"><legend className="sr-only">Criar perfil</legend><header><span>Próximo passo</span><h1>Crie seu perfil para continuar</h1><p>Trial, cartão e publicação ainda não estão habilitados neste fluxo. Nada será cobrado agora.</p></header><div className="pc-activation-summary"><div><Check aria-hidden="true" /><span><strong>Seu site fica salvo como rascunho</strong><small>Revise em Meu Site antes de publicar.</small></span></div><div><Check aria-hidden="true" /><span><strong>Convide o primeiro aluno depois</strong><small>O convite permanece disponível no Dashboard.</small></span></div></div>{state.message ? <p className="form-message" role="status">{state.message}</p> : null}<div className="pc-step-actions"><button type="button" onClick={() => setStep(4)}><ArrowLeft aria-hidden="true" />Voltar</button><button type="submit" className="pc-onboarding-primary" disabled={pending}>{pending ? "Criando perfil…" : "Criar meu perfil"}</button></div></fieldset>
  </form>;
}
