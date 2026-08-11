import { ArrowRight } from "lucide-react";
import { painPoints } from "@/data/content";
import { SectionHeading } from "@/components/ui/SectionHeading";
export function PainPointsSection() { return <section className="section light-section"><div className="container"><SectionHeading eyebrow="O ponto de virada" title="Treinar não precisa ser uma sequência de tentativas e erros." description="Quando falta direção, até o esforço mais bem-intencionado perde força. Um bom plano transforma dúvida em clareza." light/><div className="pain-grid">{painPoints.map((p,i)=><article key={p}><span>0{i+1}</span><p>{p}</p></article>)}</div><div className="section-statement"><ArrowRight/><p>A consultoria transforma essas dúvidas em um plano <strong>claro e acompanhado.</strong></p></div></div></section>; }
