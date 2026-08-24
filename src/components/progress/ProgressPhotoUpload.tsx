"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, CheckCircle2, ImagePlus, RefreshCw, ShieldCheck, Upload } from "lucide-react";
import styles from "./progress.module.css";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type PhotoView = "FRONT" | "SIDE" | "BACK";
type UploadState = "idle" | "ready" | "uploading" | "success" | "error";

const categories: Array<{ value: PhotoView; label: string }> = [
  { value: "FRONT", label: "Frente" },
  { value: "SIDE", label: "Lateral" },
  { value: "BACK", label: "Costas" },
];

function validExtension(file: File): boolean {
  const extension = file.name.split(".").at(-1)?.toLocaleLowerCase("en-US");
  if (file.type === "image/jpeg") return extension === "jpg" || extension === "jpeg";
  if (file.type === "image/png") return extension === "png";
  if (file.type === "image/webp") return extension === "webp";
  return false;
}

function validateFile(file: File): string | null {
  if (file.size < 1 || file.size > MAX_FILE_SIZE) return "A foto deve ter no máximo 10 MB.";
  if (!ALLOWED_MIME_TYPES.has(file.type) || !validExtension(file)) {
    return "Escolha uma foto JPG, PNG ou WebP válida.";
  }
  return null;
}

export function ProgressPhotoUpload() {
  const router = useRouter();
  const cameraInput = useRef<HTMLInputElement>(null);
  const libraryInput = useRef<HTMLInputElement>(null);
  const [viewType, setViewType] = useState<PhotoView>("FRONT");
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("Escolha o ângulo e uma foto para começar.");

  function selectFile(nextFile: File | undefined) {
    if (!nextFile) return;
    const error = validateFile(nextFile);
    setFile(error ? null : nextFile);
    setProgress(0);
    setState(error ? "error" : "ready");
    setMessage(error ?? `${nextFile.name} pronta para envio privado.`);
  }

  function upload() {
    if (!file || state === "uploading") return;
    const formData = new FormData();
    formData.set("viewType", viewType);
    formData.set("image", file);

    const request = new XMLHttpRequest();
    request.open("POST", "/api/student/progress/photos");
    request.withCredentials = true;
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) setProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onload = () => {
      let response: { ok?: boolean; message?: string } = {};
      try { response = JSON.parse(request.responseText) as typeof response; } catch { /* handled below */ }
      if (request.status >= 200 && request.status < 300 && response.ok) {
        setState("success");
        setProgress(100);
        setMessage(response.message ?? "Foto privada adicionada.");
        setFile(null);
        if (cameraInput.current) cameraInput.current.value = "";
        if (libraryInput.current) libraryInput.current.value = "";
        router.refresh();
        return;
      }
      setState("error");
      setMessage(response.message ?? "O envio falhou. Tente novamente.");
    };
    request.onerror = () => {
      setState("error");
      setMessage("A conexão foi interrompida. Tente novamente.");
    };
    setState("uploading");
    setProgress(0);
    setMessage("Enviando foto privada…");
    request.send(formData);
  }

  return <section className={styles.photoUpload} aria-labelledby="progress-photo-upload-title">
    <header>
      <span><ImagePlus aria-hidden="true" /></span>
      <div><small>Novo registro</small><h2 id="progress-photo-upload-title">Adicionar foto</h2></div>
      <span className={styles.privateBadge}><ShieldCheck aria-hidden="true" />Privada</span>
    </header>

    <fieldset>
      <legend>Qual é o ângulo?</legend>
      <div className={styles.photoCategories}>
        {categories.map((category) => <button
          type="button"
          key={category.value}
          data-active={viewType === category.value || undefined}
          aria-pressed={viewType === category.value}
          onClick={() => setViewType(category.value)}
          disabled={state === "uploading"}
        >{category.label}</button>)}
      </div>
    </fieldset>

    <div className={styles.photoSources}>
      <button type="button" onClick={() => cameraInput.current?.click()} disabled={state === "uploading"}>
        <Camera aria-hidden="true" />Tirar foto
      </button>
      <button type="button" onClick={() => libraryInput.current?.click()} disabled={state === "uploading"}>
        <Upload aria-hidden="true" />Escolher da biblioteca
      </button>
      <input ref={cameraInput} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(event) => selectFile(event.target.files?.[0])} />
      <input ref={libraryInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => selectFile(event.target.files?.[0])} />
    </div>

    <div className={styles.uploadStatus} data-state={state} role="status" aria-live="polite">
      {state === "success" ? <CheckCircle2 aria-hidden="true" /> : state === "error" ? <RefreshCw aria-hidden="true" /> : <ShieldCheck aria-hidden="true" />}
      <div><strong>{state === "uploading" ? `${progress}% enviado` : state === "ready" ? "Pronta para enviar" : state === "error" ? "Envio não concluído" : state === "success" ? "Envio concluído" : "Proteção ativa"}</strong><p>{message}</p></div>
    </div>

    {state === "uploading" ? <div className={styles.uploadProgress} aria-hidden="true"><span style={{ width: `${progress}%` }} /></div> : null}

    <button className={styles.uploadSubmit} type="button" onClick={upload} disabled={!file || state === "uploading"}>
      {state === "uploading" ? "Enviando…" : state === "error" && file ? "Tentar novamente" : "Enviar foto privada"}
    </button>
    <p className={styles.uploadConsent}>Ao enviar, você autoriza o armazenamento privado desta foto no seu histórico de acompanhamento.</p>
  </section>;
}
