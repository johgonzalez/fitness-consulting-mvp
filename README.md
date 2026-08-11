# MVP demonstrativo — Consultoria Fitness Online

Landing page em Next.js e TypeScript criada como demonstração replicável para Personal Trainers apresentarem uma consultoria online profissional. A persona, os dados profissionais, as imagens e os resultados desta versão são fictícios ou ilustrativos.

## Executar localmente

Requer Node.js 20.9 ou superior.

```bash
pnpm install
pnpm dev
```

Abra `http://localhost:3000`. Para validar antes de publicar, execute `pnpm lint` e `pnpm build`.

## Configurar uma nova instância

Edite `src/config/site.ts`. Nome, iniciais, descrição profissional, duração, biografia, credenciais, SEO e contatos ficam centralizados nesse arquivo. Não publique dados, registros profissionais, imagens ou depoimentos sem validação e autorização.

## Trocar imagens

Adicione arquivos otimizados em `public/images/` e atualize os componentes consumidores. Use `next/image`, dimensões estáveis e texto alternativo descritivo. Prefira WebP ou AVIF.

## Editar conteúdo

- Conteúdo recorrente: `src/data/content.ts`
- Perguntas frequentes: `src/data/faq.ts`
- Textos específicos: `src/components/sections/`
- Visual e responsividade: arquivos CSS em `src/app/`

## Resultados e depoimentos

Use somente conteúdo demonstrativo claramente identificado ou relatos e imagens reais com consentimento expresso. Não publique métricas inventadas nem faça promessas absolutas.

## Analytics

Os eventos estão tipados em `src/lib/analytics.ts` e são registrados no console em desenvolvimento. O evento customizado `site:analytics` permite integrar posteriormente uma plataforma de mensuração.

## Publicar

1. Revise dados profissionais, contatos, URL oficial e imagens.
2. Revise as páginas legais.
3. Execute lint e build.
4. Envie o repositório ao provedor de versionamento.
5. Publique a exportação estática gerada em `out/`.
