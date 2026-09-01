# PPerfil — Visual Migration Plan V1

Status: **planejamento; execução não autorizada neste Sprint**

## Objetivo

Migrar, após decisão humana, a experiência atual para uma fundação coerente sem alterar arquitetura, regra de negócio, contrato de backend, papel, RLS, Billing ou profundidade do Workout Builder.

## Guardrails

- `PRODUCT.md` e `DESIGN.md` permanecem autoridades.
- Toda fase começa com inventário visual e termina com comparação renderizada.
- Migração deve reutilizar tokens/primitives; não criar CSS isolado por tela quando uma variante compartilhada resolve.
- Nenhuma fase remove função para “limpar” a UI. Usa progressive disclosure.
- Light é primário; Dark é tradução em grafite com a mesma anatomia.
- Feature, migration, RLS, RPC ou Billing são fora do escopo visual.

## Fases propostas

### M0 — Decisão e contrato

- Product Owner decide `VF-01` a `VF-04`.
- Registrar decisão em `DECISION_LOG_V1.md`.
- Definir critérios visuais mensuráveis e screenshots canônicos.

**Saída:** Gate 1 aprovado; nenhuma mudança de produção.

### M1 — Tokens e primitives

- Mapear tokens atuais para semânticos sem renomear accent de forma enganosa.
- Consolidar Action, Field, Feedback, Operational Row, Surface e Disclosure.
- Preservar aliases legados durante transição.
- Criar testes de contraste, foco, states e reduced motion.

**Rollback:** aliases continuam apontando para primitives atuais; mudança pode ser revertida por componente.

### M2 — Entrada e ativação

- Aplicar primitives aprovados a login, signup, convite e onboarding.
- Preservar OTP, Google, `next`, state resolver, trial e publicação.
- Validar teclado aberto, retomada e erro em 320–768 px.

**Gate:** nenhum desvio funcional ou de Auth; conversão não é simulada.

### M3 — Shell e operação Trainer

- Consolidar shell, navegação, linhas, feedback e ações de Dashboard, Leads e Alunos.
- Migrar avaliações e progresso do Personal sem equalizar visualmente todos os domínios.
- Manter Meu Site estrategicamente visível.

**Gate:** matriz de rotas Trainer mobile/desktop Light/Dark.

### M4 — Superfícies profissionais densas

- Migrar Workout Builder com workspace amplo, linhas/divisores, inspector e disclosure.
- Preservar programas, semanas, sessões, blocos, exercícios, séries, carga, reps, RPE, descanso, tempo, supersets, notas, progressão, histórico, DRAFT, preview e publish.
- Validar exercício customizado e mídia própria/YouTube.

**Gate:** paridade de capacidade demonstrada antes/depois.

### M5 — Produto Student

- Migrar Today, lista/detalhe/execução, avaliações, progresso e perfil.
- Preservar prescrição imutável, actuals, timers, offline/recovery e continuidade por entitlement.
- Priorizar 320–430 px e operação com uma mão.

**Gate:** execução completa offline/online sem regressão.

### M6 — Meu Site e superfícies públicas

- Consolidar editor, organizer, preview e estados de publicação.
- Tratar cada template como identidade real, não skin genérica.
- Preservar projeção pública e entitlement.

**Gate:** preview/publicação/retirada/reativação e rotas públicas.

### M7 — Limpeza controlada

- Remover CSS/primitives legados somente depois de zero referências.
- Atualizar documentação e inventário.
- Não alterar migration histórica nem contrato de dados.

## Verificação por fase

| Gate | Obrigatório |
| --- | --- |
| Visual | Screenshots Light/Dark em 320, 360, 390, 430, 768, 1024 e 1440 |
| Acessibilidade | Axe sem `serious`/`critical`, teclado, foco não obstruído, zoom 200%, contraste manual |
| Responsive | Sem overflow do documento; copy pt-BR longa; teclado móvel; touch 44 px |
| Estado | Loading, vazio, erro, sucesso, indisponível e permission denied |
| Funcional | Testes direcionados do domínio e fluxo E2E factual |
| Técnico | TypeScript, ESLint, build de produção |
| Segurança | Nenhuma mudança de acesso; regressão RLS quando rota tocar dados protegidos |

## Estratégia de rollout

- Branch isolada por fase, sem reescrever histórico.
- Mudanças pequenas e reversíveis por primitive/rota.
- Comparação visual com baseline antes de merge.
- Feature flag somente se já existir infraestrutura aprovada; não introduzir flag para mascarar divergência.
- Não migrar para a próxima família de rotas enquanto o gate atual estiver aberto.

## Riscos e mitigação

| Risco | Mitigação |
| --- | --- |
| Visual “limpo” remove capacidade | Checklist de paridade por domínio; progressive disclosure |
| Dois design systems permanentes | Aliases temporários e plano de remoção com zero referências |
| Dark vira inversão automática | QA independente de superfície, borda, foco e imagem |
| Mobile vira desktop empilhado | Priorização própria por papel e tarefa |
| Métrica/estado fabricado | Fixtures só no Lab; produção usa repositório factual |
| Regression de Auth/Billing/RLS | Nenhuma alteração no Sprint visual; gates específicos quando UI integrar ações existentes |

## Critério de conclusão da migração futura

Somente quando todos os contratos funcionais permanecerem demonstráveis, a matriz de rotas estiver aprovada em Light/Dark/mobile/desktop, os legados estiverem removidos com segurança e o Product Owner aprovar a fidelidade real. Este documento, por si só, não autoriza início da migração.
