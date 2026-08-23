# PPerfil V1 — Product & Visual Consolidation Audit

## Executive verdict

**Overall Product Cohesion: 4.1/5**

PPerfil now reads as a substantially coherent commercial product across Trainer, Student, and Public surfaces. The Apple Clean + Health & Energy direction is strongest in the Workout domain, the Student workout experience, and the three public templates. The authenticated trainer shell, semantic Light/Dark translation, typography, spacing, and surface treatment now belong to the same product family.

The product is not yet uniformly launch-polished. Signup remains visibly attached to the older dark/neon fitness language; Dashboard is less distinctive and less purpose-built than the newer Workout interfaces; some mobile tab/navigation patterns feel responsive rather than app-native; and shared editorial stock media weakens trainer authenticity across the public templates. These are concentrated gaps, not a need for broad redesign.

| Dimension | Score |
| --- | ---: |
| Trainer Experience | **4.0/5** |
| Student Experience | **4.3/5** |
| Public Experience | **4.4/5** |
| Mobile App Feeling | **4.3/5** |
| Premium Technology Feeling | **4.2/5** |
| Fitness / human identity | **4.0/5** |
| Light theme cohesion | **4.3/5** |
| Dark theme cohesion | **4.4/5** |

## Scope, evidence, and limits

- Audited repository snapshot: `e083753d9ed2bc1828419bfd1f39c15b621cd063`.
- Real rendered localhost coverage: **64 captures across 24 screen/route keys**.
- Reference viewports: desktop `1440x900`; mobile `390x844`.
- Light was reviewed as canonical. Dark was reviewed on the representative authenticated and Student surfaces as the graphite translation.
- All captured navigations returned HTTP `200`.
- No captured page had document-level horizontal overflow.
- Browser plugin: unavailable. Regular Playwright with installed Google Chrome was used as the documented fallback.
- The populated demo fixture redirects `/onboarding` to `/dashboard`; onboarding itself is therefore classified **GRAY / not independently verifiable** in this audit.
- The shared development runtime produced HMR WebSocket instability during two additional client-action probes. Those probes were treated as inconclusive environment evidence, not as product defects. Static states, navigation surfaces, and previously implemented workout states were still reviewed. This audit does not re-certify backend mutation behavior.
- No application source, migration, Supabase state, or remote data was changed.

Screenshot evidence root:

`C:\Users\jogue\.codex\visualizations\2026\08\23\01a02f94-f6ad-7112-b9a7-657f3cb52af8\pperfil-v1-audit`

Capture manifest:

`C:\Users\jogue\.codex\visualizations\2026\08\23\01a02f94-f6ad-7112-b9a7-657f3cb52af8\pperfil-v1-audit\manifest.json`

## Classification legend

| Classification | Meaning |
| --- | --- |
| **GREEN** | Launch-quality composition; only routine polish remains. |
| **YELLOW** | Keep the current architecture and design, but refine the stated issue before launch. |
| **RED** | Material visual/product-language mismatch; rebuild before launch. |
| **GRAY** | Intentionally incomplete, post-launch, or not independently reviewable with the current fixture. |

Mobile scores measure **app-like feel**, not only responsive correctness.

## Trainer product matrix

| Screen / domain | State | Current functionality | Visual /5 | Mobile app /5 | Priority | Exact issue | Recommended action |
| --- | --- | --- | ---: | ---: | --- | --- | --- |
| Signup | **RED** | Account creation entry with role/value framing | 2.1 | 2.4 | P0 | Dark gym image, lime/neon accents, and black controls belong to the former Matrix/gamer-adjacent language, not the canonical Apple-clean purple system. This breaks cohesion at the first commercial touchpoint. | Rebuild the visual layer with the canonical Light-first auth composition, graphite Dark translation, restrained purple accent, and premium human fitness photography. Preserve the flow and fields. |
| Onboarding | **GRAY** | Route exists, but the completed demo profile redirects to Dashboard | N/A | N/A | P1 verification | The real onboarding canvas could not be isolated from the populated fixture, so visual quality cannot be responsibly inferred. | Add a local QA fixture/state that exposes first-run onboarding and capture both viewports/themes before launch. |
| Authenticated shell | **GREEN** | Desktop sidebar, mobile header/bottom navigation, theme support, demo identity | 4.2 | 4.1 | P2 | Coherent and restrained, but mobile has no direct Settings destination and some secondary destinations depend on in-page links. | Keep the shell. Add a deliberate mobile “More” or profile destination when those modules are available; do not crowd the five-item primary bar. |
| Dashboard | **YELLOW** | Business overview, metrics, recent leads, students, assessments, and site access | 3.9 | 4.0 | P1 | Clean and usable, but the familiar KPI-card grid, four accent colors, and limited human/training context make it the most generic-SaaS major Trainer screen. New Workout screens materially exceed it. | **Refine, do not redesign.** Keep the shell/grid/data, consolidate accents by semantic priority, strengthen coaching/workout/assessment next actions, and introduce restrained human or movement context. |
| Leads | **GREEN** | Filterable operational list with status, source, interest, dates, and actions | 4.3 | 4.2 | P2 | Strong density and hierarchy. On mobile it becomes a competent operational list but not a particularly distinctive fitness surface. | Keep. Apply only consistency polish and richer identity/avatar data when real customer data supports it. |
| Lead detail | **GREEN** | Contact/context detail, status, timeline-style metadata, conversion actions | 4.1 | 4.0 | P2 | Clear and coherent; slightly more form/record-like than the strongest product surfaces. | Keep. Tighten contextual hierarchy and preserve the primary conversion action as the unmistakable focus. |
| Students | **GREEN** | Active/inactive/pending relationship views and student navigation | 4.2 | 4.2 | P2 | Strong operational fit. Human identity relies heavily on compact identity treatment rather than rich trainer/student context. | Keep. Introduce real avatars progressively without increasing visual noise. |
| Student detail | **YELLOW** | Relationship overview and future module tabs | 3.6 | 3.5 | P1 | Sparse content and several unavailable tabs make the hub feel unfinished. On mobile, the destructive relationship action has excessive prominence and the tab rail lacks a strong continuation cue. | Refine the overview around current Assessment/Workout context, demote destructive actions, and make unavailable destinations explicitly future-facing or remove them until usable. |
| Assessments | **GREEN** | Operational assessment list with lifecycle/status data and trainer actions | 4.3 | 4.1 | P2 | Dense and coherent. Mobile list treatment is good, though less app-specific than Student workout surfaces. | Keep. Maintain the existing status and table/card system. |
| Assessment detail | **YELLOW** | Draft/sent/review detail, answer review, metadata, and lifecycle actions | 4.1 | 3.7 | P1 | Strong desktop information density, but the mobile tab label is clipped/partially hidden and continuation is not self-evident. | Preserve the screen; replace or clarify the mobile tab rail with an explicit scroll affordance, compact segmented control, or mobile selector. |
| Workouts | **GREEN** | Workout plans and versions with status, ownership, and actions | 4.4 | 4.2 | P2 | Purpose-built and visually mature. | Keep as a reference for other operational lists. |
| New workout | **GREEN** | Guided creation entry and student/context selection | 4.1 | 4.0 | P2 | Elegant but intentionally sparse; the first step has less visual confidence than the builder it opens. | Keep. Add only concise expectation-setting or progress context if usability evidence supports it. |
| Workout Builder | **GREEN** | Structured sections, exercise selection/media, prescription editing, ordering, and AI draft context | 4.7 | 4.5 | P0 benchmark | This is the strongest Trainer visual and product-specific benchmark. Dense controls remain readable and fitness context is tangible. | Keep as the canonical Trainer quality bar. Reuse its precision, hierarchy, and media treatment—not its exact layout—when elevating older screens. |
| Workout Review | **GREEN** | Review-ready prescription presentation and publish/send actions | 4.6 | 4.3 | P0 benchmark | Premium, specific, and coherent with the Builder. | Keep. Protect the hierarchy as more workout data is added. |
| My Site | **YELLOW** | Published-state management, template/content/appearance/organization controls, live public preview | 4.4 | 3.9 | P1 | Desktop is visually strong; on mobile the top organizer tabs clip without a sufficiently clear scroll cue. Preview media also triggers a non-blocking Next image-loading recommendation. | Keep the structure. Fix mobile section navigation and optimize above-the-fold preview image priority. |
| Settings / Profile | **YELLOW** | Professional profile and settings categories within the authenticated product | 4.1 | 3.6 | P1 | Polished desktop composition, but mobile category discovery is weak and only the first destinations are immediately visible. Some future settings remain incomplete. | Keep desktop anatomy. Provide a clear mobile settings index/accordion and distinguish available settings from roadmap destinations. |

### Trainer conclusion

The Trainer experience is commercially credible after the visual remediation and Workout work. The shell no longer needs a broad redesign. The priority is to bring **Signup, Dashboard, Student Detail, Assessment Detail mobile navigation, My Site mobile navigation, and Settings mobile discovery** up to the level already established by Workout Builder and Review.

Generic-SaaS risk is **MEDIUM on Dashboard/Settings**, **LOW on Workouts**, and **LOW-MEDIUM across the Trainer product overall**.

## Student product matrix

| Screen / domain | State | Current functionality | Visual /5 | Mobile app /5 | Priority | Exact issue | Recommended action |
| --- | --- | --- | ---: | ---: | --- | --- | --- |
| Assessment experience | **GREEN** | Trainer identity, assessment context, start/response surface, due/required semantics | 4.4 | 4.5 | P2 | Clear, calm, and human. The screen is visually less immersive than Workout, which is appropriate for the task. | Keep. Preserve the focused single-task hierarchy. |
| Today | **GREEN** | Greeting, trainer presence, current/available workout, primary continuation action | 4.6 | 4.8 | P0 benchmark | Strong app-like first viewport and excellent action clarity. Fitness identity uses illustration/media more than human photography. | Keep. Use this as the Student home benchmark; introduce authentic trainer media only when data quality supports it. |
| Workout list | **GREEN** | Published workout library, state/history treatment, current next action | 4.5 | 4.7 | P0 benchmark | Highly scannable cards and deliberate movement media. | Keep. |
| Workout overview | **GREEN** | Session summary, sections, exercise media/instructions, start/resume | 4.6 | 4.8 | P0 benchmark | Strong mobile-first composition and exercise hierarchy. | Keep. |
| Workout execution | **GREEN** | Immersive set execution, actuals, rest, pause/resume, exercise detail, recovery states | 4.8 | 4.9 | P0 benchmark | The clearest expression of PPerfil as premium fitness technology. It looks and behaves like an app rather than a resized dashboard. | Keep as the canonical mobile-product benchmark. |
| Workout completion | **GREEN** | Factual completion metrics, perceived-effort feedback, optional note | 4.7 | 4.8 | P0 benchmark | Strong closure without fabricated achievements or noisy gamification. | Keep. |
| Student shell/navigation | **YELLOW** | Mobile top chrome and five-item bottom navigation; execution removes normal navigation | 4.3 | 4.5 | P1 | Today/Treinos are excellent, but Progresso, Chat, and Perfil are visibly unavailable. On desktop the experience remains a narrow phone-like canvas in a large empty field. | Keep the mobile model. Before launch, avoid presenting dead destinations as equal primary tabs; on desktop provide a restrained adaptive frame without turning it into a Trainer dashboard. |
| Profile-related experience | **GRAY** | Profile destination is reserved but not implemented | N/A | N/A | Post-launch / scope decision | The current navigation advertises a destination the product does not yet deliver. | Either implement the minimum safe Student Profile required for launch or remove/disable it with clearer expectation until its domain is approved. |
| Progress / Chat | **GRAY** | Reserved navigation items only | N/A | N/A | Post-launch | Deliberately out of scope, but visible scaffolding lowers the feeling of completeness. | Do not fabricate modules. Reduce prominence until functional scope exists. |

### Student conclusion

The Student workout experience is the strongest mobile product surface in PPerfil and should be protected as the internal benchmark. Its limitation is not workout quality; it is the incomplete surrounding ecosystem and desktop adaptation. Mobile app feeling is **excellent for the implemented journey** and only reduced at the shell level by disabled future destinations.

## Public product and template matrix

| Screen / domain | State | Current functionality | Visual /5 | Mobile app /5 | Priority | Exact issue | Recommended action |
| --- | --- | --- | ---: | ---: | --- | --- | --- | --- |
| Public trainer website | **YELLOW** | Published trainer content, services, methodology/proof, testimonials, app proposition, CTA/lead paths | 4.5 | 4.4 | P1 | Strong commercial surface, but the same curated stock trainer imagery appears across templates and can be perceived as the trainer despite the editorial-media label. | Require or strongly guide authentic trainer-selected profile/hero media before publication; preserve graceful curated fallbacks with visible provenance. |
| Essential | **YELLOW — REFINE** | Editorial trainer story, services/pricing, methodology, student app, testimonials, CTA | 4.4 | 4.3 | P1 | Premium and clean, but shared media/content reduces trainer branding and distinction. The mobile headline approaches an oversized scale in the first viewport. | Keep the art direction and structure. Refine mobile type/crop limits and prioritize trainer-owned media. |
| Motion | **GREEN — KEEP** | Approved energetic performance narrative, services, student experience, proof, CTA | 4.8 | 4.6 | P0 benchmark | The strongest and most distinctive template. A real mobile regression remains: the editorial-media disclosure overlaps adjacent location/service metadata in the hero. | Keep the approved design. Fix only the mobile metadata/disclosure collision and image-loading priority; do not redesign. |
| Conversion | **YELLOW — REFINE** | Service/price-led conversion, process, student experience, testimonials, CTA | 4.5 | 4.4 | P1 | Excellent pricing and action clarity; shared hero/media makes trainer branding less authentic and reduces distinctness from Essential. | Preserve the conversion architecture. Refine trainer-specific media, proof, and content defaults. |
| Future purchase | **GRAY** | Current CTAs support lead/contact intent; direct purchase is not implemented | N/A | N/A | Post-launch / Billing | The public journey intentionally stops before a real purchase flow. | Keep CTAs truthful. Add purchase only when Billing/business rules are approved and implemented. |

## Exact template scorecard

| Criterion | Essential | Motion | Conversion |
| --- | ---: | ---: | ---: |
| Art direction | 4.5 | 4.9 | 4.6 |
| Mobile quality | 4.3 | 4.6 | 4.4 |
| Photography / media | 3.8 | 4.3 | 4.0 |
| Trainer branding | 3.4 | 3.6 | 3.5 |
| Student digital experience proposition | 4.2 | 4.8 | 4.7 |
| Services presentation | 4.4 | 4.5 | 4.9 |
| Conversion clarity | 4.2 | 4.6 | 4.9 |
| Distinctness | 4.0 | 4.9 | 4.3 |
| Premium polish | 4.5 | 4.8 | 4.6 |
| **Decision** | **REFINE** | **KEEP** | **REFINE** |

The template system should retain all three V1 templates. None requires rebuild. Motion remains the visual quality reference; its one mobile overlap is a regression correction, not permission to reinterpret the approved design.

## Cross-product design-system review

### Cohesive strengths

- Manrope/Inter hierarchy reads consistently across product areas.
- Light surfaces are clean without falling back into heavy glassmorphism or excessive decoration.
- Dark is an equivalent graphite translation with restrained purple, not neon/gamer styling.
- Radii, borders, and shadows are materially more controlled than the earlier product baseline.
- Workout and Student surfaces use media as structural product content.
- Status color is generally semantic and restrained.
- Trainer operational density is usable on desktop and collapses without document overflow.
- Public templates feel authored and commercially intentional, not generated from one generic landing-page grid.

### Remaining systemic weaknesses

- Dashboard still depends on a familiar multi-card admin grammar and too many accent colors.
- Trainer identity/human presence is weaker inside operational product screens than on public and Student surfaces.
- Horizontal tab rails do not have one robust mobile behavior across Assessment Detail and My Site.
- Mobile secondary navigation is not fully resolved for Settings/My Site/profile destinations.
- Curated stock media is centralized and disclosed, but trainer authenticity is not yet a publication-level quality gate.
- Some image uses produce Next LCP loading recommendations, indicating that above-the-fold priority rules are not fully standardized.
- Student desktop layouts preserve the mobile canvas too literally instead of adapting it carefully to larger screens.

## Launch-critical journeys

### Trainer: Signup → Profile → Site → Lead → Student → Assessment → Workout → Publish

| Step | Readiness | Finding |
| --- | --- | --- |
| Signup | **RED** | Visual language is inconsistent with the product entered immediately afterward. |
| Profile / Settings | **YELLOW** | Desktop is polished; mobile settings discovery needs refinement. |
| Site | **YELLOW** | Strong editor/preview, with mobile tab and media-priority polish remaining. |
| Lead | **GREEN** | Operational list/detail are clear and cohesive. |
| Student | **YELLOW** | List is strong; detail hub still feels sparse/incomplete. |
| Assessment | **YELLOW** | Strong lifecycle surface; mobile detail tabs need correction. |
| Workout | **GREEN** | Builder/Review are the Trainer benchmark. |
| Publish | **GREEN** | Review/publish hierarchy is visually clear within the audited workout/site states. |

**Journey verdict:** commercially coherent after entry, but Signup is a P0 visual discontinuity.

### Student: Access → Assessment → Today → Workout → Execution → Completion

| Step | Readiness | Finding |
| --- | --- | --- |
| Access / shell | **YELLOW** | Implemented routes feel app-like; disabled future tabs reduce completeness. |
| Assessment | **GREEN** | Focused and human. |
| Today | **GREEN** | Excellent first viewport and next-action clarity. |
| Workout | **GREEN** | Media-first overview and list are premium. |
| Execution | **GREEN** | Best mobile experience in the product. |
| Completion | **GREEN** | Strong factual closure and feedback. |

**Journey verdict:** launch-quality for the implemented workout/assessment scope; incomplete destinations must not masquerade as available product.

### Public: Website → Service → CTA → Lead / future purchase

| Step | Readiness | Finding |
| --- | --- | --- |
| Trainer website | **YELLOW** | Premium composition, but authentic trainer media should be a stronger publishing requirement. |
| Service | **GREEN** | Especially strong in Conversion. |
| CTA | **GREEN** | Clear and early across templates. |
| Lead | **GREEN** | Contact intent is visually understandable and truthful. |
| Future purchase | **GRAY** | Correctly not fabricated; depends on future Billing scope. |

**Journey verdict:** strong acquisition experience, with trainer identity integrity as the main pre-launch refinement.

## Dashboard recommendation

**REFINE — DO NOT REBUILD.**

Keep the authenticated shell, core grid, real metrics, recent-record modules, semantic tokens, and responsive behavior. Elevate Dashboard to the Workout benchmark by:

1. reducing the generic four-color KPI vocabulary;
2. using purple only for primary/product identity and semantic green/amber/red only for state;
3. prioritizing “what needs the trainer now” over equal-weight cards;
4. showing compact workout/assessment/student context with restrained human or movement media;
5. strengthening the one primary mobile action and reducing secondary first-viewport competition.

This is targeted visual elevation, not a new dashboard concept.

## Template recommendation

- **Essential — REFINE:** retain the editorial rhythm; tune mobile type/crops and authentic trainer media.
- **Motion — KEEP:** Product Owner-approved and still the strongest template; fix the mobile disclosure/metadata overlap only.
- **Conversion — REFINE:** retain service/pricing/CTA structure; strengthen trainer-specific media and proof.
- Keep exactly three V1 templates. Do not create additional template variants before closing trainer identity quality.

## Mobile recommendation

Use Student Workout Execution, Today, and Workout Overview as the internal definition of “feels like an app.” Preserve their focused chrome, early primary action, media hierarchy, large touch controls, safe-area behavior, and low-noise state feedback.

For Trainer mobile, keep the current operational compression but resolve three systemic points: explicit secondary navigation, a canonical mobile treatment for long tab rails, and lower prominence for destructive/future actions. For Student desktop, expand the composition deliberately without importing the Trainer dashboard shell.

## Top 10 pre-launch visual fixes

1. **Rebuild Signup visually** in Apple Clean + Health & Energy; remove legacy neon/lime and dark-gym auth styling.
2. **Elevate Dashboard without redesigning it:** reduce generic KPI-card/color grammar and emphasize coaching priorities, workouts, assessments, and human context.
3. **Make authentic trainer media a publication-quality requirement** or strongly guided step; prevent shared stock imagery from carrying trainer identity by default.
4. **Fix mobile tab behavior** in Assessment Detail and My Site with one clear, reusable interaction and visible continuation affordance.
5. **Refine Student Detail** around current assessments/workouts, demote the destructive relationship action, and stop empty future tabs from dominating the hub.
6. **Resolve Student primary navigation completeness:** do not present Progresso, Chat, and Perfil as equivalent active destinations while they remain unavailable.
7. **Fix the Motion mobile hero collision** between the editorial-media disclosure and location/service metadata; preserve the approved art direction.
8. **Improve mobile Settings/My Site discoverability** through a restrained secondary navigation pattern rather than adding more items to the primary bottom bar.
9. **Standardize above-the-fold media priority/crops** to remove current Next image-loading recommendations and protect mobile LCP.
10. **Adapt Student desktop layouts deliberately** so the premium mobile canvas expands naturally instead of floating as a narrow phone experience in unused space.

## Final classification summary

### GREEN areas

- Trainer Leads, Lead Detail, Students, Assessments, Workouts, Workout Builder, Workout Review
- Student Assessment, Today, Workout List, Workout Overview, Execution, Completion
- Motion template
- Core Light/Dark semantic translation

### YELLOW areas

- Dashboard
- Trainer Student Detail
- Assessment Detail mobile navigation
- My Site mobile navigation and media priority
- Settings mobile discovery
- Student shell around incomplete destinations
- Public trainer-media authenticity
- Essential and Conversion template refinement

### RED areas

- Signup visual language

### GRAY areas

- Onboarding visual QA with the current completed fixture
- Student Profile, Progress, and Chat
- Public future purchase/Billing flow

## Final statement

**NO APPLICATION CODE CHANGED: YES**



