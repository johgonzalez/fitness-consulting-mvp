# MVP replicável — Consultoria Fitness Online

Landing page V1 em Next.js, TypeScript e Tailwind CSS, criada como base replicável para profissionais de fitness gerarem contatos qualificados pelo WhatsApp. A instância inicial está configurada para Thiago Tavares.

## Executar localmente

Requer Node.js 20.9 ou superior.

```bash
pnpm install
pnpm dev
```

Abra `http://localhost:3000`. Para validar antes de publicar: `pnpm lint` e `pnpm build`.

## Configurar contatos

Edite `src/config/site.ts`. Nome, iniciais, descrição profissional, duração, biografia, credenciais, SEO e contatos ficam centralizados nesse arquivo. O WhatsApp deve conter código do país e DDD, somente números, por exemplo `5511999999999`. Enquanto estiver vazio, os CTAs levam à seção final sem causar erro.

## Trocar as fotos

Adicione arquivos otimizados em `public/images/` e substitua os placeholders em `HeroSection.tsx` e `AboutSection.tsx`. Use `next/image`, dimensões explícitas e texto alternativo descritivo. Prefira WebP ou AVIF.

## Editar conteúdo

- Conteúdo recorrente: `src/data/content.ts`
- Perguntas frequentes: `src/data/faq.ts`
- Textos específicos: `src/components/sections/`
- Visual e responsividade: arquivos CSS em `src/app/`

## Adicionar depoimentos

Substitua os placeholders em `TestimonialsSection.tsx` apenas por relatos reais e autorizados. Para fotos de antes e depois, registre consentimento expresso do aluno.

## Analytics

Os eventos estão tipados em `src/lib/analytics.ts` e são registrados no console em desenvolvimento. O evento customizado `site:analytics` permite integrar posteriormente GA, GTM, Meta Pixel ou TikTok Pixel.

## Publicar

1. Preencha contatos, URL oficial, dados profissionais e fotos.
2. Revise os textos provisórios das páginas legais.
3. Execute lint e build.
4. Envie o repositório ao GitHub.
5. Importe o projeto na Vercel ou em outro provedor compatível com Next.js.

Certificações, registro profissional, métricas e depoimentos permanecem como campos a confirmar para evitar informação inventada.
