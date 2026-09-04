import { Mail, ShieldCheck, UserRound } from "lucide-react";
import { SecureLogoutForm } from "@/components/auth/SecureLogoutForm";
import { TrainerPresence } from "@/components/student/TrainerPresence";
import { requireUser } from "@/lib/auth/user";
import { demoWorkspaceFixture } from "@/lib/demo/fixture";
import { isDemoWorkspaceRequest } from "@/lib/demo/workspace";
import { getStudentTodayWorkspace } from "@/lib/workouts/student-workspace";
import { createClient } from "@/lib/supabase/server";
import { StudentProfileForm } from "@/components/student/StudentProfileForm";
import { resolveStudentProfileImageUrl } from "@/lib/supabase/student-profile-media";

export const dynamic = "force-dynamic";

export default async function StudentProfilePage() {
  const [user, workspace, demoMode] = await Promise.all([requireUser(), getStudentTodayWorkspace(), isDemoWorkspaceRequest()]);
  const demoStudent = demoMode ? demoWorkspaceFixture.students.students.find((student) => student.name === workspace.identity.studentName) : null;
  const email = demoStudent?.email ?? user.email ?? "E-mail não disponível";
  const profile = demoMode
    ? null
    : await createClient()
      .then((supabase) => supabase.from("student_profiles").select("preferred_name,whatsapp_e164,profile_image_path").eq("user_id", user.id).maybeSingle())
      .then(({ data }) => data);
  const signedImage = await resolveStudentProfileImageUrl(profile?.profile_image_path);

  return <section className="pp-student-page pp-student-profile">
    <header className="pp-student-profile__heading"><p>Minha conta</p><h1>Perfil</h1><span>Identidade e relacionamento disponíveis com segurança.</span></header>
    <section className="pp-student-profile__panel" aria-labelledby="profile-account-title">
      <header><UserRound aria-hidden="true" /><div><h2 id="profile-account-title">Conta</h2><p>Dados de acesso em modo somente leitura.</p></div></header>
      <dl><div><dt><Mail aria-hidden="true" />E-mail</dt><dd>{email}</dd></div><div><dt><ShieldCheck aria-hidden="true" />Acesso</dt><dd>{demoMode ? "Workspace demo local" : "Conta autenticada"}</dd></div></dl>
    </section>
    {!demoMode ? <section className="pp-student-profile__panel" aria-labelledby="profile-edit-title"><header><div><h2 id="profile-edit-title">Dados opcionais</h2><p>Você pode completar ou alterar estes dados quando quiser.</p></div></header><StudentProfileForm name={profile?.preferred_name ?? ""} whatsapp={profile?.whatsapp_e164 ?? ""} studentName={workspace.identity.studentName} currentImageUrl={signedImage} /></section> : null}
    <section className="pp-student-profile__panel" aria-labelledby="profile-trainer-title">
      <header><div><h2 id="profile-trainer-title">Seu acompanhamento</h2><p>Personal vinculado ao relacionamento ativo.</p></div></header>
      <TrainerPresence {...workspace.identity.trainer} />
    </section>
    <section className="pp-student-profile__account-actions"><p>O tema pode ser alterado pelo controle no topo e permanece salvo neste dispositivo.</p><SecureLogoutForm /></section>
  </section>;
}
