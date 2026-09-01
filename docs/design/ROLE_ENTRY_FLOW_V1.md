# PPerfil — Role & Entry Flow V1

Baseline: `32c59f07bf5b357c80611deeb3486fc253b0f77b`

## Vocabulário obrigatório

| Camada | Valores | Regra |
| --- | --- | --- |
| Papel persistido | `trainer`, `student` | Só existe quando a identidade/relacionamento factual autoriza |
| Nome de domínio | Trainer, Student, trainer-student relationship | Usado em código, RLS, RPC e repositório |
| Rótulo apresentado | Personal Trainer, Aluno | Linguagem do produto em pt-BR |
| Contexto de entrada | Personal, Aluno | Preferência de destino; **nunca concede papel** |

Uma mesma identidade pode ter os dois papéis. Nesse caso, o usuário pode escolher o contexto permitido. A escolha não duplica perfil nem relacionamento.

## Fluxo autoritativo

```mermaid
flowchart TD
  A[Entrada /login ou /signup] --> B{Sessão válida?}
  B -- não --> C[Senha + OTP ou Google]
  C --> D[Callback / confirmação]
  B -- sim --> E[Resolver estado factual]
  D --> E
  E --> F{next interno seguro?}
  F -- convite --> G[Validar token, status e e-mail]
  G -- válido e correspondente --> H[Aceitar convite idempotente]
  H --> I[Relacionamento student ativo]
  I --> J[/student/today]
  G -- inválido ou divergente --> K[Erro factual; nenhum relacionamento]
  F -- outro/ausente --> L{Papéis e onboarding}
  L -- trainer sem onboarding --> M[/onboarding]
  L -- trainer ativo --> N[/dashboard]
  L -- student ativo --> J
  L -- ambos --> O[Usar contexto permitido]
  L -- student sem convite --> P[/access/student]
```

## Regras de entrada

1. `/` redireciona para `/login`.
2. `next` só é aceito quando for caminho interno seguro. URL absoluta, protocolo relativo, barra invertida ou destino malformado devem ser descartados.
3. Google fornece e-mail verificado pelo provedor e não exige OTP adicional do app.
4. Senha exige confirmação por OTP conforme Auth hospedado; após sucesso, a sessão é resolvida sem botão redundante.
5. Novo Personal autenticado e sem perfil/onboarding concluído vai para `/onboarding`.
6. Personal existente vai para `/dashboard`.
7. Aluno com convite aceito/relação ativa vai para `/student/today`.
8. Aluno sem convite não recebe papel; vê estado de convite necessário e opção de waitlist.

## Convite de Aluno

```mermaid
sequenceDiagram
  participant T as Personal
  participant P as PPerfil
  participant A as Supabase Auth
  participant S as Aluno

  T->>P: Criar convite para e-mail
  P-->>S: Link /invite/[token]
  S->>P: Abrir link
  P->>P: Preservar next do convite
  S->>A: Entrar/cadastrar por Google ou senha+OTP
  A-->>P: Sessão + e-mail verificado
  P->>P: Comparar e-mail, token, status e owner
  alt correspondente e pendente
    P->>P: Aceitar idempotentemente
    P-->>S: /student/today
  else divergente/inválido/revogado/expirado
    P-->>S: Erro factual; nenhuma relação criada
  end
```

- O Personal só cancela convite pendente próprio.
- Cancelamento preserva histórico (`revoked`) e invalida o token.
- Convite aceito não pode ser revogado para apagar relacionamento.
- Um novo convite para o mesmo e-mail gera token novo depois da revogação.
- Mensagens de erro não revelam e-mail do destinatário a terceiros.

## Matriz de destino

| Estado factual | Contexto pedido | Destino |
| --- | --- | --- |
| Sem sessão | qualquer | `/login` ou `/signup`, preservando `next` seguro |
| Trainer, onboarding incompleto | Personal | `/onboarding` |
| Trainer, onboarding completo | Personal | `/dashboard` |
| Student com relação ativa | Aluno | `/student/today` |
| Student sem convite/relação | Aluno | `/access/student` |
| Trainer + Student | Personal | `/dashboard` |
| Trainer + Student | Aluno | `/student/today` |
| Apenas Student | Personal | Não concede Trainer; resolver para estado permitido |
| Apenas Trainer | Aluno | Não concede Student; estado de convite necessário |
| Convite válido + e-mail correspondente | Aluno | Aceitar e `/student/today` |
| Convite + e-mail divergente | Aluno | Erro seguro; sem relação |

## Evidência

| Conclusão | Categoria | Fonte | Confiança |
| --- | --- | --- | --- |
| Há somente dois papéis persistidos | PRODUCT | tipos de identidade, migrations e `PRODUCT.md` | HIGH |
| Contexto não concede papel | PRODUCT | `src/lib/navigation/authenticated-home.ts`, testes de Auth | HIGH |
| Convite depende de e-mail correspondente | PRODUCT | fluxo de convite, RPCs e testes de segurança | HIGH |
| Google não precisa de OTP do app | STANDARD/PRODUCT | contrato OAuth + callback implementado | HIGH |
| Multi-role é suportado | PRODUCT | resolvedor de home autenticada | HIGH |

## Estados obrigatórios de UI

- Carregando sessão/convite sem revelar conteúdo protegido.
- Confirmação necessária com recuperação clara.
- OTP inválido, expirado e rate-limited em linguagem factual.
- Convite inválido, expirado, revogado, já aceito e e-mail divergente.
- Usuário sem papel/contexto solicitado.
- Erro recuperável com “voltar/sair” seguro.

Nenhum estado visual pode antecipar a concessão de papel antes da resposta autoritativa.
