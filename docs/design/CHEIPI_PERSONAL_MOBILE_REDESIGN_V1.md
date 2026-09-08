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

No celular, a prévia completa usa **um iframe isolado em tela cheia**, abaixo de uma toolbar de 64 px. A navegação do painel e a rolagem externa ficam fora dessa tela; o iframe ocupa o espaço restante. O isolamento preserva estilos e cabeçalhos dos templates aprovados, evitando interferência do painel. As rotas e a autenticação existentes permanecem. As amostras da seleção continuam sendo previews limitados, com ação explícita para visualizar. A prévia informa que usa **dados salvos**; esta V1 não implementa atualização instantânea de campos ainda não salvos. O retorno conserva o contexto de modelos, personalização ou publicação. A área aberta no editor (Apresentação, Aparência, Metodologia, Serviços, Depoimentos ou Seções) também é preservada na URL e restaurada ao voltar da prévia. Copiar e compartilhar têm mensagens de resultado e tratamento de cancelamento.

## Demais alterações de apresentação

- Entrada: marca maior no cabeçalho; onboarding com seis passos visuais, identificação de publicação/convite opcionais e seções opcionais recolhíveis. Especialidade e formato de atendimento se apresentam em momentos separados usando a ação existente.
- Alunos e avaliações: listas mais abertas, hierarquia tipográfica consistente, inputs com tamanho legível no celular, textos simplificados e navegação de retorno. Busca e filtros de alunos preservam seu contexto ao abrir/fechar o convite.
- Treinos: rótulos em português, redução de decoração, ações mobile de ordenar sessões, voltar da revisão para edição e criar nova versão. A criação mantém o contexto do aluno e limpa o rascunho em memória ao trocar o destinatário.
- Comunidade e plano: harmonização de tipografia, fundos e superfícies pelo shell do personal. Não houve reconstrução das regras ou do conteúdo desses módulos.

## Preservação funcional

O diff desta V1 não altera migrations, RLS, RPCs, ações de servidor de autenticação/onboarding/site/treino, contratos de domínio ou lógica de billing. Permanecem os estados de treino, permissões por vínculo, gates de publicação, validações do cadastro e regras de planos. As alterações em `src/lib/domain/site-template-presentation.ts` são metadados de apresentação.

O bloqueio visual de publicação agora encaminha a `/dashboard/settings/billing`, substituindo a mensagem antiga de pagamento futuro/registro de interesse. Isso não concede entitlement. Preços, produtos Stripe e condições comerciais não foram redefinidos. “Meu plano” identifica a assinatura Cheipi.

A funcionalidade existente de criar rascunhos com IA continua identificada como IA e exige revisão. O pedido de evitar aparência genérica orientou o tratamento visual; não foi interpretado como autorização para remover essa capacidade.

## Revisão visual autenticada de 08/09/2026

A revisão continuou na branch `codex/personal-mobile-redesign-v1`, em worktree separada, usando o navegador IAB autorizado da sessão e o servidor local `http://127.0.0.1:3001`. Foram usadas janelas de 320 × 812, 390 × 844 e 430 × 932 px. O relatório de execução, evidências e limites está em [CHEIPI_PERSONAL_MOBILE_QA_2026-09-08.md](CHEIPI_PERSONAL_MOBILE_QA_2026-09-08.md).

O Supabase usado é o projeto separado de testes `smqkpqpixnglkflhwxhr`; a configuração de Stripe foi confirmada como TEST. Checkout/publicação não foram executados, pois o webhook TEST legado ainda apontava para produção. O acesso Pro usado para inspecionar o feed foi uma fixture explícita no banco de testes, identificada por `qa_mobile_fixture`, sem validação de assinatura via Stripe. Produção não foi usada para os testes.

O próximo Preview automático desta branch também foi isolado com configurações públicas do sandbox, sem chave administrativa nem credenciais Stripe. Runtime e build foram conferidos; os 46 registros de ambiente dos demais escopos ficaram idênticos. O checkout do Preview permanece indisponível. Deploys anteriores não recebem retroativamente essa configuração.

A conta fictícia inicial percorreu os seis passos do onboarding. O cadastro por e-mail e senha foi inspecionado nas três larguras. Depois de resolver a incompatibilidade entre o template padrão de e-mail e o OTP da UI, uma conta nova concluiu cadastro real, entrega de e-mail, reenvio e confirmação de código no Preview, sem confirmação administrativa. O ciclo final ocorreu no painel de 358 px; a chegada ao onboarding, etapa 1, foi recapturada em 320/390/430 px sem overflow horizontal.

O SMTP aplicado somente ao sandbox usa uma chave Resend nova de sending_access limitada a auth.cheipi.com, com remetente no-reply-test@auth.cheipi.com e nome “Cheipi — Testes”. Conta, domínio e cotas do provedor continuam compartilhados. O HTML de confirmação versionado foi aplicado com sucesso; ambos os e-mails recebidos exibiram OTP de oito dígitos em português, sem link. Validade de 3.600 s, confirmação obrigatória e reenvio após 60 s foram preservados; limite de envio configurado em 30 e-mails/h. O fingerprint Auth de produção permaneceu idêntico e as chaves existentes não foram alteradas. Veja [SANDBOX_EMAIL_OTP.md](../auth/SANDBOX_EMAIL_OTP.md).

Foram executados navegação e retornos, busca de alunos, criação de avaliação em rascunho, criação/revisão/publicação de treino e clonagem de nova versão, feed com publicação fictícia e Meu Site. Neste último, os três modelos foram escolhidos, conteúdo/aparência/seções/serviço foram salvos e as nove combinações de modelo e largura foram abertas em prévia. O site fictício permaneceu privado.

## Correções encontradas nesta rodada

- Enter nos formulários do onboarding deixou de acionar “Sair”; a especialidade avança para o formato de atendimento. A saída continua disponível explicitamente.
- Removida a configuração redundante de encoding do formulário que gerava aviso do React ao usar Server Actions.
- A prévia restaura a aba e a área de conteúdo abertas no editor, incluindo Aparência, Seções e Serviços.
- A busca da biblioteca é atualizada após criar um exercício personalizado, mantendo texto e filtros.
- Perfil e Essencial calculam cores legíveis para texto sobre a cor da marca. O hover escuro do Essencial recebeu texto branco e foi limitado a dispositivos com mouse.
- Ajustadas contenção e quebra dos assistentes do editor em 320 px. A altura artificial do cadastro foi ajustada; voltar de publicação para modelos/endereço no onboarding retorna ao topo e foca o título.

## Verificação e limites do handoff

| Verificação | Situação desta rodada |
| --- | --- |
| Navegador autorizado | Executado em IAB local nas três larguras acima; há capturas reais fora do repositório. |
| Persistência no sandbox | **14/14 verificações aprovadas** em leitura posterior, com relatório sanitizado. |
| Testes automatizados | **197 testes únicos aprovados**, sem falhas ou skips, incluindo navegação do editor e contraste. |
| ESLint | Verificação global final aprovada. |
| TypeScript e build | Aprovados no código final; build gerou 42 páginas. Download de Google Fonts exigiu acesso de rede aprovado. |
| Retestes visuais finais | Aprovados: editor nas três larguras sem overflow do documento; retorno do onboarding ao topo com foco no título; hover do Essencial com texto branco sobre fundo escuro. |
| Cadastro novo e OTP | Aprovados no Preview: envio e reenvio entregues, código do segundo e-mail aceito na UI e chegada ao onboarding 1. Fluxo OTP em 358 px; chegada recapturada nas três larguras. 22 testes de contratos Auth passaram em rodada direcionada, sem somar ao total consolidado. |
| Stripe, checkout e publicação do site | Não executados; webhook TEST legado aponta para produção. |

Comandos direcionados reproduzíveis para as novas regressões:

```sh
node --no-warnings --test tests/templates/site-editor-navigation.test.mjs tests/templates/brand-contrast.test.mjs tests/templates/approved-site-templates.test.mjs tests/onboarding/optional-activation.test.mjs tests/onboarding/activation-flow-integrity.test.mjs tests/workouts/workout-builder-visual-sprint1c.test.mjs tests/workouts/trainer-workout-creation-sprint3.test.mjs
```

Para continuar a revisão local, usar a configuração isolada de testes já preparada na worktree. Não copiar configuração de produção. Nenhum segredo, arquivo de ambiente ou captura com dados de sessão faz parte do commit. A fixture `/demo` continua sendo uma alternativa de desenvolvimento e não substitui o fluxo autenticado descrito no relatório.

Foi usado teclado de desktop, incluindo Enter real nos formulários. Não foram validados teclado virtual de um aparelho, gestos de toque nativos, áreas seguras físicas, movimento reduzido em dispositivo ou distribuição como app nativo. A visão do aluno não foi redesenhada; não foram medidos redução de cliques, conversão, retenção ou tempo de tarefa.

Arquivos centrais para revisão: `src/components/dashboard/BottomNavigation.tsx`, `src/components/dashboard/SiteBuilder.tsx`, `src/components/dashboard/TemplatePreviewShell.tsx`, `src/components/onboarding/OnboardingForm.tsx`, `src/components/workouts/ExerciseLibraryDrawer.tsx`, `src/lib/navigation/site-editor.ts`, `src/components/templates/brand-contrast.ts`, `src/app/dashboard/business/page.tsx` e os três estilos `src/app/personal-*-redesign.css`. O launcher de desenvolvimento em `scripts/dev.mjs`/`package.json` continua sendo suporte local separado das regras do produto.
