# PPerfil — Product UX Contract V1

Data da auditoria: **2026-09-01**

Baseline factual: `codex/v1-launch-staging@32c59f07bf5b357c80611deeb3486fc253b0f77b`

## Autoridade e escopo

Este contrato descreve o produto que existe no baseline. `PRODUCT.md` determina intenção e regra de produto; código, migrations e testes determinam capacidade implementada; `DESIGN.md` determina a identidade visual vigente. O documento não autoriza feature, mudança de fluxo ou redesign.

Papéis persistidos são somente `trainer` e `student`. Os nomes apresentados são **Personal Trainer** e **Aluno**. Escolher “Personal” ou “Aluno” na entrada é contexto de navegação; não concede papel, não cria relacionamento e não substitui autorização factual.

## Escala de suporte

- `SUPPORTED`: fluxo e fonte factual identificados no baseline.
- `PARTIAL`: existe, mas algum estado, fechamento ou ambiente ainda é limitado.
- `NOT_SUPPORTED`: não existe e não deve ser simulado como disponível.
- `LEGACY`: preservado para compatibilidade, demonstração ou laboratório anterior.
- `UNKNOWN`: não pôde ser provado por evidência disponível.

## Superfícies públicas, Auth e ativação

| Rota | Público/papel | Fonte factual | Estados e ações existentes | Responsividade e acessibilidade | Suporte |
| --- | --- | --- | --- | --- | --- |
| `/` | Público | Regra de rota | Redireciona para `/login`; não depende de perfil demo | Sem superfície própria | `SUPPORTED` |
| `/login` | Público, usuário não autenticado | Supabase Auth + resolvedor de estado | Senha, Google, escolha de contexto, `next` interno seguro, erros factuais | Shell responsivo, labels persistentes, foco de teclado | `SUPPORTED` |
| `/signup` | Público, usuário não autenticado | Supabase Auth | Criação por senha/Google, OTP, retomada por `next`, saída segura | Fluxo responsivo; estados OTP, erro, reenvio e espera | `SUPPORTED` |
| `/auth/callback` | Callback OAuth | Supabase Auth + `resolveAuthenticatedHome` | Troca code por sessão, restaura contexto/convite, rejeita destino inseguro | Sem UI persistente | `SUPPORTED` |
| `/auth/confirm` | Callback OTP/link | Supabase Auth | Verifica token e preserva continuação interna | Sem UI persistente | `SUPPORTED` |
| `/auth/confirm/result` | Usuário pós-confirmação | Query factual da confirmação | Sucesso, erro, continuar/voltar | Estado textual e ações explícitas | `SUPPORTED` |
| `/invite/[token]` | Convidado/Aluno | Convite e identidade via repositório/RPC | Pendente, inválido, expirado, revogado, aceito; login/signup; aceitar somente com e-mail correspondente | Mobile-first; ação principal e mensagens factuais | `SUPPORTED` |
| `/access/student` | Usuário sem acesso de Aluno | Identidade/convite/waitlist | Estado “convite necessário”, entrada em lista de espera | Uma decisão principal; sem papel concedido | `SUPPORTED` |
| `/onboarding` | Personal autenticado sem ativação concluída | Draft persistido, perfil, conteúdo do site e estado de acesso | Retomada idempotente; foto, especialidade, serviço, social, template, preview; no baseline atual, Founder Access ou waitlist antecedem publicação; primeiro Aluno após publicar | Premium Consumer responsivo; etapas factuais persistidas | `PARTIAL` — o trial Stripe aprovado em `PRODUCT.md` ainda não é o gate primário entregue |
| `/p/[slug]` | Público | Projeção pública segura do site | Essential/Motion/Conversion; indisponível quando entitlement/publicação não permite | Desktop/mobile e conteúdo público somente | `SUPPORTED` |
| `/site-preview` | Personal/preview | Conteúdo em edição, sem publicar | Preview visual antes de publicação | Responsivo; não equivale a site público | `SUPPORTED` |
| `/encontre-seu-personal` | Público | Conteúdo público disponível | Descoberta de Personal quando factual | Superfície pública responsiva | `PARTIAL` |
| `/terms`, `/privacy` | Público | Conteúdo estático versionado | Leitura | Sem mutações | `SUPPORTED` |
| `/template-lab` | Desenvolvimento/demonstração histórica | Fixtures/variantes locais | Revisão de templates | Não é contrato do produto final | `LEGACY` |
| `/demo`, `/demo/exit` | Desenvolvimento | Adapter de fixtures protegido por ambiente | Entrar/sair de workspace demo | Proibido em produção | `LEGACY` |

## Portal do Personal Trainer

| Rota | Fonte factual | Estados e ações existentes | Responsividade/acessibilidade | Suporte |
| --- | --- | --- | --- | --- |
| `/dashboard` | Agregados reais de alunos, leads, avaliações, treinos e site | Prioridades, resumo operacional, Meu Site e ações rápidas; estados vazios/indisponíveis verdadeiros | Desktop completo; mobile prioriza ação em vez de empilhar tudo | `SUPPORTED` |
| `/dashboard/leads` | Leads do tenant via repositório Supabase | Lista, filtros/estados, criar/acompanhar; sem dados cross-tenant | Linhas refluem no mobile | `SUPPORTED` |
| `/dashboard/leads/[id]` | Lead do Personal autenticado | Detalhe, atualização de estado e conversão quando permitida | Ações preservam hierarquia móvel | `SUPPORTED` |
| `/dashboard/students` | Relações e convites do Personal | Listar, convidar, cancelar convite pendente, re-convidar | Lista e ações móveis; confirmação para revogar | `SUPPORTED` |
| `/dashboard/students/[id]` | Relação ativa + dados autorizados | Contexto do Aluno, treino, avaliações, vínculo e navegação para progresso | Progressive disclosure; ações do Personal | `SUPPORTED` |
| `/dashboard/students/[id]/progress` | Medições, fotos, atividade, avaliações e progressão autorizadas | Ver dados factuais do Aluno; sem interpretação médica | Gráficos/listas responsivos e mídia privada | `SUPPORTED` |
| `/dashboard/assessments` | Repositório de avaliações do tenant | Lista por lifecycle; loading/error/vazio | Lista/tabela refluível | `SUPPORTED` |
| `/dashboard/assessments/new` | Templates versionados + relação ativa | Criar DRAFT e configurar envio | Wizard responsivo e labels | `SUPPORTED` |
| `/dashboard/assessments/[id]` | Avaliação, template e respostas autorizadas | Editar metadados em DRAFT; enviar; revisar; concluir; histórico/auditoria | Ações dependem de status; estados não ficam só na cor | `SUPPORTED` |
| `/dashboard/workouts` | Treinos/programas do Personal | Listar DRAFT/PUBLISHED/ARCHIVED, abrir e criar | Estados de carregamento, erro e vazio | `SUPPORTED` |
| `/dashboard/workouts/new` | Catálogo, relação, Workout AI provider e builder canônico | Selecionar Aluno; criar manual/IA; editar programas, semanas, sessões, blocos, exercícios, séries, carga, reps, RPE, descanso, tempo, supersets, notas; preview/publicar explícito | Superfície densa preservada; mobile funcional com progressive disclosure | `SUPPORTED` |
| `/dashboard/workouts/[id]` | Treino versionado e autorização do tenant | Editar DRAFT, histórico, preview, publicar; leitura de publicado | Estados de rota, loading e not-found | `SUPPORTED` |
| `/dashboard/site` | Perfil, seções, serviços, mídia e status de publicação | Conteúdo, aparência, organizar página, serviços, preview, publicar quando entitlement permite | Desktop com preview; mobile mantém edição, recomendando espaço maior sem bloquear | `SUPPORTED` |
| `/dashboard/preview` | Conteúdo do site em edição | Preview autenticado | Responsivo | `SUPPORTED` |
| `/dashboard/profile` | Perfil do Personal | Editar identidade profissional permitida | Formulário responsivo | `SUPPORTED` |
| `/dashboard/settings/billing` | Estado autoritativo de Billing/Stripe | Ver plano, trial, restrições e ativar/gerir assinatura | Mensagens factuais; não simula sucesso | `SUPPORTED` |

## Portal do Aluno

| Rota | Fonte factual | Estados e ações existentes | Responsividade/acessibilidade | Suporte |
| --- | --- | --- | --- | --- |
| `/student/today` | Relação ativa, próximo treino e pendências autorizadas | Próximo treino como ação principal; frequência recente; avaliação/check-in apenas quando acionável | Mobile-first; baixa carga cognitiva | `SUPPORTED` |
| `/student/workouts` | Treinos publicados para o Aluno | Lista e histórico disponível | Mobile-first | `SUPPORTED` |
| `/student/workouts/[id]` | Prescrição publicada autorizada | Ver sessão, exercícios, mídia e metas; iniciar execução | Não permite editar prescrição | `SUPPORTED` |
| `/student/workouts/[id]/execute` | Prescrição imutável + execução do Aluno | Série atual, actuals opcionais, RPE/nota, timers, descanso +15s/pular, pausa/retomada, conclusão, recuperação offline | Mobile-first; estados grandes e acionáveis | `SUPPORTED` |
| `/student/progress` | Execuções, frequência, progressão, medições, fotos e avaliações do próprio Aluno | Consultar fatos e enviar foto privada quando entitlement permite | Mobile-first; sem score inventado ou diagnóstico | `SUPPORTED` |
| `/student/assessments/[id]` | Avaliação enviada ao Aluno | Responder, retomar, enviar; loading/error | Form semântico e responsivo | `SUPPORTED` |
| `/student/profile` | Identidade do usuário | Consultar/editar dados permitidos | Mobile-first | `SUPPORTED` |

## Endpoints e mutações HTTP

| Endpoint | Método/autoridade | Contrato | Suporte |
| --- | --- | --- | --- |
| `/api/analytics` | API interna/pública controlada | Registra evento permitido sem expor PII arbitrária | `SUPPORTED` |
| `/api/student/progress/photos` | Aluno autenticado | Upload validado para bucket privado; autorização server-side | `SUPPORTED` |
| `/api/billing/stripe/checkout` | Personal autenticado | Cria checkout TEST/ambiente configurado; retorno deriva de URL segura | `SUPPORTED` |
| `/api/billing/stripe/webhook` | Stripe assinado | Normaliza evento, aplica reconciliação autoritativa e idempotente | `SUPPORTED` |
| `/go/whatsapp/[slug]` | Público | Redireciona com contexto público e registra conversão permitida | `SUPPORTED` |

As demais mutações são Server Actions/RPCs por domínio. Nenhuma UI deve inferir sucesso antes da confirmação do repositório/servidor.

## Contratos transversais

### Autorização e estado

- `trainer` e `student` podem coexistir na mesma identidade. O contexto escolhido resolve destino, mas não cria papel.
- `/dashboard/**` exige capacidade de Personal; `/student/**` exige relacionamento/papel de Aluno.
- Convite exige token válido, status pendente e e-mail autenticado correspondente.
- Redirecionamento `next` aceita somente caminho interno seguro.
- Prescrição e execução são entidades distintas. O Aluno registra `actuals`; não reescreve a prescrição.

### Billing e continuidade

- Estados: `FREE`, `ACTIVE`, `GRACE`, `SUSPENDED`; produtos: `FREE`, `PRO`.
- Entitlements pagos governam publicar site, receber leads, gerir Alunos/avaliações/treinos e executar fluxos pagos.
- No baseline atual, o onboarding apresenta Founder Access e waitlist como gate factual; ele não inicia Checkout. O trial Stripe de sete dias descrito em `PRODUCT.md` é regra aprovada ainda não entregue como fluxo primário e, portanto, é `PARTIAL`.
- Fim do trial não apaga dados nem intenção de publicação. O site fica indisponível por entitlement e pode ser reativado.
- Continuidade limitada do Aluno preserva acesso factual autorizado conforme o resolver vigente; não deve ser ampliada pela camada visual.

### Conteúdo e evidência

- Loading, vazio, erro, sucesso e indisponível devem ser distintos.
- Não fabricar métricas, score de saúde, “aluno real”, pagamento ou resultado.
- Mídia stock não pode personificar Personal, Aluno, depoimento ou antes/depois real.
- Ações irreversíveis ou destrutivas exigem confirmação proporcional.

## Auditoria de backend no baseline

| Área | Evidência | Resultado | Limite |
| --- | --- | --- | --- |
| Migrations | CLI vinculada | 42 locais = 42 remotas | Não prova drift manual fora do histórico |
| Tabelas | Leitura estática das migrations | 47 tabelas `public`; RLS versionado para todas | Catálogo runtime completo indisponível |
| Policies | Leitura estática | 80 nomes de policy em `public`/Storage | Owners e grants atuais não foram lidos do catálogo |
| Functions/RPCs | Leitura estática | 156 funções; 152 definições `SECURITY DEFINER` detectadas com `search_path` vazio/fixo | Resultado é do repositório, não dump hospedado |
| Triggers/views | Leitura estática | 48 nomes de trigger; nenhuma view/materialized view criada nas migrations | Estado runtime e dependências atuais não foram enumerados |
| Grants/owners | Migrations + limite da ferramenta | Convenções versionadas foram lidas | Grants efetivos e owners atuais são `UNKNOWN` sem catálogo hospedado |
| Storage | Migrations | Bucket público de mídia do Personal; bucket privado de progresso do Aluno | Configuração hospedada atual não foi enumerada |
| Auth | Código e config local | Fluxos OTP, Google, convite, callback e state resolver presentes | Provedores/configuração SMTP hospedados são `UNKNOWN` nesta auditoria |
| Billing | Código, routes e migrations | Fundação Stripe, reconciliação autoritativa e entitlements; Checkout não é o gate primário do onboarding atual | Trial/publicação do fluxo aprovado continuam `PARTIAL`; saúde externa exige QA hospedado separado |

## Integridade de implementação

| Dimensão | Avaliação estática | Evidência/risco |
| --- | --- | --- |
| Consistência visual | **6/10** | Primitives V2/V3 existem, porém convivem com CSS legado e superfícies específicas por domínio |
| Manutenibilidade | **7/10** | Repositórios e domínios são explícitos; grande volume de CSS de transição aumenta custo |
| Acessibilidade | **7/10** | Labels, focus e mobile foram trabalhados; tamanhos tipográficos pequenos e estados antigos exigem revisão renderizada |
| Responsividade | **7/10** | Portais Trainer/Student têm adaptações próprias; superfícies densas exigem regressão contínua em 320–768 px |
| Segurança arquitetural | **8/10** | RLS/RPCs e isolamento são extensos e testados; catálogo hospedado completo não foi legível nesta passada |

Prioridades documentais, sem correção de produção neste Sprint:

1. Consolidar a verdade de tokens/primitives antes de propagar qualquer direção visual.
2. Reduzir CSS legado e decisões isoladas somente em migrações futuras aprovadas.
3. Medir contraste, zoom, foco e touch targets no produto real por rota; o Decision Lab não substitui esse gate.
4. Obter leitura read-only do catálogo hospedado para fechar owner/grants/Auth/Storage atualmente `UNKNOWN`.

## Fora do escopo deste contrato

Chat em tempo real completo, diagnóstico médico, score clínico, cobrança inventada, automação autônoma de treino e publicação automática de rascunho IA são `NOT_SUPPORTED` salvo futura decisão e implementação explícita.
