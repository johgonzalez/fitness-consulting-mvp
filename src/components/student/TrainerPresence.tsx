import { Avatar } from "@/components/ui/PPerfilPrimitives";

export function TrainerPresence({
  name,
  imageUrl,
  credential,
  compact = false,
}: {
  name: string;
  imageUrl: string | null;
  credential: string | null;
  compact?: boolean;
}) {
  return <div className={`pp-trainer-presence${compact ? " pp-trainer-presence--compact" : ""}`}>
    <Avatar name={name} imageUrl={imageUrl} size={compact ? "small" : "medium"} />
    <span><small>Treino por</small><strong>{name}</strong>{!compact && credential ? <em>{credential}</em> : null}</span>
  </div>;
}
