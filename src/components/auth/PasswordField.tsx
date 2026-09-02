"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

export function PasswordField({ id, name = "password", autoComplete, describedBy, placeholder = "Digite sua senha" }: { id: string; name?: string; autoComplete: string; describedBy?: string; placeholder?: string }) {
  const [visible, setVisible] = useState(false);
  return <div className="password-field">
    <input id={id} name={name} type={visible ? "text" : "password"} minLength={8} maxLength={128} autoComplete={autoComplete} placeholder={placeholder} required aria-describedby={describedBy} />
    <button type="button" onClick={() => setVisible((value) => !value)} aria-label={visible ? "Ocultar senha" : "Mostrar senha"} aria-pressed={visible}>
      {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
    </button>
  </div>;
}
