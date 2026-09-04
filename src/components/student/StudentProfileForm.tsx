"use client";

import { useActionState } from "react";
import { updateStudentProfileAction } from "@/app/actions/student-profile";

export function StudentProfileForm({ name, whatsapp }: { name: string; whatsapp: string }) {
  const [state, action, pending] = useActionState(updateStudentProfileAction, {});
  return <form action={action} className="pp-student-profile__form" aria-busy={pending}>
    <label>Nome preferido<input name="preferred_name" autoComplete="name" maxLength={120} defaultValue={name} /></label>
    <label>WhatsApp <small>Inclua + e o código do país</small><input name="whatsapp" type="tel" inputMode="tel" autoComplete="tel" placeholder="+55 11 99999-9999" defaultValue={whatsapp} /></label>
    <label>Foto de perfil <small>Opcional · JPG, PNG ou WebP, até 5 MB. HEIC ainda não é compatível.</small><input name="profile_image" type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" /></label>
    <button className="pp-button pp-button--primary" type="submit" disabled={pending}>{pending ? "Salvando…" : "Salvar perfil"}</button>
    {state.message ? <p role="status" className={state.ok ? "success" : "field-error"}>{state.message}</p> : null}
  </form>;
}
