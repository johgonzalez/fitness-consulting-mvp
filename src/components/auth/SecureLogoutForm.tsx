"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";
import { logout } from "@/app/actions/auth";
import { clearWorkoutRecoveryStorage } from "@/lib/workouts/offline-recovery";

export function SecureLogoutForm({ compact = false }: { compact?: boolean }) {
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [pending, setPending] = useState(false);
  async function logoutWithLocalCleanup() {
    setPending(true);
    try {
      await clearWorkoutRecoveryStorage();
    } catch {
      // Server logout must still proceed when browser storage is unavailable.
    }
    await logout();
  }

  return <div className={`pp-secure-logout${compact ? " pp-secure-logout--compact" : ""}`}>
    <button type="button" onClick={() => setConfirmationOpen(true)} aria-expanded={confirmationOpen}><LogOut aria-hidden="true" /><span>{compact ? "Sair" : "Sair da conta"}</span></button>
    {confirmationOpen ? <div className="pp-logout-confirmation" role="alertdialog" aria-modal="true" aria-label="Confirmar saída">
      <strong>Encerrar esta sessão?</strong>
      <p>Você precisará entrar novamente para acessar o PPerfil.</p>
      <div><button type="button" disabled={pending} onClick={logoutWithLocalCleanup}>{pending ? "Saindo…" : "Sair"}</button><button type="button" disabled={pending} onClick={() => setConfirmationOpen(false)}>Continuar conectado</button></div>
    </div> : null}
  </div>;
}
