import Image from "next/image";
import Link from "next/link";
import { ClipboardCheck, Dumbbell, UsersRound, UserRound, type LucideIcon } from "lucide-react";
import { CheipiBrand } from "@/components/auth/CheipiBrand";
import styles from "./TodayHero.module.css";

export type TodayMetric = { id: "students" | "workouts" | "assessments" | "leads"; value: number; label: string; href: string };
const icons: Record<TodayMetric["id"], LucideIcon> = { students: UserRound, workouts: Dumbbell, assessments: ClipboardCheck, leads: UsersRound };

export function TodayHero({ name, date, metrics }: { name: string; date: string; metrics: TodayMetric[] }) {
  return <section className={styles.hero} aria-label="Resumo de hoje">
    <div className={styles.media}>
      <Image src="/photos/cheipi/cheipi-forca-v1.png" alt="" fill priority sizes="(max-width: 760px) 100vw, 760px" className={styles.photo} />
    </div>
    <header className={styles.header}>
      <CheipiBrand href="/dashboard" symbolOnly />
      <div><h1>Olá, {name}</h1><p>{date}</p></div>
    </header>
    <div className={styles.metrics}>{metrics.map(({ id, value, label, href }) => {
      const Icon = icons[id];
      return <Link href={href} key={id} className={styles.metric} data-metric={id}><Icon aria-hidden="true" size={18} strokeWidth={1.75} /><strong>{value}</strong><span>{label}</span></Link>;
    })}</div>
  </section>;
}
