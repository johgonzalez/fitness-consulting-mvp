# PPerfil — Visual Migration Plan V1

Status: **migração visual controlada por gates**

## Objetivo

Migrar a experiência atual para a fundação aprovada sem alterar arquitetura, regra de negócio, contrato de backend, papel, RLS, Billing ou profundidade do Workout Builder.

## Guardrails

- `PRODUCT.md` e `DESIGN.md` permanecem autoridades.
- Toda fase começa com inventário visual e termina com comparação renderizada.
- Migração deve reutilizar tokens e primitives; não criar CSS isolado por tela quando uma variante compartilhada resolve.
- Nenhuma fase remove função para “limpar” a UI. Usa progressive disclosure.
- Light é primário; Dark é tradução em grafite com a mesma anatomia.
- Feature, migration, RLS, RPC ou Billing são fora do escopo visual.

## Fases

### M0 — Decisão e contrato

- Gate 1B define território, CTA, campo e iconografia.
- Gate 2 define App Shell, navegação Trainer e identidade Student.

### M1 — Tokens e primitives

- Mapear tokens atuais para semânticos sem renomear accent de forma enganosa.
- Consolidar Action, Field, Feedback, Operational Row, Surface e Disclosure.
- Preservar aliases legados durante transição.

### M2 — Entrada e ativação

- Aplicar primitives aprovados a login, signup, convite e onboarding.
- Preservar OTP, Google, `next`, state resolver, trial e publicação.
- Validar teclado aberto, retomada e erro em 320–768 px.

### M3 — Shell e operação Trainer

- Consolidar shell, navegação, linhas, feedback e ações de Dashboard, Leads e Alunos.
- Migrar avaliações e progresso do Personal sem equalizar visualmente todos os domínios.
- Manter Meu Site estrategicamente visível.

### M4 — Superfícies profissionais densas

- Migrar Workout Builder com workspace amplo, linhas/divisores, inspector e disclosure.
- Preservar programas, semanas, sessões, blocos, exercícios, séries, carga, reps, RPE, descanso, tempo, supersets, notas, progressão, histórico, DRAFT, preview e publish.
- Validar exercício customizado e mídia própria/YouTube.

#### Exercício confirmado e recolhido

Requisito para o sprint futuro do Workout Builder; **não implementado no Sprint Visual 1B**:

1. Adicionar exercício.
2. Editar a prescrição.
3. Confirmar.
4. Recolher o editor em um resumo compacto.
5. Continuar adicionando o próximo exercício.

No mobile, normalmente apenas um editor de exercício permanece expandido. O resumo confirmado preserva somente campos factuais suportados pelo backend, como nome, séries, repetições, carga, descanso e observações. Tocar o resumo reabre a edição. Falha de validação não recolhe o editor. Reordenação, exclusão e persistência preservam o comportamento atual do backend.

### M5 — Produto Student

- Migrar Today, lista/detalhe/execução, avaliações, progresso e perfil.
- Preservar prescrição imutável, actuals, timers, offline/recovery e continuidade por entitlement.
- Priorizar 320–430 px e operação com uma mão.

### M6 — Meu Site e superfícies públicas

- Consolidar editor, organizer, preview e estados de publicação.
- Tratar cada template como identidade real, não skin genérica.
- Preservar projeção pública e entitlement.

### M7 — Limpeza controlada

- Remover CSS e primitives legados somente depois de zero referências.
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
- Mudanças pequenas e reversíveis por primitive ou rota.
- Comparação visual com baseline antes de merge.
- Feature flag somente se já existir infraestrutura aprovada.
- Não migrar para a próxima família de rotas enquanto o gate atual estiver aberto.

## Riscos e mitigação

| Risco | Mitigação |
| --- | --- |
| Visual “limpo” remove capacidade | Checklist de paridade por domínio; progressive disclosure |
| Dois design systems permanentes | Aliases temporários e plano de remoção com zero referências |
| Dark vira inversão automática | QA independente de superfície, borda, foco e imagem |
| Mobile vira desktop empilhado | Priorização própria por papel e tarefa |
| Métrica ou estado fabricado | Demo usa fixtures determinísticas; produção usa repositório factual |
| Regressão de Auth, Billing ou RLS | Nenhuma alteração nesses contratos durante sprint visual |
