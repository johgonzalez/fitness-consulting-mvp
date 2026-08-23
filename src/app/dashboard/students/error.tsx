"use client";
export default function StudentsError({reset}:{reset:()=>void}){return <main className="matrix-page"><div className="matrix-empty"><h1>Não foi possível carregar os alunos</h1><p>Verifique sua conexão e tente novamente.</p><button onClick={reset}>Tentar novamente</button></div></main>}
