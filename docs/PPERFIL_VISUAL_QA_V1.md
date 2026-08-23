# PPerfil Visual QA V1

## Gate result

**VISUAL QA STATUS: FAIL**
**OVERALL FIDELITY SCORE: 2.1/5**

| Dimension | Score |
|---|---:|
| Dark | 2.2/5 |
| Light | 1.9/5 |
| Mobile | 2.2/5 |
| Fitness identity | 1.6/5 |
| Matrix identity | 2.2/5 |
| Premium polish | 2.0/5 |

The current implementation is technically coherent and recognizably themed, but it does not yet look like the approved PPerfil product. It reads as a competent, simplified admin interface with a dark skin. The approved references instead show a dense, highly composed Premium Fitness Tech cockpit with deliberate operational hierarchy, human imagery, stronger data visualization and a much more distinctive Matrix identity.

This audit performed no UI changes.

## Scope and method

- Current visual source inspected: the repository as rendered by Next.js on localhost.
- Viewports: desktop `1440x900`; mobile `390x844`.
- Themes: dark and light.
- Authenticated routes reviewed: Dashboard, Leads, lead detail, Alunos, student detail, Meu Site, two template previews and Perfil/Configurações.
- The normal application remained available on `http://localhost:3000`.
- Screenshot capture used an isolated localhost instance on port `3002`. The UI source was an unmodified copy of the current repository. Only authentication and data access were replaced in the temporary copy with local QA fixtures so no hosted Supabase user or business data had to be created or changed.
- Browser plugin classification: unavailable. Fallback: regular Playwright with installed Google Chrome.
- All 36 navigations returned HTTP 200. No framework error overlay or document-level horizontal overflow was detected.
- Theme interaction proof: `dark -> light`; the resulting `light` preference was present in `localStorage`.
- Eight React hydration warnings were recorded on form-heavy screenshots. The diff concerned runtime-added `caret-color` attributes and did not alter the captured composition, but it remains a frontend QA issue to investigate separately.

## Approved sources used

1. `C:\Users\jogue\Downloads\PPerfil_Mapa_Visual_de_Telas_V1.pdf`
   - Portal do Personal: Matrix Dark operational cockpit.
   - Dashboard/Finance cockpit reference.
   - Dense table plus detail-panel references for Leads, Alunos and Avaliações.
   - Treinos + IA, Chat and Configurações references.
   - Meu Site/contact/conversion ecosystem reference.
   - Public profile and acquisition references for template previews.
2. `C:\Users\jogue\Downloads\PPerfil_Product_UX_Master_Spec_v1_REVIEW.docx`
   - “Matrix Dark: SaaS premium, limpo, poucas cores, alto contraste, roxo como acento.”
   - Dashboard as the trainer cockpit, connecting operational modules without becoming cluttered.
   - Photography as structural interface content rather than decoration.
   - Few visible priorities, immediate operational comprehension and no redundant flows.
   - Meu Site editing from the selected template without a redundant preview/publication section.
   - Approved Matrix Dark settings reference.

## Screen-level fidelity score

Scores use `1 = materially unlike the approved product` and `5 = close visual fidelity`. `N/A` means the category is not part of the referenced screen's job and is excluded from its average.

| Category | Dashboard | Leads | Lead detail | Alunos | Student detail | Meu Site | Preview Essential | Preview Performance | Perfil / Settings |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| overall composition | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 3 | 2 |
| layout proportions | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 3 | 2 |
| sidebar/navigation | 2 | 2 | 2 | 2 | 2 | 2 | 1 | 1 | 2 |
| typography | 3 | 3 | 3 | 3 | 3 | 2 | 3 | 3 | 3 |
| spacing | 3 | 3 | 3 | 3 | 3 | 2 | 3 | 3 | 3 |
| information hierarchy | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 3 | 2 |
| cards/surfaces | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 3 | 2 |
| tables/lists | 1 | 2 | 1 | 2 | 1 | 1 | N/A | N/A | 1 |
| buttons/controls | 2 | 2 | 3 | 2 | 2 | 2 | 2 | 3 | 1 |
| borders/radius | 3 | 3 | 3 | 3 | 3 | 2 | 3 | 3 | 2 |
| iconography | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 |
| imagery | 2 | 1 | 1 | 1 | 1 | 3 | 3 | 3 | 2 |
| premium feel | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 3 | 2 |
| fitness identity | 2 | 1 | 1 | 1 | 1 | 2 | 3 | 3 | 1 |
| Matrix identity | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 |
| visual polish | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 3 | 2 |
| **screen average** | **2.2** | **2.1** | **2.0** | **2.1** | **2.0** | **2.1** | **2.3** | **2.7** | **2.0** |

## Findings by screen

### Dashboard

The current page is dominated by a large “Seu site” preview, one full-width edit button, three isolated metrics and a tip card. The approved cockpit uses a broader operational composition: compact metric cards, charting, finance/attention panels, upcoming items and a dense student/plan table. The current first viewport leaves substantial unused space and does not communicate an active training business.

Generic-SaaS indicators: equal-size metric cards, generic centered icon-number-label anatomy and an oversized promotional card. Fitness identity is carried almost entirely by one site-preview image rather than by the operational content.

### Leads

The current list is clear but materially flatter than the approved language. It lacks trainer/student photography, filter/search controls, denser table semantics, selected-row context and the detailed side panel visible in the approved references. Status words and expiry data are present, but they feel like a styled CRUD list rather than a premium opportunity workspace.

### Lead detail

The standalone definition-list card is functionally understandable, but its composition is generic and visually disconnected from the approved master-detail language. There is no persistent opportunity context, rich contact/profile area, timeline or conversion-step anatomy. The two actions are visually clear; this is the strongest part of the screen.

### Alunos

The current tab/list structure is serviceable. It lacks the dense operational table, profile photography, multi-column information and adjacent selected-student context shown in the approved product. Initials-only avatars and large empty horizontal areas make the screen feel early-stage and template-like.

### Student detail

The page uses a large identity block, locked horizontal tabs and a sparse information card. The approved direction expects the student to be an operational hub for training, evaluations, progress, finance and history. Visually, the current screen has too little context and too much inactive/empty space. On mobile the tab rail is clipped/scroll-dependent without a strong cue that more content exists.

### Meu Site

The current screen is a long, heavily boxed builder led by two large template cards. The approved reference emphasizes contact/conversion configuration, a high-quality device preview, lead results and clear publication status. The Master Spec also says editing should happen from the selected template without retaining a redundant preview/publication session. The current anatomy therefore diverges both visually and structurally.

### Preview Essential

The dark rendering has fitness photography but follows a blue generic consultancy template rather than the approved PPerfil public profile. The authenticated sidebar and bottom navigation remain visible around a supposed public-site preview, reducing immersion and misrepresenting the actual public canvas.

In Light Mode this screen has a critical contrast failure: the dark template remains dark while theme-dependent headline/control colors become nearly black. The headline and secondary action become barely readable. This demonstrates theme leakage across the authenticated shell and template-specific visual system.

### Preview Performance

This is the most visually polished current screen. Its editorial split hero, type scale and photography feel intentional. It still differs from the approved public Personal profile: it lacks the cinematic full-width hero, purple conversion identity, specialties/reviews overlay, performance proof and dark/light section rhythm. The dashboard shell remains visible and compresses the preview.

### Perfil / Configurações

The route named Configurações renders a long profile form. The approved Settings screen is a modular hub for professional profile, account, notifications, appearance, integrations, plan and privacy/data, with a plan/quick-actions rail. The current page is therefore a critical composition mismatch. The neon-lime photo action is also inconsistent with the approved restrained-purple PPerfil accent.

## Mockup fidelity difference ledger

| Mockup element | Current implementation | Difference | Severity | Recommended correction |
|---|---|---|---|---|
| Dashboard operational cockpit | Large site card + 3 basic metrics + tip | Missing the approved multi-panel operational density and business-at-a-glance composition | CRITICAL | Rebuild the dashboard grid from the approved cockpit hierarchy before polishing individual cards |
| Dashboard chart/table rhythm | No chart and no operational table in first viewport | Page feels visually empty and does not show an active training operation | MAJOR | Add the approved data-visualization/table anatomy using real module data when that product scope is implemented |
| Sidebar content anatomy | Five plain links and identity row | Approved shell has richer module hierarchy, counts, utilities and a deliberate AI/premium area | MAJOR | Define a canonical desktop shell anatomy and spacing model based on the approved sidebar |
| Sidebar premium treatment | Flat near-black column with minimal detail | Functional but generic; lacks the precision, content density and visual anchors of the mockup | MAJOR | Refine logo, identity, badges, section grouping, active item and footer utilities as one component system |
| PPerfil accent | Purple shell mixed with legacy neon lime controls | Competing brand languages remain visible | CRITICAL | Remove legacy `--saas-accent` leakage from authenticated trainer components; use semantic PPerfil accent tokens |
| Leads workspace | Three KPI cards and stacked rows | Approved reference uses filters, dense table/list and selected-detail context | MAJOR | Introduce a reusable operational data-grid/master-detail pattern |
| Lead identity | Text-only rows | Approved screens use human avatars and stronger identity markers | MAJOR | Add a controlled avatar/photo treatment and compact metadata columns |
| Lead detail | Standalone full-width definition list | Loses list context and feels like a generic record page | MAJOR | Use a module header, compact identity summary, context/timeline and action panel anatomy |
| Status treatments | Uppercase colored text plus small pills | Some statuses are too quiet or inconsistent across modules | MINOR | Centralize status chips with fixed color, icon, typography and density rules |
| Alunos list | Two boxed lists with initials | Approved language is a dense table plus selected-student context and photography | MAJOR | Reuse the operational data-grid/master-detail pattern with student-specific columns |
| Student profile imagery | Initials-only circles | Fitness/human identity is absent from a relationship-centered screen | MAJOR | Define photo, fallback initials, online/state indicators and privacy-safe image rules |
| Student detail hub | Sparse overview and locked tabs | Does not visually establish the student as the center of training/evaluation/progress operations | MAJOR | Build the approved hub hierarchy as modules become available; preserve a meaningful overview meanwhile |
| Student mobile tabs | Wide horizontal rail with clipped future tabs | Discoverability is weak and the first viewport looks truncated | MAJOR | Use an explicit scroll cue, compact selector or approved mobile tab adaptation |
| Meu Site reference | Large template-selection builder | Approved composition centers contact method, live device preview, publication and conversion outcomes | CRITICAL | Reframe the screen around the approved “Meu Site” operating model |
| Meu Site flow | Separate template, customize, preview and publication stages | Master Spec rejects a redundant preview/publication session | MAJOR | Edit from the selected template and consolidate preview/publication affordances |
| Template cards | Very large bordered image cards | Overly boxed and consume most of the first viewport | MAJOR | Reduce card dominance and make the selected site/preview the primary composition |
| Public preview canvas | Authenticated sidebar/bottom nav remain visible | Public-site preview is compressed and does not resemble the actual visitor experience | CRITICAL | Make preview an immersive canvas with only a compact preview toolbar outside it |
| Essential preview light theme | Dark canvas receives dark text from Light Mode tokens | Headline and control contrast fail visibly | CRITICAL | Isolate template tokens from authenticated theme tokens and QA every template/theme combination |
| Public profile design | Current templates lack approved hero/review/specialty/proof composition | Public conversion experience looks like a different product | MAJOR | Align template structure and visual rhythm to the approved Personal profile reference |
| Configurações hub | Long professional profile form | Approved multi-domain settings composition is absent | CRITICAL | Implement the approved settings hub; keep profile form as one destination inside it |
| Forms | Large full-width inputs inside broad panels | Visually generic, low information density and inconsistent with settings reference | MAJOR | Define compact form groups, section anatomy, inline actions and maximum readable widths |
| Light surfaces | White cards on very pale gray with subtle borders | Legible but looks like a generic admin template and loses PPerfil depth | MAJOR | Use a more deliberate off-white hierarchy, elevated surfaces, tonal separators and restrained shadow tokens |
| Mobile bottom navigation | Fixed nav overlays public previews and long forms | Operational nav contaminates preview and reduces usable viewport | MAJOR | Scope navigation to authenticated application pages; offset content consistently where retained |
| Matrix influence | Mostly dark background + purple active state | Composition and interaction precision do not yet carry the approved Matrix DNA | MAJOR | Express Matrix identity through grids, density, alignment, hierarchy, data visualization and motion rather than color alone |
| Border/radius language | Tokenized in newer rules but mixed with many hardcoded radii | Generally restrained, yet inconsistent across legacy/new components | MINOR | Establish component-level radius contracts and remove local one-off values |
| Responsive single-column stacks | Dense desktop modules simplify to readable cards | Direction is reasonable where content is preserved | ACCEPTABLE RESPONSIVE ADAPTATION | Keep the stacking behavior, but preserve stronger module hierarchy and avoid clipped navigation |

## Severity totals

- Critical differences: 6
- Major differences: 17
- Minor differences: 2
- Acceptable responsive adaptations: 1

## Dark Mode review

Dark Mode has the strongest baseline because the semantic palette, graphite surfaces, subtle borders and restrained purple active state are directionally correct. It still fails the approved-product test because composition, information density, imagery and module anatomy are not close enough. The dark shell is not excessively neon or gamer-like, which is positive, but several legacy lime actions compete with the PPerfil purple identity.

**DARK MODE: FAIL — 2.2/5**

## Light Mode review

Most trainer pages remain readable and preserve layout. However, the resulting language is a familiar white-card admin dashboard rather than a premium PPerfil translation. Surface hierarchy is shallow, shadows and borders are generic, and human/fitness identity remains absent. The Essential preview has a critical contrast defect caused by theme leakage.

**LIGHT MODE: FAIL — 1.9/5**

## Mobile review

The authenticated shell correctly becomes a top brand bar and five-item bottom navigation. Most content stacks without document-level overflow. The result remains visually basic, and the fixed application navigation incorrectly surrounds and overlaps public-template previews. Student tabs also present clipped/hidden destinations. These are not merely cosmetic differences because they change the perceived product frame.

**MOBILE: FAIL — 2.2/5**

## Design-system sufficiency

**DESIGN SYSTEM SUFFICIENT: NO**

The code contains useful foundations, but not a sufficiently defined or consistently applied system to reproduce the approved mockups.

| Area | Current state | Assessment |
|---|---|---|
| Typography scale | Inter + Manrope, many local `rem` values | Families are suitable; role-based scale, line-height and density contracts are underspecified |
| Spacing scale | `--saas-space-*` and `--matrix-space-*` exist | Two overlapping scales plus extensive hardcoded spacing prevent consistent composition |
| Radius | Matrix radius tokens exist | Legacy and component-local 9/10/12/14/15px values coexist |
| Surfaces | Semantic dark/light surface tokens exist | Good foundation, but `saas`, `trainer` and `matrix` layers overlap and leak |
| Borders | Semantic border tokens exist | Stronger/quiet/divider roles are only partially expressed |
| Icon sizing | Lucide is used consistently | Sizes are defined selector by selector rather than as reusable roles |
| Sidebar dimensions | `--matrix-sidebar: 228px` exists | Width is defined; anatomy, grouping, density and utility zones are not |
| Content max widths | Trainer content uses 1180px | Useful baseline; screen-specific grid templates and density rules are missing |
| Table density | No canonical data table/data grid system | Major blocker for Leads, Alunos, Avaliações and Finance fidelity |
| Card anatomy | Multiple independent card styles | Header/body/footer/action/selected/attention variants are not standardized |
| Button anatomy | Purple and legacy lime systems coexist | Priority, size, destructive, quiet, icon and split-button contracts are incomplete |
| Form anatomy | Basic label/control rules exist | Settings/form grouping, compact density and inline-action patterns are missing |
| Status treatment | Some semantic state colors and pills exist | Labels, casing, icons and shape are inconsistent across modules |
| Imagery treatment | Site/template imagery exists; trainer modules mostly lack imagery | No authenticated-product photography/avatar system, despite photography being structural in the approved spec |
| Motion/interaction | Basic hover/focus and a few transitions | No shared timing/easing/reveal/progress/selection language matching the approved precision |

### Proposed centralized PPerfil Design System V1

This is a consolidation of the existing approved direction, not a new design language.

1. **Semantic theme layer**
   - One set of roles: `background`, `surface`, `surface-elevated`, `surface-subtle`, `border`, `border-strong`, `text-primary`, `text-secondary`, `text-muted`, `accent`, `success`, `warning`, `danger`, `focus-ring`.
   - Dark and Light provide values only. Components never reference raw dark/light colors.
   - Public template themes must be scoped so authenticated theme values cannot alter template contrast.

2. **Typography roles**
   - Display: `display-xl`, `display-lg`, `title-page`, `title-section`, `title-card`.
   - UI: `body`, `body-compact`, `label`, `caption`, `overline`, `metric`, `table`.
   - Fix weight, line-height and tracking for every role. Use Manrope for display and Inter for UI/body.

3. **Spacing and layout**
   - One 4px-derived spacing scale.
   - Canonical shell: sidebar width, content gutters, header height and responsive breakpoints.
   - Reusable dashboard grids for KPI, chart/table, split-panel and rail layouts.
   - Density modes for operational desktop tables and mobile cards.

4. **Component anatomy**
   - Card: header, metric, body, footer, selected, alert and interactive variants.
   - Data grid: toolbar, search, filters, sortable header, row identity, status, pagination and selected detail.
   - Master-detail: list/table + context panel, with defined responsive collapse.
   - Button: primary, secondary, quiet, destructive, icon-only and split-button sizes.
   - Form: section, field row, inline action, help/error, readonly and destructive zone.
   - Status: consistent size, case, icon and semantic surface.

5. **Imagery and identity**
   - Human photography rules for hero, student/trainer avatar, proof and operational context.
   - Crop/aspect-ratio/overlay/fallback/privacy rules.
   - Avatar sizes and presence/status indicators as tokens.

6. **Motion and interaction**
   - Shared durations/easing for hover, selection, expand/collapse, page reveal, progress and countdown.
   - Motion remains subtle and respects reduced-motion preferences.

7. **QA contracts**
   - Reference frame per canonical screen.
   - Dark, Light, desktop and mobile screenshot regression baselines.
   - Contrast checks, shell-scope checks and a prohibition on raw component color values except approved exceptional media overlays.

## Top 10 visual corrections

1. Recompose Dashboard as the approved operational cockpit instead of a site-promotion page with three generic metrics.
2. Build one canonical dense data-grid/master-detail pattern and use it for Leads and Alunos.
3. Replace the current `/dashboard/profile` composition with the approved Settings hub; move the profile form inside its professional-profile destination.
4. Reframe Meu Site around contact/conversion configuration, selected-template editing, device preview and performance outcomes.
5. Remove the authenticated shell from public template previews and make preview an immersive, correctly sized canvas.
6. Fix theme scoping so Light Mode cannot make Essential-template text unreadable.
7. Eliminate legacy neon-lime leakage from the trainer product and consolidate all authenticated accents on semantic PPerfil purple tokens.
8. Upgrade the sidebar from a flat five-link rail to the approved information hierarchy, density, counts, grouping and utility anatomy as modules become available.
9. Introduce a structural human-imagery/avatar system across Leads, Alunos and contextual panels to restore fitness and relationship identity.
10. Consolidate typography, spacing, radius, buttons, forms, cards, statuses and motion into PPerfil Design System V1 before further screen-specific styling.

## Screenshot inventory

Root directory:

`C:\Users\jogue\OneDrive\Documentos\Thiago Pesonal Treiner\docs\screenshots\visual-qa-v1`

Capture metadata:

`C:\Users\jogue\OneDrive\Documentos\Thiago Pesonal Treiner\docs\screenshots\visual-qa-v1\capture-results.json`

Naming contract:

`{screen}--{desktop|mobile}--{dark|light}.png`

Screens captured in all four combinations:

- `dashboard`
- `leads`
- `lead-detail`
- `students`
- `student-detail`
- `site-builder`
- `preview-essential`
- `preview-performance`
- `profile`

Total: 36 real rendered localhost screenshots.

## Final gate statement

**VISUAL QA COMPLETE — NO UI CHANGES PERFORMED.**
