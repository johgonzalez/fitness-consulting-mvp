---
name: "PPerfil — Performance Serena"
description: "Sistema visual atual do PPerfil: premium pela precisão, humano, fitness, operacional e contido."
colors:
  accent-legado-violeta: "#7c5cf3"
  accent-legado-violeta-dark: "#8b6cf6"
  accent-soft: "#eee9ff"
  saude: "#45a85a"
  performance: "#2b9fc3"
  energia: "#d88912"
  perigo: "#d92d20"
  light-background: "#f7f8fa"
  light-surface: "#ffffff"
  light-surface-subtle: "#f1f3f5"
  light-border: "#e2e6ea"
  light-text: "#0f1419"
  light-text-secondary: "#4b5563"
  light-text-muted: "#667085"
  graphite-background: "#0f1419"
  graphite-surface: "#171c22"
  graphite-surface-raised: "#202731"
  graphite-border: "#2c343e"
  graphite-text: "#f8fafc"
  graphite-text-secondary: "#c8d0da"
  graphite-text-muted: "#98a2b3"
typography:
  display: { fontFamily: "Manrope, Inter, sans-serif", fontSize: "clamp(2.4rem, 4vw, 3rem)", fontWeight: 700, lineHeight: 0.98 }
  page-title: { fontFamily: "Manrope, Inter, sans-serif", fontSize: "clamp(1.875rem, 3vw, 2.4rem)", fontWeight: 700, lineHeight: 1.08 }
  section-title: { fontFamily: "Manrope, Inter, sans-serif", fontSize: "0.95rem", fontWeight: 700, lineHeight: 1.3 }
  card-title: { fontFamily: "Manrope, Inter, sans-serif", fontSize: "0.78rem", fontWeight: 700, lineHeight: 1.35 }
  body: { fontFamily: "Inter, sans-serif", fontSize: "0.75rem", fontWeight: 500, lineHeight: 1.55 }
  body-compact: { fontFamily: "Inter, sans-serif", fontSize: "0.68rem", fontWeight: 500, lineHeight: 1.45 }
  label: { fontFamily: "Inter, sans-serif", fontSize: "0.625rem", fontWeight: 650, lineHeight: 1.3 }
  caption: { fontFamily: "Inter, sans-serif", fontSize: "0.56rem", fontWeight: 550, lineHeight: 1.4 }
  metric: { fontFamily: "Manrope, Inter, sans-serif", fontSize: "1.6rem", fontWeight: 700, lineHeight: 1.05 }
rounded: { xs: "8px", sm: "10px", md: "14px", lg: "18px", xl: "24px", pill: "999px" }
spacing: { space-1: "4px", space-2: "8px", space-3: "12px", space-4: "16px", space-5: "20px", space-6: "24px", space-8: "32px", space-10: "40px", space-12: "48px", space-16: "64px", space-20: "80px" }
components:
  button-primary: { backgroundColor: "{colors.accent-legado-violeta}", height: "44px", rounded: "{rounded.sm}", padding: "0 17px" }
  button-secondary: { backgroundColor: "{colors.light-surface}", height: "44px", rounded: "{rounded.sm}", padding: "0 17px" }
  input: { backgroundColor: "{colors.light-surface-subtle}", height: "44px", rounded: "{rounded.sm}", padding: "10px 12px" }
  surface: { backgroundColor: "{colors.light-surface}", rounded: "{rounded.lg}", padding: "20px" }
  status: { backgroundColor: "{colors.light-surface-subtle}", rounded: "{rounded.pill}", height: "23px" }
---

# Design System: PPerfil — Performance Serena

## Overview

**Creative North Star: Performance Serena**

O sistema visual atual do PPerfil é premium pela precisão, humano, operacional, fitness e contido. Sua qualidade vem de hierarquia clara, alinhamento rigoroso, densidade controlada e cor com função — não de ornamentação. A linguagem deve parecer serena durante a operação e energética somente quando o conteúdo de treino pede intensidade.

Light é a composição canônica. Dark preserva a mesma anatomia e traduz os materiais para grafite; não constitui outro produto. Trainer, Student e sites públicos pertencem à mesma família, mas possuem contextos diferentes: Trainer é operacional e rico em dados; Student é touch-first e orientado à próxima ação; templates públicos preservam art directions próprias.

Este documento registra o sistema atual, sem redesenhar ou definir uma direção futura.

### Classificação dos padrões

- **Canônico existente:** tokens semânticos `--pp-*`, Design System V3, primitives compartilhadas, Dashboard V3, Workout Builder/Review e Student Workout como referências protegidas.
- **Legado ou inconsistente:** aliases `--trainer-*` e `--matrix-*`; classes `matrix-*`, `builder-*` e `saas-*`; estilos locais de domínio; vocabulário roxo/violeta presente nos tokens.
- **Denso ou verboso:** composições em que cards, painéis, tabs, explicações ou controles competem com a próxima ação. A correção é hierarquia e progressive disclosure, nunca remoção de capacidade profissional.

## Colors

A paleta atual combina neutros claros ou grafite com um accent violeta legado e quatro famílias semânticas.

### Accent atual

**Accent legado atual — violeta `#7c5cf3`.** Ele é usado em CTA primária, estado ativo, foco e identidade do produto autenticado.

- Os tokens atuais ainda usam nomes `--pp-purple-*`, além de aliases como `--pp-accent` e `--pp-accent-strong`.
- Essa nomenclatura é uma inconsistência/legado da implementação atual.
- O violeta implementado não deve ser renomeado como **Azul PPerfil**.
- O valor e sua nomenclatura não devem ser tratados como decisão visual definitiva.
- A definição futura do accent canônico deve ocorrer posteriormente no `DESIGN.md` evolutivo ou em exploração visual aprovada.
- Este registro não autoriza alteração de código agora.

### Cores semânticas

- **Saúde:** sucesso, disponibilidade real, progresso válido e estado positivo.
- **Performance:** informação operacional e contexto de desempenho.
- **Energia:** atenção, prazo, risco moderado e ação pendente.
- **Perigo:** erro, bloqueio e ação destrutiva.
- **Grafite e Neutros:** fundos, superfícies, texto, bordas, divisores, estados indisponíveis, skeletons e metadata.

Essas famílias não são decoração e não devem ser distribuídas arbitrariamente entre cards.

### Light e Dark

- **Light-first:** fundo cinza quase branco, superfícies brancas, controles cinza-claro, bordas discretas e texto grafite.
- **Dark em grafite:** fundo quase preto, superfícies grafite progressivamente elevadas, bordas frias e texto quase branco.
- Dark troca tokens semânticos, nunca layout, hierarquia ou anatomia do componente.
- Accent é restrito a ação, seleção, foco e identidade.
- Significado nunca depende somente de cor.

**Inconsistência atual:** Dashboard ainda possui receitas locais `--ppv3-*`; aliases `matrix` e `trainer` continuam ativos para compatibilidade. Eles não constituem sistemas globais paralelos.

## Typography

- **Manrope:** títulos, métricas e declarações de maior presença.
- **Inter:** interface, formulários, tabelas, labels, metadata e leitura operacional.
- **Display:** raro; reservado a statements de alto impacto.
- **Page title:** um título principal por rota.
- **Section title:** separa grupos sem competir com o título da rota.
- **Card title:** identifica uma superfície local.
- **Body:** explicações curtas e necessárias.
- **Compact body/data:** controles, linhas e fatos operacionais.
- **Label:** campos e estados; uppercase apenas em contextos breves.
- **Caption:** metadata secundária, nunca instrução essencial.
- **Metric:** valor dominante, tabular e imediatamente escaneável.

Manrope expressa hierarquia e identidade; Inter resolve operação e leitura. Não se introduz uma terceira família sem decisão sistêmica aprovada.

**Densidade atual:** body, labels e captions são compactos. Em telas com explicações longas ou muitos controles, simplificar copy e agrupamento tem prioridade sobre reduzir ainda mais a fonte.

**Inconsistência atual:** alguns domínios definem tamanhos locais e classes antigas em vez dos papéis `--pp-type-*`.

## Layout

O Trainer usa shell operacional com sidebar de 224 px e conteúdo fluido até 1440 px. O gutter desktop é 32 px, cai para 20 px abaixo de 1180 px e usa 16 px no mobile. Conteúdo de leitura e Student trabalham com largura de referência de 680 px.

A escala espacial segue 4, 8, 12, 16, 20, 24, 32, 40, 48, 64 e 80 px. Espaço entre seções deve ser maior que padding interno ou distância entre elementos relacionados.

No mobile Trainer, a sidebar se transforma em header compacto e navegação inferior com destinos de alta frequência; destinos secundários entram em “Mais”. Tabelas tornam-se linhas operacionais priorizadas. Ações mantêm touch target mínimo de 44 px e respeitam safe areas.

Student é touch-first, com mídia e ação primária mais presentes. Workout Execution pode remover navegação normal para preservar foco. Student não importa o shell do Dashboard.

Viewports de referência: 1440 × 900, 768 × 1024, 430 × 932 e 390 × 844. Não pode existir overflow horizontal do documento.

### Regras de composição

- Mobile reprioriza informação e ação; não é desktop empilhado mecanicamente.
- Espaço, linhas e divisores agrupam primeiro.
- Uma superfície fechada só aparece quando agrupamento ou elevação possuem significado.
- DataList, MasterDetail, shell Trainer responsivo, shell Student e Builder adaptativo são padrões canônicos existentes.

### Áreas densas ou verbosas

- Dashboard: muitos painéis e KPIs com peso equivalente.
- Settings, Meu Site e Assessment Detail: navegação horizontal e explicação excessiva em alguns estados.
- Student Detail: áreas indisponíveis competem com contexto útil.
- Workout Builder: denso por necessidade profissional. Deve ganhar progressive disclosure e prioridade visual, nunca perder programas, semanas, sessões, blocos, exercícios, séries, carga, reps, RPE, descanso, tempo, supersets, notas, progressão, histórico, draft, preview ou publicação.

## Elevation & Depth

A hierarquia é construída principalmente por superfícies tonais, contraste e bordas de 1 px. Sombras ambientais discretas aparecem somente quando há necessidade real de separação ou elevação.

- **Base:** sombra ambiente suave em surfaces ou painéis que precisam se separar do fundo.
- **Raised:** sombra mais ampla para drawers, painéis flutuantes, ações fixas e superfícies realmente sobrepostas.
- **Focus:** anel de 3 px derivado do accent; é acessibilidade, não glow decorativo.
- Contraste tonal e borda vêm antes da sombra.
- Sombra comunica relação espacial real e não é decoração padrão.

Previews e templates podem conter receitas locais próprias. Elas pertencem à art direction do contexto e não devem contaminar o produto autenticado.

## Shapes

Raios atuais: 8 px em elementos internos, 10 px em controles, 14 px em superfícies operacionais, 18 px em superfícies proeminentes, 24 px em features e 999 px apenas em pills, status e avatar.

- Raio expressa escala e função, não preferência decorativa.
- Cards não recebem automaticamente o maior raio disponível.
- Pill serve a status curto, contador ou filtro compacto; não transforma todo texto em badge.
- Classes `matrix-*`, `trainer-*`, `builder-*` e `saas-*` ainda carregam anatomias locais legadas.
- `--pp-radius-*` é o contrato canônico para extensões, sem reescrever automaticamente telas protegidas.

## Components

Componentes são precisos e contidos. Layouts abertos, linhas, divisores e agrupamento por espaçamento têm preferência sobre excesso de cards.

### Buttons

- Altura de 44 px, raio de 10 px, padding horizontal de 17 px e ícone de 16 px.
- **Primary:** accent forte e texto de contraste; uma ação principal por contexto.
- **Secondary:** superfície base, borda semântica e texto primário.
- **Ghost:** transparente e discreto; ainda localizado em CSS de domínio.
- **Danger:** reservado a ação destrutiva real; ainda não totalmente centralizado.
- Hover e active usam pequenas mudanças de tom/borda e movimento máximo de 1 px.
- IconButton mede 44 × 44 px e exige label acessível.

### Status, cards e listas

- `StatusBadge` possui tones accent, success, warning, danger, info e neutral.
- Status é curto e factual; não é decoração nem substituto de explicação.
- `Surface` oferece base, raised, subtle e densidade compacta.
- `MetricCard` combina ícone semântico, label, valor dominante e descrição verdadeira.
- `DataList`, rows e dividers são preferíveis a sequências de cards independentes.
- Cards aninhados, arredondados e sombreados constituem anti-pattern.

### Forms

- `FormField` combina label visível, controle, hint opcional e feedback.
- Inputs, selects e textareas têm no mínimo 44 px, superfície subtle, borda semântica e raio de 10 px.
- Placeholder não substitui label.
- Focus, readonly, disabled, error e success permanecem distinguíveis.

### Navigation

- Trainer desktop: sidebar fixa com grupos semânticos e estado ativo por fundo soft + accent.
- Trainer mobile: header compacto, destinos operacionais e “Mais”.
- Student: navegação inferior app-like; execução de treino pode removê-la para preservar foco.
- Tabs e `SegmentedNavigation` servem a poucas visões mutuamente exclusivas e incluem estado acessível.

### Identity, feedback e loading

- `PersonAvatar` usa imagem real aprovada antes de avatar humano neutro. Iniciais ou stock faces não personificam pessoas reais.
- `EmptyState` diferencia vazio, indisponível e bloqueio de permissão.
- `FeedbackMessage` usa `status` para atualização não crítica e `alert` para erro/destruição.
- `LoadingSkeleton` aproxima a geometria final para evitar layout shift.

### Motion

Movimento é suave, direto, funcional e reduzível. Ele explica hierarquia, continuidade ou mudança de estado. Skeletons, reveals e interações respeitam `prefers-reduced-motion`.

Princípio: **Alive, not animated.**

### Primitivos canônicos e inconsistências

- `PPerfilPrimitives.tsx`, `PPerfilOperational.tsx` e `PersonAvatar.tsx` formam a base reutilizável.
- Workout Builder/Review e Student Workout possuem componentes próprios e são referências protegidas.
- Ghost e Danger não estão totalmente centralizados.
- Classes `pp-button`, `matrix-message`, `builder-*` e receitas antigas coexistem.
- Dashboard possui tokens locais `--ppv3-*`.
- Esses fatos devem ser registrados, não propagados como novas APIs nem corrigidos sem migração autorizada.

## Do's and Don'ts

### Do

- Usar `--pp-color-*`, `--pp-type-*`, `--pp-space-*` e `--pp-radius-*` como contrato semântico.
- Preservar composição entre Light e Dark, alterando apenas tokens dependentes do tema.
- Priorizar CTA principal, estado atual e próxima ação.
- Preferir layouts abertos, rows, divisores e espaçamento antes de criar outra surface.
- Usar cores semânticas apenas quando o estado factual correspondente existir.
- Manter touch targets de pelo menos 44 × 44 px, focus visible, safe-area e reduced motion.
- Adaptar hierarquia para mobile e manter fluxos essenciais utilizáveis.
- Preservar a profundidade do Workout Builder ao simplificar sua percepção.
- Manter Trainer e Student como experiências irmãs, não layouts idênticos.
- Respeitar a art direction de cada template público.

### Don't

- Não criar aparência de dashboard SaaS genérico.
- Não usar excesso de cards aninhados, arredondados ou sombreados.
- Não repetir explanatory copy em headers, painéis, hints e empty states.
- Não usar estética gamer, neon excessivo, gradients aleatórios ou glassmorphism pesado.
- Não tratar o accent legado violeta ou `--pp-purple-*` como decisão visual definitiva.
- Não distribuir Saúde, Performance e Energia como decoração de cards.
- Não usar iniciais ou stock photography para personificar usuários ou autores de depoimentos.
- Não transformar status, metadata ou indisponibilidade em pills decorativas.
- Não comprimir desktop no mobile, esconder ação essencial em hover ou gerar overflow horizontal.
- Não forçar Student Workout para dentro da gramática do Dashboard Trainer.
- Não simplificar Workout Builder removendo capacidade ou contexto prescritivo.
- Não propagar aliases e classes legadas como padrão para novas telas.

## Gate visual canônico

Todo sprint visual futuro deve começar lendo `docs/design/approvals/GATE_1B.json`.

- `APPROVED`: as quatro decisões registradas são a especificação canônica; não pedir repetição, reinterpretar ou alterar silenciosamente.
- Arquivo ausente ou status `REOPENED`: interromper antes de qualquer migração visual para telas de produção.
- Aprovação com `labVersion` ou `labFingerprint` divergente: informar `APPROVED — REVIEW RECOMMENDED` antes de uma migração material; a divergência não revoga automaticamente a decisão humana.
- O artefato não contém identidade, conta, e-mail, IP ou qualquer PII.
