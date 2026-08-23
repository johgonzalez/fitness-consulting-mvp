# PPerfil Identity and Authorization Architecture V1

**Sprint:** 0B - Architecture only
**Date:** 2026-08-22
**Implementation status:** NOT IMPLEMENTED
**Operational database baseline:** hosted PPerfil Supabase project, with the accepted Sprint 0A reproducibility debt recorded in `docs/PPERFIL_DATABASE_BASELINE_V1.md`
**Product baseline:** PPerfil Product & UX Master Spec V1

This document proposes identity, roles, trainer-student relationships, invitations and authorization for PPerfil V1. It does not authorize or contain migrations, application changes, RLS changes, Storage changes, payment implementation, Admin implementation, analytics expansion or deployment.

## 1. Architecture Summary

PPerfil should use one authentication identity per person, one application identity linked 1:1 to that authentication identity, and a many-to-many role assignment. Trainer and student are capabilities/domain personas, not mutually exclusive account types. A person may therefore be both a trainer and a student without a second login.

Trainer and student data remain separate domain profiles. A first-class, temporal `trainer_student_relationships` record connects them. The relationship is many-to-many over time and is the primary authorization boundary for trainer access to student-owned resources.

Invitations are one-time, expiring, auditable claims. A pending invitation does not create a student identity or active relationship. Acceptance by an authenticated user atomically links the invitation to the verified user, ensures the student profile/role exists, and creates or reactivates the relationship.

Leads remain acquisition records. Conversion creates a traceable bridge from a lead to an invitation, student and relationship; it never changes the lead row into the student domain record.

The architecture is global-ready: ISO country/currency identifiers, BCP 47 locale tags, IANA timezones, E.164 phones, localized content, international addresses and extensible credentials are the canonical model. Brazil-specific values remain optional extensions or legacy data to migrate.

## 2. Design Principles

1. **One person, one login:** `auth.users` authenticates; application/domain tables authorize and describe.
2. **Roles are additive:** users may hold trainer and student roles simultaneously.
3. **Relationships authorize:** trainer access to student data requires an active relationship and resource scope; role alone is insufficient.
4. **Student ownership is permanent:** a student profile is not owned by, nested under or permanently assigned to one trainer.
5. **Least privilege by default:** no authenticated-wide reads; no reliance on frontend filtering.
6. **Explicit lifecycle:** pending invitation, active relationship and historical relationship are distinct states.
7. **Global primitives first:** country, currency, locale, timezone, phone and credentials are not Brazil-specific.
8. **Minimize auth duplication:** verified login identifiers stay in Supabase Auth unless a domain snapshot is operationally required.
9. **Immutable acquisition lineage:** lead source and conversion history survive account/relationship creation.
10. **Private by default:** student health/fitness data and media never inherit the public trainer-site model.
11. **Server-controlled transitions:** invitation acceptance, relationship lifecycle and lead conversion occur through narrowly granted transactional functions.
12. **Test authorization behavior:** every RLS change requires positive, negative and cross-tenant tests.

## 3. Global-Ready Identity Model

### Auth identity

`auth.users` remains the authentication authority for login identifiers, password/OAuth/MFA state, verification and session lifecycle. Application tables reference `auth.users.id`; they do not copy password hashes, provider identities or authentication state.

Email and phone used for authentication should be read from verified Auth claims server-side. Invitations retain normalized delivery targets and immutable delivery snapshots because they are business/audit records, not alternate login authorities.

### Application identity

Proposed `app_users` is 1:1 with `auth.users`:

| Field | Purpose |
|---|---|
| `id uuid PK/FK auth.users(id)` | Stable application identity |
| `display_name text` | Private/general account display name, separate from public trainer branding |
| `locale text` | BCP 47 language/region tag, for example `pt-BR` or `en-US` |
| `timezone text` | IANA timezone, for example `America/Sao_Paulo` |
| `country_code text` | Optional ISO 3166-1 alpha-2 country of residence/operation |
| `created_at`, `updated_at` | Lifecycle/audit timestamps |

`app_users.id` intentionally equals `auth.users.id`; this avoids another identity mapping key. A user creates/owns their own app identity through an idempotent onboarding function or controlled trigger.

Canonical validation should use application logic plus database checks/reference data where stable:

- Country: ISO 3166-1 alpha-2 uppercase.
- Currency: ISO 4217 uppercase; do not assume every currency has two minor digits.
- Locale: BCP 47 tag.
- Timezone: IANA identifier.
- Phone: normalized E.164 plus optional raw display input and verification metadata.
- Address: structured components with country code and flexible administrative/locality fields; no universal Brazilian `state` rule.
- Money: integer minor units plus currency and, when required, an explicit scale; never floating point.

## 4. Role Model

Use a many-to-many `user_roles` table rather than a single role column:

| Field | Purpose |
|---|---|
| `user_id uuid FK app_users(id)` | Role holder |
| `role_code text` | Initially `trainer` or `student` |
| `granted_at timestamptz` | Audit timestamp |
| `granted_by uuid nullable` | System/self/admin grant origin where applicable |
| `revoked_at timestamptz nullable` | Soft lifecycle; null means active |

The primary/unique rule should prevent duplicate active assignments for `(user_id, role_code)`. Role codes should be centrally constrained, but `admin`/`operations` must not be seeded or granted in V1. Future internal roles require a separate security review, privileged provisioning path and claims strategy; merely inserting a row must not silently grant platform administration.

Why not a single role column:

- A trainer may train with another trainer and therefore needs the student role concurrently.
- Role replacement would incorrectly destroy an existing persona.
- Domain authorization depends on relationships and ownership, not only role labels.

Role membership is necessary but never sufficient to access another person's resources.

## 5. Trainer Domain

`trainer_profiles` remains the trainer domain aggregate and public-site identity. Its existing `user_id` continues to identify its owner. A future additive foreign key may also require that `user_id` exists in `app_users`; the UUID does not need to change.

Keep trainer-specific data out of `app_users`:

- public/professional display information;
- biography and specialties;
- services and availability;
- public-site branding and publication state;
- professional credentials;
- trainer entitlements and lead settings.

Brazil-specific `cref` must not remain the universal credential primitive. Proposed future `professional_credentials` stores:

| Field | Purpose |
|---|---|
| `id`, `trainer_profile_id` | Credential identity/owner |
| `credential_type` | Extensible type, not a global enum frozen to CREF |
| `issuing_country_code` | ISO country |
| `issuing_authority` | Organization/board |
| `credential_number` | Identifier, access-restricted where needed |
| `jurisdiction` | Optional region/state/province text |
| `status` | Claimed, verified, rejected, expired or revoked |
| `issued_on`, `expires_on`, `verified_at` | Lifecycle |

Existing `trainer_profiles.cref` should be preserved until a controlled backfill to a Brazil/CREF credential row is verified. It must not be silently reinterpreted for other countries.

## 6. Student Domain

Proposed `student_profiles` is a private domain profile with one row per application user acting as a student:

| Field | Purpose |
|---|---|
| `id uuid PK` | Domain identifier independent of auth ID |
| `user_id uuid UNIQUE FK app_users(id)` | Owning person/account |
| `preferred_name text` | Private display preference |
| `locale`, `timezone`, `country_code` | Optional domain overrides; otherwise inherit app identity |
| `created_at`, `updated_at` | Lifecycle |

Goals, preferences, measurements, assessments, progress, photos and messages do not belong in the identity row. They are separate private resources with their own retention and authorization semantics.

V1 should create a student profile only for an authenticated account. A trainer cannot create an impersonatable, login-capable student identity. Adding a person who is not yet registered creates an invitation; identity/profile creation occurs when that person authenticates and accepts. Adding an existing PPerfil student creates an invitation to that existing account without exposing whether the account exists.

## 7. Trainer-Student Relationship Model

### Cardinality

`trainer_profiles N:N student_profiles`, represented by `trainer_student_relationships`.

This supports:

- one trainer with many students;
- one student with multiple trainers, concurrently or historically;
- a trainer who is also a student;
- relationship history without reassigning student ownership.

### Proposed relationship

| Field | Purpose |
|---|---|
| `id uuid PK` | Stable relationship identifier |
| `trainer_profile_id uuid FK` | Trainer party |
| `student_profile_id uuid FK` | Student party |
| `status text` | `active`, `inactive` or `ended` |
| `origin text` | `invitation`, `lead_conversion` or future approved source |
| `origin_invitation_id uuid nullable` | Auditable invitation source |
| `origin_lead_id uuid nullable` | Auditable acquisition source |
| `started_at`, `inactive_at`, `ended_at` | Lifecycle timestamps |
| `created_by_user_id uuid` | Actor that initiated the relationship |
| `end_reason text nullable` | Controlled/private lifecycle reason |
| `created_at`, `updated_at` | Audit timestamps |

There should be at most one active relationship for a trainer/student pair, enforced by a partial unique index. Historical rows are retained. Reactivation should either reopen the most recent permissible relationship with an audit event or create a new row; the exact legal/audit choice is an open decision.

Authorization uses `status = 'active'`. An inactive/ended relationship does not grant broad access to current student data. Any continued access to trainer-authored historical records must be explicitly modeled per resource and retention policy, not inherited from the former relationship.

## 8. Invitation Model

Proposed `student_invitations`:

| Field | Purpose |
|---|---|
| `id uuid PK` | Internal invitation identity |
| `trainer_profile_id uuid FK` | Inviting trainer |
| `invited_email_normalized text nullable` | Delivery/claim target snapshot |
| `invited_phone_e164 text nullable` | Delivery/claim target snapshot |
| `token_hash bytea/text UNIQUE` | Hash of the one-time random token; never store plaintext |
| `status text` | `pending`, `accepted`, `expired`, `revoked` |
| `expires_at` | Short, explicit validity window |
| `accepted_by_user_id uuid nullable` | Authenticated accepting account |
| `accepted_at`, `revoked_at` | Terminal timestamps |
| `created_by_user_id`, `created_at` | Audit origin |
| `origin_lead_id uuid nullable` | Lead conversion lineage |

Security requirements:

- Generate at least 256 bits of cryptographically secure randomness; deliver plaintext only in the invitation link and store a SHA-256 or stronger token hash.
- Require HTTPS, one-time use, expiration and atomic acceptance.
- Acceptance requires an authenticated user and a verified Auth email/phone matching at least one invitation target, unless a separately reviewed support flow is used.
- Return generic request/claim responses so callers cannot enumerate accounts, invitations or contact registration.
- Revoke prior pending duplicates or return the existing logical invitation without sending multiple active tokens. Enforce one active invitation per trainer plus normalized target/source context.
- Never expose token hash, contact target or acceptance metadata to unrelated users.
- The acceptance transaction locks the invitation, rechecks state/expiry/contact, ensures `app_users`, student role and student profile, creates/reactivates the relationship, records acceptance and invalidates the token.
- Revocation is trainer-scoped while pending. Accepted invitations are immutable audit history.

An existing account and a new account follow the same claim path after authentication. Pre-login lookup must not reveal which path will occur.

## 9. Lead → Student Conversion

Approved transition:

`student_leads` → conversion request → `student_invitations` → authenticated `app_users`/`student_profiles` → `trainer_student_relationships(active)`.

Proposed `lead_conversions` records the orchestration:

| Field | Purpose |
|---|---|
| `id uuid PK` | Conversion identity |
| `lead_id uuid UNIQUE FK student_leads(id)` | Immutable acquisition source |
| `lead_match_id uuid nullable FK lead_matches(id)` | Trainer-match context |
| `trainer_profile_id uuid FK` | Converting trainer |
| `invitation_id uuid nullable FK` | Claim flow |
| `student_profile_id uuid nullable FK` | Resolved student |
| `relationship_id uuid nullable FK` | Resulting relationship |
| `status text` | `initiated`, `invited`, `completed`, `canceled`, `failed` |
| lifecycle timestamps | Audit and troubleshooting |

Only a trainer matched to the lead may initiate conversion, through a server-controlled function. Lead PII may seed an invitation delivery target but must not be copied wholesale into the student profile. The student confirms their own identity/profile data. Lead and match rows remain unchanged acquisition history, subject to retention/privacy policy.

## 10. Authorization Model

### Core predicates

Future private helper functions should be minimal, stable, SECURITY DEFINER only where required, schema-qualified, fixed `search_path`, owned by a controlled role and inaccessible to `anon` unless explicitly needed.

Conceptual predicates:

- `is_app_user(user_id)`: current `auth.uid()` equals application user.
- `is_trainer_owner(trainer_profile_id)`: preserves current trainer ownership semantics.
- `is_student_owner(student_profile_id)`: student profile belongs to `auth.uid()`.
- `has_active_student_relationship(trainer_profile_id, student_profile_id)`: current user owns the trainer and an active relationship exists.
- Resource-specific access combines ownership/relationship with the resource's student and trainer/relationship references.

Do not use mutable `user_metadata` for authorization. Roles stored in database tables are authoritative. JWT role claims may later be a cache/optimization only if issued from protected `app_metadata`, refreshed safely and never used without server-side revocation semantics.

### Mutation strategy

- Direct self-service writes are allowed only where simple RLS checks fully express ownership.
- Multi-table lifecycle transitions use transactional functions with narrow EXECUTE grants.
- Trainer-created student-domain records must carry `student_profile_id` and `trainer_student_relationship_id` (or equivalent provenance), so access is not inferred from a broad trainer role.
- Public/anonymous access remains limited to existing published trainer surfaces and explicitly controlled lead/analytics RPCs.
- Future Admin/Operations access is deny-by-default until a separate ADR, provisioning method and audit model are approved.

## 11. Conceptual RLS Matrix

| Resource | Trainer | Student | Public | Future Admin | Authorization basis |
|---|---|---|---|---|---|
| `trainer_profiles` | Own full profile | Published projection only, unless also owner | Published column-limited projection | Future reviewed support scope | Existing `trainer_profiles.user_id`; publication policy |
| `app_users` | Own row only | Own row only | None | Future reviewed support scope | `app_users.id = auth.uid()` |
| `user_roles` | Own active roles read; no arbitrary grant | Own active roles read; no arbitrary grant | None | Future privileged provisioning | `user_id = auth.uid()`; controlled grant function |
| `student_profiles` | Read minimum profile only through active relationship | Own read/update | None | Future reviewed support scope | Student ownership or active relationship |
| `trainer_student_relationships` | Read own trainer relationships; lifecycle mutations through RPC | Read own relationships; accept/end allowed transitions through RPC | None | Future audited operations | Trainer ownership or student ownership |
| `student_invitations` | Create/read/revoke own pending invitations through controlled APIs | Claim by token through RPC; limited accepted history | No listing; generic claim endpoint only | Future audited operations | Trainer ownership plus token/contact verification |
| `student_leads` | Existing matched-lead read only | No implicit access; data-subject workflow future | Controlled create RPC only | Future privacy operations | Existing lead match policy |
| `lead_conversions` | Own matched conversions | Own resolved conversion metadata only if needed | None | Future audited operations | Match ownership or resolved student ownership |
| workouts | CRUD only for active relationship and trainer-authored scope | Read own; student-permitted updates | None | Future audited support | Active relationship + student ID + author |
| workout sessions | Read related; update trainer fields only if active | Own create/read/update completion data | None | Future audited support | Student ownership or active relationship + field-safe RPC |
| assessments | CRUD trainer-authored records only while authorized | Own read; consented/self fields | None | Highly restricted future scope | Active relationship, authorship and student ownership |
| progress | Read/write scoped coaching entries | Own read/write | None | Highly restricted future scope | Student ownership or active relationship |
| measurements | Minimum necessary read/write while active | Own read/write | None | Highly restricted future scope | Student ownership or active relationship; sensitive classification |
| private photos | Signed access only to authorized objects | Own upload/read/delete | None | Exceptional audited access only | Private bucket path/object ACL + active relationship |
| messages | Participant-only | Participant-only | None | Future abuse/legal workflow only | Conversation membership; immutable sender identity |
| notifications | Own trainer notifications | Own student notifications | None | No default access | Recipient app user ID |
| payments | Trainer sees own commercial/payment scope | Student sees own payment obligations/history | None | Future finance role, not generic admin | Payment party/account IDs; provider webhooks server-only |

RLS cannot safely enforce field-level mutation differences by itself in every table. Use column grants, immutable columns, narrowly scoped functions or separate tables where trainer and student update different data.

## 12. Privacy / Private Storage Strategy

Student measurements, assessments, progress, photos and messages are sensitive private data. Apply data minimization, purpose limitation, explicit retention and auditable access.

Future private media must use a new private bucket, not `trainer-public-media`. Recommended object key shape:

`students/{student_profile_id}/{resource_type}/{random_object_id}`

Do not place email, phone, name or predictable filenames in object paths. Keep an application metadata row containing student owner, uploader, relationship/resource reference, MIME type, size, checksum, classification and lifecycle timestamps.

Access patterns:

- student uploads and reads their own objects;
- trainer receives short-lived signed access only when an active relationship and resource authorization are revalidated server-side;
- bucket is never public;
- signed URLs are short-lived, non-cacheable where appropriate and not stored as durable database URLs;
- deletion/retention is coordinated between metadata and Storage;
- future Admin access requires an exceptional audited workflow.

Sensitive fields should not be emitted into analytics events, logs or notification payloads. Logging uses opaque IDs and outcome codes.

## 13. Globalization Considerations

| Concern | Canonical direction | Brazil compatibility |
|---|---|---|
| Country | ISO 3166-1 alpha-2 | `BR` is one value |
| Currency | ISO 4217 + integer minor units/scale | `BRL` remains supported, not default universally |
| Locale | BCP 47 | `pt-BR` initial locale |
| Timezone | IANA timezone | `America/Sao_Paulo` is one value |
| Phone | E.164 normalized value | Convert valid Brazilian numbers to `+55…` |
| Address | Country-aware structured address | State/CEP become Brazil extension fields/mappings |
| Credentials | Type + authority + country/jurisdiction | CREF becomes a Brazil credential type |
| Content | Localized content records/fallback locale | Existing Portuguese copy is initial content |
| Service mode | Stable language-neutral codes | Migrate `presencial` → `in_person`, `both` → `hybrid` |
| Money | `amount_minor bigint`, currency, optional scale | Existing decimal BRL prices require controlled conversion |

Do not infer country from language, phone prefix, currency or timezone. Store only the dimensions needed by the use case.

## 14. Payment Extensibility Considerations

No payment schema or provider is selected in Sprint 0B. Future design must separate:

- platform SaaS customer/subscription;
- trainer connected payout account;
- student-to-trainer commercial order/payment;
- platform fee and settlement allocation;
- PSP/provider identifiers and webhook events;
- country/currency/capability constraints.

Use provider-neutral internal IDs and an adapter boundary. Provider references are external identifiers, not primary domain identity. Monetary amounts use integer minor units with ISO currency/scale. Store immutable transaction/ledger facts separately from mutable payment status. Stripe Connect or equivalent and local PSPs require a future ADR covering merchant-of-record, KYB, tax, payouts, refunds, disputes and reconciliation.

## 15. Compatibility With Existing Schema

### Compatible foundations

- `trainer_profiles.user_id → auth.users.id` already provides strong trainer ownership.
- `private.owns_trainer` and operation-specific policies should be preserved, not weakened.
- `student_leads` and `lead_matches` already preserve prospect and match identity separately.
- Existing SECURITY DEFINER conventions use fixed search paths and narrow grants.
- Existing security-gate migrations establish a useful test pattern.

### Gaps and localized assumptions

- No general application identity or multi-role assignment exists.
- No authenticated student domain or first-class trainer-student relationship exists.
- `student_leads` is prospect PII, not a student account/profile.
- `trainer_profiles.cref`, `city`, Brazilian-style state assumptions and digit-only phone handling are not global primitives.
- `service_mode` values `presencial`/`both` are language-specific stored codes.
- `services.currency` defaults to `BRL`, and decimal `price` is not a universal payment amount model.
- Current media bucket is intentionally public and unsuitable for student data.

No existing field should be destructively renamed or dropped in the first identity migration. Use additive structures, backfills, compatibility reads and explicit deprecation.

## 16. KEEP / REFACTOR / MIGRATE / BUILD Implications

| Classification | Implication |
|---|---|
| KEEP | Supabase Auth, trainer ownership, trainer public/private split, lead acquisition history, current RLS posture, controlled RPC pattern and security gates |
| REFACTOR | Ownership helpers into generalized identity/relationship predicates; onboarding so one user can acquire multiple roles; phone/address validation; field-level mutation boundaries |
| MIGRATE | CREF into extensible credentials; phones to E.164; locale/timezone/country fields; service-mode codes; future monetary values to minor units; existing trainer users into `app_users` + trainer role |
| BUILD | `app_users`, `user_roles`, `student_profiles`, `trainer_student_relationships`, `student_invitations`, `lead_conversions`, acceptance/conversion functions, RLS tests and future private-media metadata/bucket |

## 17. Proposed Schema Changes

Architecture proposal only; no SQL is created:

1. `app_users` — 1:1 application identity for every authenticated person.
2. `user_roles` — many-to-many additive role assignments.
3. `student_profiles` — student domain identity owned by one app user.
4. `trainer_student_relationships` — temporal N:N authorization relationship.
5. `student_invitations` — hashed, expiring, revocable invitation claims.
6. `lead_conversions` — immutable lead-to-invitation/student/relationship lineage.
7. `professional_credentials` — global credential model; may follow core identity if not needed immediately.
8. Future domain tables — workouts, sessions, assessments, progress, measurements, private-media metadata, conversations/messages, notifications and provider-neutral payments; not part of the first implementation scope.

Required constraints include unique `app_users.id`, unique student `user_id`, unique active role, one active trainer/student relationship per pair, unique invitation token hash, one active duplicate-safe invitation per trainer/target context, and one canonical conversion per lead unless product rules approve multiple conversions.

## 18. Proposed Migration Strategy

Do not implement until the Sprint 0A replay debt has an approved execution plan.

Proposed reviewed sequence:

1. **Reproducibility gate:** resolve/test migration-004 provenance in an isolated environment; no product schema yet.
2. **Identity foundation:** add `app_users` and `user_roles`; backfill existing trainer users idempotently; add trainer role; verify no orphan/duplicate identities.
3. **Student/relationship foundation:** add `student_profiles` and `trainer_student_relationships` with RLS/grants and helper predicates.
4. **Invitation foundation:** add invitations, token/expiry constraints and transactional create/revoke/accept functions.
5. **Lead conversion bridge:** add `lead_conversions` and matched-trainer conversion function without mutating lead history.
6. **Global compatibility:** add canonical country/locale/timezone/E.164 and credential structures; dual-read/backfill before legacy field retirement.
7. **Security gates:** run transaction-rolled-back cross-user, cross-role, inactive-relationship, invitation replay/expiry and lead-conversion tests after every phase.

Each migration must be additive and independently reviewable. Backfills must be deterministic and rerunnable. RLS must be enabled in the same transaction as new exposed tables. Grants default to none, then add the minimum. Functions use fixed search paths, explicit schemas, controlled owners and exact EXECUTE grants.

## 19. Risks

1. **Accepted baseline debt:** implementing migrations before clean replay can compound migration-004 provenance risk.
2. **Role-only authorization:** treating `trainer` as sufficient would expose unrelated students.
3. **Relationship lifecycle ambiguity:** inactive/ended access and historical record retention can produce privacy leakage if unspecified.
4. **Invitation account takeover:** weak tokens, contact mismatch or non-atomic acceptance could bind a student to the wrong user.
5. **Enumeration:** invitation/lead APIs can reveal registered contacts or trainer-client relationships.
6. **PII duplication:** copying Auth or lead fields into profiles creates conflicting authorities and retention problems.
7. **Global migration errors:** naive phone, currency or address conversion can corrupt legacy Brazil data.
8. **SECURITY DEFINER expansion:** broad functions or grants can bypass otherwise correct RLS.
9. **Private media leakage:** reusing public URLs/buckets would expose sensitive student photos.
10. **Future internal roles:** an under-designed Admin shortcut could bypass tenant boundaries without audit.

## 20. Open Decisions

1. May a student have multiple concurrent active trainers, or only multiple historical trainers? Architecture supports concurrent relationships; product policy must confirm.
2. What data may a trainer retain/read after a relationship becomes inactive or ended?
3. Can either party end a relationship unilaterally, and is reactivation a new record or a state transition?
4. Which verified contact must match an invitation when both email and phone are present?
5. What invitation expiration/resend limits and delivery providers are acceptable?
6. Can one lead convert to relationships with more than one matched trainer?
7. Which student data is classified as health/sensitive data, and what consent/retention/deletion rules apply by country?
8. Should `professional_credentials` enter the first identity release or a later global-profile sprint?
9. What canonical address structure and country coverage are required at initial launch?
10. What is the approved legacy migration policy for phone, service-mode and monetary fields?
11. Which hosted Auth providers, confirmation rules, MFA posture and redirect allowlist are approved?
12. Does any Master Spec language imply single-trainer student ownership? If so, the N:N global-ready privacy model should be explicitly approved rather than silently narrowed.

## 21. Recommended Sprint 1 Scope

Sprint 1 should implement only the identity and authorization foundation after the replay/provenance execution gate is approved:

- `app_users` and multi-role `user_roles`;
- idempotent backfill of current trainers and trainer roles;
- `student_profiles`;
- `trainer_student_relationships` with active/inactive/ended lifecycle;
- private helper predicates and complete RLS/grant matrix for those four domains;
- minimal invitation create/revoke/accept model and transactional functions if product answers the invitation open decisions before build;
- lead conversion bridge only after invitation acceptance semantics are approved;
- automated positive, negative, cross-tenant, dual-role and inactive-relationship SQL security tests;
- architecture-aligned type generation and documentation.

Explicitly exclude workouts, assessments, measurements, progress, photos, messages, notifications, payments, Admin/Operations portal, advanced analytics, provider integrations and production deployment.

Sprint 1 must not begin schema implementation until its migration plan explicitly accounts for the accepted Sprint 0A debt. Architecture work may proceed immediately.

---

**SPRINT 0B ARCHITECTURE COMPLETE — NO IMPLEMENTATION PERFORMED.**
