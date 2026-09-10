"use client";

import { Camera, Check, CircleAlert, Trash2 } from "lucide-react";
import { useActionState } from "react";
import { removeProfilePhoto, requestEmailChange, saveProfileBasics } from "@/app/actions/profile";
import { uploadIdentityImage, type SiteActionState } from "@/app/actions/site-builder";
import { FullscreenUtility } from "@/components/app-shell/AppFullscreenController";
import { SecureLogoutForm } from "@/components/auth/SecureLogoutForm";
import { ThemeToggle } from "@/components/dashboard/ThemeToggle";
import { TrainerAvatar } from "@/components/dashboard/TrainerAvatar";
import { Button, FeedbackMessage } from "@/components/ui/PPerfilPrimitives";
import type { TrainerProfile } from "@/lib/domain/trainer";
import { normalizeInstagramIdentity } from "@/lib/instagram";
import type { ProfileSection } from "@/lib/navigation/profile-sections";
import styles from "./ProfileSettings.module.css";

const initialState: SiteActionState = {};

function Message({ state }: { state: SiteActionState }) {
  if (!state.message) return null;
  const Icon = state.ok ? Check : CircleAlert;
  return <div className={styles.feedback}><FeedbackMessage tone={state.ok ? "success" : "danger"}><Icon aria-hidden="true" /><span>{state.message}</span></FeedbackMessage></div>;
}

export function ProfileEditor({ profile, email, activeSection = "profile" }: { profile: TrainerProfile; email: string; activeSection?: ProfileSection }) {
  const instagram = normalizeInstagramIdentity(profile.instagram_handle ?? profile.instagram, profile.instagram_url);
  const [photoState, photoAction, photoPending] = useActionState(uploadIdentityImage.bind(null, "profile"), initialState);
  const [removeState, removeAction, removePending] = useActionState(removeProfilePhoto, initialState);
  const [profileState, profileAction, profilePending] = useActionState(saveProfileBasics, initialState);
  const [emailState, emailAction, emailPending] = useActionState(requestEmailChange, initialState);

  return <div className={styles.editor}>
    {activeSection === "profile" ? <section aria-label="Dados do perfil profissional">
      <p className={styles.intro}>Sua identidade na Cheipi e no seu site público.</p>
      <div className={styles.photo}>
        <TrainerAvatar name={profile.display_name} imageUrl={profile.profile_image_url} />
        <div><strong>Sua foto</strong><p>Uma imagem para reconhecer você.</p></div>
        <details className={styles.photoDisclosure}>
          <summary><Camera aria-hidden="true" />Alterar foto</summary>
          <div className={styles.photoActions}>
            <form action={photoAction} aria-busy={photoPending}>
              <label>Nova foto<input type="file" name="image" accept="image/jpeg,image/png,image/webp" required /></label>
              <Button type="submit" variant="primary" disabled={photoPending}>{photoPending ? "Enviando..." : "Substituir foto"}</Button>
            </form>
            {profile.profile_image_url ? <form action={removeAction} aria-busy={removePending}><Button type="submit" variant="danger" disabled={removePending}><Trash2 aria-hidden="true" />{removePending ? "Removendo..." : "Remover foto"}</Button></form> : null}
            <Message state={photoState} />
            <Message state={removeState} />
          </div>
        </details>
      </div>

      <form action={profileAction} className={styles.form} aria-busy={profilePending}>
        <fieldset className={styles.fieldGroup}>
          <legend>Sua identidade</legend>
          <label>Nome<input name="display_name" required minLength={2} maxLength={100} defaultValue={profile.display_name} autoComplete="name" /></label>
          <label>Instagram — usuário<input name="instagram_handle" maxLength={30} defaultValue={instagram.handle ?? ""} placeholder="seu.usuario" /><small>Informe sem o @.</small></label>
          <label>Instagram — link<input name="instagram_url" type="url" maxLength={300} defaultValue={instagram.url ?? ""} placeholder="https://www.instagram.com/seu.usuario/" /></label>
        </fieldset>
        <fieldset className={styles.fieldGroup}>
          <legend>Dados profissionais</legend>
          <div className={styles.professionalFields}>
            <label>CEP<input name="cep" required inputMode="numeric" maxLength={9} defaultValue={profile.cep ?? ""} placeholder="00000-000" autoComplete="postal-code" /></label>
            <label>CREF<input name="cref" required minLength={3} maxLength={60} defaultValue={profile.cref ?? ""} placeholder="000000-G/UF" /></label>
          </div>
        </fieldset>
        <Button type="submit" variant="primary" className={styles.save} disabled={profilePending}>{profilePending ? "Salvando..." : "Salvar perfil"}</Button>
        <Message state={profileState} />
      </form>
    </section> : null}

    {activeSection === "account" ? <section aria-label="E-mail e sessão">
      <p className={styles.intro}>Gerencie seu e-mail de acesso e a sessão neste dispositivo.</p>
      <form action={emailAction} className={styles.form} aria-busy={emailPending}>
        <label>E-mail atual<input type="email" value={email} readOnly /></label>
        <label>Novo e-mail<input type="email" name="email" required autoComplete="email" /></label>
        <p className={styles.note}>Seu e-mail atual continuará válido até a confirmação do novo endereço.</p>
        <Button type="submit" variant="primary" className={styles.save} disabled={emailPending}>{emailPending ? "Enviando..." : "Enviar confirmação"}</Button>
        <Message state={emailState} />
      </form>
      <section className={styles.signout} aria-labelledby="settings-signout-title">
        <div><h2 id="settings-signout-title">Sessão atual</h2><p>Encerre o acesso neste dispositivo.</p></div>
        <SecureLogoutForm />
      </section>
    </section> : null}

    {activeSection === "appearance" ? <section aria-label="Preferências de aparência">
      <p className={styles.intro}>Escolha como você prefere usar a Cheipi.</p>
      <div className={styles.appearanceGroup}>
        <h2>Tema do aplicativo</h2>
        <ThemeToggle variant="selection" />
        <p className={styles.note}>Sua escolha fica salva neste navegador.</p>
      </div>
      <div className={styles.fullscreen}><FullscreenUtility /></div>
    </section> : null}
  </div>;
}
