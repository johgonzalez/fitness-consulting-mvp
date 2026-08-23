import Image from "next/image";
import type { TrainerSiteData } from "@/lib/domain/trainer-site";
import { InstagramMark } from "@/components/ui/InstagramMark";
import styles from "./essential-editorial.module.css";

type EssentialTestimonial = TrainerSiteData["testimonials"][number];

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function EssentialTestimonialCard({
  testimonial,
  featured = false,
}: {
  testimonial: EssentialTestimonial;
  featured?: boolean;
}) {
  return (
    <blockquote className={`${styles.testimonialCard} ${featured ? styles.testimonialFeatured : ""}`}>
      <header className={styles.testimonialHeader}>
        <span className={styles.testimonialAvatar}>
          {testimonial.image ? (
            <Image src={testimonial.image} alt="" fill sizes="54px" unoptimized />
          ) : (
            <span data-avatar-fallback aria-hidden="true">{initials(testimonial.studentName)}</span>
          )}
        </span>
        <span className={styles.testimonialIdentity}>
          <strong><cite>{testimonial.studentName}</cite></strong>
          {testimonial.context ? <small>{testimonial.context}</small> : null}
          {testimonial.instagramHandle ? <a className={styles.testimonialInstagram} href={testimonial.instagramUrl ?? undefined} target="_blank" rel="noreferrer"><InstagramMark />@{testimonial.instagramHandle}</a> : null}
        </span>
      </header>
      <p>“{testimonial.content}”</p>
    </blockquote>
  );
}
