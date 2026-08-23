# Arquitetura PPerfil — Sprint 2

## Camadas

- `src/lib/domain`: contratos independentes de UI e banco;
- `src/lib/supabase`: configuração, clientes SSR/browser, sessão e adapters;
- `src/lib/validation`: normalização e validação server-side;
- `src/app/actions`: mutações autenticadas;
- `src/components/templates`: Template 01/02 sem queries Supabase;
- `supabase/migrations`: schema e autorização PostgreSQL;
- `supabase/tests`: teste reproduzível de isolamento.

## Sessão e autorização

`src/proxy.ts` atualiza cookies de sessão e realiza redirects rápidos. Cada Server Action e página privada verifica o usuário novamente com `auth.getUser()`. RLS permanece como barreira final, portanto um erro na UI, rota ou filtro não amplia o tenant acessível.

## Projeções

`TrainerProfile` representa dados do dono. `PublicTrainerProfile` remove `user_id`, e `TrainerPageData` usa somente essa projeção. O repositório público seleciona colunas explicitamente. No banco, `anon` e `authenticated` não recebem privilégio de `SELECT` em `user_id`; o dono acessa sua projeção privada pela RPC `get_my_trainer_profile()`.

## Onboarding

A Server Action valida e normaliza os campos, autentica novamente e chama `create_trainer_profile`. A função SQL deriva o dono de `auth.uid()`, cria o perfil como `published=false`, usa Template 01 e resolve colisão de slug com seis caracteres do UUID do usuário.

## Perfil público

`/p/[slug]` executa no servidor. O adapter consulta perfil publicado, serviços ativos e depoimentos publicados em paralelo. Sem credenciais locais, somente os mocks aprovados do Sprint 1 são usados como fallback demonstrativo.

## Deploy

A restrição de exportação estática foi removida. Vercel hospeda o runtime Next.js e Supabase fornece Auth/Postgres. Cloudflare fica limitado a DNS/CDN futuro; autorização não depende dele.
