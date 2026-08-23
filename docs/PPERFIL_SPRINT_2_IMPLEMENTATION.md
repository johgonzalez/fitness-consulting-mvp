# PPerfil Sprint 2 — Lead Conversion + Student Management

## Scope delivered

Sprint 2 connects the existing lead acquisition domain to the Sprint 1 identity, invitation, student profile, and trainer–student relationship foundation. It does not implement workouts, assessments, progress, finance, chat, redistribution, or Sprint 3 features.

## Schema changes

Migration `202608220003_lead_conversion_student_management.sql` is additive and forward-only:

- `lead_matches.reserved_until` is derived from `created_at + 3 days` by a database trigger.
- Lead match states are `new`, `pending`, `converted`, and `rejected`; `expired` is a server-derived state when an open reservation passes its deadline.
- Terminal timestamps are stored in `converted_at` and `rejected_at`.
- `student_invitations.invited_name` preserves the manual/lead display name without creating a student prematurely.
- `lead_conversions` preserves the lead, selected match, trainer, invitation, conversion time, and eventual student/relationship linkage.
- One lead may be converted only once in V1. Conversion closes other open reservations for that lead atomically; no redistribution is implemented.

Migration `202608220004_lead_conversion_security_gate.sql` contains static privilege assertions and rollback-only functional fixtures.

## Lead lifecycle

`NEW/PENDING -> CONVERTED` and `NEW/PENDING -> REJECTED` are the only supported terminal decisions. `EXPIRED` is derived from the authoritative database deadline. Rejected, expired, and converted leads cannot be converted. Leads are never deleted or transformed into student rows.

`reject_my_lead(uuid)` and `convert_my_lead(uuid)` lock the assigned match, verify trainer ownership, validate state and deadline, and execute the mutation transactionally. Conversion also creates the Sprint 1 invitation and inserts the audit record.

## Invitation integration

Manual addition calls `create_named_student_invitation`; lead conversion calls the existing `create_student_invitation`. Both use the same token hashing, seven-day expiry, verified-email acceptance, and one-pending-invitation rules from Sprint 1.

`accept_student_invitation` was forward-replaced to:

- reuse an existing `app_users` row;
- reuse an existing `student_profiles` row;
- reuse/reactivate the unique trainer–student relationship;
- mark lead-origin relationships as `lead_conversion`;
- complete and link the corresponding `lead_conversions` row.

No email provider is configured. The plaintext token is returned only at creation and the application renders a one-time development invitation link. Production delivery still requires a transactional email adapter, templates, sender-domain verification, delivery telemetry, and secret management.

## Student management

Routes:

- `/dashboard/students` — All, Active, and Inactive views plus pending/expired invitations and manual Add Student.
- `/dashboard/students/[relationship-id]` — real Overview data and relationship action; future product sections are visibly disabled.
- `/invite/[token]` — authentication-aware invitation acceptance entry point.

An active trainer relationship may expose the student's account email through the controlled `get_my_students` and `get_my_student_detail` RPCs. Inactive/ended relationships receive no contact email. Deactivation preserves the row and timestamps; a later invitation acceptance reactivates that same unique relationship.

## Authorization and RLS

`lead_conversions` has RLS enabled. Trainers can read only their own conversions; a linked student can read only their own completed conversion. There are no direct insert/update/delete grants for application roles.

All lifecycle mutations are `SECURITY DEFINER`, have an empty `search_path`, authenticate via `auth.uid()`, and verify resource ownership rather than trusting role membership alone. Student list/detail RPCs return a deliberately limited projection and do not grant access to `auth.users`.

The Sprint 2 gate proves cross-trainer lead mutation denial, cross-tenant student/conversion read denial, cross-tenant relationship mutation denial, student isolation, duplicate conversion denial, expired/rejected conversion denial, invitation acceptance linkage, manual invitation, and identity/relationship reuse.

## UI direction

Students uses the approved Matrix Dark direction: near-black surface, restrained purple accent, compact operational rows, clear status labels, and no fabricated metrics. The existing dashboard and lead configuration surfaces were not redesigned. Navigation gained only the Students entry required by the sprint.

## Analytics

No new analytics events were added. The existing `analytics_events` check constraint is intentionally narrow; expanding it solely for optional events would increase scope. Essential lifecycle state remains auditable in domain timestamps and `lead_conversions`.

## Validation

- Hosted target verified as `pperfil` / `vozguhgopymvrzzarttr`, `ACTIVE_HEALTHY`.
- Migration parity verified before apply; dry-run selected only 003 and 004.
- Hosted schema lint: no errors.
- Sprint 2 transactional security gate: passed.
- TypeScript: passed.
- ESLint: passed using the bundled modern Node runtime.
- Next.js production build: passed.
- Local clean database replay was unavailable because Docker/Podman is not installed. Historical clean replay status remains governed by the accepted Sprint 0A provenance debt; hosted forward migration parity is current.

## Limitations and next dependencies

- Transactional email delivery is not configured; development link handoff is intentional and must not be treated as production delivery.
- Lead expiry does not redistribute a lead.
- An inactive student's email is intentionally not returned; reactivation requires entering the known email to issue a fresh verified invitation.
- `ENDED` remains supported in the relationship schema but this sprint exposes only the approved deactivate/reactivate action.
- The legacy public lead capture retains its historical WhatsApp/location assumptions. Sprint 2 introduces no new country-specific student identity fields or validation.
- Workouts, assessments, progress, finance, history content, and advanced analytics remain future dependencies.
