# PPerfil Sprint 3A — Assessment Foundation

## Scope and outcome

Sprint 3A adds the secure, relationship-scoped foundation for assessments. It does not add assessment screens, notifications, photo upload, progress charts or AI. The authoritative database changes are `202608220006_assessment_foundation.sql` plus the forward-only hardening migrations `202608220007_assessment_validation_volatility.sql`, `202608220008_assessment_function_lint_cleanup.sql` and `202608220009_assessment_relational_integrity.sql`. They are additive, follow migration `202608220005` and do not rewrite migration history.

The lifecycle is deliberately small and explicit:

`DRAFT → SENT → ANSWERED → IN_REVIEW → COMPLETED`

There is no generic `PENDING` status. Each transition locks the assessment row, verifies the current state and relationship authorization, writes the transition timestamp and appends an event in the same PostgreSQL transaction.

## Schema

| Table | Responsibility | Mutability |
| --- | --- | --- |
| `assessment_templates` | Logical system or trainer-owned template | System ownership is immutable; owner may edit custom metadata |
| `assessment_template_versions` | Versioned question schema | Immutable after insertion |
| `assessments` | Assignment inside one trainer-student relationship | Only controlled lifecycle transitions |
| `assessment_answers` | Incrementally saved student answers | Upsert only while `SENT`; read-only after submit |
| `student_measurements` | Historical numeric progress facts | Append-only |
| `student_private_media` | Consent and storage metadata for future private photos | No client mutation surface in Sprint 3A |
| `assessment_events` | Lifecycle/audit history | Append-only |

Foreign keys use `RESTRICT` for historical records. Composite foreign keys guarantee that each measurement/media record belongs to the same student and relationship and that an optional source assessment belongs to that same relationship. Relationship, template version and actor identity cannot be silently removed from history. Foreign-key and RLS predicate columns are indexed; measurement history is indexed by student, code and descending timestamp.

## System templates

Three PPerfil-owned `pt-BR` templates are seeded with deterministic support IDs and immutable version 1 schemas:

1. `INITIAL_V1` / `INITIAL` — required by default; covers objective, experience, availability, context, preferences, self-reported limitations and optional measures.
2. `MONTHLY_CHECKIN_V1` / `MONTHLY_CHECKIN` — tracks sessions, difficulty, energy, sleep, discomfort, satisfaction, obstacles, next goal, optional weight and photo request.
3. `REASSESSMENT_V1` / `REASSESSMENT` — tracks perceived changes, goal progress, consistency, goal revision, measurements, optional photos and coaching feedback.

The safety copy makes clear that the forms do not perform medical diagnosis. System templates are readable only by authenticated users who have a real trainer profile and an active trainer role. A role row alone is insufficient. Students cannot browse templates.

## Template versioning and question schema

`assessment_template_versions.schema` is validated in PostgreSQL and parsed independently in TypeScript. A schema contains a localized `questions` array and optional metadata. Every question has a stable lower-snake-case key, supported type, required flag and BCP 47 localized label. Descriptions are optional localized objects.

Supported types:

- `SHORT_TEXT`, `LONG_TEXT`
- `SINGLE_CHOICE`, `MULTI_CHOICE`
- `NUMBER`, `BOOLEAN`, `SCALE`, `DATE`
- `MEASUREMENT`, `PHOTO_REQUEST`

Choice values and options are stored in the immutable version. Scale bounds, measurement codes and explicit unit-code allowlists are part of that version. Duplicate question keys, option values, units or measurement codes fail validation. Existing assessments reference the exact version row and therefore never change when another version is created.

Custom templates use `assessment_type = CUSTOM`, belong to one trainer profile and are visible only to that owner. Ownership and `system_key` cannot change after insertion. Version rows cannot be updated or deleted, including through privileged accidental writes, because a database guard trigger rejects those operations.

## Lifecycle operations

Application actors use narrowly granted functions instead of direct DML:

| Function | Actor and precondition | Atomic effect |
| --- | --- | --- |
| `create_assessment_from_template` | Owning trainer; active relationship; available version | Creates `DRAFT` plus `CREATED` event |
| `send_assessment` | Owning trainer; `DRAFT`; active relationship | Sets `SENT`, `sent_at`, event |
| `save_assessment_answer` | Relationship student; `SENT`; active relationship | Validates/upserts answer plus event |
| `submit_assessment` | Relationship student; `SENT`; active relationship | Validates all answers, extracts measures, sets `ANSWERED`, event |
| `start_assessment_review` | Owning trainer; `ANSWERED`; active relationship | Sets `IN_REVIEW`, timestamp, event |
| `complete_assessment` | Owning trainer; `IN_REVIEW`; active relationship | Stores feedback, sets `COMPLETED`, timestamp, event |

All functions are `SECURITY DEFINER`, schema-qualify objects, use an empty fixed `search_path`, derive the actor from `auth.uid()` and have explicit `authenticated` execute grants. Anonymous execution is revoked. Direct mutation of assessments, answers, measurements, media metadata and events is not granted to application roles.

`get_my_assessment` and `list_my_assessments` are controlled historical read operations. Before completion, student retrieval returns `trainer_feedback = null`; the trainer may inspect it. Feedback becomes visible to the student only in `COMPLETED`.

## Answer validation

Validation happens again inside PostgreSQL, even if the caller uses the TypeScript validator:

- unknown question keys fail;
- text size and non-empty values are checked;
- selected choices must exist in the immutable version;
- duplicate multi-choice values fail;
- scale values must remain inside the version bounds;
- dates must be valid ISO calendar dates;
- measurement values must be numeric and bounded;
- measurement units must belong to the question allowlist;
- measurement timestamps must be timezone-aware parseable values;
- required questions are rechecked during submit.

Submission and measurement extraction share the same transaction. A missing or invalid answer rolls back the entire submit, including any measurement already visited by the loop.

## Measurement model

Measurements are independent historical rows rather than mutable fields on `student_profiles` or values available only inside answer JSON. Each row stores:

- extensible `measurement_code`;
- numeric `value` and explicit `unit_code`;
- timezone-safe `measured_at`;
- relationship and student scope;
- source assessment when applicable;
- recording actor and creation time.

Rows are append-only. The unique `(source_assessment_id, measurement_code)` index prevents duplicate extraction from one assessment while permitting the same code across history. Unit conversion and presentation localization remain future application-layer responsibilities.

## Private media foundation

The `student-private-media` bucket is private and capped at **10 MiB per object**. The initial MIME allowlist is JPEG, PNG and WebP. No public object URL is part of the model.

`student_private_media` records storage path, media/view type, MIME type, size, consent version/time, relationship, student, optional source assessment and deletion marker. Storage object reads call a fixed-search-path security helper that resolves the metadata row and authorization:

- the student can read their own current or historical media;
- the owning trainer can read only while that exact relationship is `active`;
- inactive/ended trainers, unrelated authenticated users and anonymous users cannot read;
- the bucket remains `public = false`;
- there are no client upload, update or delete storage policies in Sprint 3A.

Future upload must use an authorized server operation that writes object and metadata consistently, validates file content (not only declared MIME), records consent and returns short-lived signed access. The metadata `storage_path` is not itself a public URL.

## RLS and historical access

All seven application tables have RLS enabled in the creating migration. Authorization is based on authenticated identity plus ownership of the trainer/student side of the referenced relationship; a role code never grants tenant access by itself.

For `active` relationships, the trainer can create/send/review/complete and the student can save/submit. For `inactive` or `ended` relationships, both parties retain read-only access to historical non-media assessments, answers, measurements and events. All lifecycle/content mutations require `active`. The trainer loses private-photo access immediately when the relationship ceases to be active; the student retains access to their own media.

## Assessment events

Event types are `CREATED`, `SENT`, `ANSWER_SAVED`, `SUBMITTED`, `REVIEW_STARTED` and `COMPLETED`. They record assessment, actor, optional JSON metadata and UTC timestamp. Application roles have no event insertion/update/delete privilege. A trigger rejects updates and deletes even if an accidental privileged statement is attempted.

## Application layer

The assessment boundary is separate from the trainer repository:

- `src/lib/domain/assessments.ts` — domain types, question union, measurements and private-media access intent;
- `src/lib/domain/assessment-repository.ts` — assessment, template and progress repository interfaces;
- `src/lib/validation/assessments.ts` — BCP 47/template parser and command validation;
- `src/lib/assessments/service.ts` — use-case boundary;
- `src/lib/supabase/assessments.ts` — server-only Supabase adapter and RPC mapping;
- `src/data/demo/assessments.ts` — four local-only state examples (`DRAFT`, `SENT`, `ANSWERED`, `COMPLETED`).

The adapter revalidates the current Supabase user before every call. Client-side or TypeScript checks are usability boundaries; PostgreSQL functions, grants and RLS are authoritative.

## Security and regression tests

`supabase/tests/assessment_foundation_security.sql` runs in a transaction and rolls back all fixtures. It covers:

- system/custom template visibility and version immutability;
- required-answer and immutable-choice validation;
- the complete lifecycle, transition timestamps and event count;
- answer ownership and post-submit immutability;
- atomic measurement extraction with explicit unit/source;
- pre-completion feedback hiding;
- completed-assessment immutability;
- Trainer A/Trainer B and Student A/Student B isolation;
- role-only denial;
- active versus inactive mutation and historical-read rules;
- metadata and `storage.objects` authorization for student, active trainer, inactive trainer, cross-tenant actor and anonymous actor;
- absence of anonymous table/RPC access.

The migration has additional fail-closed assertions for RLS enablement, anonymous grants, forbidden direct mutations, bucket configuration and fixed `search_path` on all new `SECURITY DEFINER` functions.

Required verification sequence:

1. Confirm local/remote migration parity through `202608220005`.
2. Run migration 006 plus the Sprint 3A gate in one remote transaction and roll it back.
3. Run TypeScript, ESLint and production build.
4. Re-run existing trainer RLS, Sprint 1 identity/relationship and Sprint 2 conversion gates in rollback transactions.
5. Inspect `supabase db push --linked --dry-run` and ensure only the reviewed Sprint 3A migration is pending.
6. Apply the Sprint 3A migrations without reset or destructive seed.
7. Re-run Sprint 3A and regressions against the live catalog with fixture rollback.
8. Verify local/remote migration parity and catalog assertions.

## Global-ready decisions

- Template locale and every localized label use BCP 47.
- Text supports Unicode and no Brazil-only identity field was added.
- All lifecycle and measurement times use `timestamptz`.
- Measurements never infer kg/cm; every value carries an explicit unit code allowed by its immutable question version.
- Internal status/type codes are locale-neutral.
- Question keys, option values and measurement codes are stable technical identifiers, separate from translated presentation labels.

## Known limitations and Sprint 3B dependencies

- No assessment list, creation, trainer review or student questionnaire UI exists yet.
- `PHOTO_REQUEST` is schema-ready, but there is no upload operation or photo UX. A submitted photo answer can only reference media produced by a future trusted upload flow.
- No signed-URL service is exposed yet; direct public URLs are prohibited.
- No notification/email is sent when an assessment moves to `SENT`.
- No correction/version workflow exists for completed assessments; they intentionally remain immutable.
- Unit conversion, progress charts, comparison views and translated template packs are future work.
- Trainer-custom template authoring UI is not implemented.
- The accepted migration 004 clean-replay provenance debt remains unchanged and outside Sprint 3A.

Sprint 3B may consume these repository/service operations and must preserve the same database lifecycle, answer validation and RLS boundary rather than reproducing transitions in React code.
