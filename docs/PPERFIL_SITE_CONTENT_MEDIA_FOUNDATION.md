# PPerfil Site Content and Media Foundation

## Scope

This foundation adds curated headline suggestions, a centralized development media catalog, and semantic media slots for public templates. It does not add database columns, migrations, RLS changes, upload behavior, AI generation, or new business workflows.

## Headline assistant

The presentation editor offers six curated starting points and keeps the final field fully editable. The selected suggestion is copied into the same `headline` form field already handled by the existing server action.

- Suggestions: `src/data/site/headline-suggestions.ts`
- Interactive editor: `src/components/dashboard/HeadlineAssistant.tsx`
- Future-ready contract: `FutureHeadlineGenerationRequest`

No AI request is made. `FUTURE_AI_GENERATED` is a source type only.

## Media sources and catalog

Supported source types:

- `TRAINER_UPLOAD`
- `PPERFIL_LIBRARY`
- `FUTURE_AI_GENERATED`

The development catalog lives in one place: `src/data/media/development-media-registry.ts`. Templates do not contain catalog URLs.

Every catalog asset records:

- source and stable asset ID;
- semantic categories and supported slots;
- representation (`WOMAN`, `MAN`, `MIXED`, or `NEUTRAL`);
- identity-use restriction;
- provider, source/license fields, creator credit, and review status.

All current catalog entries are `DEVELOPMENT_ONLY`. The resolver refuses to use them when `NODE_ENV=production`. A production catalog entry must be reviewed and explicitly marked `PRODUCTION_APPROVED`, with complete source and license metadata, before it can be used.

The side-by-side prototype files under `public/images/resultado-ia-*` are deliberately excluded from the catalog. They must not be used as real student proof or before/after material.

## Semantic slots

Public templates consume these slots:

- `profile`
- `hero`
- `about`
- `coaching`
- `movement_primary`
- `movement_secondary`
- `services`
- `student_experience`

Resolution order is:

1. trainer-selected catalog asset;
2. compatible trainer upload;
3. suitable reviewed PPerfil asset (development assets only outside production);
4. `null`, allowing the template to render a graceful image-free state.

The `profile` slot rejects editorial catalog media. A PPerfil library image is never promoted to trainer identity. Catalog media containing people also requires an explicit selection; without the context needed to judge suitability, the resolver uses the graceful image-free state instead of assuming trainer gender or identity. Public template images that use development library media display “Imagem editorial PPerfil”; proof-adjacent media explicitly states that it does not represent a student or result.

The types and resolver live in `src/lib/domain/trainer-media.ts`. `TrainerSiteData.media` is the single media contract consumed by the three public templates.

## Demo integrity

The local fixture no longer uses a development-library person as Thiago Costa’s profile photo. It also no longer attaches editorial images to testimonial before/after fields or result records. The Motion template can still use catalog imagery as disclosed editorial context.

## Future AI media contract

`FutureAiMediaRequest` prepares, but does not execute, this future flow:

1. trainer uploads reference photos;
2. trainer explicitly requests generation;
3. trainer chooses `Fitness Editorial`, `Clean Wellness`, `Performance`, `Studio`, or `Outdoor`;
4. media is generated;
5. trainer reviews it;
6. only approved media enters the trainer library.

No generation endpoint, provider call, credential, approval mutation, or persistence was introduced in this phase.
