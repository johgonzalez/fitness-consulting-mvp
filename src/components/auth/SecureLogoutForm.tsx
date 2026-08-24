"use client";

import { LogOut } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { clearWorkoutRecoveryStorage } from "@/lib/workouts/offline-recovery";

export function SecureLogoutForm() {
  async function logoutWithLocalCleanup() {
    try {
      await clearWorkoutRecoveryStorage();
    } catch {
      // Server logout must still proceed when browser storage is unavailable.
    }
    await logout();
  }

  return <form action={logoutWithLocalCleanup}>
    <button type="submit"><LogOut aria-hidden="true" />Sair da conta</button>
  </form>;
}
