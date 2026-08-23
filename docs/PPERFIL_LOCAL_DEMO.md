# PPerfil local demo sem Docker

Este workspace usa um adapter de fixtures apenas para desenvolvimento. Ele não executa migrations, não depende de Docker e não cria ou altera registros no Supabase hospedado.

## Ativar

Opção temporária para a sessão atual do PowerShell:

```powershell
$env:PPERFIL_DEMO_MODE="true"
pnpm dev
```

Ou configure em `.env.local`:

```env
PPERFIL_DEMO_MODE=true
```

Depois abra `http://localhost:3000/demo`. A rota cria um cookie HTTP-only local, entra no workspace de Thiago Costa e redireciona para `/dashboard`. Não existe senha de demonstração.

## Desativar

Abra `http://localhost:3000/demo/exit`, altere `PPERFIL_DEMO_MODE=false` (ou remova a variável) e reinicie o servidor de desenvolvimento.

## Dataset único

A fonte de dados é `src/lib/demo/fixture.ts`. Dashboard, Leads, Alunos, Meu Site, prévia e o perfil público usam as mesmas identidades e entidades:

- Thiago Costa / Thiago Training / `thiago.demo@pperfil.local` / TRAINER;
- 8 leads cobrindo NEW, PENDING, CONVERTED, REJECTED e EXPIRED;
- 3 alunos ativos e 1 inativo;
- 2 convites pendentes;
- 5 avaliações locais cobrindo DRAFT, SENT, ANSWERED, IN_REVIEW e COMPLETED;
- site publicado `thiago-costa` no template Motion;
- 3 serviços, 3 depoimentos, 2 resultados e 4 etapas de metodologia.

Juliana Mendes e Bruno Almeida são os leads convertidos e também aparecem como alunos. Nenhuma tela gera números aleatórios.

## Segurança

- O gate exige simultaneamente `NODE_ENV !== "production"`, `PPERFIL_DEMO_MODE=true` e o cookie emitido por `/demo` para acessar telas autenticadas.
- Em produção, `/demo` retorna HTTP 404 mesmo que a variável seja configurada incorretamente.
- Actions autenticadas retornam estado somente leitura antes de criar um cliente Supabase.
- Envio público de lead e analytics também não tocam o Supabase enquanto o gate local está ativo.
- O shell mostra o indicador discreto `Demo workspace`, que também permite sair.

## Rotas para revisão

- `http://localhost:3000/demo`
- `http://localhost:3000/dashboard`
- `http://localhost:3000/dashboard/leads`
- `http://localhost:3000/dashboard/students`
- `http://localhost:3000/dashboard/assessments`
- `http://localhost:3000/dashboard/assessments/new`
- `http://localhost:3000/student/assessments/d3100000-0000-4000-8000-000000000002`
- `http://localhost:3000/dashboard/site`
- `http://localhost:3000/p/thiago-costa`

O seed SQL e `.\scripts\seed-local-demo.ps1` permanecem disponíveis apenas para testes locais de banco, migrations e RLS quando Docker estiver disponível. Eles não fazem parte deste fluxo de revisão de produto.
