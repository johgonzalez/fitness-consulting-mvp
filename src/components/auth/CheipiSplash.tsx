import { CheipiBrand } from "./CheipiBrand";

export function CheipiSplash({ compact = false }: { compact?: boolean }) {
  return <div className={`cheipi-splash${compact ? " cheipi-splash--compact" : ""}`} role="status" aria-label="Abrindo Cheipi">
    <span className="cheipi-splash__halo" aria-hidden="true" />
    <CheipiBrand symbolOnly className="cheipi-splash__brand" />
  </div>;
}
