# PPerfil Design System V3

Status: canonical foundation for the authenticated PPerfil product.

Approved visual source: Dashboard V3 plus Avatar/Motion Polish at commit
`5ab168d5f55d19eb993dccc0b6bc1a16157ec1fa`.

This document formalizes the approved language. It does not authorize a redesign,
automatic component replacement, or visual propagation to older screens.

## 1. Product principles

1. **Clear before decorative.** Hierarchy, state and next action must be understood
   before accent, imagery or motion is added.
2. **Premium through precision.** Typography, spacing, alignment, density and
   restrained color create the PPerfil identity. Neon and visual noise do not.
3. **Light is canonical; Dark is graphite translation.** Both themes share the same
   composition and component anatomy. Dark changes semantic tokens, not the product.
4. **Purple is an accent.** Health, performance, warning and danger retain their own
   semantics and never become arbitrary decoration.
5. **Alive, not animated.** Motion explains hierarchy or state and remains subtle.
6. **Mobile is composed, not squeezed.** Information is reprioritized for touch and
   first-viewport comprehension.
7. **Truthful UI.** Empty, unavailable and loading states must not imply data or
   functionality that does not exist.

## 2. Architecture and compatibility

The versioned source of truth is split by responsibility:

- `src/app/pperfil-design-system.css`: global foundations, semantic tokens and shared
  authenticated primitives.
- `src/components/ui/PPerfilPrimitives.tsx`: reusable presentational primitives.
- `src/components/ui/PPerfilOperational.tsx`: operational list, toolbar and
  master-detail patterns.
- `src/components/ui/PersonAvatar.tsx`: canonical person identity treatment.
- `src/app/dashboard/dashboard-v3.css`: approved Dashboard-specific composition.
- `src/components/workouts/workouts.module.css`: Workout Builder/Review composition.
- `src/app/student-workouts.css`: immersive Student workout composition.

Existing `--pp-*` and legacy compatibility variables remain valid. New product work
should consume the V3 semantic contract. Dashboard-specific `--ppv3-*` variables are
recipes for that screen, not a second global token system.

## 3. Token taxonomy

### 3.1 Semantic color contract

Use semantic aliases inside `.dashboard-shell` or `.pp-student-shell`.

| Purpose | V3 token | Compatibility source |
| --- | --- | --- |
| Page background | `--pp-color-background` | `--pp-background` |
| Base surface | `--pp-color-surface` | `--pp-surface` |
| Raised surface | `--pp-color-surface-raised` | `--pp-surface-elevated` |
| Subtle/control surface | `--pp-color-surface-subtle` | `--pp-surface-subtle` |
| Hover surface | `--pp-color-surface-hover` | `--pp-surface-hover` |
| Border | `--pp-color-border` | `--pp-border` |
| Strong border | `--pp-color-border-strong` | `--pp-border-strong` |
| Divider | `--pp-color-divider` | `--pp-divider` |
| Primary text | `--pp-color-text` | `--pp-text-primary` |
| Secondary text | `--pp-color-text-secondary` | `--pp-text-secondary` |
| Muted text | `--pp-color-text-muted` | `--pp-text-muted` |
| Brand action | `--pp-color-accent` | `--pp-accent` |
| Strong brand action | `--pp-color-accent-strong` | `--pp-accent-strong` |
| Soft brand state | `--pp-color-accent-soft` | `--pp-accent-soft` |
| Health/success | `--pp-color-health` | `--pp-success` |
| Performance/info | `--pp-color-performance` | `--pp-info` |
| Attention | `--pp-color-warning` | `--pp-warning` |
| Destructive/error | `--pp-color-danger` | `--pp-danger` |

Do not encode meaning with color alone. Pair tone with visible text, state labels or
an accessible icon.

### 3.2 Typography

Manrope is the display family and Inter is the interface/data family.

| Role | Token | Intended use |
| --- | --- | --- |
| Display | `--pp-type-display` | rare, high-emphasis product statements |
| Page title | `--pp-type-page-title` | one primary heading per route |
| Section title | `--pp-type-section-title` | major content group |
| Card title | `--pp-type-card-title` | local surface heading |
| Body | `--pp-type-body` | explanatory text |
| Compact body | `--pp-type-body-compact` | operational controls and dense rows |
| Label | `--pp-type-label` | form and state labels |
| Caption | `--pp-type-caption` | metadata and secondary context |
| Metric | `--pp-type-metric` | tabular numeric emphasis |
| Table/data | `--pp-type-data` | rows, cells and operational facts |

Rules:

- Use tabular numerals for metrics and aligned data.
- Avoid uppercase for long text. Uppercase is limited to brief context labels.
- Do not create route-specific type sizes when an existing role communicates the
  same hierarchy.
- Interface controls must define size, weight and line height deliberately.

### 3.3 Spacing

The scale is derived from 4 px:

`0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80`

Use `--pp-space-0`, `--pp-space-1`, `--pp-space-2`, `--pp-space-3`,
`--pp-space-4`, `--pp-space-5`, `--pp-space-6`, `--pp-space-8`,
`--pp-space-10`, `--pp-space-12`, `--pp-space-16` and `--pp-space-20`.

- Desktop page gutter: `--pp-page-gutter` = 32 px at the wide reference.
- Compact desktop/tablet gutter: 20 px below 1180 px.
- Mobile gutter: `--pp-page-gutter-mobile` = 16 px.
- Reading/Student content width: `--pp-content-reading` = 680 px.
- Wide Trainer content width: `--pp-content-wide` = 1440 px.

Operational density is allowed, but unrelated elements must not collapse into one
visual group. Section spacing should remain stronger than card-internal spacing.

### 3.4 Shape, borders and elevation

| Role | Token |
| --- | --- |
| Compact/internal radius | `--pp-radius-xs` |
| Control radius | `--pp-radius-sm` |
| Operational surface radius | `--pp-radius-md` |
| Prominent surface radius | `--pp-radius-lg` |
| Hero/feature radius | `--pp-radius-xl` |
| Status/avatar pill | `--pp-radius-pill` |
| Standard border | `--pp-border-width` |
| Base elevation | `--pp-elevation-base` |
| Raised elevation | `--pp-elevation-raised` |

Borders carry most of the hierarchy. Shadows are quiet and reserved for true surface
separation. Avoid nesting several rounded, shadowed cards.

## 4. Motion

Principle: **Alive, not animated.**

| Intent | Token | Use |
| --- | --- | --- |
| Immediate response | `--pp-motion-instant` | pressed/selected acknowledgement |
| Hover | `--pp-motion-fast` | border, color and small opacity change |
| State transition | `--pp-motion-base` | progress and local state |
| Deliberate transition | `--pp-motion-slow` | panel or detail transition |
| Reveal | `--pp-motion-reveal` | restrained first-render hierarchy |

- Hover translation is normally no more than 1 px.
- Press uses a small translation or scale, never a dramatic bounce.
- Progress animates only the changed property.
- Loading skeletons communicate waiting; they are not decoration.
- `prefers-reduced-motion: reduce` removes reveal, skeleton and interaction motion
  while preserving state and hierarchy.

## 5. Shared component foundations

### PersonAvatar / Avatar

Canonical resolution order:

1. approved real image;
2. neutral human PPerfil avatar.

Initials and letters are never a visible person fallback. Stock faces must not
impersonate a trainer, student, lead or testimonial author. Broken images return to
the neutral fallback. Status dots are optional and must express a real state.

### Button and IconButton

- `Button` variants: `primary`, `secondary`, `ghost`, `danger`.
- Primary is reserved for the main action in the local context.
- `IconButton` always requires a meaningful accessible label.
- Interactive targets are at least `--pp-touch-target` (44 px).
- Loading and disabled states must preserve the label or explain progress.

Existing link buttons may continue using `pp-button` classes until an authorized,
screen-specific migration.

### StatusBadge

Tones: `accent`, `success`, `warning`, `danger`, `info`, `neutral`.
Use short factual labels. Status is not a decorative pill.

### Metric / MetricCard

Anatomy: semantic icon, readable label, dominant value, truthful description.
Desktop may use a four-column summary. The Dashboard mobile 2 × 2 pattern is an
approved compact recipe, not a universal requirement for every metric group.

### PageHeader and SectionHeader

`PageHeader` owns route title, optional context, concise description and one action.
`SectionHeader` owns a local group title, optional explanation and local action.
Do not use card titles as substitutes for page hierarchy.

### Surface

Variants: `base`, `raised`, `subtle`; optional compact density. Use a surface only
when grouping or elevation has meaning. Open layout, rows and dividers are preferred
to generic card spam.

### Operational DataList

`PPerfilOperational.tsx` remains the canonical operational list foundation:
`OperationalToolbar`, `DataList`, `DataListRow`, `IdentityCell`, `MasterDetail`,
`ContextPanel` and `ActionGroup`.

Desktop preserves row/table scanability. Mobile may transform a row into a compact
two-column summary, but content priority and row action must remain clear.

### EmptyState

Contains a restrained icon, factual title, explanation and optional recovery action.
It must distinguish empty data from unavailable data and permission restrictions.

### FormField and SearchField

Anatomy: visible label, control, optional hint, error/success feedback. Placeholder
text is not a label. Inputs use semantic surface/border/focus tokens and remain at
least 44 px high.

### SegmentedNavigation

Used for secondary navigation or a small set of mutually exclusive views. It may
scroll locally on narrow screens, but primary KPI content must never become a swipe
carousel. Active state uses `aria-current` plus visible treatment.

### LoadingSkeleton and FeedbackMessage

Skeleton geometry should approximate the final content to avoid layout shift.
Feedback uses `status` for non-critical updates and `alert` for destructive/error
states. Success, warning, info and danger use semantic colors.

## 6. Responsive system

Reference viewports:

| Viewport | Primary concern |
| --- | --- |
| 1440 × 900 | canonical wide Trainer composition |
| 768 × 1024 | tablet hierarchy and navigation adaptation |
| 430 × 932 | large mobile density and safe-area behavior |
| 390 × 844 | canonical mobile composition |

Rules:

- Mobile page gutters are 16 px.
- Bottom navigation and sticky actions include `env(safe-area-inset-bottom)`.
- Touch targets are at least 44 × 44 px.
- Secondary navigation can locally scroll when every item remains reachable.
- Primary KPIs must be immediately scannable; do not use a primary-metric carousel.
- Tables become prioritized operational rows rather than squeezed columns.
- Feature media uses deliberate crops; desktop media is not merely compressed.
- No document-level horizontal overflow.
- Compact density must not reduce readable labels or accessible controls.

## 7. Trainer context

Trainer product tone is operational, precise, professional and data-rich.

- Prioritize current state, pending work, real metrics and next action.
- Use compact rows, controlled surfaces and restrained semantic accents.
- Keep unavailable domains visibly honest.
- The Dashboard V3 composition is the quality reference, not a mandatory template
  for every Trainer screen.

## 8. Student context

Student product tone is immersive, touch-first, fitness/performance and app-like.

- Prioritize the current workout, execution state and thumb-reachable action.
- Media can carry more emotional weight than in Trainer operations.
- Preserve the same typography, color semantics, avatar integrity and accessibility.
- Do not force Student Workout Execution into Dashboard card or grid grammar.

Trainer and Student are siblings in one PPerfil family, not identical layouts.

## 9. Public-template boundary

Design System V3 governs the authenticated PPerfil product. Public trainer templates
may use distinct art directions while sharing:

- accessibility and focus quality;
- media authorization and identity safety;
- semantic status colors where product state is shown;
- performance, responsive and technical quality;
- selected primitives where they do not erase the template art direction.

Atelier, Gallery and Spotlight remain separate future work. This consolidation does
not implement or redesign public templates.

## 10. Accessibility

- Maintain WCAG-readable contrast in Light and Dark.
- Preserve visible `focus-visible` treatment.
- Use semantic headings in route order.
- Provide accessible labels for icon-only controls.
- Use `aria-current`, `aria-pressed`, `role=status` and `role=alert` only for the
  corresponding real state.
- Avoid color-only meaning and respect reduced motion.
- Keep touch targets at least 44 px and include safe-area padding where needed.
- Person imagery requires truthful alt/identity behavior; decorative imagery uses
  empty alt text.

## 11. Anti-patterns

- generic SaaS card spam;
- neon or gamer language;
- excessive gradients, glass or shadows;
- random accent colors;
- initials as person avatars;
- fake stock identities;
- excessive or decorative motion;
- desktop squeezed into mobile;
- arbitrary screen-specific visual tokens;
- badges and pills used as decoration;
- fabricated metrics, progress or availability;
- Student experience forced into Trainer dashboard grammar.

## 12. Adoption gate

V3 adoption is deliberate and screen-scoped:

1. identify the approved reference and product context;
2. reuse semantic tokens and an existing primitive where compatible;
3. add a variant only when anatomy or state is genuinely different;
4. compare Light/Dark and 390, 430, 768 and 1440 behavior where relevant;
5. verify no horizontal overflow, console regression or business-state change;
6. obtain Product Owner visual approval before broad propagation.

Dashboard V3, Workout Builder, Workout Review, Student Today and Student Workout
Execution are regression-protected references. A foundation change must preserve
their visual output or remain isolated until a dedicated migration is authorized.
