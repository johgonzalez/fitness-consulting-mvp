import Link from "next/link";
import { Dumbbell, GraduationCap } from "lucide-react";
import { authRouteWithNext } from "@/lib/navigation/student-invitation";

export function AuthContextPicker({ route, nextPath }: { route: "/login" | "/signup"; nextPath?: string }) {
  return <div className="pc-auth-contexts" aria-label="Escolha como você usa o PPerfil">
    <Link href={authRouteWithNext(route, nextPath, "trainer")}>
      <span><Dumbbell aria-hidden="true" /></span>
      <div><strong>Sou Personal Trainer</strong><p>Crie seu site, organize seus alunos e acompanhe os treinos.</p></div>
    </Link>
    <Link href={authRouteWithNext(route, nextPath, "student")}>
      <span><GraduationCap aria-hidden="true" /></span>
      <div><strong>Sou Aluno</strong><p>Acesse seus treinos e acompanhe sua evolução.</p></div>
    </Link>
  </div>;
}
