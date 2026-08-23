import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Avatar } from "@/components/ui/PPerfilPrimitives";

type FilterItem = {
  label: string;
  href: string;
  count?: number;
  active?: boolean;
};

export function OperationalToolbar({
  filters,
  action,
  note,
}: {
  filters: FilterItem[];
  action?: ReactNode;
  note?: ReactNode;
}) {
  return <div className="pp-operational-toolbar">
    <nav className="pp-filter-control" aria-label="Filtros da lista">
      {filters.map((item) => <Link key={item.href} href={item.href} className={item.active ? "active" : undefined} aria-current={item.active ? "page" : undefined}>
        <span>{item.label}</span>{typeof item.count === "number" ? <b>{item.count}</b> : null}
      </Link>)}
    </nav>
    {note ? <div className="pp-operational-toolbar__note">{note}</div> : null}
    {action ? <div className="pp-operational-toolbar__action">{action}</div> : null}
  </div>;
}

export function DataList({
  label,
  columns,
  className = "",
  children,
}: {
  label: string;
  columns: string[];
  className?: string;
  children: ReactNode;
}) {
  return <section className={`pp-data-list ${className}`} role="table" aria-label={label}>
    <div className="pp-data-list__head" role="row">
      {columns.map((column) => <span role="columnheader" key={column}>{column}</span>)}
    </div>
    <div className="pp-data-list__body" role="rowgroup">{children}</div>
  </section>;
}

export function DataListRow({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href} className="pp-data-list__row" role="row">
    {children}
    <span className="pp-data-list__open" role="cell" aria-hidden="true"><ChevronRight /></span>
  </Link>;
}

export function IdentityCell({ name, detail }: { name: string; detail?: string | null }) {
  return <span className="pp-identity-cell" role="cell">
    <Avatar name={name} size="medium" />
    <span><strong>{name}</strong>{detail ? <small>{detail}</small> : null}</span>
  </span>;
}

export function MasterDetail({ children, aside }: { children: ReactNode; aside: ReactNode }) {
  return <div className="pp-master-detail">
    <div className="pp-master-detail__main">{children}</div>
    <aside className="pp-master-detail__aside">{aside}</aside>
  </div>;
}

export function ContextPanel({
  title,
  description,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return <section className={`pp-context-panel ${className}`}>
    <header><h2>{title}</h2>{description ? <p>{description}</p> : null}</header>
    <div className="pp-context-panel__body">{children}</div>
  </section>;
}

export function ActionGroup({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return <section className="pp-action-group">
    <header><h2>{title}</h2>{description ? <p>{description}</p> : null}</header>
    <div>{children}</div>
  </section>;
}
