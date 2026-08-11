import { trustItems } from "@/data/content";
export function TrustBar() { return <section className="trust"><div className="container trust-inner"><p>Estratégia adaptada à sua realidade</p><div>{trustItems.map(({icon: Icon,label}) => <span key={label}><Icon size={17}/>{label}</span>)}</div></div></section>; }
