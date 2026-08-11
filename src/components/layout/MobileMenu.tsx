"use client";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { navigation } from "@/config/site";

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  return <div className="mobile-menu-wrap">
    <button className="menu-trigger" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="mobile-navigation" aria-label={open ? "Fechar menu" : "Abrir menu"}>{open ? <X /> : <Menu />}</button>
    {open && <nav id="mobile-navigation" className="mobile-navigation" aria-label="Navegação móvel">
      {navigation.map((item) => <a key={item.href} href={item.href} onClick={() => setOpen(false)}>{item.label}</a>)}
    </nav>}
  </div>;
}
