"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { updateStudentProfileAction } from "@/app/actions/student-profile";
import { Avatar } from "@/components/ui/PPerfilPrimitives";

export function StudentProfileForm({ name, whatsapp, studentName, currentImageUrl }: { name: string; whatsapp: string; studentName: string; currentImageUrl: string | null }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(updateStudentProfileAction, {});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const objectUrl = useRef<string | null>(null);

  useEffect(() => () => { if (objectUrl.current) URL.revokeObjectURL(objectUrl.current); }, []);
  useEffect(() => { if (state.ok) router.refresh(); }, [router, state.ok]);

  function preview(file?: File) {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = file ? URL.createObjectURL(file) : null;
    setPreviewUrl(objectUrl.current);
  }

  return <form action={action} className="pp-student-profile__form" aria-busy={pending}>
    <div className="pp-student-profile__identity">
      <Avatar name={studentName} imageUrl={previewUrl ?? currentImageUrl} size="large" loading="eager" />
      <div><strong>{studentName}</strong><small>Aluno Cheipi</small></div>
    </div>
    <label>Nome preferido<input name="preferred_name" autoComplete="name" maxLength={120} defaultValue={name} /></label>
    <label>WhatsApp <small>Inclua + e o código do país</small><input name="whatsapp" type="tel" inputMode="tel" autoComplete="tel" placeholder="+55 11 99999-9999" defaultValue={whatsapp} /></label>
    <label>Alterar sua foto <small>JPG, PNG ou WebP, até 5 MB. HEIC ainda não é compatível.</small><input name="profile_image" type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" onChange={(event) => preview(event.target.files?.[0])} /></label>
    <button className="pp-button pp-button--primary" type="submit" disabled={pending}>{pending ? "Salvando…" : "Salvar perfil"}</button>
    {state.message ? <p role="status" className={state.ok ? "success" : "field-error"}>{state.message}</p> : null}
  </form>;
}
