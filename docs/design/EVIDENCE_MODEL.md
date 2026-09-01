# PPerfil — Evidence Model V1

Data da revisão: **2026-09-01**

Baseline: `codex/v1-launch-staging@32c59f07bf5b357c80611deeb3486fc253b0f77b`

## Objetivo

Este modelo impede que preferência visual, benchmark e capacidade real sejam confundidos. Toda recomendação do Sprint Visual 0A deve indicar categoria, fonte, data e confiança. Uma referência externa nunca autoriza funcionalidade que o produto não possui.

## Categorias

| Categoria | Autoridade | Uso permitido | Exemplo |
| --- | --- | --- | --- |
| `STANDARD` | Norma ou orientação técnica primária | Requisitos de acessibilidade, semântica e interação | WCAG 2.2, WAI Forms, Apple HIG |
| `BENCHMARK` | Produto comparável em fonte oficial atual | Identificar padrões maduros; nunca copiar marca ou inventar feature | Trainerize, Everfit, My PT Hub, TrueCoach, Superset |
| `PRODUCT` | Código, migration, teste ou documento de produto vigente | Determinar capacidade, estado, papel, permissão e fluxo factual | `PRODUCT.md`, tipos de domínio, RPCs, testes |
| `BRAND` | Identidade visual aprovada e implementação canônica | Determinar tom, hierarquia, material, tipografia e anti-patterns | `DESIGN.md`, Design System V3 |

## Níveis de confiança

| Confiança | Critério |
| --- | --- |
| `HIGH` | Confirmado por código/teste versionado ou fonte primária explícita e atual |
| `MEDIUM` | Inferência consistente apoiada por mais de uma evidência, sem confirmação de runtime |
| `LOW` | Evidência incompleta, histórica ou dependente de ambiente não acessível |

## Classificação de suporte

| Estado | Definição |
| --- | --- |
| `SUPPORTED` | Fluxo e contrato existem no baseline atual, com caminho de dados identificável |
| `PARTIAL` | Há entrega funcional, mas falta um estado, validação, ambiente ou fechamento explícito |
| `NOT_SUPPORTED` | A capacidade não existe e não pode aparecer como disponível |
| `LEGACY` | Existe para compatibilidade ou laboratório anterior, sem ser padrão futuro |
| `UNKNOWN` | Não foi possível comprovar com as capacidades read-only disponíveis |

## Hierarquia de decisão

1. Segurança, permissão e verdade do produto (`PRODUCT`) limitam todas as opções.
2. Requisitos normativos (`STANDARD`) definem o piso de qualidade.
3. Identidade aprovada (`BRAND`) define a continuidade visual.
4. Benchmarks (`BENCHMARK`) informam alternativas dentro desses limites.
5. Preferência subjetiva só entra no Decision Gate, nunca como fato.

## Evidência técnica coletada

| Evidência | Categoria | Resultado | Confiança |
| --- | --- | --- | --- |
| Branch e SHA | PRODUCT | `codex/v1-launch-staging@32c59f0` confirmado antes da worktree | HIGH |
| Paridade de migrations | PRODUCT | 42 locais = 42 remotas no projeto vinculado | HIGH |
| Lint remoto | PRODUCT | `supabase db lint --linked --level warning`: sem erros | HIGH |
| Tabelas/RLS versionadas | PRODUCT | 47 tabelas `public`; RLS habilitado em todas nas migrations | HIGH para repositório |
| Policies versionadas | PRODUCT | 80 nomes de policy sobre `public` e `storage.objects` | HIGH para repositório |
| Functions versionadas | PRODUCT | 156 nomes finais; 152 definições `SECURITY DEFINER` detectadas, todas com `search_path=''` | HIGH para repositório |
| Triggers versionados | PRODUCT | 48 nomes de trigger detectados nas migrations | HIGH para repositório |
| Views versionadas | PRODUCT | Nenhuma `CREATE VIEW`/`CREATE MATERIALIZED VIEW` detectada | HIGH para repositório |
| Grants e ownership runtime | PRODUCT | Migrations auditadas; estado efetivo atual não enumerado sem catálogo hospedado | LOW / UNKNOWN |
| Buckets versionados | PRODUCT | `trainer-public-media` público e `student-private-media` privado | HIGH para repositório |
| Catálogo remoto completo | PRODUCT | Não extraído: CLI exige Docker para `db dump`; MCP de catálogo não está disponível | LOW / UNKNOWN |
| Auth hospedado atual | PRODUCT | Configuração runtime não é legível pelas ferramentas disponíveis; `config.toml` descreve somente local | LOW / UNKNOWN |

Paridade e lint provam que as migrations versionadas foram aplicadas, mas não substituem leitura atual de owners, grants, policies, triggers, Auth e Storage. Esses itens permanecem `UNKNOWN` quando não forem dedutíveis com segurança.

## Fontes primárias externas

- [ABC Trainerize — Features](https://www.trainerize.com/features/)
- [Everfit — Training](https://everfit.io/training/)
- [Everfit — Client App Walkthrough](https://help.everfit.io/en/articles/5555389-onboarding-walkthrough-for-clients)
- [My PT Hub — Features](https://www.mypthub.net/features/)
- [TrueCoach — Workout Builder Basics](https://help.truecoach.co/en/articles/3047972-the-workout-builder-basics)
- [Superset](https://www.supersetapp.com/)
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [WAI Forms Tutorial](https://www.w3.org/WAI/tutorials/forms/)
- [WAI User Notifications](https://www.w3.org/WAI/tutorials/forms/notifications/)

## Regras de acessibilidade adotadas

- O requisito AA de WCAG 2.2 para Target Size (Minimum) é **24 × 24 CSS px**, considerando suas exceções e espaçamento.
- PPerfil mantém **44 × 44 px** como padrão de qualidade mobile e operacional; ele não é rotulado incorretamente como o mínimo AA.
- Campos usam label persistente; placeholder não substitui label.
- Erros identificam o problema e sua recuperação, associados por `aria-describedby` quando aplicável.
- Status não críticos usam `role=status`; erros urgentes usam `role=alert`.
- Reduced motion preserva a mudança de estado e elimina movimento sustentado, sem ocultar resultado.

## Regra de atualização

Uma evidência perde validade quando o baseline muda, a fonte externa altera sua oferta ou a decisão de Product Owner muda. Nesse caso, atualize a linha existente com nova data e fonte; não apague o histórico do `DECISION_LOG_V1.md`.
