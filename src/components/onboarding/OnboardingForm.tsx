"use client";

import { ArrowLeft } from "lucide-react";
import { useActionState, useState } from "react";
import { completeOnboarding } from "@/app/actions/onboarding";

const stepContent = [
  { title: "Sobre você", description: "Conte o essencial sobre seu trabalho." },
  { title: "Como você atende", description: "Defina sua localização e formato de atendimento." },
  { title: "Contato", description: "Informe como futuros alunos poderão falar com você." },
] as const;

export function OnboardingForm() {
  const [state, action, pending] = useActionState(completeOnboarding, {});
  const [step, setStep] = useState(0);
  const content = stepContent[step];

  function nextStep(event: React.MouseEvent<HTMLButtonElement>) {
    const group = event.currentTarget.closest("fieldset");
    const fields = group?.querySelectorAll<HTMLInputElement>("input");
    if (fields && Array.from(fields).some((field) => !field.reportValidity())) return;
    setStep((value) => Math.min(value + 1, 2));
  }

  return <form action={action} className="saas-form onboarding-form">
    <div className="onboarding-progress"><span>{step + 1} de 3</span><div aria-hidden="true"><i style={{ width: `${((step + 1) / 3) * 100}%` }} /></div></div>
    <header className="onboarding-heading"><h1>{content.title}</h1><p>{content.description}</p></header>
    <fieldset hidden={step !== 0} className="onboarding-step"><legend className="sr-only">Sobre você</legend>
      <label htmlFor="display_name">Nome completo *</label><input id="display_name" name="display_name" required minLength={2} maxLength={100} autoComplete="name" />{state.errors?.display_name ? <p className="field-error">{state.errors.display_name}</p> : null}
      <label htmlFor="professional_name">Nome profissional</label><input id="professional_name" name="professional_name" maxLength={100} />
      <label htmlFor="specialty">Especialidade *</label><input id="specialty" name="specialty" required minLength={2} maxLength={120} placeholder="Ex.: Hipertrofia e condicionamento" />{state.errors?.specialty ? <p className="field-error">{state.errors.specialty}</p> : null}
      <button type="button" className="primary-button" onClick={nextStep}>Próximo</button>
    </fieldset>
    <fieldset hidden={step !== 1} className="onboarding-step"><legend className="sr-only">Como você atende</legend>
      <label htmlFor="city">Cidade *</label><input id="city" name="city" required minLength={2} maxLength={120} autoComplete="address-level2" />{state.errors?.city ? <p className="field-error">{state.errors.city}</p> : null}
      <label htmlFor="cref">CREF</label><input id="cref" name="cref" maxLength={60} />
      <fieldset className="mode-fieldset"><legend>Como você atende? *</legend><div className="mode-options">{[["online","Online"],["presencial","Presencial"],["both","Ambos"]].map(([value,label]) => <label key={value}><input type="radio" name="service_mode" value={value} required /><span>{label}</span></label>)}</div>{state.errors?.service_mode ? <p className="field-error">{state.errors.service_mode}</p> : null}</fieldset>
      <div className="step-actions"><button type="button" className="back-button" onClick={() => setStep(0)}><ArrowLeft aria-hidden="true" /> Voltar</button><button type="button" className="primary-button" onClick={nextStep}>Próximo</button></div>
    </fieldset>
    <fieldset hidden={step !== 2} className="onboarding-step"><legend className="sr-only">Contato</legend>
      <label htmlFor="whatsapp">WhatsApp *</label><input id="whatsapp" name="whatsapp" type="tel" inputMode="tel" required autoComplete="tel" placeholder="55 11 99999-9999" />{state.errors?.whatsapp ? <p className="field-error">{state.errors.whatsapp}</p> : null}
      <label htmlFor="instagram">Instagram</label><input id="instagram" name="instagram" placeholder="@seuperfil" maxLength={120} autoComplete="url" />
      {state.message ? <p className="form-message" role="status">{state.message}</p> : null}
      <div className="step-actions"><button type="button" className="back-button" onClick={() => setStep(1)}><ArrowLeft aria-hidden="true" /> Voltar</button><button type="submit" className="primary-button" disabled={pending}>{pending ? "Criando perfil…" : "Finalizar"}</button></div>
      <small>Seu perfil começa privado para você revisar com calma.</small>
    </fieldset>
  </form>;
}
