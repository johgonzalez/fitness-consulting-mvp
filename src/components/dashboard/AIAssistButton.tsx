"use client";

import { Sparkles } from "lucide-react";

export function AIAssistButton({ compact = false }: { compact?: boolean }) {
  return <button
    type="button"
    className={`pp-ai-assist${compact ? " pp-ai-assist--compact" : ""}`}
    disabled
    aria-label="Aprimorar com IA — em breve"
    title="Aprimorar com IA — em breve"
  ><Sparkles aria-hidden="true" /><span>Aprimorar com IA</span><small>Em breve</small></button>;
}
