"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

export function PasswordField({ id, autoComplete, describedBy }: { id: string; autoComplete: string; describedBy?: string }) {
  const [visible, setVisible] = useState(false);
  return <div className="password-field">
    <input id={id} name="password" type={visible ? "text" : "password"} minLength={8} maxLength={128} autoComplete={autoComplete} placeholder="Digite sua senha" required aria-describedby={describedBy} />
    <button type="button" onClick={() => setVisible((value) => !value)} aria-label={visible ? "Ocultar senha" : "Mostrar senha"} aria-pressed={visible}>
      {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
    </button>
  </div>;
}
