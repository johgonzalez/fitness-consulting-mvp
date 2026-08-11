"use client";
import { Plus } from "lucide-react";
import { faq } from "@/data/faq";
import { trackEvent } from "@/lib/analytics";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { siteConfig } from "@/config/site";
export function FAQSection(){return <section id="duvidas" className="section light-section faq-section"><div className="container faq-grid"><SectionHeading eyebrow="Dúvidas frequentes" title="O que você precisa saber para começar." description={`Ainda com dúvida? Fale com ${siteConfig.shortName}.`} light/><div className="faq-list">{faq.map(({q,a})=><details key={q} onToggle={e=>{if(e.currentTarget.open) trackEvent("view_faq",{question:q})}}><summary>{q}<Plus/></summary><p>{a}</p></details>)}</div></div></section>}
