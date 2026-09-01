# PPerfil — Design System Candidates V1

Status: **exploração controlada; nenhuma opção aprovada**

North Star: **Performance Serena**

## Fundação que não está em votação

- Light-first, com tradução Dark em grafite.
- Premium pela precisão, humana, operacional, fitness e contida.
- Manrope para títulos; Inter para interface e corpo.
- Hierarquia principalmente por superfície tonal, contraste, borda e espaço.
- Sombra ambiental discreta apenas quando separação real exigir.
- Layout aberto, linhas e divisores antes de grids de cards.
- Ícones Lucide em traço consistente; ícone não substitui texto ambíguo.
- 44 × 44 px como alvo prático adotado pelo produto.
- Accent legado atual: violeta `#7c5cf3`, com tokens `--pp-purple-*`. É legado de implementação, não decisão definitiva de “Azul PPerfil”.
- Sem heavy glassmorphism, neon excessivo, gamer UI ou aparência genérica de dashboard SaaS.
- FIT APP é rótulo temporário exclusivo do laboratório; PPerfil continua sendo o produto auditado.

## Princípio do comparativo

Cada trio A/B/C no Decision Lab mantém conteúdo, contexto e dimensões. Somente a variável declarada muda. Isso evita comparar “telas completas” com densidade, copy ou informação diferentes.

## VF-01 — Canvas e superfícies

| Opção | Variável | Definição | Risco |
| --- | --- | --- | --- |
| A — Linha | Separação por bordas lineares mais visíveis | Canvas neutro, uma superfície, divisores precisos | Pode parecer excessivamente técnico em áreas consumer |
| B — Tonal | Separação por pequenos degraus tonais | Canvas claro/grafite, superfícies tonais, borda baixa | Exige contraste calibrado em ambos os temas |
| C — Elevada | Separação por sombra ambiental discreta | Mesma anatomia, elevação perceptível em superfície focal | Pode reintroduzir sensação de card se propagada demais |

**Recomendação:** B — Tonal. Melhor continuidade com Performance Serena e menor risco de caixa sobre caixa.

**Status:** `RECOMMENDED — AWAITING PRODUCT OWNER`.

## VF-02 — CTA primário

| Opção | Variável | Definição | Risco |
| --- | --- | --- | --- |
| A — Sólido contido | Preenchimento neutro escuro/claro | Alta legibilidade, pouca assinatura de marca | Pode ser genérico |
| B — Accent preciso | Accent legado em área controlada | Um CTA dominante, sem espalhar cor | Accent futuro ainda está em aberto |
| C — Contraste editorial | Texto/ícone sobre superfície com borda forte | Visual leve e refinado | Pode perder saliência em fluxo crítico |

**Recomendação:** B — Accent preciso, enquanto o token legado for o accent implementado.

**Status:** `RECOMMENDED — AWAITING PRODUCT OWNER`.

## VF-03 — Campo de formulário

| Opção | Variável | Definição | Risco |
| --- | --- | --- | --- |
| A — Contorno | Caixa completa, label externa | Familiar e previsível | Sequências longas podem ficar pesadas |
| B — Superfície | Fundo tonal, borda baixa, label persistente | Melhor agrupamento sem excesso de contorno | Precisa de focus ring inequívoco |
| C — Linha aberta | Somente divisor inferior e label | Leve e editorial | Menor robustez para erro/disabled/autofill |

**Recomendação:** B — Superfície. Mantém label, erro e estados previsíveis com menor densidade visual.

**Status:** `RECOMMENDED — AWAITING PRODUCT OWNER`.

## VF-04 — Personalidade de movimento

| Opção | Variável | Definição | Uso | Risco |
| --- | --- | --- | --- | --- |
| A — Quiet | Curva suave, sem overshoot | Form, feedback, navegação operacional | Pode parecer seca em momentos de conquista |
| B — Spatial | Curva de desaceleração mais marcada | Disclosure e bottom sheet | Deve preservar foco e continuidade |
| C — Expressive | Curva de ênfase sem bounce | Sucesso raro e intencional | Não usar em operação repetitiva |

**Recomendação:** A — Quiet como default; B/C somente por contexto explícito.

**Status:** `RECOMMENDED — AWAITING PRODUCT OWNER`.

No comparativo do Lab, duração, distância e conteúdo são idênticos; apenas a curva muda. Faixas de duração por contexto só serão definidas depois da decisão humana.

`prefers-reduced-motion: reduce` elimina deslocamento e duração não essencial, preservando estado final, foco, anúncio e compreensão.

## Anatomia candidata compartilhada

| Primitivo | Anatomia estável |
| --- | --- |
| Ação | label clara, ícone opcional, estado disabled/loading, foco visível, alvo 44 px |
| Campo | label persistente, controle, helper opcional, erro associado, success/disabled |
| Linha operacional | status/ícone, título, contexto, ação; divisor em vez de card por item |
| Feedback | semântica + texto; cor e ícone são redundantes, nunca exclusivos |
| Navegação | destino ativo, label, foco; desktop lateral e mobile compacta conforme prioridade |
| Disclosure | summary claro, estado expandido programático, conteúdo preservado |
| Bottom sheet | dialog modal, título, fechamento explícito, foco contido, conteúdo sem truncar |

## Tradução Light/Dark

Light e Dark compartilham anatomia, ordem, tamanho e semântica. Mudam somente tokens de canvas, superfície, texto, borda, sombra e contraste de ícone. Dark usa grafite; não usa preto absoluto em todas as camadas nem converte accent em neon.

## Mobile

- 320, 360, 390 e 430 px são larguras primárias de decisão.
- Navegação e linhas mudam de composição, não apenas empilham desktop.
- Tabelas densas viram linhas/inspector ou scroll interno explícito sem overflow do documento.
- Bottom sheet respeita viewport reduzida e teclado aberto.
- Copy longa pt-BR, zoom 200% e labels não podem romper ação primária.

## Relação com primitives atuais

O laboratório reutiliza princípios de `PPerfilPrimitives`, `PPerfilOperational` e `PersonAvatar`, mas não importa nem altera seus estilos de produção. A implementação é CSS Module isolado para impedir que um candidato em decisão vire padrão global por acidente.
