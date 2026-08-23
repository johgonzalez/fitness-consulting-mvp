# PPerfil Database Baseline V1

**Sprint:** 0A - Technical Source-of-Truth Recovery
**Date:** 2026-08-22
**Mode:** verification and documentation only
**Repository snapshot:** branch `codex/initial-mvp`, commit `f5e7a33`, including the pre-existing working tree
**Product baseline:** PPerfil Product & UX Master Spec V1
**Audit baseline:** `docs/PPERFIL_TECHNICAL_AUDIT_V1.md`

**Sprint 0A disposition:** CLOSED WITH ACCEPTED TECHNICAL DEBT

No product feature, application code, migration, hosted database object, RLS policy, grant, bucket, Auth configuration, dependency, or environment variable was changed during Sprint 0A.

## 1. Supabase access status

### Status

**SUPABASE ACCESS: PARTIAL - READ-ONLY SECURITY CATALOG AVAILABLE; AUTH PLATFORM CONFIG AND LOCAL REPLAY TOOLING BLOCKED**

### Evidence

- Configured project hostname: `vozguhgopymvrzzarttr.supabase.co`.
- Locally linked project ref: `vozguhgopymvrzzarttr`.
- The configured hostname and linked ref agree.
- Public DNS resolves the API hostname.
- Supabase Management API identifies project `pperfil`, region `sa-east-1`, PostgreSQL 17. It initially reported `COMING_UP` and later reached `ACTIVE_HEALTHY`.
- After project recovery, authenticated CLI database reads succeeded.
- `supabase migration list --linked` returned a complete local/remote match for migrations `001-013`.
- `supabase gen types --linked` and inspect commands returned live public/private/storage metadata.
- The configured publishable key exactly matches the current project key returned by the authenticated Management API.
- A table-level REST request to `/rest/v1/trainer_profiles?select=id&limit=1` returned `200` with the configured publishable key. The root discovery endpoint `/rest/v1/` returned `401 Secret API key required`; this is endpoint-specific behavior and not evidence that the publishable key or REST data API is unavailable.
- `supabase db query --linked` provided safe, read-only access to `pg_catalog` and `information_schema`. This was used to verify current RLS flags, policies and expressions, grants, function definitions/ownership/ACLs/search paths, triggers, views, event-trigger dependencies and Storage configuration.
- Full schema dump and clean local replay remain blocked because the official CLI workflow requires a Docker-compatible runtime, and none is installed.

### Reason

The database is healthy and the security-critical application catalog is readable. Current RLS flags, policies, grants, functions, triggers, views and Storage state were verified directly. Hosted Auth service configuration remains unavailable through the installed CLI, and clean replay remains unavailable without a Docker-compatible runtime and versioned `supabase/config.toml`.

### What is required from the user

1. Install and start Docker Desktop or another Docker-compatible runtime approved for Supabase local development.
2. Generate and review a non-secret `supabase/config.toml`, then execute an isolated `supabase start` and `supabase db reset` against migrations 001-013.
3. Export relevant hosted Auth settings through the dashboard or a Management API configuration-read capability without exposing secrets.

No live schema claim in this document is inferred from repository state.

## 2. Live inventory summary

| Inventory area | Result | Evidence status |
|---|---|---|
| Project identity | `pperfil`, ref `vozguhgopymvrzzarttr`, `sa-east-1`, PostgreSQL 17 | CONFIRMED through Management API |
| Project runtime status | Transitioned from `COMING_UP` to `ACTIVE_HEALTHY` | CONFIRMED |
| REST availability | Table-level request succeeds with configured publishable key; root discovery endpoint requires a secret key | CONFIRMED |
| Migration history | Local and remote `001-013` match | CONFIRMED |
| Schemas/tables/columns | Public domain tables and columns match; private helper schema present | CONFIRMED for exposed metadata |
| Enums/constraints/FKs/indexes | Enums, FKs and expected indexes match; check expressions not exported | PARTIAL |
| Functions/triggers/views | 16 public/private functions verified; all are SECURITY DEFINER with fixed search paths; expected application trigger enabled; no public/private views | CONFIRMED |
| RLS policies/grants | RLS enabled on all 11 application tables; 22 application policies plus 3 Storage policies and current ACLs verified | CONFIRMED |
| SECURITY DEFINER functions | Definitions, owners, search paths and execute ACLs verified | CONFIRMED |
| Storage buckets/policies | `trainer-public-media` and its exact limit/MIME/public settings plus three owner-path policies verified | CONFIRMED |
| Auth configuration | Not readable through available connection | BLOCKED |

The database currently contains all repository migration versions. Since several migrations contain assertions that raise on failure, their presence also proves those gates completed when applied. It does not prove that no privileged drift occurred afterward.

## 3. Repository migration history

| Order | Migration | Repository purpose | Key objects/effects | Replay note |
|---:|---|---|---|---|
| 001 | `202608140001_foundation.sql` | Core public-site schema | `service_mode`, `template_id`, trainer profiles, services, testimonials, initial RLS/indexes | Self-contained relative to standard Supabase `auth` schema |
| 002 | `202608140002_saas_core_security.sql` | Tenant/security hardening | `professional_name`, operation-specific policies, onboarding/owner RPCs, column grants | Defines then exposes controlled SECURITY DEFINER functions |
| 003 | `202608140003_anon_least_privilege.sql` | Defense-in-depth grants | Revokes anonymous writes and authenticated DDL-style privileges | Depends on 001 tables |
| 004 | `202608140004_function_surface_hardening.sql` | Move ownership helper to private schema | `private.owns_trainer`, policy rewrites, public helper removal, revoke on `public.rls_auto_enable()` | Contains unversioned-object dependency; see section 5 |
| 005 | `202608140005_site_builder_foundation.sql` | Site builder, entitlements, public storage | service extensions, entitlements, custom requests, service RPCs, publication/template RPCs, public-media bucket/policies | Requires 004 to complete |
| 006 | `202608140006_sprint3_security_gate_assertions.sql` | Transactional security assertions | Tenant/storage/entitlement checks with rollback fixtures | A gate embedded in migration history |
| 007 | `202608140007_testimonial_context.sql` | Testimonial context and grants | Adds `result_context`; restores owner table privileges consistent with RLS | Additive |
| 008 | `202608140008_testimonial_security_assertions.sql` | Transactional testimonial security gate | Cross-trainer and public/private checks | A gate embedded in migration history |
| 009 | `202608140009_commercial_foundation.sql` | Launch entitlements/offers | template-specific flags, FREE defaults, commercial offers, purchase intents, RPC replacements | Mutates default publication behavior and existing data |
| 010 | `202608140010_commercial_security_assertions.sql` | Transactional commercial security gate | FREE/founder publication and intent assertions | A gate embedded in migration history |
| 011 | `202608140011_leads_beta.sql` | Public leads, matching, analytics | four tables, indexes, RLS/grants, six controlled RPCs | Anonymous RPC surface and PII creation introduced |
| 012 | `202608140012_leads_security_assertions.sql` | Lead policy/grant assertions | Corrects qualified cross-table policy reference; verifies grants/RLS | Important correction after 011 |
| 013 | `202608140013_leads_functional_security_gate.sql` | Transactional leads functional/security gate | Matching, isolation, entitlements, analytics assertions | Latest checked-in migration |

### Repository schema expected after 013

- Public domain tables: `trainer_profiles`, `services`, `testimonials`, `trainer_entitlements`, `custom_site_requests`, `commercial_offers`, `publication_purchase_intents`, `trainer_lead_settings`, `student_leads`, `lead_matches`, `analytics_events`.
- Application enums: `service_mode`, `template_id`.
- Private schema helper: `private.owns_trainer(uuid)`.
- Public-media bucket: `trainer-public-media`.
- No repository view or materialized view is defined.
- No realtime publication configuration is defined.

## 4. Clean replay result

### Result

**CLEAN MIGRATION REPLAY: NOT EXECUTED - BLOCKED**

### Environment constraints

- Docker is not available on the audit machine.
- `psql`/local PostgreSQL client and service are not available.
- WSL is not installed; Podman and another Docker-compatible runtime are also unavailable.
- The repository does not contain `supabase/config.toml`.
- The hosted project cannot be used for destructive or replay experiments. It is healthy and supplied the current application security catalog through read-only queries, but it cannot prove a clean replay.

Creating or repairing local Supabase configuration inside the repository would itself be a repository change beyond verification and was not performed. No production reset, migration, SQL statement, or schema mutation was attempted.

### Static replay finding

Migration 004 contains:

```sql
revoke all on function public.rls_auto_enable() from public, anon, authenticated;
```

No earlier checked-in migration creates that exact function. PostgreSQL `REVOKE ... ON FUNCTION` requires the referenced routine to exist. The live definition is the same as the optional auto-enable-RLS example in current Supabase documentation, but the documentation presents it as user-created configuration, not a guaranteed managed bootstrap object. Therefore migration 004 is not self-contained relative to migrations 001-003 and repository-only state cannot reproduce the chain unless the target baseline already contains this object.

### Required executable replay procedure

Once Docker/Supabase local prerequisites are available:

1. Use a temporary, isolated project directory outside the working repository.
2. Initialize standard Supabase local configuration there.
3. Copy the checked-in migrations unchanged and in chronological order.
4. Start a clean local Supabase stack.
5. Run the complete migration chain from 001 to 013.
6. Record the first failing statement, SQLSTATE, migration, and object.
7. Execute all checked-in SQL gates and compare resulting object definitions with the repository inventory.
8. Destroy only that isolated temporary stack.

The expected investigation point is migration 004 and `public.rls_auto_enable()`, but the result must be observed rather than assumed.

## 5. `rls_auto_enable` provenance

### Repository evidence

- Exactly one repository reference exists: the revoke in migration 004.
- No checked-in SQL, TypeScript, JavaScript, JSON, technical document, or local Supabase artifact defines `public.rls_auto_enable()`.
- No checked-in migration defines an event trigger that calls it.

### Live evidence

- Migration 004 is recorded as applied remotely.
- `public.rls_auto_enable()` exists and returns `event_trigger`.
- It is owned by `postgres`, is `SECURITY DEFINER`, uses `SET search_path TO 'pg_catalog'`, and has execute ACLs only for `postgres` and `service_role`.
- Enabled event trigger `ensure_rls` invokes it on `ddl_command_end` for `CREATE TABLE`, `CREATE TABLE AS` and `SELECT INTO`.
- Its direct catalog dependencies are schema `public` and language `plpgsql`; `ensure_rls` depends on the function. The body dynamically uses PostgreSQL event-trigger APIs and enables RLS on newly created `public` tables.
- The live definition matches the optional Supabase documentation example, but no checked-in migration, extension membership or other repository artifact records its creation.

### Provenance conclusion

**RLS_AUTO_ENABLE PROVENANCE: LIVE DEFINITION VERIFIED; CREATION IS UNVERSIONED MIGRATION PROVENANCE DEBT**

The function was most likely created by executing the documented optional Supabase recipe, either manually or through an uncommitted setup step; this is an evidence-based inference, not proven history. It is not supplied by migrations 001-003. Migration 004 therefore depends on prior state that is not reproducible from the checked-in chain alone.

### Safest remediation strategy

Do not change the hosted object or applied migration history. The safest remediation is to add an approved, idempotent pre-004 baseline migration (or perform a reviewed baseline squash for fresh environments) that creates the exact verified function and `ensure_rls` trigger, sets owner/search path, and revokes execution consistently before migration 004 runs. Because inserting history before an already-applied migration requires migration-history governance, the exact approach must be tested by clean replay and reviewed before application. No remediation was applied in Sprint 0A.

## 6. Migrations 005-013 live status

| Migration | Repository | Live status | Evidence |
|---|---|---|---|
| 005 site builder foundation | Present | APPLIED | Migration history plus live objects/columns |
| 006 Sprint 3 security gate | Present | APPLIED/PASSED AT APPLICATION | Migration history; failure would have aborted migration |
| 007 testimonial context | Present | APPLIED | Live `result_context` column |
| 008 testimonial security gate | Present | APPLIED/PASSED AT APPLICATION | Migration history; failure would have aborted migration |
| 009 commercial foundation | Present | APPLIED | Live tables, columns and RPC signatures |
| 010 commercial security gate | Present | APPLIED/PASSED AT APPLICATION | Migration history; failure would have aborted migration |
| 011 leads beta | Present | APPLIED | Live lead/analytics tables, indexes and RPC signatures |
| 012 leads security assertions | Present | APPLIED/PASSED AT APPLICATION | Migration history; corrected current policy body verified live |
| 013 leads functional security gate | Present | APPLIED/PASSED AT APPLICATION | Migration history; failure would have aborted migration |

**MIGRATIONS 005-013: ALL APPLIED LIVE.** Live objects, RLS policies, grants and function definitions agree with their expected repository outcomes. Clean replay remains the separate accepted reproducibility debt.

## 7. Repository/live diff

The diff below distinguishes confirmed live matches, the confirmed unversioned dependency, and the remaining hosted Auth configuration gap.

| Object/category | Repository state | Live state | Status | Risk | Recommended resolution |
|---|---|---|---|---|---|
| Migration history | 001-013 present | 001-013 applied | MATCH | Low | Preserve evidence; still verify clean replay |
| Schemas | `public`, `private`; depends on Supabase `auth`/`storage` | Public/private/storage metadata available | MATCH/PARTIAL | Medium | Full dump schema owners/ACLs |
| Tables | 11 public domain tables expected | Same 11 tables | MATCH | Low | Full dump check non-exposed/live-only schemas |
| Columns | Full expected set derived from migrations | Names/types/nullability/default optionality align | MATCH | Low | Verify exact defaults/checks with catalog dump |
| Enums | `service_mode`, `template_id` | Same labels/order | MATCH | Low | None beyond full dump confirmation |
| Constraints/FKs | Checks, uniques and FKs expected | FKs/uniques represented; check expressions unavailable | MATCH/PARTIAL | Medium | Compare exact check definitions/validation state |
| Indexes | Expected profile/service/testimonial/custom/commercial/lead/analytics indexes | Expected indexes present | MATCH | Low | Verify predicates/validity in full dump |
| Public functions | Expected RPC definitions plus unversioned `rls_auto_enable` | Definitions, owner, volatility, SECURITY DEFINER, search paths and ACLs verified | MATCH plus provenance debt | High | Version the pre-004 dependency through an approved baseline strategy |
| `private.owns_trainer` | Expected helper | Exact definition, owner, search path and execute grants match | MATCH | Low | Preserve in replay verification |
| `public.rls_auto_enable` | Referenced, not defined | Exists with documented body; owner `postgres`; SECURITY DEFINER; `search_path=pg_catalog`; restricted ACL | LIVE-ONLY/UNVERSIONED | High | Add reviewed reproducible provenance without mutating production yet |
| Triggers | Default-entitlements trigger expected | Expected trigger enabled; live-only `ensure_rls` event trigger also verified | MATCH plus provenance debt | High | Include `ensure_rls` in the approved baseline remediation |
| Views | None defined by repository | No public/private views in generated metadata | MATCH | Low | Full dump confirm non-exposed views |
| RLS enablement | Expected on all 11 public domain tables | Enabled on all 11; FORCE RLS disabled, owners are `postgres` | MATCH | Low | Preserve and recheck after clean replay |
| RLS policies | Owner/public/matched-trainer policies expected | All 22 application policies and expressions match the migration chain | MATCH | Low | Re-run checked-in functional gates after replay |
| Grants | Explicit table/column/function grants expected | Current effective grants match migration outcomes | MATCH | Medium | Preserve; document broad base grants constrained by RLS |
| Storage buckets | Public `trainer-public-media` expected | Public; 5 MB; JPEG/PNG/WebP; STANDARD | MATCH | Low | Preserve |
| Storage policies | Owner path writes; anonymous mutations revoked | Three expected authenticated owner-path policies match | MATCH | Low | Preserve and retest after replay |
| Auth configuration | Email/password/confirmation assumed by app | Public key current and table-level REST access succeeds; remaining settings unreadable | UNKNOWN/PARTIAL | High | Export relevant dashboard/API settings without secrets |

## 8. RLS/security baseline

### Repository assumptions

| Security property | Repository mechanism | Static status | Executed status |
|---|---|---|---|
| Trainer tenant isolation | `user_id`, `private.owns_trainer`, per-operation RLS | PRESENT | LIVE CATALOG VERIFIED |
| Owner-only writes | RLS plus Server Action owner filters | PRESENT | LIVE CATALOG VERIFIED |
| Public trainer projection | Published-row policy plus column grants omitting `user_id` | PRESENT | LIVE CATALOG VERIFIED |
| Public service projection | `get_public_services` hides non-public prices | PRESENT | LIVE FUNCTION VERIFIED |
| Entitlement enforcement | SECURITY DEFINER template/publication/leads RPCs | PRESENT | LIVE FUNCTIONS VERIFIED |
| Lead isolation | Matched-trainer lead policy and own-match policy | PRESENT after migration 012 | LIVE CATALOG VERIFIED |
| Storage ownership | First folder segment equals `auth.uid()` | PRESENT | LIVE CATALOG VERIFIED |
| SECURITY DEFINER hardening | Fixed `search_path`, explicit revokes/grants on exposed RPCs | PRESENT | ALL 16 PUBLIC/PRIVATE FUNCTIONS VERIFIED |
| Raw analytics protection | Direct table access revoked; RPC-only ingestion/aggregation | PRESENT | LIVE GRANTS/FUNCTIONS VERIFIED |
| SQL security gates | Migrations 006, 008, 010, 012, 013 plus `rls_isolation.sql` | PRESENT | MIGRATION GATES PASSED WHEN APPLIED; STANDALONE TEST NOT RE-RUN |

### Baseline conclusion

**SECURITY BASELINE: CURRENT LIVE RLS, ACL, FUNCTION, TRIGGER, VIEW AND STORAGE CATALOG VERIFIED AGAINST REPOSITORY EXPECTATIONS.** All embedded gate migrations are recorded as applied. The remaining identity/RLS risk is reproducibility: migration 004 depends on the unversioned `rls_auto_enable` object, and the chain has not been replayed locally from zero.

No security policy was weakened to bypass the blocked replay.

## 9. Storage baseline

### Repository state

- Expected bucket: `trainer-public-media`.
- Visibility: public.
- Limit: 5 MB.
- MIME types: JPEG, PNG, WebP.
- Authenticated insert/update/delete constrained to an object name whose first folder equals the authenticated UUID.
- Anonymous insert/update/delete explicitly revoked.

### Live state

`trainer-public-media` exists live as a public STANDARD bucket with a 5 MB limit and exactly JPEG, PNG and WebP allowed MIME types. The three authenticated owner-folder insert/update/delete policies match migration 005. Anonymous mutation privileges remain revoked by the repository grant chain.

### Risk

The application generates public URLs and relies on these policies. Missing or differing live bucket configuration can break uploads or weaken ownership. This bucket must not be generalized to future private student media.

## 10. Auth baseline

### Repository assumptions

- Supabase email/password signup and login.
- Email confirmation callback at `/auth/confirm`.
- Cookie-backed SSR session refresh.
- Protected trainer onboarding/dashboard routes.
- One trainer profile per `auth.users` identity.
- No service-role credential in application configuration.

### Hosted status

- Configured publishable key identity: **CURRENT/MATCHES MANAGEMENT API**.
- Direct REST behavior: **WORKING** for table-level access with the configured publishable key (`200`); root API discovery requires a secret key by design/current platform behavior.
- Email/password provider: **UNKNOWN**.
- Confirmation requirement: **UNKNOWN**.
- Site/redirect allowlist: **UNKNOWN**.
- leaked-password protection: historical audit says unavailable on the Free plan; current setting **UNKNOWN**.
- JWT/session/security settings: **UNKNOWN**.
- Auth hooks/triggers: **UNKNOWN**.

The read-only database role can see the `auth` schema and its 23 managed tables, and no project-owned non-internal Auth trigger was found. Provider, confirmation, redirect, password and JWT/session configuration is service configuration rather than authoritative PostgreSQL catalog state. The installed CLI exposes configuration push but no safe configuration-read command; completing this inventory requires Supabase Dashboard read access or a Management API Auth-configuration GET capability/credential.

### Required read-only inventory

Capture provider enablement, confirmation settings, site URL, allowed callback URLs, password protections, session/JWT settings relevant to architecture, and any hooks. Do not include secret values in the baseline document.

## 11. Risks

1. **Migration provenance debt:** migration 004 references a verified live object that migrations 001-003 do not create.
2. **Clean replay uncertainty:** no successful zero-to-latest replay and no versioned local Supabase config.
3. **Local tooling gap:** Docker-compatible runtime absence prevents the official isolated Supabase replay.
4. **Auth configuration visibility:** hosted provider/redirect/session settings remain outside the accessible read-only catalog.
5. **Security regression risk:** patching applied history without a reviewed baseline strategy could create diverging histories.

## 12. Required remediation

### Required before reconciliation design

1. Install and run Docker Desktop or another Docker-compatible runtime with at least the resources required by the Supabase local stack.
2. Generate/review and commit a non-secret `supabase/config.toml` through a separately approved remediation change.
3. In an isolated local stack, run migrations 001-013 unchanged and capture the expected first failure at migration 004 if `rls_auto_enable()` is absent from the clean Supabase bootstrap.
4. Design and review an idempotent pre-004 baseline migration or controlled baseline squash containing the exact verified `rls_auto_enable` function, `ensure_rls` event trigger, owner/search-path and ACL posture; do not apply it remotely until replay and history governance are approved.
5. Read the remaining hosted Auth settings through Dashboard or an approved Management API configuration-read capability.

### Explicitly not approved yet

- Editing migration 004.
- Creating/dropping `rls_auto_enable` live.
- Repairing migration history.
- Applying migrations 005-013.
- Changing RLS, grants, functions, triggers, buckets, Auth, or application code.
- Creating a schema diff migration.

Any such remediation requires a reviewed plan after the missing evidence is collected.

## 13. Recommended authoritative baseline

### Decision

**B - hosted production is accepted as the current authoritative operational baseline, with explicit reproducibility debt.**

### Rationale

- The hosted catalog is verified and migrations 001-013 are synchronized, so the hosted database is an evidence-backed operational source of truth for architecture design.
- Strategy A/full repository reproducibility cannot be claimed because clean replay is not proven and migration 004 has an unversioned dependency.
- A future Strategy C/reconciled baseline is likely appropriate after the provenance remediation passes clean replay and migration-history governance review.
- Accepting Strategy B operationally does not authorize treating live-only state as desirable or bypassing the debt-resolution gate.

Repository and live exposed schema substantially match. Production is authoritative operationally; the database is explicitly **not fully reproducible** and no new authorization migration is authorized by this decision.

## 14. Readiness for Sprint 0B

**READY FOR SPRINT 0B: YES - ARCHITECTURE DESIGN ONLY**

The verified hosted security catalog and exact local/remote migration parity are sufficient to design the identity/authorization architecture without implementation. They are not sufficient to claim full database reproducibility or to authorize production hardening, schema changes, new RLS, deployment, or public launch.

## 15. Accepted technical debt and closure decision

### Accepted technical debt

- A clean migration replay from 001 through 013 has not yet been proven.
- Migration 004 depends on the historically unversioned `public.rls_auto_enable()` function and its `ensure_rls` event trigger.
- The current hosted database security catalog has been verified directly, including RLS, policies, grants, SECURITY DEFINER functions, triggers, views and Storage security.
- Migrations 001-013 are synchronized local to remote.
- This debt **must be resolved before production hardening or public launch**.
- This debt does not block architecture design for PPerfil V1, provided no schema, migration, RLS, application or production implementation begins under this exception.

### Authority decision

The hosted production database is the current **authoritative operational baseline**. The synchronized repository migrations remain the intended versioned history, but the database must not be described as fully reproducible until the clean replay and migration-004 provenance debt are resolved.

This is a time-bounded risk acceptance for early-stage architecture work, not a waiver of the production-readiness gate.

### Debt-resolution exit criteria before production hardening/public launch

- Hosted project remains healthy and table-level REST access continues to succeed with the configured publishable key.
- Live application schemas, tables, functions, triggers, policies, grants and bucket security remain matched to the repository.
- Relevant hosted Auth settings are inventoried.
- Migrations 005-013 remain confirmed applied and their critical definitions are compared exactly.
- `rls_auto_enable` and `ensure_rls` are represented reproducibly in an approved migration baseline.
- Clean isolated replay from zero has PASS/FAIL evidence.
- A repository/live diff contains no `UNKNOWN` or unversioned dependency for baseline-critical objects.
- A reproducible authoritative baseline can be selected with an approved remediation plan where necessary.

---

**SPRINT 0A RESULT:** CLOSED WITH ACCEPTED TECHNICAL DEBT. The current live application security catalog is verified and migrations 001-013 are synchronized. Clean replay and migration-004 provenance remain unresolved and mandatory before production hardening/public launch. No production operation or automatic remediation was performed.
