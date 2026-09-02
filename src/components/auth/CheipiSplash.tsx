import { CheipiBrand } from "./CheipiBrand";

export function CheipiSplash({ compact = false }: { compact?: boolean }) {
  return <div className={`cheipi-splash${compact ? " cheipi-splash--compact" : ""}`} role="status" aria-label="Abrindo o PPerfil">
    <span className="cheipi-splash__halo" aria-hidden="true" />
    <span className="cheipi-splash__orbit" aria-hidden="true" />
    <CheipiBrand symbolOnly className="cheipi-splash__brand" />
  </div>;
}
