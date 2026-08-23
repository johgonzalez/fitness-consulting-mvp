# PPerfil Sprint 3B — Assessment Experience

## Escopo entregue

O Sprint 3B adiciona a experiência operacional do Personal e a jornada mobile do Aluno sobre as tabelas, RLS e operações autoritativas do Sprint 3A. Nenhuma migration, policy, regra de storage ou seed remoto foi alterado.

Rotas:

- `/dashboard/assessments`
- `/dashboard/assessments/new`
- `/dashboard/assessments/[id]`
- `/student/assessments/[id]`

## Estados e operações

| Estado | Personal | Aluno |
| --- | --- | --- |
| `DRAFT` | prévia das perguntas e envio confirmado | indisponível para resposta por regra do banco |
| `SENT` | aguarda e acompanha respostas salvas expostas pelo domínio | preenchimento guiado, incremental save e envio |
| `ANSWERED` | inicia revisão | respostas somente leitura |
| `IN_REVIEW` | respostas/medidas, feedback final e conclusão confirmada | respostas somente leitura; aguarda devolutiva |
| `COMPLETED` | histórico integral somente leitura | feedback final, conclusão e respostas somente leitura |

As mutações reais usam somente `create_assessment_from_template`, `send_assessment`, `save_assessment_answer`, `submit_assessment`, `start_assessment_review` e `complete_assessment`. O histórico usa `assessment_events` sob RLS. O workspace demo não chama essas operações e não grava no Supabase.

## Renderizadores

A jornada do Aluno suporta `SHORT_TEXT`, `LONG_TEXT`, `SINGLE_CHOICE`, `MULTI_CHOICE`, `NUMBER`, `BOOLEAN`, `SCALE`, `DATE` e `MEASUREMENT`. `PHOTO_REQUEST` apresenta um estado indisponível explícito, sem upload fictício, URL pública ou enfraquecimento do bucket privado.

Medidas preservam valor, unidade, data e origem da avaliação. Não há conversão automática.

## Edição segura de Draft

O Sprint 3B.1 resolveu a limitação anterior com a operação `update_draft_assessment`. Enquanto a avaliação permanece `DRAFT`, o Personal proprietário do relacionamento ativo pode alterar somente `title`, `is_required` e `due_at`. A versão do template, o relacionamento, as respostas e o lifecycle permanecem imutáveis. Cada mudança efetiva registra um evento append-only `DRAFT_UPDATED`; chamadas sem alteração não criam eventos artificiais. Depois de `SENT`, os metadados são somente leitura na V1.

## QA

Capturas reais de localhost estão em `docs/screenshots/sprint3b`. O roteiro `scripts/capture-sprint3b-visual-qa.mjs` valida 1440x900 e 390x844, Light e Dark, erros de console e overflow horizontal.

Gates executados:

- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`
- fluxo demo completo do Aluno via Playwright/Chrome local
- todas as rotas/estados demo do Personal em Light/Dark e desktop/mobile
- ausência de erro de console/runtime e overflow horizontal nas capturas

Os testes de segurança do Sprint 3A permanecem a referência de regressão de autorização/RLS. Como nenhum SQL foi alterado, o Sprint 3B não modifica a superfície de segurança do banco ou storage.
