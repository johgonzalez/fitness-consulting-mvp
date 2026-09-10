# Cheipi Personal Mobile — QA de 08/09/2026

## Escopo e estado do relatório

Revisão do PR #1 em `codex/personal-mobile-redesign-v1`, com worktree separada e dados fictícios no ambiente de testes. Esta rodada executou fluxos autenticados e inspeção visual real; não representa aceite de produção. Build e verificações finais passaram. Cadastro real, entrega SMTP, reenvio e confirmação por OTP foram aprovados no Preview. Checkout permanece pendente. Os retestes finais de overflow, retorno do onboarding e hover foram aprovados.

A sessão usou o navegador IAB autorizado, apontado para `http://127.0.0.1:3001`, com viewports:

| Largura | Altura |
| --- | --- |
| 320 px | 812 px |
| 390 px | 844 px |
| 430 px | 932 px |

A variação de viewport ocorreu em navegador de desktop. As larguras foram inspecionadas visualmente e, nos defeitos de overflow, também por medidas do DOM. Não foram simulados como prova um teclado virtual nativo, aparelho físico, áreas seguras de dispositivo ou gestos de toque.

## Isolamento do ambiente

- Supabase confirmado: projeto separado `smqkpqpixnglkflhwxhr`, em `https://smqkpqpixnglkflhwxhr.supabase.co`.
- Stripe configurado em TEST. O webhook TEST legado ainda apontava para produção; por isso não foram executados checkout, pagamento, retorno de checkout ou publicação do site.
- A conta inicial de QA foi preparada administrativamente para a revisão dos módulos. Depois, uma conta nova concluiu o cadastro real no Preview, com código recebido por e-mail e digitado na UI; essa confirmação não usou acesso administrativo.
- O bloqueio FREE da comunidade foi observado. Para testar feed e composição, foi usada uma fixture Pro explícita no banco de testes, com provider `qa_mobile_fixture`. Não foi uma assinatura Stripe verificada.
- O site fictício de Marina QA Mobile permaneceu com `published = false`. Os registros criados foram preservados no sandbox; não houve exclusão do app nem dos dados existentes.
- SMTP do sandbox usa uma chave Resend nova de `sending_access`, limitada a `auth.cheipi.com`, com remetente `no-reply-test@auth.cheipi.com` e nome “Cheipi — Testes”. As chaves existentes não foram alteradas. Conta, domínio e cotas do Resend continuam compartilhados; o isolamento é da credencial de envio e da configuração Supabase.
- Nenhuma configuração de ambiente, credencial ou imagem de sessão será incluída no repositório.

Antes do push, o Preview automático do PR foi isolado com sete overrides públicos exclusivos de `preview` + `codex/personal-mobile-redesign-v1`: URL/publishable/anon do Supabase, origem do alias observado, demo/lab desativados e `STRIPE_ENVIRONMENT=TEST`. A leitura efetiva de runtime e build confirmou o sandbox; o fingerprint dos outros 46 registros de ambiente permaneceu idêntico. Nenhuma chave administrativa, credencial Stripe ou segredo de webhook foi enviada. O checkout desse Preview fica indisponível. Evidência externa: `vercel-pr-preview-isolation.json`. A configuração vale para o próximo deploy automático; não transforma deploys anteriores em ambientes isolados.

## Execução por fluxo

| Fluxo | Ações executadas e resultados reais | Cobertura visual e limites |
| --- | --- | --- |
| Login | Inspeção nos temas claro e escuro; login bem-sucedido com a conta fictícia. | Tela nas três larguras. Não foi usada conta real de produção. |
| Cadastro novo | E-mail e senha inspecionados nas três larguras. Após configurar SMTP do sandbox, cadastro real no Preview, entrega inicial, reenvio pela UI e confirmação com o código do segundo e-mail foram aprovados; redirecionou ao onboarding, etapa 1. | Fluxo final de OTP executado no painel de 358 px. A chegada ao onboarding foi recapturada em 320/390/430 px sem overflow; não se afirma repetição do OTP nas três larguras. |
| Onboarding | Conta fixture percorreu identidade, especialidade, formato de atendimento, contato, endereço e modelo. Retomada mostrou dados salvos. Enter real no teclado deixou de encerrar a sessão. | Identidade capturada nas três larguras, incluindo a chegada da conta com e-mail realmente confirmado; demais etapas exercitadas em larguras distribuídas. Não se afirma que cada etapa foi repetida integralmente em cada viewport. |
| Navegação | Hoje, Alunos, Treinos, Comunidade e Negócio abertos; retornos entre áreas e contexto do aluno exercitados. | Telas principais nas três larguras. |
| Alunos | Três vínculos ativos fictícios; busca e abertura do aluno com contexto. | Lista nas três larguras e detalhe em 320 px. |
| Avaliações | Criada e salva pela UI a avaliação “Avaliação inicial QA · setembro”, vinculada à aluna fictícia; estado final `DRAFT`. | Configuração, modelo e revisão exercitados em larguras distribuídas; lista final nas três larguras. Envio/resposta pelo aluno não foi escopo concluído. |
| Treinos | Criado treino manual; exercício personalizado, duas séries de 12 repetições e descanso de 60 s; revisão e publicação da versão 1; clonagem para versão 2 em rascunho. | Listas e revisão nas três larguras; editor/detalhe e biblioteca em 320 px. Não foi executada a sessão de treino como aluno. |
| Busca de exercícios | Busca por “agachamento” inicialmente retornou zero; criar exercício não atualizava a consulta. Corrigido o refetch após criação. “Agachamento QA Mobile” e “Remada QA Mobile” ficaram salvos. | A busca ativa foi retestada sem precisar limpar o texto. A ausência do catálogo inicial no sandbox foi tratada com exercícios fictícios. |
| Comunidade | Gate FREE observado. Após fixture Pro explícita, feed aberto e publicação fictícia criada no grupo “Clube da Marina”; persistência confirmada. | Feed final nas três larguras; composição em 320 px. A fixture não valida cobrança. |
| Meu Site — modelos | Escolhidos Perfil (`template_05`), Conversão (`template_06`) e Essencial (`template_01`). | Os três modelos foram abertos em prévia nas três larguras: nove combinações. Modelo final persistido: Essencial. |
| Meu Site — conteúdo | Headline, bio, identidade visual, organização de seções e serviço “Consultoria QA Mobile” salvos. Serviço mensal fictício de R$ 99, com preço visível no site privado. | Editor exercitado e salvo; capturas de seções/modelos e visão geral. Upload de imagem não deve ser inferido apenas da edição da cor da marca. |
| Meu Site — prévia e retorno | Visualizar após salvar e voltar para Aparência, Seções e Serviços preservou o contexto via URL validada. | Visão geral nas três larguras. A prévia usa dados salvos; campos ainda não salvos não têm atualização instantânea. |
| Publicação/checkout | Não executados. | Bloqueados pelo webhook TEST legado apontando para produção. Nenhum resultado de pagamento ou publicação é alegado. |

## Defeitos corrigidos e reteste

| Problema observado | Correção | Evidência/estado |
| --- | --- | --- |
| Enter no onboarding acionava “Sair”, primeiro submit do formulário. | A saída usa formulário próprio; o submit da especialidade avança para atendimento. | Enter real observado seguindo para salvamento/etapa seguinte. |
| React avisava sobre `encType` em formulário com action de função. | Removida a configuração redundante; React controla o encoding da Server Action. | Após recarregar o código final, a última consulta do console retornou zero erros e avisos. |
| Botão Avaliações cortado e navegação apertada em 320 px. | Cabeçalho permite quebra e botão mantém largura do conteúdo; barra inferior distribui os rótulos sem colisão. | Lista de Alunos e navegação recapturadas nas três larguras. |
| Identificação do exercício desorganizada na revisão e placeholder cortado. | Layout independe da presença do controle de arrastar; miniaturas sem mídia contêm texto com quebra. | Revisão e busca por Remada QA Mobile conferidas no navegador. |
| Prévia voltava sempre a Conteúdo/Apresentação. | Área do editor validada em `editor`/`returnEditor`, restaurada no retorno. | Retornos a Aparência, Seções e Serviços exercitados. |
| Exercício personalizado salvo não aparecia na busca ainda aberta. | Atualização do catálogo local dispara nova consulta com os filtros atuais. | Refetch retestado na UI; exercícios confirmados na leitura posterior. |
| CTA claro com texto branco e rótulo claro sobre branco no Perfil/Essencial. | Cor de texto calculada para a marca e para as superfícies claras. | Com marca `#c7ff36`: 15,74:1 no CTA Perfil; 9,94:1 no CTA Essencial. Capturas posteriores mostraram o estado normal legível. |
| Hover do Essencial ficava preto sobre preto após a correção inicial. | Hover em mouse usa texto branco sobre `#171719`; efeito limitado a ponteiro fino com hover. | Reteste real aprovado: fundo computado `rgb(23,23,25)` e texto `rgb(255,255,255)`, 17,90:1; captura `final-site-essential-hover-430.png`. |
| Assistentes do editor expandiam o documento em 320 px. | Trilhas `minmax(0,1fr)`, filhos com `min-width:0`, quebra de textos/chips e rodapé. | Reteste aprovado nas três larguras: scrollWidth igual a clientWidth em 305/375/415 px. O editor foi recapturado no tema escuro. As abas mantêm rolagem horizontal local. |
| Cadastro apresentava espaço/rolagem artificial. | Removida a altura mínima excessiva do conteúdo do cadastro, mantendo fluxo vertical natural. | Telas finais de e-mail e senha capturadas. |
| Rolagem do onboarding após mudança de etapa. | A mudança de etapa restaura o topo e o foco no título. | Reteste aprovado: publicação → voltar a Modelo em 430 px e voltar a Endereço em 320 px retornaram `scrollY = 0`, com `activeElement = H1` e título correto. |

Os valores de contraste foram calculados a partir das cores renderizadas esperadas e cobertos por teste numérico. A primeira rodada não considerava o hover escuro do Essencial; essa regressão foi encontrada pelo reteste no navegador e recebeu correção específica. Não se deve usar a primeira captura com texto ilegível como comprovação do estado corrigido.

## Verificação posterior de persistência

O relatório externo `final-persistence-sanitized.json`, de `2026-09-08T21:04:55.637Z`, executou somente SELECT pela Data API do Supabase, sem mutações remotas, chamadas Stripe ou envio de e-mails nessa verificação. Resultado: **14/14 checks verdadeiros**.

| Check | Resultado |
| --- | --- |
| Projeto sandbox correto | Aprovado |
| Ambiente Stripe TEST | Aprovado |
| Identidade da conta fixture fixada | Aprovado |
| Três alunos ativos | Aprovado |
| Avaliação em `DRAFT` | Aprovado |
| Treino versão 1 em `PUBLISHED` | Aprovado |
| Nova versão 2 em `DRAFT` | Aprovado |
| Agachamento personalizado salvo | Aprovado |
| Remada personalizada salva | Aprovado |
| Grupo e publicação fictícia salvos | Aprovado |
| Conteúdo do site presente | Aprovado |
| Serviço mensal de R$ 99 | Aprovado |
| Modelo final `template_01` | Aprovado |
| Site privado | Aprovado |

O relatório identifica separadamente a fixture de billing como `EXPLICIT_DATABASE_QA_FIXTURE_NOT_STRIPE_VERIFICATION`. A verificação de preservação de outras contas não encontrou atualizações posteriores nas tabelas de billing/entitlements consultadas, mas não reteve um snapshot completo do banco; esse limite impede alegar comparação integral de todos os dados existentes.

## Testes automatizados e build

- A rodada final consolidada registrou **197 testes únicos aprovados, sem falhas ou skips**, incluindo as novas suites de navegação do editor e contraste.
- Na rodada direcionada de Auth, os **22 testes de contratos Auth/OTP/convites passaram**. Não são somados aos 197 testes consolidados, pois há sobreposição.
- A nova suite `tests/templates/site-editor-navigation.test.mjs` passou seus oito testes de retorno e parâmetros inválidos.
- A nova suite `tests/templates/brand-contrast.test.mjs` passou quatro testes, incluindo amostragem de 4.096 cores para texto sobre a marca e verificação de rótulos nas superfícies claras.
- Suites de templates aprovados, onboarding e criação/biblioteca de treinos também passaram nas execuções direcionadas das correções. Essas rodadas compartilham testes; não devem ser somadas como um novo total único.
- **Lint global, TypeScript e `git diff --check` passaram.**
- **Build final passou**, incluindo TypeScript e geração das 42 páginas. A primeira tentativa falhou apenas por bloqueio de rede ao baixar Google Fonts; a repetição com acesso de rede aprovado passou. O preflight de produção foi pulado porque `VERCEL_ENV` não era `production`; não houve chamada Stripe pelo build.
- Logs externos: `tests-final.tap` e `build-final.log`.
- O build concluído foi servido em localhost e abriu o dashboard autenticado “Olá, Marina”, com console sem erros/avisos (`build-browser-smoke.json`).

Reprodução das novas suites:

```sh
node --no-warnings --test tests/templates/site-editor-navigation.test.mjs tests/templates/brand-contrast.test.mjs
```

## Capturas e arquivos de evidência

Diretório externo ao repositório:

```text
C:/Users/jogue/.codex/visualizations/2026/09/08/01a082a7-e09c-7a33-8793-aa07b50ece6d/cheipi-mobile-qa
```

As capturas PNG prefixadas por `final-` registram a rodada final; as capturas anteriores permitem comparar defeitos encontrados. Arquivos de sessão e de preparação da fixture não fazem parte da entrega pública. As imagens não são commitadas.

| Evidência | Arquivos |
| --- | --- |
| Login claro | `final-login-light-320.png`, `final-login-light-390.png`, `final-login-light-430.png` |
| Cadastro e-mail | `final-signup-email-320.png`, `final-signup-email-390.png`, `final-signup-email-430.png` |
| Cadastro senha | `final-signup-password-320.png`, `final-signup-password-390.png`, `final-signup-password-430.png` |
| Tema escuro | `final-signup-dark-320.png`, `final-today-dark-320.png`, editor nas três larguras e retornos do onboarding indicados abaixo; capturas iniciais de login escuro também disponíveis |
| Onboarding | `final-onboarding-identity-320.png`, `final-onboarding-identity-390.png`, `final-onboarding-identity-430.png`; retornos no escuro: `final-onboarding-template-430.png`, `final-onboarding-slug-dark-320.png` |
| Início e listas | `final-today-{320,390,430}.png`, `final-students-{320,390,430}.png`, `final-assessments-{320,390,430}.png`, `final-workouts-{320,390,430}.png` |
| Treino e busca | `final-workout-review-{320,390,430}.png`, `final-workout-detail-320.png`, `final-exercise-search-320.png` |
| Comunidade | `final-community-{320,390,430}.png`, `community-free-gate-430.png`, `community-compose-320.png` |
| Meu Site | `final-site-overview-{320,390,430}.png`, `final-site-models-320.png` |
| Três modelos | `final-site-profile-{320,390,430}.png`, `final-site-conversion-{320,390,430}.png`, `final-site-essential-{320,390,430}.png` |
| Editor após correção | `final-site-editor-{320,390,430}.png`, todas no tema escuro, sem overflow do documento |
| Hover Essencial após correção | `final-site-essential-hover-430.png`, branco sobre fundo escuro, sem navegar para o contato |
| Persistência | `final-persistence-sanitized.json` |
| Cadastro/OTP real no Preview | `otp-preview-358.jpg`, `otp-confirmed-onboarding-358.jpg` |
| Chegada ao onboarding após OTP | `otp-confirmed-onboarding-320.jpg`, `otp-confirmed-onboarding-390.jpg`, `otp-confirmed-onboarding-430.jpg` |
| SMTP e confirmação — relatórios sanitizados | `auth-smtp-readback-sanitized.json`, `otp-preview-browser-result.json` |

O arquivo `final-site-essential-430.png` foi recapturado com o estado normal corrigido; `final-site-essential-hover-430.png` registra o hover corrigido. O pacote `cheipi-capturas-mobile-2026-09-08.zip` contém 54 capturas selecionadas, incluindo a falha real `signup-result-390.png`, sem arquivos de credenciais ou preparação. `viewport-measurements.json` mantém medidas cronológicas, incluindo o overflow encontrado e os retestes posteriores; `final-browser-checks.json` registra foco, hover, busca e console finais.

## Reteste de confirmação por e-mail — aprovado

O primeiro teste identificou uma incompatibilidade: a UI exigia OTP de oito dígitos, mas o template padrão do Supabase enviava somente um link. O provedor padrão do projeto Free recusou a personalização com HTTP 400. Essa falha inicial foi resolvida com SMTP próprio no sandbox; não é mais uma pendência de cadastro.

Após login autorizado do usuário no Resend, foi criada uma chave nova de `sending_access`, restrita a `auth.cheipi.com`, sem reutilizar, remover ou rotacionar as chaves existentes. O remetente é `no-reply-test@auth.cheipi.com`, com nome “Cheipi — Testes”. O projeto Supabase e a credencial de envio são exclusivos desta configuração de testes; a conta, o domínio e as cotas do Resend continuam compartilhados.

O PATCH somente no projeto `smqkpqpixnglkflhwxhr` retornou HTTP 200 e aplicou SMTP, o HTML versionado em `supabase/templates/confirmation.html`, o assunto “Seu código de confirmação — Cheipi” e limite de 30 e-mails/h. A releitura confirmou OTP de oito dígitos, validade de 3.600 s, confirmação obrigatória e intervalo de reenvio de 60 s. SiteURL, redirect da branch de billing e redirect do Preview foram preservados. O fingerprint Auth de produção permaneceu idêntico. A API atualizou metadados de conteúdo customizado do sandbox; não há snapshot anterior campo a campo para alegar identidade integral dos demais metadados remotos.

O reteste final foi executado no Preview pelo navegador autorizado, em painel de 358 px:

1. Cadastro enviado pela UI e primeiro e-mail entregue no Resend: `5180bc07-385c-467c-9f18-2b406fec77d1`.
2. Botão “Reenviar código” acionado na UI; segundo e-mail entregue: `c0de1fd3-9227-4520-8a5e-5ec5bdd337ce`.
3. Ambos os corpos de e-mail estavam em português, com OTP numérico de oito dígitos e sem link de confirmação.
4. O código do segundo e-mail foi digitado na aplicação e aceito. A conta foi redirecionada ao onboarding, etapa 1, sem confirmação administrativa.

A leitura posterior em `otp-browser-persistence.json` confirmou `email_confirmed_at` preenchido e nenhum perfil/draft de onboarding criado ainda, consistente com a etapa 1. E-mail real e identificador da conta não são reproduzidos neste documento.

A chegada ao onboarding foi então recapturada em 320 × 812, 390 × 844 e 430 × 932 px. As larguras de documento/scroll foram, respectivamente, 305/305, 390/390 e 430/430 px; os 15 px restantes no viewport de 320 correspondem à barra de rolagem. Não houve overflow horizontal. Isso valida a chegada nas três larguras; o ciclo final de envio/reenvio/OTP ocorreu uma vez no painel de 358 px. As telas de cadastro em 320/390/430 já haviam sido cobertas na rodada anterior.

A prova preliminar por API com `generateLink`/`verifyOtp` não enviava e-mail; foi complementada pelo teste real acima. Os 22 testes de contratos Auth/OTP/convites também passaram. Nenhum código, senha, chave ou token de sessão é reproduzido neste relatório.

Evidências sanitizadas externas: `auth-smtp-readback-sanitized.json`, `otp-preview-browser-result.json` e `otp-browser-persistence.json`. Capturas: `otp-preview-358.jpg`, `otp-confirmed-onboarding-358.jpg` e `otp-confirmed-onboarding-{320,390,430}.jpg`. O adendo externo `cheipi-confirmacao-cadastro-2026-09-08.zip` contém somente essas cinco capturas JPEG (106.795 bytes), separado do pacote original de 54 imagens. O contrato e a configuração final estão em [SANDBOX_EMAIL_OTP.md](../auth/SANDBOX_EMAIL_OTP.md).

## Pendências para fechamento

1. Corrigir/configurar um destino de webhook exclusivamente de testes antes de executar Stripe TEST, checkout e publicação. Até lá, manter esses fluxos sem execução e produção intacta.

Teclado virtual nativo, gestos em aparelho, áreas seguras físicas, preferência de movimento reduzido em dispositivo e execução completa como aluno não foram validados nesta rodada. Não há medição de conversão, retenção, fluidez quantitativa ou ganho de tempo.
