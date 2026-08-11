type Props = { eyebrow?: string; title: string; description?: string; align?: "left" | "center"; light?: boolean };

export function SectionHeading({ eyebrow, title, description, align = "left", light = false }: Props) {
  return <div className={`section-heading ${align === "center" ? "mx-auto text-center" : ""}`}>
    {eyebrow && <p className="eyebrow">{eyebrow}</p>}
    <h2 className={light ? "text-ink" : "text-white"}>{title}</h2>
    {description && <p className={light ? "text-slate-600" : "text-muted"}>{description}</p>}
  </div>;
}
