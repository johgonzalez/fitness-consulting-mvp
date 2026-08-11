const messages = [
  "Treino feito para sua rotina",
  "Acompanhamento online",
  "Ajustes conforme sua evolução",
  "90 dias de direcionamento",
];

function MessageSet() {
  return <>{messages.map((message) => <span key={message}>{message}<i aria-hidden="true" /></span>)}</>;
}

export function MessageTicker() {
  return <div className="message-ticker" aria-label={messages.join(". ")}>
    <div className="message-ticker-track" aria-hidden="true"><MessageSet /><MessageSet /></div>
  </div>;
}
