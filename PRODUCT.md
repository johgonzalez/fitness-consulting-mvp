# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

O usuário principal é o Personal Trainer brasileiro. Ele usa o PPerfil em mobile e desktop para construir presença profissional, captar oportunidades e operar o acompanhamento dos alunos. O produto deve permitir que o Personal conduza o dia a dia pelo celular, inclusive dentro da academia, entre atendimentos ou longe de um computador. Tarefas densas, como a criação detalhada de treinos, continuam disponíveis no mobile, mas podem aproveitar melhor o espaço do desktop.

O aluno é o usuário secundário. Sua experiência é prioritariamente mobile-first, simples, guiada e orientada à próxima ação, especialmente para visualizar e executar treinos, responder avaliações e acompanhar o próprio progresso.

## Product Purpose

O PPerfil reúne em uma única plataforma:

- presença digital e site profissional;
- captação e gestão de leads;
- gestão de alunos;
- avaliações;
- prescrição robusta de treinos;
- execução do treino pelo aluno;
- acompanhamento de progresso;
- experiência digital do aluno.

Essas capacidades não devem aparecer com o mesmo peso no primeiro contato. A criação e a publicação do site profissional são a principal porta de entrada, o principal momento de ativação e a proposta de valor inicial do produto.

O primeiro valor entregue é permitir que o Personal veja e publique rapidamente um site profissional próprio. O segundo é permitir que convide seu primeiro aluno. O produto revela sua profundidade progressivamente, sem tentar ensinar todas as capacidades durante o onboarding.

## Positioning

Muitos Personais dependem apenas de Instagram, WhatsApp ou soluções genéricas de link-in-bio. O PPerfil transforma essa presença fragmentada em uma página profissional própria, conectada diretamente à operação do Personal.

O site permite divulgar serviços, apresentar especialidade e posicionamento, captar leads, receber contatos pelo WhatsApp, apoiar campanhas e transmitir mais autoridade. A mesma plataforma continua a jornada depois da aquisição: o Personal gerencia alunos, avalia, prescreve treinos e acompanha progresso sem separar presença digital e coaching em produtos desconectados.

O site é a porta de entrada. A gestão e o coaching são a profundidade do produto.

## Operating Context

### Onboarding oficial

O onboarding deve seguir esta sequência:

1. Criar conta.
2. Confirmar e-mail.
3. Adicionar foto e nome profissional.
4. Informar especialidade e forma de atendimento.
5. Adicionar os canais principais: WhatsApp, Instagram, TikTok e outros quando relevantes.
6. Escolher rapidamente um template ou estilo.
7. Gerar um preview real do próprio site.
8. Informar claramente: “Seu site está pronto”.
9. Convidar o Personal a publicar.
10. Para publicar, iniciar o trial PRO de sete dias, com cartão obrigatório via Stripe.
11. Informar R$ 0 no início do trial.
12. Informar a cobrança recorrente de R$ 59,90 por mês após sete dias.
13. Informar que o cancelamento antes do fim do trial não gera cobrança.
14. Após a ativação, publicar o site.
15. Mostrar o link real do site.
16. Permitir copiar o link, compartilhá-lo no WhatsApp e abrir o site.
17. Sugerir que o Personal coloque o link na bio das redes sociais.
18. Convidar o primeiro aluno como próximo passo.
19. Levar o Personal ao Dashboard depois dessa ativação.

O Personal deve ver o próprio site pronto antes de ser solicitado a cadastrar um cartão. O cartão não é uma barreira inicial. Billing entra como parte natural da ação de publicar o site.

O onboarding não deve exigir metodologia completa, depoimentos, biografia extensa ou configurações avançadas antes da publicação. Esses detalhes podem ser completados depois.

### Retomada do onboarding

O onboarding deve ser resumível e idempotente.

Se o Personal fechar o navegador, trocar de dispositivo ou interromper o processo:

- o sistema deve detectar o último estado factual concluído;
- retomar no próximo passo necessário;
- nunca exigir a repetição de dados já salvos;
- nunca depender apenas de estado local, como `step=4`.

### Flexibilidade inicial

O onboarding deve pedir apenas o mínimo necessário para gerar um site convincente. Campos não essenciais podem ser pulados e completados posteriormente.

O primeiro preview nunca deve ser bloqueado por:

- TikTok ausente;
- YouTube ausente;
- depoimentos;
- metodologia;
- biografia extensa;
- configurações avançadas.

### Momentos de ativação

- Primeiro “aha moment”: o Personal vê e publica o próprio site profissional.
- Segundo “aha moment”: o Personal convida o primeiro aluno.

### Progressão do produto

1. Criar presença: site profissional.
2. Gerar negócio: leads.
3. Gerenciar: alunos.
4. Avaliar: avaliações.
5. Prescrever: treinos.
6. Acompanhar: progresso.

## Capabilities and Constraints

### Experiência e conteúdo

- Uma decisão principal por tela.
- Pouco texto e baixa carga cognitiva.
- Progressive disclosure.
- Feedback imediato.
- Preview real cedo.
- Uma CTA principal clara.
- Experiência mobile-first com responsividade real.
- Reutilização de dados, componentes e arquitetura existentes.
- Detalhes avançados podem ser concluídos depois da ativação inicial.

### Workout Builder

A simplificação visual nunca pode remover profundidade profissional. O Workout Builder deve preservar:

- programas;
- semanas;
- sessões;
- blocos;
- exercícios;
- séries;
- carga;
- repetições;
- RPE;
- descanso;
- tempo;
- supersets;
- observações;
- progressão;
- histórico;
- rascunho;
- preview como aluno;
- publicação.

O objetivo é simplificar a percepção da complexidade, não reduzir a capacidade do produto. Prescrição e execução permanecem domínios distintos.

### Billing

O modelo comercial aprovado para o PRO é:

- sete dias grátis;
- cartão obrigatório no início do trial;
- R$ 0 no início;
- cobrança recorrente de R$ 59,90 por mês após o trial;
- cancelamento antes do fim do trial sem cobrança.

A arquitetura Billing/Stripe existente deve ser reutilizada. Não deve existir um sistema de cobrança paralelo.

O trial e o vínculo entre publicação e Billing são regras aprovadas de produto, mas ainda não representam funcionalidade entregue no código atual. A implementação existente cobre a fundação de Billing e Hosted Checkout em Stripe TEST, sem ativação por webhook ou trial. Até essa implementação ser concluída e validada, o produto não deve apresentar trial, publicação condicionada ou cobrança como se já estivessem operacionais.

### Continuidade após trial

Se o trial terminar sem uma assinatura paga ativa:

- nenhum dado do Personal ou dos alunos deve ser apagado;
- o site deixa de ficar publicamente disponível por entitlement, sem destruir a intenção ou a configuração de publicação;
- o Personal mantém acesso ao produto em estado FREE ou restrito;
- dados e configurações permanecem disponíveis para reativação futura;
- a experiência deve explicar claramente o que ficou indisponível e como reativar o PRO.

### Integridade, segurança e domínio

- Português-BR é o idioma inicial, com arquitetura preparada para internacionalização futura.
- Dados e estados apresentados devem ser reais e factuais.
- Nenhuma prova, resultado, cliente ou depoimento pode ser fabricado.
- Dados de prescrição e dados de execução não devem ser misturados.
- O isolamento entre Trainer e Student é obrigatório.
- Privacidade e RLS são limites arquiteturais permanentes.
- O produto não oferece interpretação médica nem diagnóstico.
- A cobrança deve ser transparente.
- O workspace Demo é apenas para desenvolvimento e QA, permanece read-only e não pode existir em produção.
- Stripe permanece em TEST até autorização explícita e validação para outro ambiente.

## Brand Commitments

O nome do produto é PPerfil.

A experiência deve preservar a identidade PPerfil existente e comunicar uma plataforma moderna, premium, humana, fitness, minimalista e de alta clareza. Deve priorizar menos texto e evitar cards sem função.

O produto não deve parecer um dashboard SaaS genérico, uma interface gamer, uma composição dominada por neon ou uma aplicação baseada em glassmorphism pesado.

Esses compromissos não definem uma nova identidade visual. Cores, tipografia, layout, componentes e decisões visuais específicas pertencem ao `DESIGN.md` e a referências visuais aprovadas futuras.

## Evidence on Hand

- O repositório contém Trainer Portal, Student Portal, sites públicos, leads, alunos, avaliações, Workout Builder, execução de treinos, progresso e fundação de Billing.
- `docs/PPERFIL_DESIGN_SYSTEM_V3.md` registra a fundação visual canônica atual do produto autenticado.
- `docs/PPERFIL_V1_PRODUCT_VISUAL_AUDIT.md` registra a avaliação consolidada das experiências Trainer, Student e públicas.
- O catálogo versionado contém 190 exercícios; o Media Pack V1 mapeia 49 exercícios para 96 imagens aprovadas.
- Existem fixtures locais consistentes para demonstração e QA, claramente identificadas como Demo e sem escrita no Supabase remoto.
- Depoimentos, resultados e mídias editoriais não podem ser tratados como identidade real do Personal ou do aluno sem origem e autorização adequadas.

## Product Principles

1. Entregar valor antes de pedir compromisso: o Personal vê o site pronto antes de cadastrar o cartão.
2. Ativar em duas etapas: primeiro presença profissional, depois o primeiro aluno.
3. Revelar profundidade progressivamente: site primeiro; gestão e coaching conforme se tornam relevantes.
4. Simplificar a percepção sem reduzir a capacidade profissional.
5. Manter verdade, propriedade e segurança em todos os dados e estados.

## Accessibility & Inclusion

- Os fluxos principais devem funcionar por teclado e tecnologias assistivas.
- Contraste, foco visível, semântica e legibilidade devem ser preservados em temas Light e Dark.
- Touch targets devem ser adequados ao uso mobile.
- Nenhuma interação essencial pode depender apenas de hover.
- Reduced motion deve ser respeitado.
- O produto deve permanecer utilizável em diferentes larguras, incluindo mobile compacto, sem bloquear fluxos complexos.
- Linguagem, mídia e exemplos devem evitar pressupor gênero, aparência, condição física ou objetivo do Personal ou do aluno.
