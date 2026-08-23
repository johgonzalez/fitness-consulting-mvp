"use client";

import Image from "next/image";
import { UserRound } from "lucide-react";
import { useState } from "react";

export type PersonAvatarSize = "small" | "medium" | "large";
export type PersonAvatarStatus = "online" | "offline";

export type PersonAvatarProps = {
  name: string;
  src?: string | null;
  imageUrl?: string | null;
  alt?: string;
  size?: PersonAvatarSize;
  status?: PersonAvatarStatus;
  loading?: "eager" | "lazy";
  className?: string;
};

const imageSizes: Record<PersonAvatarSize, string> = {
  small: "32px",
  medium: "40px",
  large: "56px",
};

type ImageState = "fallback" | "loading" | "loaded" | "error";

export function PersonAvatar({
  name,
  src,
  imageUrl,
  alt,
  size = "medium",
  status,
  loading = "lazy",
  className = "",
}: PersonAvatarProps) {
  const resolvedSource = src ?? imageUrl ?? null;

  return (
    <PersonAvatarVisual
      key={resolvedSource ?? "neutral-avatar"}
      name={name}
      source={resolvedSource}
      alt={alt}
      size={size}
      status={status}
      loading={loading}
      className={className}
    />
  );
}

function PersonAvatarVisual({
  name,
  source,
  alt,
  size,
  status,
  loading,
  className,
}: {
  name: string;
  source: string | null;
  alt?: string;
  size: PersonAvatarSize;
  status?: PersonAvatarStatus;
  loading: "eager" | "lazy";
  className: string;
}) {
  const [imageState, setImageState] = useState<ImageState>(
    source ? "loading" : "fallback",
  );

  const accessibleLabel =
    alt ??
    (source && imageState === "loaded"
      ? `Foto de ${name}`
      : `Avatar neutro de ${name}`);

  return (
    <span
      className={`pp-avatar pp-person-avatar pp-avatar--${size}${className ? ` ${className}` : ""}`}
      role="img"
      aria-label={accessibleLabel}
      aria-busy={imageState === "loading" || undefined}
      data-avatar-state={imageState}
    >
      <span className="pp-avatar__fallback" aria-hidden="true">
        <UserRound />
      </span>

      {source && imageState !== "error" ? (
        <Image
          className="pp-avatar__image"
          src={source}
          alt=""
          fill
          sizes={imageSizes[size]}
          loading={loading}
          unoptimized
          onLoad={() => setImageState("loaded")}
          onError={() => setImageState("error")}
        />
      ) : null}

      {status ? (
        <i
          className={`pp-avatar__status pp-avatar__status--${status}`}
          aria-hidden="true"
        />
      ) : null}
    </span>
  );
}
