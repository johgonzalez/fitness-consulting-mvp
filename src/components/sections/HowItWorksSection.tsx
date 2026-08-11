import { steps } from "@/data/content";
import { SectionHeading } from "@/components/ui/SectionHeading";
export function HowItWorksSection(){return <section id="como-funciona" className="section how"><div className="container"><SectionHeading eyebrow="Como funciona" title="Do seu objetivo a um plano claro." description="Três etapas simples para começar e continuar evoluindo."/><div className="steps">{steps.map(([n,t,d])=><article key={n}><div className="step-top"><span>{n}</span><i/></div><h3>{t}</h3><p>{d}</p></article>)}</div></div></section>}
