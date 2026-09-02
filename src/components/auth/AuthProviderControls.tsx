"use client";

import { useState } from "react";
import { startGoogleOAuth } from "@/app/actions/auth";
import type { AuthContext } from "@/lib/validation/auth";

export function AuthProviderControls({ nextPath, context, googleEnabled = true, googleFirst = false }: { nextPath?: string; context?: AuthContext; googleEnabled?: boolean; googleFirst?: boolean }) {
  const [notice, setNotice] = useState<string | null>(null);

  const appleControl = <button
    key="apple"
    className="cheipi-provider-control cheipi-provider-control--apple"
    type="button"
    aria-label="Entrar com Apple — em breve"
    aria-describedby={notice ? "cheipi-apple-notice" : undefined}
    onClick={() => setNotice("Entrar com Apple — em breve")}
    data-fullscreen-eligible="true"
  >
    {/* Official Apple-generated logo-only artwork, stored locally; this control never starts OAuth. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src="/auth/providers/apple-black-square@2x.png" alt="" width="104" height="104" aria-hidden="true" />
  </button>;
  const googleControl = <form key="google" action={startGoogleOAuth}>
    {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}
    {context ? <input type="hidden" name="context" value={context} /> : null}
    <button
      className="cheipi-provider-control cheipi-provider-control--google"
      type="submit"
      aria-label={googleEnabled ? "Continuar com Google" : "Google indisponível neste ambiente"}
      title={googleEnabled ? "Continuar com Google" : "Google indisponível neste ambiente"}
      disabled={!googleEnabled}
      data-fullscreen-eligible="true"
    >
      {/* Official pre-approved Google Identity icon-mode artwork, stored locally. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/auth/providers/google-dark-square@2x.png" alt="" width="80" height="80" aria-hidden="true" />
    </button>
  </form>;

  return <div className="cheipi-provider-area">
    <div className="cheipi-provider-controls" aria-label="Opções de acesso">
      {googleFirst ? <>{googleControl}{appleControl}</> : <>{appleControl}{googleControl}</>}
    </div>
    {notice ? <p id="cheipi-apple-notice" className="cheipi-provider-notice" role="status" aria-live="polite">{notice}</p> : null}
  </div>;
}
