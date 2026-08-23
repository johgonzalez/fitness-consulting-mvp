import { Skeleton } from "@/components/ui/PPerfilPrimitives";

export default function WorkoutBuilderLoading() {
  return <main className="dashboard-main pp-workspace"><Skeleton className="pp-skeleton--toolbar" /><Skeleton className="pp-skeleton--list" /></main>;
}
