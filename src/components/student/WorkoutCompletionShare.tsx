"use client";

import Link from "next/link";
import { Check, Copy, Dumbbell, MessageCircle, Share2, TrendingUp } from "lucide-react";
import { useMemo, useState, useSyncExternalStore } from "react";

const subscribeToBrowserCapabilities = () => () => {};

export function WorkoutCompletionShare({
  executionId,
  durationMinutes,
  completedExercises,
  completedSets,
}: {
  executionId: string;
  durationMinutes: number;
  completedExercises: number;
  completedSets: number;
}) {
  const webShareAvailable = useSyncExternalStore(
    subscribeToBrowserCapabilities,
    () => typeof navigator.share === "function",
    () => false,
  );
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const shareText = useMemo(
    () => `Concluí meu treino no Cheipi: ${completedExercises} exercícios, ${completedSets} séries e ${durationMinutes} min.`,
    [completedExercises, completedSets, durationMinutes],
  );
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  async function share() {
    try {
      await navigator.share({ title: "Treino concluído", text: shareText });
      setMessage("Resumo compartilhado.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setMessage("Não foi possível abrir o compartilhamento. Use WhatsApp ou copie o resumo.");
    }
  }

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setMessage("Resumo copiado.");
    } catch {
      setMessage("Não foi possível copiar automaticamente.");
    }
  }

  return <section className="pp-completion-share" aria-labelledby="completion-share-title">
    <div>
      <h2 id="completion-share-title">Seu treino ficou registrado</h2>
      <p>Compartilhe somente o resumo, sem dados pessoais ou observações da sessão.</p>
    </div>
    <div className="pp-completion-share__actions">
      <Link href={`/student/community?shareWorkout=${encodeURIComponent(executionId)}`}><Dumbbell aria-hidden="true" />Publicar na comunidade</Link>
      {webShareAvailable ? <button type="button" onClick={share}><Share2 aria-hidden="true" />Compartilhar</button> : null}
      <a href={whatsappUrl} target="_blank" rel="noreferrer"><MessageCircle aria-hidden="true" />WhatsApp</a>
      <button type="button" onClick={copySummary}>{copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}{copied ? "Copiado" : "Copiar resumo"}</button>
    </div>
    <p className="pp-completion-share__platform-note">Para Instagram ou TikTok, copie o resumo e publique manualmente.</p>
    {message ? <p className="pp-completion-share__status" role="status">{message}</p> : null}
    <div className="pp-completion-share__navigation">
      <Link href="/student/progress"><TrendingUp aria-hidden="true" />Ver progresso</Link>
      <Link href="/student/today">Voltar para Hoje</Link>
    </div>
  </section>;
}
