# PPerfil Sprint 3A — Overnight Review

## Status and timing disclosure

**Local implementation:** complete and checkpointed.

**Remote status:** migrations `202608220006` through `202608220009` were already applied and verified in the preceding interactive turn, under the authorization active at that time. The `UNATTENDED_SAFE` override was received only after that work completed. No hosted Supabase mutation occurred after this override became active. Reverting the already-applied migrations would be destructive and was not attempted.

This timing distinction is material:

- `REMOTE DATABASE MODIFIED DURING THIS OVERRIDE: NO`.
- `REMOTE DATABASE MODIFIED BEFORE THIS OVERRIDE: YES`.
- Current local/remote migration parity is through `202608220009` rather than the override's expected pre-work baseline of `202608220005`.

## Repository and checkpoint

- Repository root: `C:/Users/jogue/OneDrive/Documentos/Thiago Pesonal Treiner`
- Branch: `codex/initial-mvp`
- Checkpoint commit: `81ebeef` — `checkpoint: completed sprint 3A before overnight review`
- Push performed: no
- Merge performed: no
- Checkpoint scope: only the 12 Sprint 3A implementation files; unrelated dirty/untracked project work was deliberately excluded.

The requested commit named `checkpoint: before sprint 3A assessments` could not be created truthfully because the override arrived after Sprint 3A was complete. A post-implementation checkpoint was created before this review document was added. At checkpoint time the worktree contained 17 tracked modifications and 538 untracked files from earlier project work; committing the entire worktree would have mixed unrelated user work into the checkpoint.

## Baseline verification

- Before the Sprint 3A remote apply, local/remote migrations were confirmed synchronized through `202608220005`.
- After implementation, local/remote migrations are synchronized through `202608220009`.
- Final `supabase db push --linked --dry-run`: `upToDate: true`, no migrations, seeds or roles pending.
- A Next development server is running for this repository, but `.next/lock` was absent during this review. It was not stopped or restarted.

## Implemented locally

The Sprint 3A implementation includes:

- assessment domain types and discriminated question types;
- independent assessment repository and service boundaries;
- template and command validation;
- server-only Supabase adapter;
- relationship-scoped assessment lifecycle operations;
- versioned immutable template schemas;
- incremental student answer save and atomic submission;
- historical measurement extraction;
- append-only audit events;
- private student media metadata and storage-read authorization;
- seven RLS-protected application tables;
- three `pt-BR` system template definitions;
- four local-only fixture summaries (`DRAFT`, `SENT`, `ANSWERED`, `COMPLETED`);
- SQL functional, RLS, cross-tenant and storage tests;
- implementation documentation.

No Assessment UI, photo upload UI, notification, AI integration, workout, chat, finance or admin domain was implemented.

## Migration SQL summary

### `202608220006_assessment_foundation.sql`

Creates:

1. `assessment_templates`
2. `assessment_template_versions`
3. `assessments`
4. `assessment_answers`
5. `student_measurements`
6. `student_private_media`
7. `assessment_events`

It also creates validation/authorization helpers, lifecycle RPCs, RLS policies, immutability triggers, indexes, grants, three system template versions and the private `student-private-media` bucket.

### `202608220007_assessment_validation_volatility.sql`

Corrects the answer validator from `IMMUTABLE` to `STABLE` because date/time casts depend on stable database settings. It asserts volatility, invoker status and empty `search_path`.

### `202608220008_assessment_function_lint_cleanup.sql`

Removes two unused PL/pgSQL declarations detected by Supabase schema lint. The migration asserts the exact expected prior definitions and fails closed if provenance differs.

### `202608220009_assessment_relational_integrity.sql`

Adds composite foreign keys so measurements and media cannot mix a student, relationship or source assessment from different tenants. It also requires measurement answer timestamps to contain an explicit `Z` or numeric UTC offset.

No historical migration was modified.

## Assessment templates

The seeded PPerfil templates are:

- `INITIAL_V1` / `INITIAL` / default required;
- `MONTHLY_CHECKIN_V1` / `MONTHLY_CHECKIN`;
- `REASSESSMENT_V1` / `REASSESSMENT`.

All are `pt-BR`, use BCP 47 localized labels, stable question keys, explicit question types and immutable version 1 schemas. The content does not diagnose medical conditions. Custom templates are private to their owning trainer; students cannot browse templates.

## Lifecycle, answers and measurements

The only accepted lifecycle is:

`DRAFT → SENT → ANSWERED → IN_REVIEW → COMPLETED`

Every transition locks the assessment, checks the exact current state and active relationship, writes its timestamp and appends an event in the same transaction. Invalid transitions fail. Completed assessments reject further changes.

Students may upsert answers only while the assessment is `SENT`. Unknown keys, invalid types, invalid choices, duplicates, out-of-range scales, invalid dates, ambiguous measurement timestamps, invalid units and missing required answers fail server-side. Submission extracts each measurement into an append-only historical record in the same transaction.

Trainer feedback remains hidden from the student until `COMPLETED`.

## Private media foundation

- Bucket: `student-private-media`
- Public: false
- Maximum object size: 10 MiB
- MIME allowlist: `image/jpeg`, `image/png`, `image/webp`
- Public URL delivery: prohibited
- Client insert/update/delete storage policies: none

The student can read their own media. The owning trainer can read it only while the exact relationship is active. Inactive/ended trainers, unrelated authenticated users and anonymous users cannot read the metadata or object. Composite constraints prevent cross-relationship metadata/source mismatches.

## RLS and grants summary

- RLS enabled: all seven new application tables.
- Anonymous grants on those tables: zero.
- Direct authenticated mutation grants on assessments, answers, measurements, private-media metadata and events: zero.
- Lifecycle mutations: authenticated execute on narrow RPCs only.
- Security-definer operation/helper owner: `postgres`.
- Security-definer `search_path`: empty/fixed.
- Role-only authorization: denied; actual profile/relationship ownership is required.
- System template visibility: authenticated trainer profile plus active trainer role.
- Historical non-media reads: trainer and student relationship parties retain read-only access after inactive/ended.
- Historical private photos: student retains access; trainer does not after inactive/ended.

Final catalog observations:

- RLS tables: 7/7 enabled.
- System templates: 3.
- System template versions: 3.
- Operational assessment, answer, measurement, private-media and event rows: 0.
- Private bucket objects: 0.
- Supabase schema lint: no errors or warnings.

## Commands and tests executed

The following commands/workflows were executed during Sprint 3A and this review. Credential values are intentionally omitted; the direct SQL runner used ephemeral connection values returned by the linked Supabase CLI and never printed them.

### Repository and baseline

```powershell
git status --short
git rev-parse --show-toplevel
git branch --show-current
git diff --stat
git diff --check -- <Sprint-3A files>
Test-Path .next\lock
Get-CimInstance Win32_Process -Filter "Name = 'node.exe'"
node_modules\.bin\supabase.cmd migration list --linked
```

Results: correct repository and branch; pre-apply parity through `202608220005`; final parity through `202608220009`; no `.next/lock`.

### SQL preflight and security

Each new migration was executed through `psycopg` inside a remote transaction and rolled back before its apply. The assessment gate was executed in the same rollback transaction.

```text
MIGRATION_006_ROLLBACK_PREFLIGHT=PASS
SPRINT_3A_MIGRATION_PLUS_GATE_ROLLBACK=PASS
MIGRATION_007_PLUS_SPRINT_3A_GATE_ROLLBACK=PASS
MIGRATION_008_PLUS_SPRINT_3A_GATE_ROLLBACK=PASS
MIGRATION_009_PLUS_SPRINT_3A_GATE_ROLLBACK=PASS
SPRINT_3A_FINAL_REMOTE_GATE_ROLLBACK=PASS
```

The final post-apply rollback gates passed:

```text
supabase/tests/assessment_foundation_security.sql=PASS
supabase/tests/rls_isolation.sql=PASS
supabase/migrations/202608220002_identity_security_gate.sql=PASS
supabase/migrations/202608220004_lead_conversion_security_gate.sql=PASS
```

The legacy Sprint 1 gate contained an unscoped count of all live active relationships. For safe live regression execution only, the SQL was transformed in memory to scope that assertion to its fixture trainer IDs; the historical migration file was not modified. `RESET ROLE` statements were also transformed in memory to `SET LOCAL ROLE postgres` because the CLI login role reaches `postgres` through role switching. All fixture transactions rolled back.

### Supabase inspection and apply history

```powershell
node_modules\.bin\supabase.cmd db push --linked --dry-run
node_modules\.bin\supabase.cmd db push --linked --yes
node_modules\.bin\supabase.cmd db lint --linked --level warning
node_modules\.bin\supabase.cmd migration list --linked
```

Apply history before this override arrived:

- `202608220006_assessment_foundation.sql` applied.
- `202608220007_assessment_validation_volatility.sql` applied.
- `202608220008_assessment_function_lint_cleanup.sql` applied.
- `202608220009_assessment_relational_integrity.sql` applied.

Final dry-run: remote up to date. Final schema lint: no schema errors found.

### Application gates

```powershell
pnpm typecheck
pnpm lint
pnpm build
```

- TypeScript: pass (`tsc --noEmit`).
- ESLint: pass.
- Next 16.2.12 production build: pass; 20 pages generated/validated.

### Checkpoint

```powershell
git add -- <12 exact Sprint-3A files>
git diff --cached --stat
git diff --cached --check
git commit -m "checkpoint: completed sprint 3A before overnight review"
```

Result: local commit `81ebeef`, 12 files, 2,433 insertions. No push.

## Failures encountered and corrected

All failures remained within the three-attempt-per-distinct-failure policy; no indefinite loop occurred.

1. Migration preflight: `function jsonb_object_length(jsonb) does not exist`. Corrected with a count over `jsonb_object_keys`.
2. Static search-path assertion: `unsafe_assessment_function:private.can_access_student_private_media`. The catalog represents an empty path as `search_path=""`; assertion corrected to accept the authoritative representation.
3. Custom-version insert test: `permission denied for function validate_assessment_template_schema`. Minimal execute privilege was granted only to the safe invoker validation functions required by the table check.
4. Storage-policy evaluation: `permission denied for table student_private_media`. Metadata lookup was moved behind a fixed-search-path, security-definer boolean helper; no table grant was broadened.
5. Media path check: `invalid regular expression: invalid repetition count(s)`. The unsupported large regex bound was replaced with an explicit `char_length` constraint plus an unbounded character-class expression.
6. Anonymous bucket test: null result violated the test result `NOT NULL` constraint. It was rewritten as a boolean non-existence check; the authoritative bucket configuration remains separately asserted as `postgres`.
7. TypeScript: `TS2366: Function lacks ending return statement`. An explicit unreachable/default error branch was added to the question parser.
8. Legacy trainer regression: `permission denied for table rls_results` after `RESET ROLE`. The live test runner used `SET LOCAL ROLE postgres` in memory; source test remained unchanged.
9. Legacy Sprint 1 regression: `accepted invitations create active relationships` failed because its count included an existing live relationship. The runner scoped only that assertion to its fixture trainer IDs in memory; source migration remained unchanged.
10. Initial database lint warned that `validate_assessment_answer` was `IMMUTABLE` despite stable date/time casts and identified two unused variables. Forward-only migrations `007` and `008` corrected these issues. Final lint is clean.

No test or code gate remains failed or blocked.

## Open decisions

These behaviors remain intentionally unimplemented:

1. Trusted upload operation, content inspection, consent UX and short-lived signed URL delivery for assessment photos.
2. Whether a trainer customizes a reusable template by creating a new immutable version or creates an assignment-specific derivative. Current foundation supports new custom template versions; it does not mutate an assigned schema.
3. Explicit correction workflow for a completed assessment. Current records are immutable.
4. Notification/email behavior when an assessment becomes `SENT`.
5. Additional locale packs and localized system-template content beyond `pt-BR`.
6. Unit conversion/display policy and progress-chart presentation.
7. Photo retention, deletion and post-relationship consent policy beyond the restrictive current access rule.

Security ambiguity was resolved restrictively: no client photo mutations, no inactive trainer photo access and no role-only authorization.

## Files created in Sprint 3A

- `docs/PPERFIL_SPRINT_3A_ASSESSMENT_FOUNDATION.md`
- `src/data/demo/assessments.ts`
- `src/lib/assessments/service.ts`
- `src/lib/domain/assessment-repository.ts`
- `src/lib/domain/assessments.ts`
- `src/lib/supabase/assessments.ts`
- `src/lib/validation/assessments.ts`
- `supabase/migrations/202608220006_assessment_foundation.sql`
- `supabase/migrations/202608220007_assessment_validation_volatility.sql`
- `supabase/migrations/202608220008_assessment_function_lint_cleanup.sql`
- `supabase/migrations/202608220009_assessment_relational_integrity.sql`
- `supabase/tests/assessment_foundation_security.sql`

This review adds:

- `docs/PPERFIL_SPRINT_3A_OVERNIGHT_REVIEW.md`

No existing tracked file was modified by the Sprint 3A checkpoint. The wider worktree still contains unrelated earlier product changes and was preserved.

## Git diff summary

Checkpoint `81ebeef`:

```text
12 files changed, 2433 insertions(+)
```

The overnight review document is intentionally outside that checkpoint so the checkpoint represents the implementation state at receipt of the override.

## Exact morning review steps

The linked hosted project is already migrated. Do **not** reapply or roll back migrations. Use this safe review sequence:

1. Inspect the local checkpoint without changing the worktree:

   ```powershell
   git show --stat --oneline 81ebeef
   git show --check 81ebeef
   ```

2. Review the SQL in order:

   ```powershell
   Get-Content -Raw supabase/migrations/202608220006_assessment_foundation.sql
   Get-Content -Raw supabase/migrations/202608220007_assessment_validation_volatility.sql
   Get-Content -Raw supabase/migrations/202608220008_assessment_function_lint_cleanup.sql
   Get-Content -Raw supabase/migrations/202608220009_assessment_relational_integrity.sql
   ```

3. Confirm linked migration parity read-only:

   ```powershell
   node_modules\.bin\supabase.cmd migration list --linked
   node_modules\.bin\supabase.cmd db push --linked --dry-run
   ```

   Expected: local and remote through `202608220009`; dry-run `upToDate: true` with no pending migration, seed or role.

4. Run static schema lint read-only:

   ```powershell
   node_modules\.bin\supabase.cmd db lint --linked --level warning
   ```

   Expected: `No schema errors found`.

5. Re-run local application gates:

   ```powershell
   pnpm typecheck
   pnpm lint
   pnpm build
   ```

6. Review `supabase/tests/assessment_foundation_security.sql`. If executing it against the hosted database, use a verified `postgres` transaction runner and confirm the final `ROLLBACK`; never run it through a client role or after removing the rollback.

7. Inspect the Supabase catalog read-only and verify:

   - 7/7 new tables have RLS;
   - no anonymous table grants;
   - no direct authenticated lifecycle mutation grants;
   - all lifecycle security-definer functions have owner `postgres` and empty `search_path`;
   - `student-private-media` is private, 10 MiB, JPEG/PNG/WebP;
   - three system templates and three version rows exist;
   - no fixture operational rows or private objects exist.

8. Review the open decisions above. Do not begin UI/Sprint 3B until the Product Owner separately authorizes it.

If reviewing a different Supabase environment where migrations `006`–`009` are genuinely pending, first confirm parity through `005`, run all four migrations plus the security gate inside one rollback transaction, inspect `db push --dry-run`, obtain attended human approval and only then apply. That instruction does not authorize applying to the currently linked project again.

## Final assessment

`READY FOR HUMAN REVIEW — REMOTE MIGRATION WAS ALREADY APPLIED BEFORE THE UNATTENDED OVERRIDE`

No Sprint 3B work was started.
