# PPerfil Sprint 3B.1 — Draft Assessment Update

## Operação

`public.update_draft_assessment(uuid, text, boolean, timestamptz)` é a única nova superfície de escrita. A função é `SECURITY DEFINER`, pertence a `postgres`, usa `search_path` vazio, revoga execução de `PUBLIC`/`anon` e concede execução apenas a `authenticated`.

A operação bloqueia chamadas sem sessão, estudantes, outros tenants, relacionamentos inativos e qualquer avaliação fora de `DRAFT`. Ela aceita somente `title`, `is_required` e `due_at`. Atribuição, template versionado, respostas e lifecycle não fazem parte da assinatura e continuam protegidos pelo trigger autoritativo.

## Auditoria

Mudanças efetivas geram `DRAFT_UPDATED` em `assessment_events`, com ator, campos alterados e os valores anterior/posterior. Uma chamada sem diferença retorna sem atualizar a linha nem criar um evento duplicado.

## UI

O detalhe de uma avaliação em Draft exibe “Configuração do Draft” para título, prazo e prioridade. O formulário usa a camada de serviço/repositório existente e a Server Action revalida lista, detalhe do Personal e detalhe do Aluno. A configuração desaparece após o envio e os metadados passam a somente leitura.

O workspace demo continua sem escrita remota: o formulário pode ser revisado visualmente, mas a submissão retorna o aviso de workspace somente leitura.

## Gate

`supabase/tests/draft_assessment_update_security.sql` executa em transação com `ROLLBACK` e cobre ownership, cross-tenant, relacionamento inativo, estudante, anônimo, estados `SENT`/`ANSWERED`/`COMPLETED`, imutabilidade do template versionado e evento de auditoria.

Resultado final em 23/08/2026:

- migration `202608220010_draft_assessment_update.sql` aplicada ao projeto Supabase vinculado, sem seed e sem reset;
- paridade local/remota completa e `db push --dry-run` sem pendências;
- `db lint --linked --level warning` sem erros;
- preflight da migration + gate novo em transação revertida: PASS;
- gate novo pós-apply: 12/12 cenários PASS, com `ROLLBACK` confirmado;
- regressão completa de `assessment_foundation_security.sql`: PASS;
- catálogo: owner `postgres`, `SECURITY DEFINER`, `search_path=""`, `authenticated=EXECUTE`, `anon=NO EXECUTE`;
- TypeScript, ESLint e Next production build: PASS;
- QA local do formulário em Light/Dark e 1440x900/390x844: sem erro de console e sem overflow horizontal;
- submissão no workspace demo permaneceu somente leitura e não chamou escrita remota.

Capturas de QA: `C:\Users\jogue\.codex\visualizations\2026\08\18\01a0173a-61b0-7e31-8d07-bf3c2f7cae9d\sprint3b1`.
