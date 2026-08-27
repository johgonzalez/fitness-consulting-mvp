"use client";

import { Copy, ExternalLink, Share2 } from "lucide-react";
import { useState } from "react";

export const SITE_SHARE_ACTION_MODEL = ["whatsapp", "native", "copy", "instagram_bio", "tiktok_bio"] as const;

export function SiteShareActions({ publicUrl }: { publicUrl: string }) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const shareText = `Conheça meu site: ${publicUrl}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setFeedback("Link copiado.");
    } catch {
      setFeedback("Não foi possível copiar automaticamente. Selecione o link acima.");
    }
  }

  async function shareSite() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Meu site no PPerfil", text: "Conheça meu site", url: publicUrl });
        setFeedback("Compartilhamento aberto.");
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    await copyLink();
  }

  return <>
    <div className="pc-public-link"><strong>{publicUrl}</strong><button type="button" onClick={copyLink}><Copy/>Copiar link</button></div>
    <div className="pc-publish-actions">
      <a href={publicUrl} target="_blank" rel="noreferrer"><ExternalLink/>Abrir site</a>
      <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noreferrer"><Share2/>WhatsApp</a>
      <button type="button" onClick={shareSite}><Share2/>Compartilhar</button>
    </div>
    {feedback?<p className="form-message" role="status">{feedback}</p>:null}
    <p className="pc-honest-note">Instagram e TikTok não permitem publicação direta aqui. Copie o link para adicionar à sua bio.</p>
  </>;
}
