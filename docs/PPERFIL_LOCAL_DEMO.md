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
- site publicado `thiago-costa` no template Atelier;
- 3 serviços, 3 depoimentos, 2 resultados e 4 etapas de metodologia.

Juliana Mendes e Bruno Almeida são os leads convertidos e também aparecem como alunos. Nenhuma tela gera números aleatórios.

## Segurança

- O gate exige simultaneamente `NODE_ENV !== "production"`, `PPERFIL_DEMO_MODE=true` e o cookie emitido por `/demo` para acessar telas autenticadas.
- Em produção, `/demo` retorna HTTP 404 mesmo que a variável seja configurada incorretamente.
- Edição de apresentação, contato, cor, serviços, metodologia, depoimentos, seleção de template, organização e publicação usam um adapter em memória exclusivo do servidor de desenvolvimento. Isso permite testar o fluxo completo sem criar um cliente Supabase nem gravar no projeto hospedado.
- Uploads de mídia, solicitações comerciais e intenções de compra continuam bloqueados no demo porque exigiriam efeitos externos.
- O estado editável permanece durante a navegação local e é restaurado ao sair por `/demo/exit` ou reiniciar o servidor de desenvolvimento.
- Envio público de lead e analytics também não tocam o Supabase enquanto o gate local está ativo.
- Os shells permitem alternar entre o Portal do Personal e o Portal do Aluno; `/demo/exit` encerra o workspace e apaga também as preferências locais do site.

## Rotas para revisão

Entre primeiro por `http://localhost:3000/demo`. O mesmo cookie permite navegar por toda a experiência integrada.

### Personal

- Dashboard: `http://localhost:3000/dashboard`
- Leads: `http://localhost:3000/dashboard/leads`
- Alunos: `http://localhost:3000/dashboard/students`
- Detalhe da Juliana: `http://localhost:3000/dashboard/students/75000000-0000-4000-8000-000000000001`
- Progresso da Juliana: `http://localhost:3000/dashboard/students/75000000-0000-4000-8000-000000000001/progress`
- Avaliações: `http://localhost:3000/dashboard/assessments`
- Nova avaliação: `http://localhost:3000/dashboard/assessments/new`
- Treinos: `http://localhost:3000/dashboard/workouts`
- Novo treino: `http://localhost:3000/dashboard/workouts/new`
- Meu Site: `http://localhost:3000/dashboard/site`
- Preview Atelier: `http://localhost:3000/dashboard/preview?template=template_04`

### Aluno

- Entrada direta: `http://localhost:3000/demo?next=/student/today`
- Hoje: `http://localhost:3000/student/today`
- Treinos: `http://localhost:3000/student/workouts`
- Progresso: `http://localhost:3000/student/progress`
- Avaliação enviada: `http://localhost:3000/student/assessments/d3100000-0000-4000-8000-000000000002`

### Público

- Site real de Thiago Costa em Atelier: `http://localhost:3000/p/thiago-costa`

O seed SQL e `.\scripts\seed-local-demo.ps1` permanecem disponíveis apenas para testes locais de banco, migrations e RLS quando Docker estiver disponível. Eles não fazem parte deste fluxo de revisão de produto.
