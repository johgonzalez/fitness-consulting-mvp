"use client";

import { Bell, Camera, ChevronRight, CreditCard, Database, Mail, Palette, Plug, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { useActionState, useState } from "react";
import { removeProfilePhoto, requestEmailChange, saveProfileBasics } from "@/app/actions/profile";
import { uploadIdentityImage, type SiteActionState } from "@/app/actions/site-builder";
import { SecureLogoutForm } from "@/components/auth/SecureLogoutForm";
import { ThemeToggle } from "@/components/dashboard/ThemeToggle";
import { TrainerAvatar } from "@/components/dashboard/TrainerAvatar";
import type { TrainerProfile } from "@/lib/domain/trainer";
import { normalizeInstagramIdentity } from "@/lib/instagram";

const initialState: SiteActionState = {};

type SettingsSectionId = "profile" | "account" | "appearance";

const settingsNavigation = [
  { id: "profile", label: "Perfil profissional", description: "Foto e dados públicos", icon: UserRound, available: true },
  { id: "account", label: "Conta e segurança", description: "E-mail e acesso", icon: ShieldCheck, available: true },
  { id: "notifications", label: "Notificações", description: "Em breve", icon: Bell, available: false },
  { id: "appearance", label: "Aparência", description: "Tema do aplicativo", icon: Palette, available: true },
  { id: "integrations", label: "Integrações", description: "Em breve", icon: Plug, available: false },
  { id: "plan", label: "Plano PPerfil", description: "Em breve", icon: CreditCard, available: false },
  { id: "privacy", label: "Privacidade e dados", description: "Em breve", icon: Database, available: false },
] as const;

function Message({ state }: { state: SiteActionState }) {
  return state.message ? <p className={`builder-message ${state.ok ? "success" : "error"}`} role="status" aria-live="polite">{state.message}</p> : null;
}

export function ProfileEditor({ profile, email }: { profile: TrainerProfile; email: string }) {
  const instagram = normalizeInstagramIdentity(profile.instagram_handle ?? profile.instagram, profile.instagram_url);
  const [activeSection, setActiveSection] = useState<SettingsSectionId>("profile");
  const [photoState, photoAction, photoPending] = useActionState(uploadIdentityImage.bind(null, "profile"), initialState);
  const [removeState, removeAction, removePending] = useActionState(removeProfilePhoto, initialState);
  const [profileState, profileAction, profilePending] = useActionState(saveProfileBasics, initialState);
  const [emailState, emailAction, emailPending] = useActionState(requestEmailChange, initialState);

  return <div className="pp-settings-layout">
    <nav className="pp-settings-navigation" aria-label="Seções de configurações">
      {settingsNavigation.map((item) => {
        const Icon = item.icon;
        const active = item.available && item.id === activeSection;
        return <button
          type="button"
          key={item.id}
          className={active ? "active" : undefined}
          onClick={() => item.available && setActiveSection(item.id as SettingsSectionId)}
          disabled={!item.available}
          aria-current={active ? "page" : undefined}
        >
          <span className="pp-settings-navigation__icon"><Icon aria-hidden="true" /></span>
          <span><strong>{item.label}</strong><small>{item.description}</small></span>
          {item.available ? <ChevronRight aria-hidden="true" /> : <small className="pp-settings-navigation__soon">Em breve</small>}
        </button>;
      })}
    </nav>

    <div className="pp-settings-content">
      {activeSection === "profile" ? <section className="pp-settings-section" aria-labelledby="settings-profile-title">
        <header className="pp-settings-section__header">
          <span className="pp-settings-section__icon"><UserRound aria-hidden="true" /></span>
          <div><h2 id="settings-profile-title">Perfil profissional</h2><p>Esses dados representam você no PPerfil e no seu site público.</p></div>
        </header>

        <div className="pp-profile-photo">
          <TrainerAvatar name={profile.display_name} imageUrl={profile.profile_image_url} />
          <div><strong>Sua foto</strong><p>Use uma imagem clara e profissional.</p></div>
          <details>
            <summary><Camera aria-hidden="true" />Alterar foto</summary>
            <div className="pp-profile-photo__actions">
              <form action={photoAction}><input type="file" name="image" accept="image/jpeg,image/png,image/webp" required /><button className="pp-button pp-button--primary" disabled={photoPending}>{photoPending ? "Enviando..." : "Substituir foto"}</button></form>
              {profile.profile_image_url ? <form action={removeAction}><button className="pp-button pp-button--danger" disabled={removePending}><Trash2 aria-hidden="true" />Remover foto</button></form> : null}
            </div>
            <Message state={photoState} />
            <Message state={removeState} />
          </details>
        </div>

        <form action={profileAction} className="builder-form pp-settings-form" aria-busy={profilePending}>
          <div className="pp-settings-form__group"><strong>Identidade pública</strong><p>Seu nome e Instagram aparecem como parte da sua marca profissional.</p></div>
          <div className="pp-settings-form__grid">
            <label>Nome<input name="display_name" required minLength={2} maxLength={100} defaultValue={profile.display_name} /></label>
            <label>Instagram — usuário<input name="instagram_handle" maxLength={30} defaultValue={instagram.handle ?? ""} placeholder="seu.usuario" /><small>Informe sem o @.</small></label>
            <label className="pp-settings-form__wide">Instagram — link<input name="instagram_url" type="url" maxLength={300} defaultValue={instagram.url ?? ""} placeholder="https://www.instagram.com/seu.usuario/" /></label>
          </div>
          <div className="pp-settings-form__group"><strong>Dados profissionais</strong><p>Nesta fase, pedimos somente o necessário para identificar sua atuação.</p></div>
          <div className="pp-settings-form__grid">
            <label>CEP<input name="cep" required inputMode="numeric" maxLength={9} defaultValue={profile.cep ?? ""} placeholder="00000-000" /></label>
            <label>CREF<input name="cref" required minLength={3} maxLength={60} defaultValue={profile.cref ?? ""} placeholder="000000-G/UF" /></label>
          </div>
          <div className="pp-settings-form__actions"><button className="builder-primary" disabled={profilePending}>{profilePending ? "Salvando..." : "Salvar perfil"}</button></div>
          <Message state={profileState} />
        </form>
      </section> : null}

      {activeSection === "account" ? <section className="pp-settings-section" aria-labelledby="settings-account-title">
        <header className="pp-settings-section__header">
          <span className="pp-settings-section__icon"><ShieldCheck aria-hidden="true" /></span>
          <div><h2 id="settings-account-title">Conta e segurança</h2><p>Atualize seu acesso com confirmação e mantenha sua conta protegida.</p></div>
        </header>
        <form action={emailAction} className="builder-form pp-settings-form" aria-busy={emailPending}>
          <div className="pp-settings-form__grid">
            <label>E-mail atual<input type="email" value={email} readOnly /></label>
            <label>Novo e-mail<input type="email" name="email" required autoComplete="email" /></label>
          </div>
          <p className="sensitive-note">Seu e-mail atual continuará válido até o novo endereço ser confirmado pelo Supabase Auth.</p>
          <div className="pp-settings-form__actions"><button className="builder-primary" disabled={emailPending}>{emailPending ? "Enviando..." : "Enviar confirmação"}</button></div>
          <Message state={emailState} />
        </form>
        <aside className="pp-settings-security-note"><Mail aria-hidden="true" /><p>Verificação de telefone por OTP e proteção adicional para mudanças sensíveis ainda não estão disponíveis.</p></aside>
        <section className="pp-settings-signout" aria-labelledby="settings-signout-title">
          <div><h3 id="settings-signout-title">Sessão atual</h3><p>Encerre com segurança o acesso neste dispositivo.</p></div>
          <SecureLogoutForm />
        </section>
      </section> : null}

      {activeSection === "appearance" ? <section className="pp-settings-section" aria-labelledby="settings-appearance-title">
        <header className="pp-settings-section__header">
          <span className="pp-settings-section__icon"><Palette aria-hidden="true" /></span>
          <div><h2 id="settings-appearance-title">Aparência</h2><p>Alterne entre os temas claro e escuro sem mudar a estrutura do produto.</p></div>
        </header>
        <div className="pp-settings-theme-row"><div><strong>Tema do aplicativo</strong><p>Sua preferência é aplicada em toda a experiência autenticada e fica salva neste navegador.</p></div><ThemeToggle /></div>
      </section> : null}
    </div>
  </div>;
}
