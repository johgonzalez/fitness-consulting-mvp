# Cheipi — atleta aprovado

Decisão do usuário em 08/09/2026: adotar exatamente o atleta apresentado na imagem, com base preta, sem regenerar ou redesenhar o corpo. A grafia adotada é **CHEIPI**, conforme o arquivo aprovado; em texto corrido, **Cheipi**. “Shape” continua sendo a origem conceitual do nome, sem uma renomeação do produto.

## Papel da marca

O corpo em movimento torna a relação com fitness explícita. As curvas abertas e a assimetria dão direção ao símbolo. Como o atleta já tem informação visual suficiente, a interface mantém fundos sólidos, tipografia legível e pouca decoração ao redor. Não adicionar halteres, circuitos, brilho ou novos detalhes anatômicos ao símbolo.

| Contexto | Aplicação |
| --- | --- |
| Cabeçalho do personal | Apenas o atleta: área de toque de 48 px, símbolo de 44 px. O link continua levando a Hoje. |
| Cabeçalho de login/onboarding | Símbolo de 52 px ao lado dos controles já existentes. O nome permanece no conteúdo/assinatura da entrada. |
| Boas-vindas | Símbolo acompanhado de Cheipi. |
| Abertura | Atleta central de 88 px, fundo preto, sem os círculos decorativos antigos. |
| Aluno | Símbolo secundário de 32 px. Avatar e nome do personal continuam sendo a identidade principal. |
| Sites dos personais | Marca do personal preservada. Créditos secundários “Powered by Cheipi” nos modelos aprovados 05 e 06; demais créditos existentes permanecem. |
| Navegador e atalho Apple | Favicon 32/48 px e ícone Apple de 180 px, derivados do mesmo atleta. Sem novo manifest ou comportamento de instalação. |

Preto é o padrão para novos visitantes sem preferência salva. Uma escolha clara/escura válida já armazenada continua respeitada. Não resetar cookies ou preferências de tema para forçar a demonstração.

## Fonte e integridade

- Original anexado: `ChatGPT Image 8 de set. de 2026, 17_04_18.png`, 1122 × 1402 px.
- SHA-256 original: `a0f65c329dba682e80f6c0c6811f4e1c2e1e58856af4360ea215624967a4e03a`.
- Recorte superior: x=100, y=231, largura=374, altura=368. A comparação dos pixels RGB do recorte com o original passou, sem diferença.
- `public/brand/cheipi/athlete-approved.png` guarda o recorte original sem recolorir, retocar, esticar ou reconstruir o atleta.
- `public/brand/cheipi/symbol.svg` incorpora esse PNG, centralizado em um canvas quadrado. O clip remove apenas o papel nos cantos externos da prancha. **É um contêiner SVG de raster, não uma vetorização redesenhada.**
- `apple-touch-icon.png` e `src/app/favicon.ico` são exports de tamanho do mesmo símbolo.

O componente `CheipiBrand` é a única fonte para a marca no app. O CSS final `cheipi-approved-brand.css` elimina a inversão e a ampliação/corte que eram aplicadas ao asset provisório. Não aplicar `invert`, distorção de proporção ou zoom que corte braços/pernas. Os ícones pequenos devem ser conferidos no dispositivo, sem alterar o desenho para compensar falta de espaço.

## Integração e revisão

Branch `codex/brand-athlete-v1`, baseada no PR #1 (`codex/personal-mobile-redesign-v1`). A separação permite revisar a marca enquanto o QA mobile prossegue. Sem alterações de banco, regras de autenticação, treino, planos ou pagamento.

Build, TypeScript e ESLint aprovados. Testes direcionados de templates, shell e autenticação e cenários do script inicial de tema são verificados na entrega. As expectativas antigas de texto do dashboard e da marca completa no cabeçalho foram atualizadas para as decisões visuais atuais.

A inspeção estática e a conferência do arquivo de marca não equivalem a QA de telas renderizadas. A revisão em navegador permanece para a sessão local autorizada do Codex: conferir header em 320/390/430 px, tema claro/escuro, splash, login, onboarding, ícones e créditos dos dois templates. Preservar a branch e as correções de QA em andamento; não publicar produção automaticamente.
