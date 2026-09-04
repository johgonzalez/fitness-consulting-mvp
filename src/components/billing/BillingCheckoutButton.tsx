"use client";

import { useState } from "react";

export function BillingCheckoutButton() {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function startCheckout() {
    if (pending) return;
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/billing/stripe/checkout", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const payload = await response.json() as { ok?: boolean; checkoutUrl?: string; message?: string };
      if (!response.ok || !payload.ok || !payload.checkoutUrl) {
        setMessage(payload.message || "Não foi possível iniciar o pagamento agora.");
        return;
      }
      window.location.assign(payload.checkoutUrl);
    } catch {
      setMessage("Não foi possível iniciar o pagamento agora.");
    } finally {
      setPending(false);
    }
  }

  return <div className="billing-checkout-action">
    <button className="pp-button pp-button--primary" type="button" onClick={startCheckout} disabled={pending}>
      {pending ? "Abrindo pagamento…" : "Assinar Cheipi Pro"}
    </button>
    {message ? <p className="billing-checkout-error" role="alert">{message}</p> : null}
  </div>;
}
