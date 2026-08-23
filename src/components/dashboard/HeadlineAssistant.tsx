"use client";

import { Check, Sparkles, WandSparkles } from "lucide-react";
import { useId, useState } from "react";
import { curatedHeadlineSuggestions } from "@/data/site/headline-suggestions";
import { professionalizeText } from "@/components/dashboard/AssistedTextField";

export function HeadlineAssistant({ initialValue }: { initialValue: string }) {
  const fieldId = useId();
  const [headline, setHeadline] = useState(initialValue);

  return (
    <fieldset className="pp-headline-assistant">
      <legend>Headline</legend>
      <div className="pp-headline-assistant__intro">
        <Sparkles aria-hidden="true" />
        <div>
          <strong>Comece com uma sugestão</strong>
          <p>Escolha uma base e ajuste as palavras para combinar com o seu trabalho.</p>
        </div>
      </div>
      <div className="pp-headline-suggestions" aria-label="Sugestões de headline">
        {curatedHeadlineSuggestions.map((suggestion) => {
          const selected = headline === suggestion.text;
          return (
            <button
              key={suggestion.id}
              type="button"
              aria-pressed={selected}
              onClick={() => setHeadline(suggestion.text)}
            >
              <span>{suggestion.text}</span>
              {selected ? <Check aria-hidden="true" /> : null}
            </button>
          );
        })}
      </div>
      <label htmlFor={fieldId}>Headline personalizada</label>
      <textarea
        id={fieldId}
        name="headline"
        required
        minLength={2}
        maxLength={180}
        rows={2}
        value={headline}
        onChange={(event) => setHeadline(event.target.value)}
      />
      <div className="pp-content-assistant__footer">
        <button type="button" onClick={() => setHeadline(professionalizeText(headline || curatedHeadlineSuggestions[0]?.text || "").slice(0, 180))}><WandSparkles aria-hidden="true" />Aprimorar texto</button>
        <small className="pp-headline-assistant__count">{headline.length}/180</small>
      </div>
    </fieldset>
  );
}
