# PPerfil Sprint 1 Implementation

**Sprint:** 1 - Identity + Roles + Trainer-Student Foundation
**Date:** 2026-08-22
**Target project:** `pperfil` (`vozguhgopymvrzzarttr`)
**Result:** Implemented and verified
**Excluded:** student portal UI, workouts, assessments, progress, photos, chat, payments, finance, Admin, analytics expansion, PWA and deployment changes

## Schema Implemented

### `app_users`

One application identity per `auth.users` identity. Stores only application-facing identity preferences:

- `id` as PK/FK to `auth.users(id)`;
- optional display name;
- optional BCP 47 locale;
- optional IANA timezone string;
- optional ISO alpha-2 country code;
- lifecycle timestamps.

Authentication credentials, verified email, password/provider state and sessions remain in Supabase Auth.

### `user_roles`

Additive role assignments with `trainer` and `student` as the only V1 role codes. The composite primary key prevents duplicate assignments. Revocation metadata supports lifecycle without adding Admin/Operations roles.

Existing trainers were backfilled into `app_users` and given the active `trainer` role. An `AFTER INSERT` trigger maintains this invariant for future trainer profiles.

### `student_profiles`

Private student domain identity with one profile per app user. It intentionally contains no trainer ownership FK and no health/fitness data. A student can therefore participate in multiple trainer relationships without identity duplication.

### `trainer_student_relationships`

Temporal N:N relationship with:

- unique trainer/student pair;
- `active`, `inactive` and `ended` lifecycle;
- `invitation` or future `lead_conversion` origin;
- lifecycle timestamps and creating actor;
- reactivation through invitation acceptance, reusing the existing relationship row.

Only an active relationship authorizes a trainer to read the related student profile.

### `student_invitations`

Email-only V1 invitations with:

- normalized email target;
- 256-bit random one-time token;
- SHA-256 token hash as the only persisted token material;
- seven-day expiration;
- pending/accepted/expired/revoked lifecycle;
- duplicate rotation for the same trainer/email target;
- accepting user and audit timestamps.

Plaintext tokens are returned exactly once by the creation RPC for future delivery. They are never stored in the table or exposed by table grants.

`lead_conversions` was not added because the identity/invitation/relationship foundation is clean without it. It remains a next-sprint domain.

## Migrations

### `202608220001_identity_relationship_foundation.sql`

Adds the five tables, constraints, indexes, backfill, triggers, RLS policies, grants and controlled RPCs.

### `202608220002_identity_security_gate.sql`

Transactional functional/security gate. It creates temporary fixtures, exercises the complete lifecycle and rolls back all fixture data. A first execution found a test-harness role-reset issue after the foundation migration had committed. The still-unapplied gate was corrected to restore `postgres` explicitly for administrative assertions and then passed. No historical migration was edited and no destructive remediation occurred.

Final local/remote migration history matches for migrations 001-013 plus both Sprint 1 migrations.

## RLS Policies

All five new tables have RLS enabled.

| Table | Policies | Write surface |
|---|---|---|
| `app_users` | User reads/updates own identity | Direct update limited to non-identity preference columns; sync RPC available |
| `user_roles` | User reads own roles | No direct authenticated writes |
| `student_profiles` | Student reads/updates own profile; active related trainer may read | Direct update limited to `preferred_name` |
| `trainer_student_relationships` | Owning trainer or owning student may read | No direct authenticated writes; controlled lifecycle RPC |
| `student_invitations` | Inviting trainer may read | No direct writes; token hash excluded from SELECT grant; controlled RPCs |

Anonymous roles have no table access or invitation-function execution.

Private predicates:

- `private.owns_student(uuid)`;
- `private.has_active_student_relationship(uuid)`;
- existing `private.owns_trainer(uuid)` remains unchanged and authoritative.

All new SECURITY DEFINER functions are owned by `postgres`, use an empty fixed search path and have explicit grants. The two private authorization helpers are executable only by `authenticated`; trigger helpers are not client-executable.

## Application Primitives

Added domain types and narrow repository interfaces:

- `src/lib/domain/identity.ts`;
- `src/lib/domain/identity-repository.ts`.

Added server-only Supabase DAL implementations:

- `SupabaseIdentityRepository`;
- `SupabaseStudentRelationshipRepository`;
- `SupabaseStudentInvitationRepository`.

Every DAL operation revalidates the Supabase Auth user. Mutations delegate authorization and atomicity to controlled database RPCs. Returned values are mapped to minimal domain DTOs; token-bearing invitation creation remains server-only.

No dashboard, navigation or visual screen was redesigned.

## Controlled RPCs

| Function | Purpose |
|---|---|
| `ensure_my_app_user` | Idempotently synchronize current app identity/preferences |
| `get_my_app_identity` | Return current identity plus active role codes |
| `create_student_invitation` | Verify trainer ownership/role, rotate duplicates and return a one-time token |
| `revoke_my_student_invitation` | Revoke caller-owned pending invitation |
| `accept_student_invitation` | Validate token, state, expiry and confirmed email; atomically create student role/profile and relationship |
| `deactivate_my_trainer_student_relationship` | Allow either relationship party to deactivate an active relationship |

Invitation acceptance returns the same generic `invitation_invalid` error for missing, malformed, expired, revoked, accepted or contact-mismatched tokens, reducing enumeration signals.

## Tests and Security Gates

The Sprint 1 transactional gate proves:

- trainer app-user synchronization;
- trainer role synchronization;
- student profile creation on acceptance;
- trainer + student roles on one user;
- invitation creation and acceptance;
- existing-user invitation acceptance;
- relationship creation, deactivation and reactivation;
- relationship/student isolation between Trainer A and Trainer B;
- student profile ownership and cross-student denial;
- trainer role alone grants no student access;
- direct role escalation is rejected;
- direct relationship mutation is unavailable;
- anonymous access is unavailable;
- token hashes cannot be selected;
- inactive relationships revoke trainer access;
- expired and revoked invitations cannot be accepted;
- accepted invitations cannot be reused;
- existing trainer ownership remains isolated.

The legacy `supabase/tests/rls_isolation.sql` regression gate was executed remotely in a rollback transaction. All eight existing trainer ownership/public projection scenarios passed.

No temporary test user, invitation, relationship or profile persisted.

## Validation Results

| Gate | Result |
|---|---|
| Target project and status | PASS - linked `pperfil`, `ACTIVE_HEALTHY` |
| Pre-push parity | PASS - 001-013 matched; only two expected Sprint 1 files pending |
| CLI dry-run | PASS - exactly migrations `220001` and `220002`; no seed/role/config changes |
| Migration application | PASS after correcting unapplied gate harness |
| Final migration parity | PASS - all 15 versions synchronized |
| Sprint 1 SQL gate | PASS, including standalone rerun with rollback |
| Existing trainer RLS regression | PASS - 8/8 |
| TypeScript | PASS - `tsc --noEmit` |
| ESLint | PASS using the workspace Node 24 runtime |
| Next.js production build | PASS - Next.js 16.2.12 |
| Security catalog | PASS - RLS enabled and expected policy counts on all new tables |
| Function posture | PASS - owner/search path/ACL verified live |

Supabase Security Advisor reports generic warnings for authenticated-callable SECURITY DEFINER RPCs. These RPCs are intentionally authenticated entry points. Each derives the actor from `auth.uid()`, validates ownership/state internally, uses schema-qualified relations and a fixed empty search path, and is granted only to `authenticated` plus the managed `service_role`. No new anonymous SECURITY DEFINER warning was introduced.

The pre-existing leaked-password-protection warning and intentionally anonymous public-service/lead/analytics RPC warnings remain outside Sprint 1.

## Global-Ready Check

The new migrations and TypeScript primitives were scanned for `BR`, `BRL`, `CPF`, `CNPJ`, `CREF`, Brazilian phone/address validation and Portuguese-only identity assumptions.

Result: PASS. No Brazil-specific identity primitive or localized default was introduced. Test fixture phone values use non-Brazilian E.164-style numbers and have no domain validation effect. Existing Brazil-specific fields in earlier trainer/lead/payment-placeholder schema remain documented legacy compatibility work.

## Compatibility Notes

- Historical migrations 001-013 were not modified.
- Existing trainer profile ownership and public projection remain unchanged.
- Existing trainer rows are synchronized idempotently to app identities/roles.
- No lead row became a student profile.
- No current public Storage bucket or policy changed.
- No private media architecture was implemented.
- Existing UI routes build successfully without adopting the new primitives yet.

## Production Safety

- Target project ref and healthy status were revalidated before push.
- A dry-run identified the exact migration set.
- No reset, repair, drop, seed, data clone or destructive command ran.
- The security gate uses temporary data inside `BEGIN ... ROLLBACK`.
- The initial gate failure rolled back that gate's fixtures; the foundation migration remained valid and was inspected before rerunning only the pending gate.

## Accepted Debt

Sprint 0A debt remains accepted and unchanged:

- clean replay from migration 001 has not been proven;
- migration 004 depends on historically unversioned `public.rls_auto_enable()`;
- this must be resolved before production hardening/public launch.

Sprint 1 did not edit migration 004, `rls_auto_enable()` or `ensure_rls`.

## Known Limitations

- Email delivery UI/provider is not implemented; the server-only creation primitive returns the one-time token for a future delivery adapter.
- No student portal UI exists.
- No `lead_conversions` domain exists yet.
- Relationship history is represented by lifecycle timestamps on one row per trainer/student pair; a separate immutable event log is future work.
- Hosted Auth configuration and leaked-password protection remain an operational configuration dependency.
- Professional credentials and migration of legacy CREF/phone/address/currency fields are future work.
- Workouts, assessments, progress, measurements, private media, chat, notifications and payments are not implemented.

## Next Dependencies

Before Sprint 2 implementation:

1. Approve its precise domain scope and relationship-scoped resource model.
2. Decide whether lead conversion is the next bounded feature and define its retention/consent behavior.
3. Select an invitation email delivery adapter and callback route without exposing tokens in logs/analytics.
4. Define relationship end/reactivation audit requirements.
5. Preserve the clean-replay/provenance debt as a production-readiness gate.

Sprint 2 has not started.
