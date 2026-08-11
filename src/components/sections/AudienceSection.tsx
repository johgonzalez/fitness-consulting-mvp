import { Check } from "lucide-react";
import { audiences } from "@/data/content";
import { SectionHeading } from "@/components/ui/SectionHeading";
export function AudienceSection(){return <section className="section light-section audience"><div className="container"><SectionHeading eyebrow="Para quem é" title="A consultoria é para você que…" light/><div className="audience-grid">{audiences.map(x=><div key={x}><Check/>{x}</div>)}</div><blockquote><span>Transparência em primeiro lugar</span><p>Não é uma promessa de resultado rápido. É um processo estruturado para quem está disposto a treinar com consistência.</p></blockquote></div></section>}
