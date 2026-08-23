"use client";

import { Check, Plus, Sparkles, WandSparkles, X } from "lucide-react";
import { useId, useMemo, useState } from "react";

function sentenceCase(value: string) {
  const cleaned = value
    .replace(/\s+/g, " ")
    .replace(/\b(muito bom|top|show)\b/gi, "consistente")
    .replace(/\bajudo a galera\b/gi, "ajudo pessoas")
    .replace(/\bfaço treino\b/gi, "desenvolvo treinos")
    .trim();
  if (!cleaned) return "";
  const capitalized = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  return /[.!?]$/.test(capitalized) ? capitalized : `${capitalized}.`;
}

export function AssistedTextField({
  name,
  label,
  initialValue,
  suggestions,
  maxLength,
  rows = 4,
  required = false,
}: {
  name: string;
  label: string;
  initialValue: string;
  suggestions: readonly string[];
  maxLength: number;
  rows?: number;
  required?: boolean;
}) {
  const id = useId();
  const [value, setValue] = useState(initialValue);

  function professionalize() {
    setValue((current) => sentenceCase(current || suggestions[0] || "").slice(0, maxLength));
  }

  return (
    <fieldset className="pp-content-assistant">
      <legend>{label}</legend>
      <div className="pp-content-assistant__intro">
        <Sparkles aria-hidden="true" />
        <div><strong>Você não precisa começar do zero</strong><p>Escolha uma sugestão ou escreva do seu jeito e aprimore o texto.</p></div>
      </div>
      <div className="pp-content-assistant__suggestions" aria-label={`Sugestões para ${label}`}>
        {suggestions.map((suggestion) => (
          <button key={suggestion} type="button" aria-pressed={value === suggestion} onClick={() => setValue(suggestion)}>
            <span>{suggestion}</span>{value === suggestion ? <Check aria-hidden="true" /> : null}
          </button>
        ))}
      </div>
      <label htmlFor={id}>{label} personalizada</label>
      <textarea id={id} name={name} required={required} maxLength={maxLength} rows={rows} value={value} onChange={(event) => setValue(event.target.value)} />
      <div className="pp-content-assistant__footer">
        <button type="button" onClick={professionalize}><WandSparkles aria-hidden="true" />Aprimorar texto</button>
        <small>{value.length}/{maxLength}</small>
      </div>
    </fieldset>
  );
}

export function SpecialtyAssistant({ initialValue, suggestions }: { initialValue: string; suggestions: readonly string[] }) {
  const [selected, setSelected] = useState(() => initialValue.split(/\s*[·|]\s*/).map((item) => item.trim()).filter(Boolean));
  const [custom, setCustom] = useState("");
  const value = useMemo(() => selected.join(" · ").slice(0, 120), [selected]);

  function toggle(item: string) {
    setSelected((current) => current.includes(item) ? current.filter((entry) => entry !== item) : [...current, item]);
  }

  function addCustom() {
    const next = custom.trim();
    if (!next || selected.includes(next) || `${value} · ${next}`.length > 120) return;
    setSelected((current) => [...current, next]);
    setCustom("");
  }

  function professionalizeSpecialties() {
    setSelected((current) => Array.from(new Set(current.map((item) => {
      const cleaned = item.replace(/\s+/g, " ").trim().toLocaleLowerCase("pt-BR");
      return cleaned ? cleaned.charAt(0).toLocaleUpperCase("pt-BR") + cleaned.slice(1) : "";
    }).filter(Boolean))));
  }

  return (
    <fieldset className="pp-content-assistant pp-specialty-assistant">
      <legend>Especialidades</legend>
      <div className="pp-content-assistant__intro"><Sparkles aria-hidden="true" /><div><strong>Escolha as áreas que representam seu trabalho</strong><p>Você pode combinar sugestões e incluir uma especialidade própria.</p></div></div>
      <div className="pp-specialty-assistant__options">
        {suggestions.map((item) => <button key={item} type="button" aria-pressed={selected.includes(item)} onClick={() => toggle(item)}>{selected.includes(item) ? <Check aria-hidden="true" /> : <Plus aria-hidden="true" />}{item}</button>)}
      </div>
      {selected.length ? <div className="pp-specialty-assistant__selected" aria-label="Especialidades selecionadas">{selected.map((item) => <button key={item} type="button" onClick={() => toggle(item)}>{item}<X aria-hidden="true" /></button>)}</div> : null}
      <div className="pp-specialty-assistant__custom"><input aria-label="Outra especialidade" value={custom} maxLength={60} onChange={(event) => setCustom(event.target.value)} placeholder="Adicionar outra especialidade" /><button type="button" onClick={addCustom}>Adicionar</button></div>
      <input type="hidden" name="specialty" value={value} />
      <div className="pp-content-assistant__footer"><button type="button" onClick={professionalizeSpecialties}><WandSparkles aria-hidden="true" />Organizar especialidades</button><small>{value.length}/120</small></div>
    </fieldset>
  );
}

export { sentenceCase as professionalizeText };
