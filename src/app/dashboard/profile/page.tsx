import { redirect } from "next/navigation";
import { ProfileEditor } from "@/components/dashboard/ProfileEditor";
import { requireUser } from "@/lib/auth/user";
import { findOwnerProfile } from "@/lib/supabase/trainers";

export default async function ProfilePage() {
  const [user, profile] = await Promise.all([requireUser(), findOwnerProfile()]);
  if (!profile) redirect("/onboarding");
  return <main className="dashboard-main pp-workspace pp-settings-page">
    <header className="pp-page-header">
      <div>
        <p className="pp-page-context">Conta</p>
        <h1>Configurações</h1>
        <p>Gerencie seu perfil profissional, segurança e preferências da Cheipi.</p>
      </div>
    </header>
    <ProfileEditor profile={profile} email={user.email ?? ""} />
  </main>;
}
