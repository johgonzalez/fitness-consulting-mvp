import Image from "next/image";
import { ImageIcon, Quote } from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import type { Testimonial } from "@/lib/domain/trainer";

export function TestimonialsSection({ testimonials }: { testimonials: Testimonial[] }) {
  const published = testimonials.filter((item) => item.published);
  if (!published.length) return null;
  return <section className="section light-section testimonials"><div className="container"><SectionHeading eyebrow="Histórias reais" title="Resultados construídos com acompanhamento." description="Relatos compartilhados pelos alunos." light /><div className="testimonial-grid">{published.map((item) => <article key={item.id}><div className="testimonial-image">{item.image_url ? <Image src={item.image_url} alt={`Foto de ${item.student_name}`} fill unoptimized sizes="(max-width: 720px) 100vw, 33vw" /> : <><ImageIcon /><span>Sem foto</span></>}</div><Quote /><h3>“{item.content}”</h3><p>{item.student_name}{item.result_context ? ` · ${item.result_context}` : ""}</p></article>)}</div><p className="consent-note">Fotos e relatos devem ser publicados somente com autorização dos alunos.</p></div></section>;
}
