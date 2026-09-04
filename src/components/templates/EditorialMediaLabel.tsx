import type { ResolvedTrainerMedia } from "@/lib/domain/trainer-media";

export function EditorialMediaLabel({
  media,
  className,
  proof = false,
}: {
  media: ResolvedTrainerMedia | null;
  className: string;
  proof?: boolean;
}) {
  if (!media?.requiresEditorialDisclosure) return null;
  return (
    <figcaption className={className}>
      {proof ? "Imagem editorial Cheipi — não representa aluno ou resultado" : "Imagem editorial Cheipi"}
    </figcaption>
  );
}
