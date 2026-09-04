import Image from "next/image";
import type { CSSProperties } from "react";
import type { TemplateId, TrainerProfile } from "@/lib/domain/trainer";
import { findDevelopmentMediaByUrl } from "@/data/media/development-media-registry";

export function TemplatePreview({ profile, templateId, compact = false }: { profile: TrainerProfile; templateId: TemplateId; compact?: boolean }) {
  const firstName = profile.display_name.split(" ")[0];
  const editorialMedia = profile.hero_image_url ? findDevelopmentMediaByUrl(profile.hero_image_url) : null;
  return <div className={`template-preview-v2 is-${templateId}${compact ? " is-compact" : ""}`} style={{ "--template-accent": profile.primary_color } as CSSProperties} role="img" aria-label={`Prévia do template para ${profile.display_name}`}>
    {profile.hero_image_url ? <Image src={profile.hero_image_url} alt="" fill unoptimized sizes={compact ? "460px" : "900px"} loading={compact ? "lazy" : "eager"} fetchPriority={compact ? "auto" : "high"} /> : null}
    {editorialMedia ? <span className="template-preview-v2__media-label">Imagem editorial PPerfil</span> : null}
    {templateId === "template_01" ? <div className="template-preview-v2__essential"><small>{profile.display_name}</small><strong>{profile.headline}</strong><span>Quero treinar com {firstName}</span></div> : null}
    {templateId === "template_02" ? <div className="template-preview-v2__performance"><small>{profile.display_name}</small><strong>{profile.headline}</strong><span>Começar acompanhamento</span></div> : null}
    {templateId === "template_03" ? <div className="template-preview-v2__conversion"><small>{profile.display_name}</small><strong>{profile.headline}</strong><div><span>Serviços</span><b>Experiência digital</b></div></div> : null}
    {templateId === "template_04" ? <div className="template-preview-v2__atelier"><small>Atelier · {profile.display_name}</small><strong>{profile.headline}</strong><span>Experiência premium</span></div> : null}
    {templateId === "template_05" ? <div className="template-preview-v2__profile"><small>{profile.display_name}</small><strong>{profile.headline}</strong><span>Quero treinar com {firstName}</span></div> : null}
    {templateId === "template_06" ? <div className="template-preview-v2__cinematic"><small>{profile.display_name}</small><strong>{profile.headline}</strong><span>Começar acompanhamento</span></div> : null}
  </div>;
}
