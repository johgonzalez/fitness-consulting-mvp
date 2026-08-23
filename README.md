# PPerfil

SaaS multi-tenant para presença digital de Personal Trainers. O projeto usa Next.js 16.2, React 19, TypeScript estrito e Supabase Auth/PostgreSQL com RLS.

## Requisitos

- Node.js 20.9 ou superior;
- pnpm;
- Supabase CLI e Docker Desktop apenas para replay de banco/migrations (não são necessários para a demo de produto);
- um projeto Supabase para integração hospedada.

## Configuração local

```bash
pnpm install
copy .env.example .env.local
pnpm dev
```

Preencha em `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=SUA_CHAVE_PUBLICAVEL
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Projetos antigos podem usar `NEXT_PUBLIC_SUPABASE_ANON_KEY` no lugar da chave publicável. O aplicativo não usa nem solicita `service_role`.

Sem variáveis Supabase, a aplicação ainda compila e os perfis demonstrativos públicos continuam disponíveis; cadastro, login e áreas privadas informam que a integração não está configurada.

## Rotas

- `/signup` e `/login`: Supabase Auth por e-mail/senha;
- `/auth/confirm`: troca segura do código de confirmação por sessão;
- `/onboarding`: criação do perfil privado;
- `/dashboard`: status, URL, template e preview;
- `/dashboard/preview`: preview autenticado, inclusive quando não publicado;
- `/p/[slug]`: perfil público dinâmico;
- `/p/rafael-martins`, `/p/marina-costa` e `/p/thiago-costa`: demos quando Supabase não está configurado.

## Demo local completa sem Docker

Ative o adapter de fixtures somente no desenvolvimento:

```powershell
$env:PPERFIL_DEMO_MODE="true"
pnpm dev
```

Abra `http://localhost:3000/demo`. Não há senha: a rota cria uma sessão de fixture local e redireciona ao Dashboard de Thiago Costa. Nenhum dado é escrito no Supabase. O modo é ignorado quando `NODE_ENV=production`. Detalhes, dados e desligamento em [`docs/PPERFIL_LOCAL_DEMO.md`](docs/PPERFIL_LOCAL_DEMO.md).

O seed de banco local com Docker continua disponível em `.\scripts\seed-local-demo.ps1` para testes de migrations/RLS, mas não é necessário para revisão visual e de produto.

## Banco e migrations

As migrations são aditivas:

1. `202608140001_foundation.sql`: tabelas, enums, índices e RLS inicial;
2. `202608140002_saas_core_security.sql`: `professional_name`, políticas por operação, RPC de onboarding, projeção privada do dono e privilégios públicos por coluna;
3. `202608140003_anon_least_privilege.sql`: remoção explícita de privilégios de escrita e administração das roles de API;
4. `202608140004_function_surface_hardening.sql`: helper de ownership em schema privado e endurecimento da superfície de funções.

O resultado e o risco aceito do Security Gate estão registrados em [`docs/security-gate-sprint-2-5.md`](docs/security-gate-sprint-2-5.md).

Para um Supabase local limpo:

```bash
supabase start
supabase db reset
supabase test db
```

Para vincular e aplicar em um projeto de homologação:

```bash
supabase link --project-ref SEU_PROJECT_REF
supabase db push --dry-run
supabase db push
```

Revise o `--dry-run` antes da aplicação. Execute `supabase/tests/rls_isolation.sql` apenas em banco local ou isolado; o teste cria usuários temporários e executa rollback.

## Segurança multi-tenant

- `trainer_profiles.user_id` é único e referencia `auth.users`;
- entidades dependentes usam `trainer_id` indexado;
- o onboarding não recebe `user_id`: a função SQL usa `auth.uid()`;
- operações privadas são verificadas novamente nas Server Actions;
- perfis não publicados só podem ser lidos pelo dono;
- visitantes não possuem escrita;
- `user_id` não faz parte das colunas públicas concedidas pelo PostgreSQL;
- templates recebem apenas `PublicTrainerProfile`, sem o identificador de autenticação.

## Validação

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm build
```

## Deploy na Vercel

1. Use Node.js 20.9+.
2. Configure as três variáveis públicas acima nos ambientes necessários.
3. No Supabase Auth, cadastre a URL de produção e `https://SEU-DOMINIO/auth/confirm` nas URLs permitidas.
4. Aplique as migrations antes de liberar cadastro.
5. Não configure `service_role` no frontend ou em variáveis `NEXT_PUBLIC_*`.

O projeto agora usa o runtime Next.js; `output: "export"` foi removido. Cloudflare permanece como futura camada de DNS/CDN, sem lógica de autenticação delegada a ela.

## Créditos de dados de exercícios

Exercise data by [RepDB (repdb.co)](https://repdb.co). O Media Pack V1 usa somente os WebP do free tier dentro do aplicativo, conforme a licença e a atribuição documentadas em [`docs/PPERFIL_EXERCISE_MEDIA_PACK_V1.md`](docs/PPERFIL_EXERCISE_MEDIA_PACK_V1.md). Os ativos não são redistribuídos neste repositório.
