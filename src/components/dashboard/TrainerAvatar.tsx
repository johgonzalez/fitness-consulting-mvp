import { PersonAvatar } from "@/components/ui/PersonAvatar";

export function TrainerAvatar({ name, imageUrl, size = "default" }: { name: string; imageUrl?: string | null; size?: "default" | "small" }) {
  return <PersonAvatar
    name={name}
    src={imageUrl}
    size={size === "small" ? "small" : "medium"}
    status="online"
    loading="eager"
    className={`trainer-avatar ${size}`}
  />;
}
