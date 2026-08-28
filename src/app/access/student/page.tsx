import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { StudentAccessState } from "@/components/auth/StudentAccessState";
import { requireUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";

type StudentEntryState = {
  active_relationship?: boolean;
  student_role_active?: boolean;
  waitlist_joined?: boolean;
  waitlist_email?: string | null;
  waitlist_whatsapp?: string | null;
};

export default async function StudentAccessPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_my_student_entry_state");
  const state = data as StudentEntryState | null;
  if (state?.student_role_active === true && state.active_relationship === true) redirect("/student/today");

  return <AuthShell title="Acesso do Aluno" subtitle="Seu Personal libera o app por meio de um convite.">
    <StudentAccessState email={state?.waitlist_email ?? user.email ?? ""} joined={state?.waitlist_joined === true} whatsapp={state?.waitlist_whatsapp} />
  </AuthShell>;
}
