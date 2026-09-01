# PPerfil — Decision Log V1

Baseline: `32c59f07bf5b357c80611deeb3486fc253b0f77b`

Gate atual: **Decision Gate 1**

## Regra de governança

- Recomendação não é aprovação.
- Toda decisão deve registrar autoridade (`STANDARD`, `BENCHMARK`, `PRODUCT`, `BRAND`), fonte, data e confiança.
- Uma decisão visual não pode mudar papel, permissão, dado, fluxo ou capacidade.
- Opções não escolhidas permanecem no histórico; não são apagadas.
- O Product Owner aprova explicitamente antes de qualquer migração para produção.

## Gate 1

| ID | Decisão | Opções | Recomendação | Evidência | Status |
| --- | --- | --- | --- | --- | --- |
| `VF-01` | Canvas e superfícies | A Linha / B Tonal / C Elevada | **B Tonal** | BRAND: Performance Serena e hierarquia por tom/borda; STANDARD: contraste permanece mensurável | `RECOMMENDED — AWAITING PRODUCT OWNER` |
| `VF-02` | CTA primário | A Sólido / B Accent preciso / C Contraste editorial | **B Accent preciso** | BRAND: cor como sinal contido; PRODUCT: uma ação principal por contexto | `RECOMMENDED — AWAITING PRODUCT OWNER` |
| `VF-03` | Campo de formulário | A Contorno / B Superfície / C Linha aberta | **B Superfície** | STANDARD: label/erro/focus robustos; BRAND: menos caixas pesadas | `RECOMMENDED — AWAITING PRODUCT OWNER` |
| `VF-04` | Personalidade de movimento | A Quiet / B Spatial / C Expressive | **A Quiet** como padrão | BRAND: “Alive, not animated”; STANDARD: reduced motion e continuidade | `RECOMMENDED — AWAITING PRODUCT OWNER` |

## Fontes do Gate 1

| Tipo | Fonte | Uso | Confiança |
| --- | --- | --- | --- |
| PRODUCT | `PRODUCT.md`, contratos de domínio e rotas do baseline | Capacidade, prioridade, estados e papéis | HIGH |
| BRAND | `DESIGN.md`, `docs/PPERFIL_DESIGN_SYSTEM_V3.md` | Identidade atual, material, tipografia e anti-patterns | HIGH |
| STANDARD | WCAG 2.2, WAI Forms/Notifications, Apple HIG | Piso de interação e acessibilidade | HIGH |
| BENCHMARK | Fontes oficiais listadas em `BENCHMARK_MATRIX_V1.md` | Padrões maduros dentro dos contratos PPerfil | MEDIUM/HIGH |

## Registro de decisão do Product Owner

Preencher somente após revisão humana:

| ID | Opção aprovada | Data | Autor | Observação/condição |
| --- | --- | --- | --- | --- |
| `VF-01` | — | — | — | Aguardando |
| `VF-02` | — | — | — | Aguardando |
| `VF-03` | — | — | — | Aguardando |
| `VF-04` | — | — | — | Aguardando |

## Decisões explicitamente adiadas

- Accent canônico futuro e eventual substituição de `--pp-purple-*`.
- Marca/símbolo definitivo; FIT APP não é candidato de renome neste Gate.
- Alteração da arquitetura de navegação Trainer/Student.
- Propagação de qualquer opção a componentes de produção.
- Direção final de motion por template público.

Não há decisões automaticamente aprovadas neste Sprint.

<!-- GATE_1B:START -->
## GATE 1B

STATUS: **APPROVED**

Visual Territory: D

Primary Button: B01

Field System: F02

Iconography: I01

Approved At: 2026-09-01T20:26:19.118Z
<!-- GATE_1B:END -->

<!-- GATE_2_APP_SHELL:START -->
## GATE 2 — APP SHELL

STATUS: **APPROVED**

Trainer Mobile Navigation: G2-01A

Student Identity: G2-02A

Inherited Foundation: D / B01 / F02 / I01

Approved At: 2026-09-01T22:33:15.518Z
<!-- GATE_2_APP_SHELL:END -->
