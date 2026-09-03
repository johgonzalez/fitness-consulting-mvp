"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { startGoogleOAuth } from "@/app/actions/auth";
import { AppFullscreenController } from "@/components/app-shell/AppFullscreenController";
import { CheipiBrand } from "./CheipiBrand";
import { CheipiSplash } from "./CheipiSplash";

const SPLASH_DURATION_MS = 900;
const SPLASH_SESSION_KEY = "pperfil:entry-splash:v1";

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
  const emailHref = emailParams.size ? `/login?${emailParams}` : "/login";

  return <main className="cheipi-welcome">
    <AppFullscreenController />
    <div className="cheipi-welcome__media" aria-hidden="true"><Image src="/images/saas/auth-trainer.webp" alt="" fill sizes="100vw" priority unoptimized /></div>
    <div className="cheipi-welcome__shade" aria-hidden="true" />
    <CheipiBrand href="/" className="cheipi-welcome__wordmark" />
    <section className="cheipi-welcome__hero" aria-labelledby="cheipi-welcome-title">
      <h1 id="cheipi-welcome-title"><span>Todo treino.</span><span>Toda evolução.</span><strong>Juntos.</strong></h1>
      <p>Personal Trainers e alunos, conectados para resultados reais.</p>
    </section>
    <div className="cheipi-welcome__actions">
      <form action={startGoogleOAuth}>
        {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}
        <button className="cheipi-provider-control cheipi-provider-control--google" type="submit" aria-label={googleEnabled ? "Continuar com Google" : "Google indisponível neste ambiente"} disabled={!googleEnabled} data-fullscreen-eligible="true">
          <Image src="/auth/providers/google-dark-square@2x.png" alt="" width="80" height="80" aria-hidden="true" />
        </button>
      </form>
      <Link className="cheipi-welcome__email" href={emailHref} data-fullscreen-eligible="true">Usar e-mail</Link>
    </div>
  </main>;
}

export { SPLASH_DURATION_MS };
