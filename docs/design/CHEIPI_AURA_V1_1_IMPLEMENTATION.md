# Cheipi Aura V1.1 — implementação local

Base aprovada: V1, commit c3d71d219de8f843f2a5e32540d262610841a76a, branch codex/personal-mobile-redesign-v1. Worktree preservada: ../cheipi-personal-mobile-redesign-v1.

Evolução: branch codex/cheipi-aura-v1-1, worktree ../cheipi-aura-v1-1. Sem push, merge ou deploy. O pacote CHEIPI_AURA_V1_1 foi extraído separadamente; os 21 hashes SHA256 conferem com CHECKSUMS.sha256.

## Mapa e limites

| Tela/camada | Componentes e decisão | Contratos preservados |
|---|---|---|
| Shell e navegação | DashboardLayout servidor, BottomNavigation, coordenador client pequeno de entrada | Auth, onboarding, grupos de rotas, histórico Next |
| Hoje | TodayHero, fotografia fixa fornecida, indicadores existentes, painel de prioridade | Ordem V1 das prioridades; fontes indisponíveis omitidas |
| Negócio e preferências | BusinessPage, ProfileEditor, ThemeToggle, telas section=profile/appearance/account | Mesmas actions, validações, cookie e preferência |
| Treinos | Índice, filtro compacto, builder e mensagens semânticas | Todos inclui APPROVED/exclui ARCHIVED; status/student/q e retorno; salvamento/versionamento |
| Alunos e avaliações | Tokens, marcadores de entrada e contexto de URL lista/detalhe/progresso | Convites, avaliações, permissões, dados e retorno preservando status/q |
| Comunidade | Gate real, feedback de resultados, regiões seguras de motion | Entitlements efetivos, membership, RLS e ações |
| Meu site | Curadoria 05/06/01, organização existente, mensagens consistentes | Demais IDs persistidos, Free/Premium, editor/preview/retorno |
| Auth/onboarding | Símbolo aprovado e regressão dos fluxos V1 | Métodos, confirmação, campos e roteamento |

## Ambiente

Origem local: http://127.0.0.1:3002. Supabase de teste: smqkpqpixnglkflhwxhr. Stripe TEST. Configuração em arquivo ignorado pelo Git, sem valores sensíveis neste documento. Produção não foi modificada.

A conta Marina é uma fixture existente com três alunos e treino rascunho/publicado. Seu acesso Pro efetivo deriva de fixture de banco, não de pagamento verificado nesta V1.1. Uma nova conta foi cadastrada e confirmada pela UI nesta rodada; o onboarding terminou com site privado, modelo 01 e convite opcional pulado. A tela Hoje apresentou contadores zerados e a primeira ação; a Comunidade apresentou o gate de acesso indisponível sem mudar permissões. Checkout Stripe não foi testado.

## Referências e riscos

01_PROMPT_CODEX_V1_1.md e 02_SPEC prevalecem visualmente; V1 mantém as regras. Mockup usado para curva, hierarquia, contraste, badges e cápsula. Arte do atleta e cinco fotos preservadas em public; apenas a foto de Hoje carrega com prioridade pelo next/image. Não existe seletor de capa nem inferência de gênero.

A infraestrutura usa Next 16.2.12, React 19.2.4, Inter/Manrope existentes. Os guias locais de navegação, Link, loading e useLinkStatus foram consultados. Link já fazia navegação client: loading/pending não deve ser confundido com reload. A entrada é delimitada pelo conteúdo final pronto; sem key global, experimental, cópia viva do formulário ou atraso artificial. O conteúdo seguro usa entrada curta de 20 px: 190 ms entre áreas, 260 ms para detalhe e 240 ms ao voltar. Filhos seguros são animados sem envolver fixed, sticky ou modais; wrappers com esses elementos são percorridos até os ramos seguros. O builder mantém fade explícito no editorCanvas. Nenhum snapshot ou cópia de formulário é criado. Reduced motion elimina a animação no helper; teste físico dessa preferência não foi realizado.

Riscos acompanhados: transform em ancestral de fixed; streaming; estado/scroll na volta; mensagens de resultado; timeout sem duplicação; foco/Escape em modais; gates legítimos; regressão de auth/aluno/site por estilos compartilhados.

## Evidência e verificação

Hoje renderizado no navegador autorizado em 390 px, claro e escuro, com 3 alunos ativos, 1 rascunho, 0 avaliações para revisar e 0 leads aguardando. Fontes retornadas pelo servidor sem warnings após execução local com acesso à rede. Dock medido em 296 × 64 px; ícones acessíveis e rota ativa confirmada. Verificações iniciais também em 320, 360, 430, 768 e 1440: document.scrollWidth igual à largura útil, sem overflow horizontal do documento. Essas capturas são calibração, não substituem o QA final.

A regressão V1.1 soma **185 testes únicos aprovados em 35 arquivos**, sem falhas ou testes ignorados. Os dez testes de motion foram reexecutados após as durações finais, sem serem contados novamente. ESLint global e dirigido passaram. O build final da sessão 72373 encerrou com exit 0, incluindo TypeScript e geração de 43 páginas. Não são resultados emprestados do baseline V1.

Os registros funcionais documentam criação manual de treino, aprovação/publicação, nova versão com séries persistidas, histórico e retorno com filtros; publicação/comentário na Comunidade persistidos após reload; cadastro real confirmado e onboarding completo. Perfil e Sites têm capturas dos temas, edição, feedback e modelos 01/05/06. O bloqueio de signup no build servido por HTTP local decorreu corretamente do requisito HTTPS de authSiteUrl; o dev server permitiu completar o fluxo sem alterar o guard.

O usuário **dispensou expressamente o vídeo**. Não há gravação apresentada nem solicitação pendente de captura. Dispositivo físico, reduced motion real, falha/timeout de rede injetado, checkout Stripe, entrega a conta real de aluno, recuperação de conta e observação do dashboard Resend não foram testados nesta rodada.

Artefatos locais ficam fora do repositório, em cheipi-aura-v1-1-qa: index.html (galeria regenerável), QA-RESULTS.md, regression-final-consolidated.json e TAPs, browser-evidence.json, workout-functional-evidence.json, community-functional-evidence.json e auth-onboarding-evidence.json. Arquivos privados e credenciais não integram as entregas.

**Pendente apenas o registro do reteste final de CSS/navegação pelo root**, inclusive overflow/nomes acessíveis da Comunidade e retorno de Alunos com busca/status. A medida de overflow deve comparar scrollWidth com clientWidth do documento.
