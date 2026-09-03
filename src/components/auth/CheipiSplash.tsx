export function CheipiSplash({ compact = false }: { compact?: boolean }) {
  return <div className={`cheipi-splash${compact ? " cheipi-splash--compact" : ""}`} role="status" aria-label="Abrindo o PPerfil">
    <span className="cheipi-splash__brand" aria-hidden="true">PPERFIL</span>
  </div>;
}
