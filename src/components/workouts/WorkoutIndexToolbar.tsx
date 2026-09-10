"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition, type ReactNode } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { ModalSurface } from "@/components/ui/ModalSurface";
import styles from "./workouts.module.css";

type Filter = { label: string; href: string; count: number; active: boolean };
export function WorkoutIndexToolbar({ filters, action, note, initialQuery, resultCount }: { filters: Filter[]; action: ReactNode; note?: ReactNode; initialQuery: string; resultCount: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const active = filters.find((filter) => filter.active) ?? filters[0];
  return <div className={styles.indexToolbar}>
    <form className={styles.indexSearch} role="search" aria-label="Buscar treinos" aria-busy={pending} onSubmit={(event) => {
      event.preventDefault();
      const query = String(new FormData(event.currentTarget).get("q") ?? "").trim().slice(0, 160);
      const destination = new URL(active.href, "http://local.invalid");
      if (query) destination.searchParams.set("q", query); else destination.searchParams.delete("q");
      startTransition(() => router.push(destination.pathname + destination.search, { scroll: false }));
    }}>
      <input key={initialQuery} name="q" type="search" defaultValue={initialQuery} maxLength={160} placeholder="Buscar treino ou aluno" aria-label="Nome do treino ou aluno" />
      <button type="submit" aria-label="Buscar" disabled={pending}><Search aria-hidden="true" /></button>
    </form>
    <button className={styles.filterTrigger} type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open} aria-label={"Filtrar treinos: " + active.label}>{active.label}<span>{active.count}</span><ChevronDown aria-hidden="true" /></button>
    <nav className={styles.desktopFilters} aria-label="Filtrar treinos">{filters.map((filter) => <Link key={filter.href} href={filter.href} scroll={false} aria-current={filter.active ? "page" : undefined}>{filter.label}<span>{filter.count}</span></Link>)}</nav>
    <div className={styles.indexCreate}>{action}</div>
    <p className={styles.indexNote} role="status">{pending ? "Buscando treinos…" : initialQuery ? resultCount + (resultCount === 1 ? " treino encontrado" : " treinos encontrados") : note}</p>
    <ModalSurface open={open} onClose={() => setOpen(false)} labelledBy={titleId}>
      <section className={styles.filterSheet}>
        <header><h2 id={titleId}>Mostrar treinos</h2><button type="button" onClick={() => setOpen(false)} aria-label="Fechar filtros"><X aria-hidden="true" /></button></header>
        <nav aria-label="Status do treino">{filters.map((filter) => <Link key={filter.href} href={filter.href} scroll={false} onClick={() => setOpen(false)} aria-current={filter.active ? "page" : undefined} data-modal-initial-focus={filter.active || undefined}><span>{filter.label}<small>{filter.count} {filter.count === 1 ? "treino" : "treinos"}</small></span>{filter.active ? <Check aria-hidden="true" /> : null}</Link>)}</nav>
      </section>
    </ModalSurface>
  </div>;
}
