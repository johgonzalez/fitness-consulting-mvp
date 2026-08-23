"use client";

import { useActionState, useCallback } from "react";
import { configureLeads, type LeadActionState } from "@/app/actions/leads";
import { leadsConfig } from "@/config/site";
import type { LeadSettings, TrainerService } from "@/lib/domain/trainer";

const initial: LeadActionState = {};
const actionTimeoutMs = 15_000;

function runWithTimeout(action: Promise<LeadActionState>) {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeout = new Promise<LeadActionState>((resolve) => {
    timeoutId = setTimeout(() => resolve({ message: "A ação demorou mais que o esperado. Verifique o status antes de tentar novamente." }), actionTimeoutMs);
  });
  return Promise.race([action, timeout]).finally(() => clearTimeout(timeoutId));
}

export function LeadSettingsForm({
  services,
  settings,
}: {
  services: TrainerService[];
  settings?: LeadSettings | null;
}) {
  const resilientAction = useCallback(async (previousState: LeadActionState, data: FormData) => {
    try {
      return await runWithTimeout(configureLeads(previousState, data));
    } catch {
      return { message: "Não foi possível concluir a ação. Verifique sua conexão e tente novamente." };
    }
  }, []);
  const [state, formAction, pending] = useActionState(resilientAction, initial);
  const eligible = services.filter((service) => service.active && service.price !== null && ["public", "match_only"].includes(service.price_visibility));

  return <section className="lead-onboarding pp-leads-config">
    <header className="pp-leads-config__header">
      <span className="beta-label">Beta · incluído para clientes fundadores</span>
      <h2>Receba novas oportunidades</h2>
      <p>Configure como você atende. Preços marcados como <em>match only</em> continuam privados.</p>
    </header>

    <form action={formAction} className="builder-form pp-leads-config__form" aria-busy={pending}>
      <fieldset className="pp-leads-config__section pp-leads-config__objectives">
        <legend>Objetivos atendidos</legend>
        <div className="pp-leads-config__options">
          {leadsConfig.goals.map((goal) => <label className="check-row pp-leads-config__option" key={goal.value}>
            <input type="checkbox" name="objectives" value={goal.value} defaultChecked={settings?.objectives.includes(goal.value)} />
            <span>{goal.label}</span>
          </label>)}
        </div>
      </fieldset>

      <fieldset className="pp-leads-config__section pp-leads-config__attendance">
        <legend>Atendimento</legend>
        <div className="pp-leads-config__attendance-grid">
          <label className="pp-leads-config__mode">Modalidade
            <select name="service_mode" defaultValue={settings?.service_mode ?? "online"}>
              <option value="online">Online</option>
              <option value="presencial">Presencial</option>
              <option value="both">Online e presencial</option>
            </select>
          </label>
          <label>Cidade
            <input name="city" defaultValue={settings?.city ?? ""} maxLength={120} />
          </label>
          <label className="pp-leads-config__state">Estado
            <input name="state" defaultValue={settings?.state ?? ""} maxLength={2} />
          </label>
        </div>
      </fieldset>

      <fieldset className="pp-leads-config__section pp-leads-config__services">
        <legend>Serviços disponíveis</legend>
        {eligible.length ? <div className="pp-leads-config__service-options">
          {eligible.map((service) => <label className="check-row pp-leads-config__option" key={service.id}>
            <input type="checkbox" name="service_ids" value={service.id} defaultChecked={settings?.service_ids.includes(service.id)} />
            <span>{service.title} · {service.price?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} {service.price_visibility === "match_only" ? "(privado)" : ""}</span>
          </label>)}
        </div> : <p>Adicione preço a um serviço ativo no Meu site antes de ativar o matching.</p>}
      </fieldset>

      <section className="pp-leads-config__section pp-leads-config__activation" aria-labelledby="lead-activation-title">
        <h3 id="lead-activation-title">Ativação</h3>
        <label className="check-row accepting">
          <input type="checkbox" name="accepting" defaultChecked={settings?.accepting_new_clients} />
          <strong>Quero receber oportunidades de novos alunos</strong>
        </label>
      </section>

      {state.message ? <p className={`builder-message ${state.ok ? "success" : "error"}`} role="status" aria-live="polite">{state.message}</p> : null}

      <div className="pp-leads-config__actions">
        <button type="submit" className="builder-primary" disabled={pending || !eligible.length}>
          {pending ? "Salvando..." : settings ? "Atualizar configuração" : "Quero receber oportunidades"}
        </button>
      </div>
    </form>
  </section>;
}
