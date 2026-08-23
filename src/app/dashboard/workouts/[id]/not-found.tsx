import Link from "next/link";
import { Dumbbell } from "lucide-react";
import { EmptyState } from "@/components/ui/PPerfilPrimitives";

export default function WorkoutNotFound() {
  return <main className="dashboard-main pp-workspace"><section className="pp-panel"><EmptyState icon={Dumbbell} title="Treino não encontrado" description="A versão pode não existir ou não estar disponível para este relacionamento." action={<Link href="/dashboard/workouts" className="pp-button pp-button--secondary">Voltar para treinos</Link>} /></section></main>;
}
