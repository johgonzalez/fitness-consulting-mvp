# Cheipi — redesign mobile do personal V1

Data: 08/09/2026. Escopo: apresentação e navegação da visão personal, sobre as regras existentes. Este documento registra o código em revisão; não certifica prontidão para produção nem uma porcentagem de satisfação.

## Objetivo e direção

Fazer a rotina do personal funcionar como uma experiência de aplicativo no celular: próxima ação evidente, continuidade entre telas, leitura confortável e menos superfícies concorrentes. A direção adotada é clean e neutra, com preto, branco e cinzas sólidos, tipografia Manrope já disponível no projeto, listas abertas e bordas discretas. Os templates públicos conservam sua identidade própria.

O código aplica respostas curtas ao toque, entrada do onboarding em 200 ms e elevação de 2 px com duas sombras discretas no ícone ativo da navegação. Há tratamento de `prefers-reduced-motion`, foco visível e áreas seguras do dispositivo. Essas escolhas são decisões de design; seu resultado visual ainda precisa de inspeção renderizada.

A pesquisa sobre aparência genérica usou [a análise da Anthropic sobre frontend gerado](https://claude.com/blog/improving-frontend-design-through-skills) e os guias dos autores de [Impeccable](https://github.com/pbakaus/impeccable), [Emil](https://github.com/emilkowalski/skills) e [Taste](https://github.com/Leonxlnx/taste-skill). São orientações de prática, sem uma medida universal de “cara de IA”. A resposta aplicada foi dar função diferente a cada superfície, reduzir cards repetidos, usar conteúdo real e manter hierarquia específica para o trabalho do personal. A navegação também considera [as orientações da Apple](https://developer.apple.com/videos/play/wwdc2022/10001/); progresso do cadastro e movimento reduzido consideram [formulários em etapas](https://www.w3.org/WAI/tutorials/forms/multi-page/) e [animação por interação](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html) do W3C.

## Benchmark oficial e aplicação

Fontes consultadas em 08/09/2026. A coluna de evidência resume descrições oficiais públicas; a aplicação é uma decisão do Cheipi. Não houve acesso a contas logadas dos concorrentes, medição de toques ou avaliação de suas animações.

| Fonte | Evidência pública | Aplicação nesta V1 |
| --- | --- | --- |
| [ABC Trainerize — primeiros passos](https://www.trainerize.com/getting-started/) | Orientação por estágio do negócio; cliente, programa e venda aparecem como uma sequência de trabalho. | Onboarding com progresso explícito e campos opcionais recolhidos; início vazio com convite do primeiro aluno e preparação do site. As etapas obrigatórias existentes continuam válidas. |
| [TrueCoach — dashboard](https://truecoach.co/features/dashboard/) | Treinos do dia, comentários e clientes que precisam de atenção alimentam a tela inicial. | “Hoje” prioriza ações originadas nos dados existentes. Mostra até três pendências inicialmente e permite expandir as demais. |
| [Everfit — programação de treinos](https://everfit.io/training/) | Reutilização de exercícios/programas, reorganização, histórico e feedback contextual. | Continuidade entre aluno, criação e edição de treino; navegação de retorno preserva o aluno selecionado. Não foram adicionadas modalidades de prescrição. |
| [Everfit — comunicação](https://everfit.io/communication/) | Comunicação individual, grupos, publicações e desafios cumprem funções distintas. | Comunidade ganha acesso direto na barra inferior e ajuste de leitura/superfícies. Feed, participação e regras dos grupos continuam os existentes. |
| [Everfit — pagamentos](https://everfit.io/payment/) | Página de oferta, pagamento, onboarding e entrega integram a jornada comercial. | Publicação direciona à área de plano/cobrança existente, com estado e próxima ação claros. A comparação não implica adicionar cobranças entre personal e aluno. |
| [TrueCoach — perfil público](https://truecoach.co/features/public-profiles/) | Página mobile com serviços e candidatura; criar perfil, compartilhar link e receber interessados são os passos divulgados. | “Meu site” se organiza em modelo, conteúdo/aparência e publicação/link, com prévia mobile e retorno ao contexto. |
| [Hevy — produto](https://www.hevyapp.com/) | Registro de treino, histórico, progresso e interação social se conectam ao conteúdo da atividade. | Exercícios, alunos e acompanhamento ganham protagonismo. Textos de interface mais diretos e nomes de músculos/equipamentos legíveis em português. |

## Navegação implementada

| Entrada mobile | Destino | Comportamento |
| --- | --- | --- |
| Hoje | `/dashboard` | Próximas ações, resumo discreto da rotina, alunos e atalhos de criação. |
| Alunos | `/dashboard/students` | Busca, filtros, convites e acompanhamento. Avaliações mantêm Alunos como contexto ativo. |
| Treinos | `/dashboard/workouts` | Listagem, criação, revisão e publicação pelos fluxos atuais. |
| Comunidade | `/dashboard/community` | Acesso direto à comunidade existente. |
| Negócio | `/dashboard/business` | Meu site, leads, assinatura Cheipi, configurações, tema, tela cheia e saída. Site, prévia, leads e configurações mantêm esta entrada ativa. |

A barra mobile mantém cinco destinos com rótulos visíveis. A navegação desktop continua disponível como adaptação. “Avaliações” também tem acesso direto em Alunos, além do contexto de cada aluno e do atalho da tela Hoje.

## Meu site e templates

A faixa principal com muitas abas foi substituída por uma visão vertical: estado/endereço, amostra visual e três tarefas numeradas. Contato fica acessível na personalização; desempenho continua secundário. Dentro do editor, Conteúdo, Aparência e Seções organizam as tarefas. As abas largas foram ajustadas para permitir rolagem horizontal dentro da largura disponível.

| ID persistido | Nome de apresentação | Uso comunicado |
| --- | --- | --- |
| `template_05` | Perfil | Começar a presença online: foto, apresentação e serviços. |
| `template_06` | Conversão | Vender consultoria, destacando acompanhamento, app e comunidade. |
| `template_01` | Essencial | Presença direta, serviços e caminho curto para contato. |

A curadoria está em `src/lib/domain/site-template-presentation.ts`, usada pelo onboarding e pelo editor. Os IDs 05 e 06 preservam os dois modelos mais recentes exigidos. Os modelos 02, 03 e 04 continuam registrados: não há exclusão, migração ou substituição automática de sites existentes. O onboarding permite manter um modelo anterior já selecionado. Disponibilidade e permissões do catálogo continuam verificadas.

No celular, a prévia completa usa **um iframe isolado em tela cheia**, abaixo de uma toolbar de 64 px. A navegação do painel e a rolagem externa ficam fora dessa tela; o iframe ocupa o espaço restante. O isolamento preserva estilos e cabeçalhos dos templates aprovados, evitando interferência do painel. As rotas e a autenticação existentes permanecem. As amostras da seleção continuam sendo previews limitados, com ação explícita para visualizar. A prévia informa que usa **dados salvos**; esta V1 não implementa atualização instantânea de campos ainda não salvos. O retorno conserva o contexto de modelos, personalização ou publicação. Copiar e compartilhar têm mensagens de resultado e tratamento de cancelamento.

## Demais alterações de apresentação

- Entrada: marca maior no cabeçalho; onboarding com seis passos visuais, identificação de publicação/convite opcionais e seções opcionais recolhíveis. Especialidade e formato de atendimento se apresentam em momentos separados usando a ação existente.
- Alunos e avaliações: listas mais abertas, hierarquia tipográfica consistente, inputs com tamanho legível no celular, textos simplificados e navegação de retorno. Busca e filtros de alunos preservam seu contexto ao abrir/fechar o convite.
- Treinos: rótulos em português, redução de decoração, ações mobile de ordenar sessões, voltar da revisão para edição e criar nova versão. A criação mantém o contexto do aluno e limpa o rascunho em memória ao trocar o destinatário.
- Comunidade e plano: harmonização de tipografia, fundos e superfícies pelo shell do personal. Não houve reconstrução das regras ou do conteúdo desses módulos.

## Preservação funcional

O diff desta V1 não altera migrations, RLS, RPCs, ações de servidor de autenticação/onboarding/site/treino, contratos de domínio ou lógica de billing. Permanecem os estados de treino, permissões por vínculo, gates de publicação, validações do cadastro e regras de planos. As alterações em `src/lib/domain/site-template-presentation.ts` são metadados de apresentação.

O bloqueio visual de publicação agora encaminha a `/dashboard/settings/billing`, substituindo a mensagem antiga de pagamento futuro/registro de interesse. Isso não concede entitlement. Preços, produtos Stripe e condições comerciais não foram redefinidos. “Meu plano” identifica a assinatura Cheipi.

A funcionalidade existente de criar rascunhos com IA continua identificada como IA e exige revisão. O pedido de evitar aparência genérica orientou o tratamento visual; não foi interpretado como autorização para remover essa capacidade.

## Verificação e limites do handoff

| Verificação | Situação documentada |
| --- | --- |
| TypeScript, ESLint e build | `pnpm lint` e `pnpm build` passaram na integração final em 08/09/2026. O build inclui a checagem TypeScript. |
| Testes direcionados de integração | **30/30 passaram**: templates aprovados, ativação opcional, integridade do onboarding, convite de aluno, criação de treino e shell. Comando reproduzível abaixo. |
| Revisão independente | Corrigidos acesso mobile a avaliações, largura das abas, contraste/retorno da prévia e conflitos de CSS. `git diff --check` passou. |
| QA renderizado no navegador | **Bloqueado pela política do navegador deste ambiente.** Não há aprovação visual de responsividade, gestos, teclado ou fluidez. |
| Produção e aceite visual | Pendentes. Este documento não representa publicação nem satisfação de 98%. |

```sh
pnpm install --frozen-lockfile
pnpm lint
pnpm build
node --no-warnings --test tests/templates/approved-site-templates.test.mjs tests/onboarding/optional-activation.test.mjs tests/onboarding/activation-flow-integrity.test.mjs tests/auth/student-invitation-routing.test.mjs tests/workouts/trainer-workout-creation-sprint3.test.mjs tests/product/app-shell-v1.test.mjs
```

Uma rodada adicional de onboarding/autenticação teve 41/42 testes aprovados: `tests/onboarding/functional-onboarding-v2.test.mjs` procura `constructEventAsync` diretamente na rota do webhook, mas a versão base já delega a verificação a `verifyStripeWebhookEvent`. Essa falha preexistente não foi corrigida nem contabilizada como aprovação. O preflight de billing do build foi ignorado automaticamente fora do ambiente Vercel Production; não houve transação Stripe real ou teste E2E de pagamento.

Para continuar a revisão no checkout desta branch, executar `pnpm dev`. A fixture existente pode ser habilitada exclusivamente em desenvolvimento com `PPERFIL_DEMO_MODE=true` e acessada em `/demo`; ela não substitui validação autenticada de uma conta nova. Nenhum segredo ou arquivo de ambiente faz parte desta entrega.

Antes do aceite visual, revisar em 320, 390 e 430 px, nos temas claro/escuro: entrada e retomada de cadastro; navegação e retornos; criação de treino/avaliação; seleção dos três modelos; personalização → salvar → prévia → voltar; publicação conforme entitlement e retorno do checkout. Verificar teclado aberto, foco, áreas seguras, rolagem do site e movimento reduzido. Esse roteiro é uma pendência de validação, não evidência de execução.

A visão do aluno não foi redesenhada nesta entrega. O browser mobile ainda pode exibir sua própria interface; a reorganização não equivale à distribuição de aplicativo nativo. Não foram medidos redução de cliques, conversão, retenção ou tempo de tarefa.

Arquivos centrais para revisão: `src/components/dashboard/BottomNavigation.tsx`, `src/components/dashboard/SiteBuilder.tsx`, `src/components/dashboard/TemplatePreviewShell.tsx`, `src/components/onboarding/OnboardingForm.tsx`, `src/app/dashboard/business/page.tsx` e os três estilos `src/app/personal-*-redesign.css`. O diff também contém o launcher de desenvolvimento em `scripts/dev.mjs`/`package.json`, uma alteração de suporte local a revisar separadamente do comportamento do produto.
