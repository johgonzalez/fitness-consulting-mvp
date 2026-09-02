"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AppFullscreenController } from "@/components/app-shell/AppFullscreenController";
import { AuthProviderControls } from "./AuthProviderControls";
import { CheipiBrand } from "./CheipiBrand";
import { CheipiSplash } from "./CheipiSplash";

const SPLASH_DURATION_MS = 900;
const SPLASH_SESSION_KEY = "pperfil:entry-splash:v1";

const mosaic = [
  { src: "/images/saas/auth-coaching.webp", className: "cheipi-welcome__tile--coaching", priority: true },
  { src: "/images/saas/auth-trainer-03.webp", className: "cheipi-welcome__tile--strength", priority: false },
  { src: "/images/saas/auth-trainer-02.webp", className: "cheipi-welcome__tile--movement", priority: false },
  { src: "/images/saas/auth-trainer-04.webp", className: "cheipi-welcome__tile--conditioning", priority: false },
  { src: "/images/saas/auth-trainer.webp", className: "cheipi-welcome__tile--focus", priority: false },
] as const;

export function CheipiEntry({ googleEnabled, nextPath }: { googleEnabled: boolean; nextPath?: string }) {
  const [entryStage, setEntryStage] = useState<"checking" | "splash" | "welcome">("checking");

  useEffect(() => {
    let timer: number | undefined;
    const frame = window.requestAnimationFrame(() => {
      const splashSeen = Boolean(window.sessionStorage.getItem(SPLASH_SESSION_KEY));
      if (splashSeen) {
        setEntryStage("welcome");
        return;
      }
      setEntryStage("splash");
      timer = window.setTimeout(() => {
        window.sessionStorage.setItem(SPLASH_SESSION_KEY, "seen");
        setEntryStage("welcome");
      }, SPLASH_DURATION_MS);
    });
    return () => {
      window.cancelAnimationFrame(frame);
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  if (entryStage === "checking") return <main className="cheipi-entry-pending" aria-hidden="true" />;
  if (entryStage === "splash") return <CheipiSplash />;

  const emailParams = new URLSearchParams();
  if (nextPath) emailParams.set("next", nextPath);
  const emailHref = `/login${emailParams.size ? `?${emailParams}` : ""}`;

  return <main className="cheipi-welcome">
    <AppFullscreenController />
    <div className="cheipi-welcome__mosaic" aria-hidden="true">
      {mosaic.map((item) => <figure className={`cheipi-welcome__tile ${item.className}`} key={item.src}>
        <Image src={item.src} alt="" fill sizes="(max-width: 760px) 62vw, 38vw" priority={item.priority} loading={item.priority ? undefined : "lazy"} unoptimized />
      </figure>)}
    </div>
    <div className="cheipi-welcome__shade" aria-hidden="true" />
    <CheipiBrand href="/" className="cheipi-welcome__wordmark" />
    <section className="cheipi-welcome__hero" aria-labelledby="cheipi-welcome-title">
      <div className="cheipi-welcome__orb" aria-hidden="true">
        <span className="cheipi-welcome__orb-ring" />
        <CheipiBrand symbolOnly className="cheipi-welcome__orb-brand" />
      </div>
      <h1 id="cheipi-welcome-title"><span>Todo treino.</span><span>Toda evolução.</span><strong>Juntos.</strong></h1>
      <p>A plataforma que conecta Personal Trainers e Alunos para resultados reais.</p>
    </section>
    <div className="cheipi-welcome__actions">
      <AuthProviderControls googleEnabled={googleEnabled} nextPath={nextPath} />
      <Link className="cheipi-welcome__email" href={emailHref} data-fullscreen-eligible="true">Usar e-mail</Link>
    </div>
  </main>;
}

export { SPLASH_DURATION_MS };
