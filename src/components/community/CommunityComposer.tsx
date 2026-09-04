"use client";

import { Bell, Camera, Dumbbell, LoaderCircle, MessageCircle, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { createCommunityPostAction } from "@/app/actions/community";
import type { CommunityGroup, CommunityPost } from "@/lib/domain/community";
import { COMMUNITY_PHOTO_POSTING_ENABLED } from "@/lib/community/features";

type ComposerKind = "TEXT" | "PHOTO" | "WORKOUT_COMPLETION" | "TRAINER_ANNOUNCEMENT";
type UploadResult = { ok: boolean; message: string; post?: CommunityPost };
type PhotoPhase = "IDLE" | "PREPARING" | "UPLOADING" | "PROCESSING" | "PUBLISHED";

async function prepareImage(file: File) {
  if (file.size > 12 * 1024 * 1024) throw new Error("Cada imagem deve ter até 12 MB antes da otimização.");
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const ratio = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * ratio));
  const height = Math.max(1, Math.round(bitmap.height * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("Não foi possível preparar a imagem.");
  context.drawImage(bitmap, 0, 0, width, height); bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.84));
  if (!blob) throw new Error("Não foi possível preparar a imagem.");
  return new File([blob], `${crypto.randomUUID()}.webp`, { type: "image/webp" });
}

export function CommunityComposer({ open, groups, audience, shareWorkoutExecutionId, onClose, onCreated }: {
  open: boolean;
  groups: CommunityGroup[];
  audience: "trainer" | "student";
  shareWorkoutExecutionId?: string;
  onClose: () => void;
  onCreated: (post?: CommunityPost, message?: string) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const [pending, startTransition] = useTransition();
  const availableGroups = groups.filter((group) => group.membershipStatus === "ACTIVE" && group.canPost);
  const [groupId, setGroupId] = useState(availableGroups[0]?.id ?? "");
  const [kind, setKind] = useState<ComposerKind>(shareWorkoutExecutionId ? "WORKOUT_COMPLETION" : "TEXT");
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState(0);
  const [photoPhase, setPhotoPhase] = useState<PhotoPhase>("IDLE");
  const photoBusy = photoPhase !== "IDLE" && photoPhase !== "PUBLISHED";
  const [error, setError] = useState<string | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const effectiveGroupId = availableGroups.some((group) => group.id === groupId) ? groupId : availableGroups[0]?.id ?? "";

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function resetAndClose() {
    xhrRef.current?.abort(); xhrRef.current = null;
    setBody(""); setFiles([]); setProgress(0); setPhotoPhase("IDLE"); setError(null); setConfirmClose(false); onClose();
  }

  function requestClose() {
    if (pending || photoBusy) return;
    if (body.trim() || files.length) setConfirmClose(true); else resetAndClose();
  }

  async function uploadPhotos() {
    setError(null); setProgress(0); setPhotoPhase("PREPARING");
    try {
      const prepared: File[] = [];
      for (const file of files) prepared.push(await prepareImage(file));
      const form = new FormData();
      form.set("groupId", effectiveGroupId); form.set("body", body.trim()); form.set("clientMutationId", crypto.randomUUID());
      prepared.forEach((file) => form.append("images", file));
      const result = await new Promise<UploadResult>((resolve, reject) => {
        const xhr = new XMLHttpRequest(); xhrRef.current = xhr;
        xhr.open("POST", "/api/community/photos"); xhr.responseType = "json"; xhr.timeout = 45_000;
        setPhotoPhase("UPLOADING");
        xhr.upload.onprogress = (event) => event.lengthComputable && setProgress(Math.min(99, Math.max(1, Math.round((event.loaded / event.total) * 100))));
        xhr.upload.onload = () => { setProgress(100); setPhotoPhase("PROCESSING"); };
        xhr.onload = () => resolve((xhr.response ?? { ok: false, message: "Não foi possível enviar as imagens." }) as UploadResult);
        xhr.onerror = () => reject(new Error("Falha de rede durante o envio."));
        xhr.ontimeout = () => reject(new Error("O processamento demorou mais que o esperado. Tente novamente."));
        xhr.onabort = () => reject(new Error("Envio cancelado.")); xhr.send(form);
      });
      xhrRef.current = null;
      if (!result.ok) throw new Error(result.message);
      setPhotoPhase("PUBLISHED");
      onCreated(result.post, result.message); resetAndClose();
    } catch (cause) {
      xhrRef.current = null; setProgress(0); setPhotoPhase("IDLE"); setError(cause instanceof Error ? cause.message : "Não foi possível enviar as imagens.");
    }
  }

  function publish() {
    if (!effectiveGroupId) return;
    if (kind === "PHOTO") { void uploadPhotos(); return; }
    startTransition(async () => {
      setError(null);
      const result = await createCommunityPostAction({
        groupId: effectiveGroupId,
        type: kind,
        body: body.trim() || undefined,
        workoutExecutionId: kind === "WORKOUT_COMPLETION" ? shareWorkoutExecutionId : undefined,
        clientMutationId: crypto.randomUUID(),
      });
      if (!result.ok) { setError(result.message); return; }
      onCreated(result.data, result.message); resetAndClose();
    });
  }

  const canPublish = Boolean(effectiveGroupId) && (kind === "WORKOUT_COMPLETION" ? Boolean(shareWorkoutExecutionId) : kind === "PHOTO" ? files.length > 0 : Boolean(body.trim()));
  return <dialog ref={dialogRef} className="community-composer" aria-labelledby="community-composer-title" onCancel={(event) => { event.preventDefault(); requestClose(); }}>
    <section>
      <header>
        <button type="button" onClick={requestClose} aria-label="Fechar publicação"><X aria-hidden="true" /></button>
        <div><span>Nova publicação</span><strong id="community-composer-title">Compartilhar no grupo</strong></div>
        <button type="button" onClick={publish} disabled={!canPublish || pending || photoBusy}>{pending || photoBusy ? <><LoaderCircle className="community-spin" aria-hidden="true" />Publicando</> : "Publicar"}</button>
      </header>
      {availableGroups.length > 1 ? <label className="community-composer-field">Grupo<select value={effectiveGroupId} onChange={(event) => setGroupId(event.target.value)}>{availableGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label> : <p className="community-composer-destination">{availableGroups[0]?.name}</p>}
      <nav aria-label="Tipo de publicação">
        <button type="button" className={kind === "TEXT" ? "active" : undefined} onClick={() => setKind("TEXT")}><MessageCircle aria-hidden="true" />Texto</button>
        {COMMUNITY_PHOTO_POSTING_ENABLED ? <button type="button" className={kind === "PHOTO" ? "active" : undefined} onClick={() => setKind("PHOTO")}><Camera aria-hidden="true" />Fotos</button> : null}
        {shareWorkoutExecutionId ? <button type="button" className={kind === "WORKOUT_COMPLETION" ? "active" : undefined} onClick={() => setKind("WORKOUT_COMPLETION")}><Dumbbell aria-hidden="true" />Treino</button> : null}
        {audience === "trainer" ? <button type="button" className={kind === "TRAINER_ANNOUNCEMENT" ? "active" : undefined} onClick={() => setKind("TRAINER_ANNOUNCEMENT")}><Bell aria-hidden="true" />Aviso</button> : null}
      </nav>
      {kind === "WORKOUT_COMPLETION" ? <div className="community-workout-preview"><Dumbbell aria-hidden="true" /><div><small>Treino concluído</small><strong>Resumo factual do treino</strong><p>Somente duração, exercícios e séries concluídas serão compartilhados.</p></div></div> : null}
      <label className="community-composer-field" htmlFor="community-post-body">{kind === "TRAINER_ANNOUNCEMENT" ? "Aviso" : kind === "WORKOUT_COMPLETION" ? "Legenda opcional" : "Publicação"}<textarea id="community-post-body" value={body} onChange={(event) => setBody(event.target.value)} maxLength={2000} rows={6} placeholder={kind === "WORKOUT_COMPLETION" ? "Como foi o treino?" : "O que você quer compartilhar?"} /></label>
      <small className="community-character-count">{body.length}/2000</small>
      {kind === "PHOTO" ? <label className="community-file"><Camera aria-hidden="true" /><span>{files.length ? `${files.length} de 4 imagens selecionadas` : "Escolher até 4 imagens"}</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => { setError(null); setFiles(Array.from(event.target.files ?? []).slice(0, 4)); }} /></label> : null}
      {photoPhase !== "IDLE" ? <div className="community-upload" aria-live="polite"><div><span style={{ width: `${photoPhase === "PREPARING" ? 8 : progress}%` }} /></div><p>{photoPhase === "PREPARING" ? "Preparando imagens…" : photoPhase === "UPLOADING" ? `Enviando · ${progress}%` : photoPhase === "PROCESSING" ? "Processando com segurança…" : "Publicado"}</p>{photoPhase !== "PUBLISHED" ? <button type="button" onClick={() => { xhrRef.current?.abort(); setPhotoPhase("IDLE"); setProgress(0); }}>Cancelar envio</button> : null}</div> : null}
      {error ? <div className="community-inline-error" role="alert"><p>{error}</p>{kind === "PHOTO" && files.length ? <button type="button" onClick={() => void uploadPhotos()}>Tentar novamente</button> : null}</div> : null}
      {confirmClose ? <div className="community-discard-confirm" role="alertdialog" aria-label="Descartar publicação"><strong>Descartar esta publicação?</strong><p>O conteúdo ainda não foi publicado.</p><div><button type="button" onClick={() => setConfirmClose(false)}>Continuar editando</button><button type="button" onClick={resetAndClose}>Descartar</button></div></div> : null}
    </section>
  </dialog>;
}
