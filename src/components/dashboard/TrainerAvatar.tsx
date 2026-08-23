import Image from "next/image";

export function TrainerAvatar({ name, imageUrl, size = "default" }: { name: string; imageUrl?: string | null; size?: "default" | "small" }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "PP";
  return <span className={`trainer-avatar ${size}`} aria-label={imageUrl ? `Foto de ${name}` : `Iniciais de ${name}`}>
    {imageUrl ? <Image src={imageUrl} alt="" fill sizes={size === "small" ? "36px" : "42px"} unoptimized /> : <span aria-hidden="true">{initials}</span>}
    <i aria-hidden="true" />
  </span>;
}
