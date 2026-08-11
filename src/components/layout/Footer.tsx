import { ArrowUpRight } from "lucide-react";
import { siteConfig } from "@/config/site";

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <div className="brand"><span className="brand-mark">{siteConfig.initials}</span><span><strong>{siteConfig.name}</strong><small>{siteConfig.descriptor}</small></span></div>
          <p>Consultoria fitness online com estratégia, proximidade e consistência.</p>
        </div>
        <div><h3>Navegação</h3><a href="#como-funciona">Como funciona</a><a href="#beneficios">Benefícios</a><a href="#oferta">Consultoria</a><a href="#duvidas">Dúvidas</a></div>
        <div><h3>Perfil demonstrativo</h3><span>{siteConfig.location}</span><span>CREF {siteConfig.professionalData.cref}</span></div>
        <div><h3>Informações</h3><a href="/privacy">Política de Privacidade</a><a href="/terms">Termos de Uso</a></div>
      </div>
      <div className="container demo-disclaimer">
        <p>Site demonstrativo desenvolvido pela Perfil.Pro. Nomes, imagens, CREF, depoimentos e resultados apresentados nesta página são ilustrativos.</p>
        <a href={siteConfig.perfilProUrl} target="_blank" rel="noreferrer">Quero um site como este <ArrowUpRight aria-hidden="true" /></a>
      </div>
      <div className="container footer-bottom">© {new Date().getFullYear()} Projeto demonstrativo.<span>Landing page para Personal Trainers.</span></div>
    </footer>
  );
}
