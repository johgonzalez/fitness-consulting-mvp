-- Sprint 4A: relationship-scoped, versioned workout programming foundation.
-- Workout execution/session logging and external AI invocation are intentionally out of scope.

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  owner_trainer_id uuid references public.trainer_profiles(id) on delete restrict,
  source_type text not null,
  name text not null,
  normalized_name text not null,
  slug text,
  description text,
  primary_muscle_group text not null,
  secondary_muscle_groups text[] not null default '{}'::text[],
  equipment text[] not null default '{}'::text[],
  movement_pattern text,
  instructions text not null,
  coaching_cues text[] not null default '{}'::text[],
  locale text not null default 'pt-BR',
  status text not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exercises_source_type_check check (source_type in ('PPERFIL_LIBRARY', 'TRAINER_CUSTOM')),
  constraint exercises_ownership_check check (
    (source_type = 'PPERFIL_LIBRARY' and owner_trainer_id is null)
    or (source_type = 'TRAINER_CUSTOM' and owner_trainer_id is not null)
  ),
  constraint exercises_name_check check (char_length(trim(name)) between 2 and 160),
  constraint exercises_normalized_name_check check (
    char_length(trim(normalized_name)) between 2 and 160
    and normalized_name = lower(trim(normalized_name))
  ),
  constraint exercises_slug_check check (slug is null or slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint exercises_description_check check (description is null or char_length(trim(description)) between 2 and 2000),
  constraint exercises_primary_muscle_check check (primary_muscle_group ~ '^[a-z][a-z0-9_]{1,63}$'),
  constraint exercises_secondary_muscles_check check (cardinality(secondary_muscle_groups) <= 24),
  constraint exercises_equipment_check check (cardinality(equipment) <= 24),
  constraint exercises_movement_pattern_check check (
    movement_pattern is null or movement_pattern ~ '^[a-z][a-z0-9_]{1,63}$'
  ),
  constraint exercises_instructions_check check (char_length(trim(instructions)) between 2 and 5000),
  constraint exercises_coaching_cues_check check (cardinality(coaching_cues) <= 32),
  constraint exercises_locale_check check (locale ~ '^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$'),
  constraint exercises_status_check check (status in ('ACTIVE', 'ARCHIVED'))
);

create unique index exercises_system_slug_idx
  on public.exercises(slug)
  where source_type = 'PPERFIL_LIBRARY' and slug is not null;
create index exercises_owner_status_name_idx
  on public.exercises(owner_trainer_id, status, normalized_name)
  where owner_trainer_id is not null;
create index exercises_system_status_name_idx
  on public.exercises(status, normalized_name)
  where owner_trainer_id is null;

create table public.exercise_media (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  media_type text not null,
  url_or_storage_path text not null,
  thumbnail_url_or_path text,
  provider text,
  source_url text,
  license_type text,
  creator_credit text,
  production_status text not null default 'DEVELOPMENT',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint exercise_media_type_check check (media_type in ('IMAGE', 'VIDEO')),
  constraint exercise_media_location_check check (
    char_length(trim(url_or_storage_path)) between 3 and 1000
    and url_or_storage_path !~ '(^|/)\.\.(/|$)'
  ),
  constraint exercise_media_thumbnail_check check (
    thumbnail_url_or_path is null
    or (char_length(trim(thumbnail_url_or_path)) between 3 and 1000 and thumbnail_url_or_path !~ '(^|/)\.\.(/|$)')
  ),
  constraint exercise_media_provider_check check (provider is null or char_length(trim(provider)) between 2 and 120),
  constraint exercise_media_source_url_check check (source_url is null or source_url ~ '^https://'),
  constraint exercise_media_license_check check (license_type is null or char_length(trim(license_type)) between 2 and 120),
  constraint exercise_media_credit_check check (creator_credit is null or char_length(trim(creator_credit)) between 2 and 240),
  constraint exercise_media_production_status_check check (
    production_status in ('DEVELOPMENT', 'REVIEW', 'APPROVED', 'ARCHIVED')
  ),
  constraint exercise_media_sort_order_check check (sort_order >= 0),
  unique (exercise_id, sort_order)
);

create index exercise_media_exercise_status_idx
  on public.exercise_media(exercise_id, production_status, sort_order);

create table public.workout_plans (
  id uuid primary key default gen_random_uuid(),
  trainer_student_relationship_id uuid not null references public.trainer_student_relationships(id) on delete restrict,
  name text not null,
  goal text,
  status text not null default 'ACTIVE',
  created_by uuid not null references public.app_users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workout_plans_name_check check (char_length(trim(name)) between 2 and 160),
  constraint workout_plans_goal_check check (goal is null or char_length(trim(goal)) between 2 and 2000),
  constraint workout_plans_status_check check (status in ('ACTIVE', 'ARCHIVED'))
);

create index workout_plans_relationship_status_idx
  on public.workout_plans(trainer_student_relationship_id, status, updated_at desc);
create index workout_plans_created_by_idx on public.workout_plans(created_by);

create table public.workout_plan_versions (
  id uuid primary key default gen_random_uuid(),
  workout_plan_id uuid not null references public.workout_plans(id) on delete restrict,
  version_number integer not null,
  status text not null default 'DRAFT',
  source_type text not null,
  source_assessment_id uuid references public.assessments(id) on delete restrict,
  source_version_id uuid references public.workout_plan_versions(id) on delete restrict,
  trainer_prompt text,
  generation_metadata jsonb not null default '{}'::jsonb,
  approved_at timestamptz,
  published_at timestamptz,
  archived_at timestamptz,
  created_by uuid not null references public.app_users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint workout_plan_versions_number_check check (version_number > 0),
  constraint workout_plan_versions_status_check check (status in ('DRAFT', 'APPROVED', 'PUBLISHED', 'ARCHIVED')),
  constraint workout_plan_versions_source_check check (source_type in ('MANUAL', 'AI_DRAFT')),
  constraint workout_plan_versions_prompt_check check (
    trainer_prompt is null or char_length(trim(trainer_prompt)) between 2 and 5000
  ),
  constraint workout_plan_versions_ai_provenance_check check (
    source_type = 'MANUAL'
    or (trainer_prompt is not null and jsonb_typeof(generation_metadata) = 'object')
  ),
  constraint workout_plan_versions_generation_metadata_check check (
    jsonb_typeof(generation_metadata) = 'object' and pg_column_size(generation_metadata) <= 65536
  ),
  constraint workout_plan_versions_lifecycle_check check (
    (status = 'DRAFT' and approved_at is null and published_at is null and archived_at is null)
    or (status = 'APPROVED' and approved_at is not null and published_at is null and archived_at is null)
    or (status = 'PUBLISHED' and approved_at is not null and published_at is not null and archived_at is null)
    or (status = 'ARCHIVED' and approved_at is not null and published_at is not null and archived_at is not null)
  ),
  unique (workout_plan_id, version_number)
);

create unique index workout_plan_versions_open_version_idx
  on public.workout_plan_versions(workout_plan_id)
  where status in ('DRAFT', 'APPROVED');
create unique index workout_plan_versions_published_idx
  on public.workout_plan_versions(workout_plan_id)
  where status = 'PUBLISHED';
create index workout_plan_versions_plan_history_idx
  on public.workout_plan_versions(workout_plan_id, version_number desc);
create index workout_plan_versions_assessment_idx
  on public.workout_plan_versions(source_assessment_id)
  where source_assessment_id is not null;
create index workout_plan_versions_source_version_idx
  on public.workout_plan_versions(source_version_id)
  where source_version_id is not null;
create index workout_plan_versions_created_by_idx on public.workout_plan_versions(created_by);

create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  workout_plan_version_id uuid not null references public.workout_plan_versions(id) on delete restrict,
  name text not null,
  description text,
  estimated_duration_minutes integer,
  sort_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workout_sessions_name_check check (char_length(trim(name)) between 1 and 120),
  constraint workout_sessions_description_check check (description is null or char_length(trim(description)) between 2 and 2000),
  constraint workout_sessions_duration_check check (
    estimated_duration_minutes is null or estimated_duration_minutes between 1 and 600
  ),
  constraint workout_sessions_sort_order_check check (sort_order >= 0),
  constraint workout_sessions_version_sort_key unique (workout_plan_version_id, sort_order) deferrable initially immediate
);

create index workout_sessions_version_idx on public.workout_sessions(workout_plan_version_id);

create table public.workout_sections (
  id uuid primary key default gen_random_uuid(),
  workout_session_id uuid not null references public.workout_sessions(id) on delete restrict,
  section_type text not null,
  name text,
  sort_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workout_sections_type_check check (
    section_type in ('WARMUP', 'MAIN', 'SUPERSET', 'CONDITIONING', 'COOLDOWN', 'CUSTOM')
  ),
  constraint workout_sections_name_check check (name is null or char_length(trim(name)) between 1 and 120),
  constraint workout_sections_sort_order_check check (sort_order >= 0),
  constraint workout_sections_session_sort_key unique (workout_session_id, sort_order) deferrable initially immediate
);

create index workout_sections_session_idx on public.workout_sections(workout_session_id);

create table public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_section_id uuid not null references public.workout_sections(id) on delete restrict,
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  sort_order integer not null,
  superset_group_key text,
  trainer_note text,
  student_instruction text,
  tempo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workout_exercises_sort_order_check check (sort_order >= 0),
  constraint workout_exercises_superset_key_check check (
    superset_group_key is null or superset_group_key ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,31}$'
  ),
  constraint workout_exercises_trainer_note_check check (
    trainer_note is null or char_length(trim(trainer_note)) between 1 and 2000
  ),
  constraint workout_exercises_student_instruction_check check (
    student_instruction is null or char_length(trim(student_instruction)) between 1 and 2000
  ),
  constraint workout_exercises_tempo_check check (tempo is null or char_length(trim(tempo)) between 1 and 32),
  constraint workout_exercises_section_sort_key unique (workout_section_id, sort_order) deferrable initially immediate
);

create index workout_exercises_section_idx on public.workout_exercises(workout_section_id);
create index workout_exercises_exercise_idx on public.workout_exercises(exercise_id);
create index workout_exercises_superset_idx
  on public.workout_exercises(workout_section_id, superset_group_key)
  where superset_group_key is not null;

create table public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  workout_exercise_id uuid not null references public.workout_exercises(id) on delete restrict,
  set_number integer not null,
  set_type text not null default 'STANDARD',
  target_reps integer,
  target_reps_min integer,
  target_reps_max integer,
  target_load numeric,
  load_unit text,
  duration_seconds integer,
  distance_value numeric,
  distance_unit text,
  rest_seconds integer,
  target_rpe numeric(3,1),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workout_sets_number_check check (set_number > 0),
  constraint workout_sets_type_check check (set_type in ('STANDARD', 'WARMUP', 'DROP', 'FAILURE', 'AMRAP')),
  constraint workout_sets_reps_check check (
    (target_reps is null or target_reps >= 0)
    and (target_reps_min is null or target_reps_min >= 0)
    and (target_reps_max is null or target_reps_max >= 0)
    and ((target_reps_min is null and target_reps_max is null)
      or (target_reps_min is not null and target_reps_max is not null and target_reps_min <= target_reps_max))
    and not (target_reps is not null and target_reps_min is not null)
  ),
  constraint workout_sets_load_check check (
    (target_load is null and load_unit is null)
    or (target_load is not null and target_load >= 0 and load_unit in ('kg', 'lb'))
  ),
  constraint workout_sets_duration_check check (duration_seconds is null or duration_seconds >= 0),
  constraint workout_sets_distance_check check (
    (distance_value is null and distance_unit is null)
    or (distance_value is not null and distance_value >= 0 and distance_unit in ('m', 'km', 'mi'))
  ),
  constraint workout_sets_rest_check check (rest_seconds is null or rest_seconds >= 0),
  constraint workout_sets_rpe_check check (target_rpe is null or target_rpe between 0 and 10),
  constraint workout_sets_notes_check check (notes is null or char_length(trim(notes)) between 1 and 1000),
  constraint workout_sets_prescription_check check (
    target_reps is not null or target_reps_min is not null or duration_seconds is not null or distance_value is not null
  ),
  constraint workout_sets_exercise_number_key unique (workout_exercise_id, set_number) deferrable initially immediate
);

create index workout_sets_exercise_idx on public.workout_sets(workout_exercise_id);

create table public.workout_events (
  id uuid primary key default gen_random_uuid(),
  workout_plan_id uuid not null references public.workout_plans(id) on delete restrict,
  workout_plan_version_id uuid references public.workout_plan_versions(id) on delete restrict,
  event_type text not null,
  actor_user_id uuid not null references public.app_users(id) on delete restrict,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint workout_events_type_check check (
    event_type in ('WORKOUT_CREATED', 'DRAFT_CREATED', 'DRAFT_UPDATED', 'AI_DRAFT_CREATED',
      'APPROVED', 'PUBLISHED', 'ARCHIVED', 'NEW_DRAFT_FROM_PUBLISHED')
  ),
  constraint workout_events_metadata_check check (jsonb_typeof(metadata) = 'object')
);

create index workout_events_plan_history_idx on public.workout_events(workout_plan_id, created_at, id);
create index workout_events_version_idx
  on public.workout_events(workout_plan_version_id, created_at)
  where workout_plan_version_id is not null;
create index workout_events_actor_idx on public.workout_events(actor_user_id);

alter table public.exercises enable row level security;
alter table public.exercise_media enable row level security;
alter table public.workout_plans enable row level security;
alter table public.workout_plan_versions enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.workout_sections enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.workout_sets enable row level security;
alter table public.workout_events enable row level security;

create or replace function private.workout_plan_owned_by_current_trainer(p_workout_plan_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workout_plans plan
    join public.trainer_student_relationships relationship
      on relationship.id = plan.trainer_student_relationship_id
    where plan.id = p_workout_plan_id
      and (select private.owns_trainer(relationship.trainer_profile_id))
  );
$$;

create or replace function private.workout_plan_owned_by_current_student(p_workout_plan_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workout_plans plan
    join public.trainer_student_relationships relationship
      on relationship.id = plan.trainer_student_relationship_id
    where plan.id = p_workout_plan_id
      and (select private.owns_student(relationship.student_profile_id))
  );
$$;

create or replace function private.can_read_workout_version(p_workout_plan_version_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workout_plan_versions version
    where version.id = p_workout_plan_version_id
      and (
        (select private.workout_plan_owned_by_current_trainer(version.workout_plan_id))
        or (
          version.status in ('PUBLISHED', 'ARCHIVED')
          and (select private.workout_plan_owned_by_current_student(version.workout_plan_id))
        )
      )
  );
$$;

create or replace function private.workout_version_is_mutable(p_workout_plan_version_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workout_plan_versions version
    join public.workout_plans plan on plan.id = version.workout_plan_id
    join public.trainer_student_relationships relationship
      on relationship.id = plan.trainer_student_relationship_id
    where version.id = p_workout_plan_version_id
      and version.status = 'DRAFT'
      and plan.status = 'ACTIVE'
      and relationship.status = 'active'
      and (select private.owns_trainer(relationship.trainer_profile_id))
  );
$$;

create or replace function private.exercise_visible_to_trainer(
  p_exercise_id uuid,
  p_trainer_profile_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.exercises exercise
    where exercise.id = p_exercise_id
      and exercise.status = 'ACTIVE'
      and (
        (exercise.source_type = 'PPERFIL_LIBRARY' and exercise.owner_trainer_id is null)
        or (
          exercise.source_type = 'TRAINER_CUSTOM'
          and exercise.owner_trainer_id = p_trainer_profile_id
        )
      )
  );
$$;

create or replace function private.can_read_exercise(p_exercise_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.exercises exercise
    where exercise.id = p_exercise_id
      and (
        (
          (select private.current_trainer_profile_id()) is not null
          and (
            (exercise.source_type = 'PPERFIL_LIBRARY' and exercise.status = 'ACTIVE')
            or exercise.owner_trainer_id = (select private.current_trainer_profile_id())
          )
        )
        or exists (
          select 1
          from public.workout_exercises prescribed
          join public.workout_sections section on section.id = prescribed.workout_section_id
          join public.workout_sessions session on session.id = section.workout_session_id
          join public.workout_plan_versions version on version.id = session.workout_plan_version_id
          where prescribed.exercise_id = exercise.id
            and version.status in ('PUBLISHED', 'ARCHIVED')
            and (
              (select private.workout_plan_owned_by_current_trainer(version.workout_plan_id))
              or (select private.workout_plan_owned_by_current_student(version.workout_plan_id))
            )
        )
      )
  );
$$;

create or replace function private.can_read_exercise_media(
  p_exercise_id uuid,
  p_production_status text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (
      (select private.current_trainer_profile_id()) is not null
      and (select private.can_read_exercise(p_exercise_id))
    )
    or (
      p_production_status = 'APPROVED'
      and exists (
        select 1
        from public.workout_exercises prescribed
        join public.workout_sections section on section.id = prescribed.workout_section_id
        join public.workout_sessions session on session.id = section.workout_session_id
        join public.workout_plan_versions version on version.id = session.workout_plan_version_id
        where prescribed.exercise_id = p_exercise_id
          and version.status in ('PUBLISHED', 'ARCHIVED')
          and (select private.workout_plan_owned_by_current_student(version.workout_plan_id))
      )
    );
$$;

create or replace function private.record_workout_draft_update(
  p_workout_plan_version_id uuid,
  p_action text,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  plan_id uuid;
begin
  select version.workout_plan_id into plan_id
  from public.workout_plan_versions version
  where version.id = p_workout_plan_version_id;
  if plan_id is null or jsonb_typeof(coalesce(p_metadata, '{}'::jsonb)) <> 'object' then
    raise exception 'invalid_workout_draft_event';
  end if;
  insert into public.workout_events(
    workout_plan_id, workout_plan_version_id, event_type, actor_user_id, metadata
  ) values (
    plan_id,
    p_workout_plan_version_id,
    'DRAFT_UPDATED',
    (select auth.uid()),
    jsonb_build_object('action', p_action) || coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

create or replace function private.validate_workout_version_structure(p_workout_plan_version_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.workout_plan_versions;
  trainer_profile_id uuid;
begin
  select version.* into target
  from public.workout_plan_versions version
  where version.id = p_workout_plan_version_id;
  if target.id is null or target.status not in ('DRAFT', 'APPROVED') then
    raise exception 'workout_version_not_available_for_validation';
  end if;
  select relationship.trainer_profile_id into trainer_profile_id
  from public.workout_plans plan
  join public.trainer_student_relationships relationship
    on relationship.id = plan.trainer_student_relationship_id
  where plan.id = target.workout_plan_id;

  if not exists (
    select 1 from public.workout_sessions session
    where session.workout_plan_version_id = target.id
  ) then raise exception 'workout_requires_session'; end if;

  if exists (
    select 1
    from public.workout_sessions session
    where session.workout_plan_version_id = target.id
      and not exists (
        select 1 from public.workout_sections section where section.workout_session_id = session.id
      )
  ) then raise exception 'workout_session_requires_section'; end if;

  if exists (
    select 1
    from public.workout_sections section
    join public.workout_sessions session on session.id = section.workout_session_id
    where session.workout_plan_version_id = target.id
      and not exists (
        select 1 from public.workout_exercises prescribed where prescribed.workout_section_id = section.id
      )
  ) then raise exception 'workout_section_requires_exercise'; end if;

  if exists (
    select 1
    from public.workout_exercises prescribed
    join public.workout_sections section on section.id = prescribed.workout_section_id
    join public.workout_sessions session on session.id = section.workout_session_id
    where session.workout_plan_version_id = target.id
      and not exists (
        select 1 from public.workout_sets set_row where set_row.workout_exercise_id = prescribed.id
      )
  ) then raise exception 'workout_exercise_requires_set'; end if;

  if exists (
    select 1
    from public.workout_exercises prescribed
    join public.workout_sections section on section.id = prescribed.workout_section_id
    join public.workout_sessions session on session.id = section.workout_session_id
    where session.workout_plan_version_id = target.id
      and not (select private.exercise_visible_to_trainer(prescribed.exercise_id, trainer_profile_id))
  ) then raise exception 'workout_contains_unauthorized_exercise'; end if;

  if exists (
    select 1
    from public.workout_exercises prescribed
    join public.workout_sections section on section.id = prescribed.workout_section_id
    join public.workout_sessions session on session.id = section.workout_session_id
    where session.workout_plan_version_id = target.id
      and (
        (prescribed.superset_group_key is not null and section.section_type <> 'SUPERSET')
        or (section.section_type = 'SUPERSET' and prescribed.superset_group_key is null)
      )
  ) then raise exception 'invalid_superset_membership'; end if;

  if exists (
    select grouped.workout_section_id, grouped.superset_group_key
    from public.workout_exercises grouped
    join public.workout_sections section on section.id = grouped.workout_section_id
    join public.workout_sessions session on session.id = section.workout_session_id
    where session.workout_plan_version_id = target.id
      and grouped.superset_group_key is not null
    group by grouped.workout_section_id, grouped.superset_group_key
    having count(*) < 2
  ) then raise exception 'superset_group_requires_multiple_exercises'; end if;
end;
$$;

create or replace function private.guard_exercise_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.owner_trainer_id is distinct from old.owner_trainer_id
    or new.source_type is distinct from old.source_type
    or new.created_at is distinct from old.created_at
  then raise exception 'exercise_identity_is_immutable'; end if;
  if exists (
    select 1
    from public.workout_exercises prescribed
    join public.workout_sections section on section.id = prescribed.workout_section_id
    join public.workout_sessions session on session.id = section.workout_session_id
    join public.workout_plan_versions version on version.id = session.workout_plan_version_id
    where prescribed.exercise_id = old.id and version.status <> 'DRAFT'
  ) and row(
    new.name, new.normalized_name, new.slug, new.description, new.primary_muscle_group,
    new.secondary_muscle_groups, new.equipment, new.movement_pattern,
    new.instructions, new.coaching_cues, new.locale
  ) is distinct from row(
    old.name, old.normalized_name, old.slug, old.description, old.primary_muscle_group,
    old.secondary_muscle_groups, old.equipment, old.movement_pattern,
    old.instructions, old.coaching_cues, old.locale
  ) then raise exception 'published_exercise_content_is_immutable'; end if;
  return new;
end;
$$;

create or replace function private.guard_exercise_media_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_exercise_id uuid := case when tg_op = 'DELETE' then old.exercise_id else new.exercise_id end;
begin
  if tg_op = 'UPDATE' and (
    new.exercise_id is distinct from old.exercise_id or new.created_at is distinct from old.created_at
  ) then raise exception 'exercise_media_identity_is_immutable'; end if;
  if tg_op in ('UPDATE', 'DELETE') and exists (
    select 1
    from public.workout_exercises prescribed
    join public.workout_sections section on section.id = prescribed.workout_section_id
    join public.workout_sessions session on session.id = section.workout_session_id
    join public.workout_plan_versions version on version.id = session.workout_plan_version_id
    where prescribed.exercise_id = target_exercise_id and version.status <> 'DRAFT'
  ) then raise exception 'published_exercise_media_is_immutable'; end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create or replace function private.guard_workout_plan_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.trainer_student_relationship_id is distinct from old.trainer_student_relationship_id
    or new.created_by is distinct from old.created_by
    or new.created_at is distinct from old.created_at
  then raise exception 'workout_plan_identity_is_immutable'; end if;
  if new.status is distinct from old.status
    and not (old.status = 'ACTIVE' and new.status = 'ARCHIVED')
  then raise exception 'invalid_workout_plan_transition'; end if;
  return new;
end;
$$;

create or replace function private.guard_workout_version_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then raise exception 'workout_versions_are_historical'; end if;
  if new.workout_plan_id is distinct from old.workout_plan_id
    or new.version_number is distinct from old.version_number
    or new.source_type is distinct from old.source_type
    or new.source_assessment_id is distinct from old.source_assessment_id
    or new.source_version_id is distinct from old.source_version_id
    or new.trainer_prompt is distinct from old.trainer_prompt
    or new.generation_metadata is distinct from old.generation_metadata
    or new.created_by is distinct from old.created_by
    or new.created_at is distinct from old.created_at
  then raise exception 'workout_version_identity_is_immutable'; end if;
  if not (
    (old.status = 'DRAFT' and new.status = 'APPROVED' and new.approved_at is not null)
    or (old.status = 'APPROVED' and new.status = 'PUBLISHED' and new.published_at is not null)
    or (old.status = 'PUBLISHED' and new.status = 'ARCHIVED' and new.archived_at is not null)
  ) then raise exception 'invalid_workout_version_transition'; end if;
  return new;
end;
$$;

create or replace function private.guard_workout_structure_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  version_id uuid;
  version_status text;
begin
  if tg_table_name = 'workout_sessions' then
    if tg_op = 'UPDATE' and new.workout_plan_version_id is distinct from old.workout_plan_version_id then
      raise exception 'workout_structure_parent_is_immutable';
    end if;
    version_id := case when tg_op = 'DELETE' then old.workout_plan_version_id else new.workout_plan_version_id end;
  elsif tg_table_name = 'workout_sections' then
    if tg_op = 'UPDATE' and new.workout_session_id is distinct from old.workout_session_id then
      raise exception 'workout_structure_parent_is_immutable';
    end if;
    select session.workout_plan_version_id into version_id
    from public.workout_sessions session
    where session.id = case when tg_op = 'DELETE' then old.workout_session_id else new.workout_session_id end;
  elsif tg_table_name = 'workout_exercises' then
    if tg_op = 'UPDATE' and new.workout_section_id is distinct from old.workout_section_id then
      raise exception 'workout_structure_parent_is_immutable';
    end if;
    select session.workout_plan_version_id into version_id
    from public.workout_sections section
    join public.workout_sessions session on session.id = section.workout_session_id
    where section.id = case when tg_op = 'DELETE' then old.workout_section_id else new.workout_section_id end;
  elsif tg_table_name = 'workout_sets' then
    if tg_op = 'UPDATE' and new.workout_exercise_id is distinct from old.workout_exercise_id then
      raise exception 'workout_structure_parent_is_immutable';
    end if;
    select session.workout_plan_version_id into version_id
    from public.workout_exercises prescribed
    join public.workout_sections section on section.id = prescribed.workout_section_id
    join public.workout_sessions session on session.id = section.workout_session_id
    where prescribed.id = case when tg_op = 'DELETE' then old.workout_exercise_id else new.workout_exercise_id end;
  end if;
  select version.status into version_status
  from public.workout_plan_versions version where version.id = version_id;
  if version_status is distinct from 'DRAFT' then raise exception 'workout_structure_is_immutable'; end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create or replace function private.reject_workout_event_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'workout_events_are_append_only';
end;
$$;

create trigger guard_exercise_update before update on public.exercises
for each row execute function private.guard_exercise_update();
create trigger touch_exercises_updated_at before update on public.exercises
for each row execute function private.touch_updated_at();
create trigger guard_exercise_media_change before update or delete on public.exercise_media
for each row execute function private.guard_exercise_media_change();
create trigger guard_workout_plan_update before update on public.workout_plans
for each row execute function private.guard_workout_plan_update();
create trigger touch_workout_plans_updated_at before update on public.workout_plans
for each row execute function private.touch_updated_at();
create trigger guard_workout_version_update before update or delete on public.workout_plan_versions
for each row execute function private.guard_workout_version_update();
create trigger guard_workout_sessions before insert or update or delete on public.workout_sessions
for each row execute function private.guard_workout_structure_mutation();
create trigger touch_workout_sessions_updated_at before update on public.workout_sessions
for each row execute function private.touch_updated_at();
create trigger guard_workout_sections before insert or update or delete on public.workout_sections
for each row execute function private.guard_workout_structure_mutation();
create trigger touch_workout_sections_updated_at before update on public.workout_sections
for each row execute function private.touch_updated_at();
create trigger guard_workout_exercises before insert or update or delete on public.workout_exercises
for each row execute function private.guard_workout_structure_mutation();
create trigger touch_workout_exercises_updated_at before update on public.workout_exercises
for each row execute function private.touch_updated_at();
create trigger guard_workout_sets before insert or update or delete on public.workout_sets
for each row execute function private.guard_workout_structure_mutation();
create trigger touch_workout_sets_updated_at before update on public.workout_sets
for each row execute function private.touch_updated_at();
create trigger reject_workout_event_change before update or delete on public.workout_events
for each row execute function private.reject_workout_event_change();

create policy "authorized users read exercise library" on public.exercises
for select to authenticated using ((select private.can_read_exercise(id)));
create policy "authorized users read exercise media" on public.exercise_media
for select to authenticated using (
  (select private.can_read_exercise_media(exercise_id, production_status))
);
create policy "relationship parties read workout plans" on public.workout_plans
for select to authenticated using (
  (select private.workout_plan_owned_by_current_trainer(id))
  or (select private.workout_plan_owned_by_current_student(id))
);
create policy "authorized parties read workout versions" on public.workout_plan_versions
for select to authenticated using ((select private.can_read_workout_version(id)));
create policy "authorized parties read workout sessions" on public.workout_sessions
for select to authenticated using ((select private.can_read_workout_version(workout_plan_version_id)));
create policy "authorized parties read workout sections" on public.workout_sections
for select to authenticated using (exists (
  select 1 from public.workout_sessions session
  where session.id = workout_session_id
    and (select private.can_read_workout_version(session.workout_plan_version_id))
));
create policy "authorized parties read prescribed exercises" on public.workout_exercises
for select to authenticated using (exists (
  select 1
  from public.workout_sections section
  join public.workout_sessions session on session.id = section.workout_session_id
  where section.id = workout_section_id
    and (select private.can_read_workout_version(session.workout_plan_version_id))
));
create policy "authorized parties read workout sets" on public.workout_sets
for select to authenticated using (exists (
  select 1
  from public.workout_exercises prescribed
  join public.workout_sections section on section.id = prescribed.workout_section_id
  join public.workout_sessions session on session.id = section.workout_session_id
  where prescribed.id = workout_exercise_id
    and (select private.can_read_workout_version(session.workout_plan_version_id))
));
create policy "trainers read workout audit events" on public.workout_events
for select to authenticated using ((select private.workout_plan_owned_by_current_trainer(workout_plan_id)));

create or replace function public.create_custom_exercise(
  p_name text,
  p_description text,
  p_primary_muscle_group text,
  p_secondary_muscle_groups text[],
  p_equipment text[],
  p_movement_pattern text,
  p_instructions text,
  p_coaching_cues text[],
  p_locale text default 'pt-BR'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  trainer_profile_id uuid := (select private.current_trainer_profile_id());
  created_id uuid;
begin
  if trainer_profile_id is null or (select auth.uid()) is null then
    raise exception 'trainer_authentication_required';
  end if;
  insert into public.exercises(
    owner_trainer_id, source_type, name, normalized_name, description,
    primary_muscle_group, secondary_muscle_groups, equipment, movement_pattern,
    instructions, coaching_cues, locale
  ) values (
    trainer_profile_id, 'TRAINER_CUSTOM', trim(p_name), lower(trim(p_name)), nullif(trim(p_description), ''),
    lower(trim(p_primary_muscle_group)), coalesce(p_secondary_muscle_groups, '{}'::text[]),
    coalesce(p_equipment, '{}'::text[]), nullif(lower(trim(p_movement_pattern)), ''),
    trim(p_instructions), coalesce(p_coaching_cues, '{}'::text[]), coalesce(nullif(trim(p_locale), ''), 'pt-BR')
  ) returning id into created_id;
  return created_id;
end;
$$;

create or replace function public.add_custom_exercise_media(
  p_exercise_id uuid,
  p_media_type text,
  p_url_or_storage_path text,
  p_thumbnail_url_or_path text default null,
  p_provider text default null,
  p_source_url text default null,
  p_license_type text default null,
  p_creator_credit text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  trainer_profile_id uuid := (select private.current_trainer_profile_id());
  next_sort_order integer;
  created_id uuid;
begin
  if trainer_profile_id is null or not exists (
    select 1 from public.exercises exercise
    where exercise.id = p_exercise_id
      and exercise.source_type = 'TRAINER_CUSTOM'
      and exercise.owner_trainer_id = trainer_profile_id
      and exercise.status = 'ACTIVE'
  ) then raise exception 'custom_exercise_not_available'; end if;
  select coalesce(max(media.sort_order) + 1, 0) into next_sort_order
  from public.exercise_media media where media.exercise_id = p_exercise_id;
  insert into public.exercise_media(
    exercise_id, media_type, url_or_storage_path, thumbnail_url_or_path,
    provider, source_url, license_type, creator_credit, production_status, sort_order
  ) values (
    p_exercise_id, upper(trim(p_media_type)), trim(p_url_or_storage_path), nullif(trim(p_thumbnail_url_or_path), ''),
    nullif(trim(p_provider), ''), nullif(trim(p_source_url), ''), nullif(trim(p_license_type), ''),
    nullif(trim(p_creator_credit), ''), 'DEVELOPMENT', next_sort_order
  ) returning id into created_id;
  return created_id;
end;
$$;

create or replace function public.create_workout_plan(
  p_relationship_id uuid,
  p_name text,
  p_goal text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  relationship public.trainer_student_relationships;
  created_id uuid;
begin
  select candidate.* into relationship
  from public.trainer_student_relationships candidate
  where candidate.id = p_relationship_id
  for update;
  if current_user_id is null or relationship.id is null or relationship.status <> 'active'
    or not (select private.owns_trainer(relationship.trainer_profile_id))
  then raise exception 'workout_relationship_not_available'; end if;
  insert into public.workout_plans(
    trainer_student_relationship_id, name, goal, created_by
  ) values (
    relationship.id, trim(p_name), nullif(trim(p_goal), ''), current_user_id
  ) returning id into created_id;
  insert into public.workout_events(workout_plan_id, event_type, actor_user_id)
  values (created_id, 'WORKOUT_CREATED', current_user_id);
  return created_id;
end;
$$;

create or replace function public.create_workout_draft_version(
  p_workout_plan_id uuid,
  p_source_type text default 'MANUAL',
  p_source_assessment_id uuid default null,
  p_trainer_prompt text default null,
  p_generation_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  plan public.workout_plans;
  relationship public.trainer_student_relationships;
  next_version integer;
  created_id uuid;
  normalized_source text := upper(trim(p_source_type));
  normalized_metadata jsonb := coalesce(p_generation_metadata, '{}'::jsonb);
begin
  select candidate.* into plan from public.workout_plans candidate
  where candidate.id = p_workout_plan_id for update;
  select candidate.* into relationship from public.trainer_student_relationships candidate
  where candidate.id = plan.trainer_student_relationship_id for update;
  if current_user_id is null or plan.id is null or plan.status <> 'ACTIVE'
    or relationship.status <> 'active'
    or not (select private.owns_trainer(relationship.trainer_profile_id))
  then raise exception 'workout_plan_not_available_for_draft'; end if;
  if normalized_source not in ('MANUAL', 'AI_DRAFT')
    or jsonb_typeof(normalized_metadata) <> 'object'
    or pg_column_size(normalized_metadata) > 65536
  then raise exception 'invalid_workout_draft_source'; end if;
  if normalized_source = 'AI_DRAFT'
    and (p_trainer_prompt is null or char_length(trim(p_trainer_prompt)) not between 2 and 5000)
  then raise exception 'ai_draft_requires_trainer_prompt'; end if;
  if p_source_assessment_id is not null and not exists (
    select 1 from public.assessments assessment
    where assessment.id = p_source_assessment_id
      and assessment.trainer_student_relationship_id = relationship.id
      and assessment.status = 'COMPLETED'
  ) then raise exception 'source_assessment_not_available'; end if;
  select coalesce(max(version.version_number), 0) + 1 into next_version
  from public.workout_plan_versions version where version.workout_plan_id = plan.id;
  insert into public.workout_plan_versions(
    workout_plan_id, version_number, source_type, source_assessment_id,
    trainer_prompt, generation_metadata, created_by
  ) values (
    plan.id, next_version, normalized_source, p_source_assessment_id,
    nullif(trim(p_trainer_prompt), ''), normalized_metadata, current_user_id
  ) returning id into created_id;
  insert into public.workout_events(
    workout_plan_id, workout_plan_version_id, event_type, actor_user_id,
    metadata
  ) values (
    plan.id, created_id,
    case when normalized_source = 'AI_DRAFT' then 'AI_DRAFT_CREATED' else 'DRAFT_CREATED' end,
    current_user_id,
    jsonb_build_object('version_number', next_version, 'source_assessment_id', p_source_assessment_id)
  );
  return created_id;
end;
$$;

create or replace function public.add_workout_session(
  p_workout_plan_version_id uuid,
  p_name text,
  p_description text default null,
  p_estimated_duration_minutes integer default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_sort_order integer;
  created_id uuid;
begin
  if not (select private.workout_version_is_mutable(p_workout_plan_version_id)) then
    raise exception 'workout_draft_not_available';
  end if;
  select coalesce(max(session.sort_order) + 1, 0) into next_sort_order
  from public.workout_sessions session
  where session.workout_plan_version_id = p_workout_plan_version_id;
  insert into public.workout_sessions(
    workout_plan_version_id, name, description, estimated_duration_minutes, sort_order
  ) values (
    p_workout_plan_version_id, trim(p_name), nullif(trim(p_description), ''),
    p_estimated_duration_minutes, next_sort_order
  ) returning id into created_id;
  perform private.record_workout_draft_update(
    p_workout_plan_version_id, 'SESSION_ADDED', jsonb_build_object('workout_session_id', created_id)
  );
  return created_id;
end;
$$;

create or replace function public.update_workout_session(
  p_workout_session_id uuid,
  p_name text,
  p_description text default null,
  p_estimated_duration_minutes integer default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  version_id uuid;
begin
  select session.workout_plan_version_id into version_id
  from public.workout_sessions session where session.id = p_workout_session_id;
  if not (select private.workout_version_is_mutable(version_id)) then
    raise exception 'workout_session_not_available';
  end if;
  update public.workout_sessions
  set name = trim(p_name), description = nullif(trim(p_description), ''),
      estimated_duration_minutes = p_estimated_duration_minutes
  where id = p_workout_session_id;
  perform private.record_workout_draft_update(
    version_id, 'SESSION_UPDATED', jsonb_build_object('workout_session_id', p_workout_session_id)
  );
end;
$$;

create or replace function public.reorder_workout_sessions(
  p_workout_plan_version_id uuid,
  p_workout_session_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  expected_count integer;
  supplied_count integer := coalesce(cardinality(p_workout_session_ids), 0);
begin
  if not (select private.workout_version_is_mutable(p_workout_plan_version_id)) then
    raise exception 'workout_draft_not_available';
  end if;
  select count(*) into expected_count from public.workout_sessions session
  where session.workout_plan_version_id = p_workout_plan_version_id;
  if supplied_count <> expected_count
    or supplied_count <> (select count(distinct item) from unnest(p_workout_session_ids) item)
    or exists (
      select 1 from unnest(p_workout_session_ids) item
      where not exists (
        select 1 from public.workout_sessions session
        where session.id = item and session.workout_plan_version_id = p_workout_plan_version_id
      )
    )
  then raise exception 'invalid_workout_session_order'; end if;
  set constraints public.workout_sessions_version_sort_key deferred;
  update public.workout_sessions session
  set sort_order = ordered.ordinality - 1
  from unnest(p_workout_session_ids) with ordinality ordered(id, ordinality)
  where session.id = ordered.id;
  perform private.record_workout_draft_update(
    p_workout_plan_version_id, 'SESSIONS_REORDERED',
    jsonb_build_object('workout_session_ids', to_jsonb(p_workout_session_ids))
  );
end;
$$;

create or replace function public.remove_workout_session(p_workout_session_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  version_id uuid;
begin
  select session.workout_plan_version_id into version_id
  from public.workout_sessions session where session.id = p_workout_session_id;
  if not (select private.workout_version_is_mutable(version_id)) then
    raise exception 'workout_session_not_available';
  end if;
  if exists (
    select 1 from public.workout_sections section where section.workout_session_id = p_workout_session_id
  ) then raise exception 'workout_session_must_be_empty'; end if;
  delete from public.workout_sessions where id = p_workout_session_id;
  set constraints public.workout_sessions_version_sort_key deferred;
  with ordered as (
    select id, row_number() over (order by sort_order, id) - 1 as next_order
    from public.workout_sessions where workout_plan_version_id = version_id
  )
  update public.workout_sessions session set sort_order = ordered.next_order
  from ordered where session.id = ordered.id;
  perform private.record_workout_draft_update(
    version_id, 'SESSION_REMOVED', jsonb_build_object('workout_session_id', p_workout_session_id)
  );
end;
$$;

create or replace function public.add_workout_section(
  p_workout_session_id uuid,
  p_section_type text,
  p_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  version_id uuid;
  next_sort_order integer;
  created_id uuid;
begin
  select session.workout_plan_version_id into version_id
  from public.workout_sessions session where session.id = p_workout_session_id;
  if not (select private.workout_version_is_mutable(version_id)) then
    raise exception 'workout_session_not_available';
  end if;
  select coalesce(max(section.sort_order) + 1, 0) into next_sort_order
  from public.workout_sections section where section.workout_session_id = p_workout_session_id;
  insert into public.workout_sections(workout_session_id, section_type, name, sort_order)
  values (p_workout_session_id, upper(trim(p_section_type)), nullif(trim(p_name), ''), next_sort_order)
  returning id into created_id;
  perform private.record_workout_draft_update(
    version_id, 'SECTION_ADDED', jsonb_build_object('workout_section_id', created_id)
  );
  return created_id;
end;
$$;

create or replace function public.reorder_workout_sections(
  p_workout_session_id uuid,
  p_workout_section_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  version_id uuid;
  expected_count integer;
  supplied_count integer := coalesce(cardinality(p_workout_section_ids), 0);
begin
  select session.workout_plan_version_id into version_id
  from public.workout_sessions session where session.id = p_workout_session_id;
  if not (select private.workout_version_is_mutable(version_id)) then
    raise exception 'workout_session_not_available';
  end if;
  select count(*) into expected_count from public.workout_sections section
  where section.workout_session_id = p_workout_session_id;
  if supplied_count <> expected_count
    or supplied_count <> (select count(distinct item) from unnest(p_workout_section_ids) item)
    or exists (
      select 1 from unnest(p_workout_section_ids) item
      where not exists (
        select 1 from public.workout_sections section
        where section.id = item and section.workout_session_id = p_workout_session_id
      )
    )
  then raise exception 'invalid_workout_section_order'; end if;
  set constraints public.workout_sections_session_sort_key deferred;
  update public.workout_sections section
  set sort_order = ordered.ordinality - 1
  from unnest(p_workout_section_ids) with ordinality ordered(id, ordinality)
  where section.id = ordered.id;
  perform private.record_workout_draft_update(
    version_id, 'SECTIONS_REORDERED', jsonb_build_object('workout_section_ids', to_jsonb(p_workout_section_ids))
  );
end;
$$;

create or replace function public.remove_workout_section(p_workout_section_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  session_id uuid;
  version_id uuid;
begin
  select section.workout_session_id, session.workout_plan_version_id into session_id, version_id
  from public.workout_sections section
  join public.workout_sessions session on session.id = section.workout_session_id
  where section.id = p_workout_section_id;
  if not (select private.workout_version_is_mutable(version_id)) then
    raise exception 'workout_section_not_available';
  end if;
  if exists (
    select 1 from public.workout_exercises prescribed where prescribed.workout_section_id = p_workout_section_id
  ) then raise exception 'workout_section_must_be_empty'; end if;
  delete from public.workout_sections where id = p_workout_section_id;
  set constraints public.workout_sections_session_sort_key deferred;
  with ordered as (
    select id, row_number() over (order by sort_order, id) - 1 as next_order
    from public.workout_sections where workout_session_id = session_id
  )
  update public.workout_sections section set sort_order = ordered.next_order
  from ordered where section.id = ordered.id;
  perform private.record_workout_draft_update(
    version_id, 'SECTION_REMOVED', jsonb_build_object('workout_section_id', p_workout_section_id)
  );
end;
$$;

create or replace function public.add_workout_exercise(
  p_workout_section_id uuid,
  p_exercise_id uuid,
  p_superset_group_key text default null,
  p_trainer_note text default null,
  p_student_instruction text default null,
  p_tempo text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  version_id uuid;
  section_kind text;
  trainer_profile_id uuid;
  next_sort_order integer;
  created_id uuid;
begin
  select session.workout_plan_version_id, section.section_type, relationship.trainer_profile_id
  into version_id, section_kind, trainer_profile_id
  from public.workout_sections section
  join public.workout_sessions session on session.id = section.workout_session_id
  join public.workout_plan_versions version on version.id = session.workout_plan_version_id
  join public.workout_plans plan on plan.id = version.workout_plan_id
  join public.trainer_student_relationships relationship
    on relationship.id = plan.trainer_student_relationship_id
  where section.id = p_workout_section_id;
  if not (select private.workout_version_is_mutable(version_id)) then
    raise exception 'workout_section_not_available';
  end if;
  if not (select private.exercise_visible_to_trainer(p_exercise_id, trainer_profile_id)) then
    raise exception 'exercise_not_available';
  end if;
  if (p_superset_group_key is not null and section_kind <> 'SUPERSET')
    or (p_superset_group_key is null and section_kind = 'SUPERSET')
  then raise exception 'invalid_superset_membership'; end if;
  select coalesce(max(prescribed.sort_order) + 1, 0) into next_sort_order
  from public.workout_exercises prescribed where prescribed.workout_section_id = p_workout_section_id;
  insert into public.workout_exercises(
    workout_section_id, exercise_id, sort_order, superset_group_key,
    trainer_note, student_instruction, tempo
  ) values (
    p_workout_section_id, p_exercise_id, next_sort_order, nullif(trim(p_superset_group_key), ''),
    nullif(trim(p_trainer_note), ''), nullif(trim(p_student_instruction), ''), nullif(trim(p_tempo), '')
  ) returning id into created_id;
  perform private.record_workout_draft_update(
    version_id, 'EXERCISE_ADDED',
    jsonb_build_object('workout_exercise_id', created_id, 'exercise_id', p_exercise_id)
  );
  return created_id;
end;
$$;

create or replace function public.replace_workout_exercise(
  p_workout_exercise_id uuid,
  p_exercise_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  version_id uuid;
  trainer_profile_id uuid;
  previous_exercise_id uuid;
begin
  select session.workout_plan_version_id, relationship.trainer_profile_id, prescribed.exercise_id
  into version_id, trainer_profile_id, previous_exercise_id
  from public.workout_exercises prescribed
  join public.workout_sections section on section.id = prescribed.workout_section_id
  join public.workout_sessions session on session.id = section.workout_session_id
  join public.workout_plan_versions version on version.id = session.workout_plan_version_id
  join public.workout_plans plan on plan.id = version.workout_plan_id
  join public.trainer_student_relationships relationship
    on relationship.id = plan.trainer_student_relationship_id
  where prescribed.id = p_workout_exercise_id;
  if not (select private.workout_version_is_mutable(version_id)) then
    raise exception 'workout_exercise_not_available';
  end if;
  if not (select private.exercise_visible_to_trainer(p_exercise_id, trainer_profile_id)) then
    raise exception 'exercise_not_available';
  end if;
  update public.workout_exercises set exercise_id = p_exercise_id where id = p_workout_exercise_id;
  perform private.record_workout_draft_update(
    version_id, 'EXERCISE_REPLACED',
    jsonb_build_object(
      'workout_exercise_id', p_workout_exercise_id,
      'previous_exercise_id', previous_exercise_id,
      'exercise_id', p_exercise_id
    )
  );
end;
$$;

create or replace function public.reorder_workout_exercises(
  p_workout_section_id uuid,
  p_workout_exercise_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  version_id uuid;
  expected_count integer;
  supplied_count integer := coalesce(cardinality(p_workout_exercise_ids), 0);
begin
  select session.workout_plan_version_id into version_id
  from public.workout_sections section
  join public.workout_sessions session on session.id = section.workout_session_id
  where section.id = p_workout_section_id;
  if not (select private.workout_version_is_mutable(version_id)) then
    raise exception 'workout_section_not_available';
  end if;
  select count(*) into expected_count from public.workout_exercises prescribed
  where prescribed.workout_section_id = p_workout_section_id;
  if supplied_count <> expected_count
    or supplied_count <> (select count(distinct item) from unnest(p_workout_exercise_ids) item)
    or exists (
      select 1 from unnest(p_workout_exercise_ids) item
      where not exists (
        select 1 from public.workout_exercises prescribed
        where prescribed.id = item and prescribed.workout_section_id = p_workout_section_id
      )
    )
  then raise exception 'invalid_workout_exercise_order'; end if;
  set constraints public.workout_exercises_section_sort_key deferred;
  update public.workout_exercises prescribed
  set sort_order = ordered.ordinality - 1
  from unnest(p_workout_exercise_ids) with ordinality ordered(id, ordinality)
  where prescribed.id = ordered.id;
  perform private.record_workout_draft_update(
    version_id, 'EXERCISES_REORDERED',
    jsonb_build_object('workout_exercise_ids', to_jsonb(p_workout_exercise_ids))
  );
end;
$$;

create or replace function public.remove_workout_exercise(p_workout_exercise_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  section_id uuid;
  version_id uuid;
begin
  select prescribed.workout_section_id, session.workout_plan_version_id into section_id, version_id
  from public.workout_exercises prescribed
  join public.workout_sections section on section.id = prescribed.workout_section_id
  join public.workout_sessions session on session.id = section.workout_session_id
  where prescribed.id = p_workout_exercise_id;
  if not (select private.workout_version_is_mutable(version_id)) then
    raise exception 'workout_exercise_not_available';
  end if;
  delete from public.workout_sets where workout_exercise_id = p_workout_exercise_id;
  delete from public.workout_exercises where id = p_workout_exercise_id;
  set constraints public.workout_exercises_section_sort_key deferred;
  with ordered as (
    select id, row_number() over (order by sort_order, id) - 1 as next_order
    from public.workout_exercises where workout_section_id = section_id
  )
  update public.workout_exercises prescribed set sort_order = ordered.next_order
  from ordered where prescribed.id = ordered.id;
  perform private.record_workout_draft_update(
    version_id, 'EXERCISE_REMOVED', jsonb_build_object('workout_exercise_id', p_workout_exercise_id)
  );
end;
$$;

create or replace function public.upsert_workout_set(
  p_workout_set_id uuid,
  p_workout_exercise_id uuid,
  p_set_number integer,
  p_set_type text,
  p_target_reps integer default null,
  p_target_reps_min integer default null,
  p_target_reps_max integer default null,
  p_target_load numeric default null,
  p_load_unit text default null,
  p_duration_seconds integer default null,
  p_distance_value numeric default null,
  p_distance_unit text default null,
  p_rest_seconds integer default null,
  p_target_rpe numeric default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  version_id uuid;
  target_id uuid;
begin
  select session.workout_plan_version_id into version_id
  from public.workout_exercises prescribed
  join public.workout_sections section on section.id = prescribed.workout_section_id
  join public.workout_sessions session on session.id = section.workout_session_id
  where prescribed.id = p_workout_exercise_id;
  if not (select private.workout_version_is_mutable(version_id)) then
    raise exception 'workout_exercise_not_available';
  end if;
  if p_workout_set_id is not null and not exists (
    select 1 from public.workout_sets set_row
    where set_row.id = p_workout_set_id and set_row.workout_exercise_id = p_workout_exercise_id
  ) then raise exception 'workout_set_not_available'; end if;
  target_id := p_workout_set_id;
  if target_id is null then
    select set_row.id into target_id
    from public.workout_sets set_row
    where set_row.workout_exercise_id = p_workout_exercise_id
      and set_row.set_number = p_set_number;
    target_id := coalesce(target_id, gen_random_uuid());
  end if;
  insert into public.workout_sets(
    id, workout_exercise_id, set_number, set_type, target_reps,
    target_reps_min, target_reps_max, target_load, load_unit,
    duration_seconds, distance_value, distance_unit, rest_seconds,
    target_rpe, notes
  ) values (
    target_id, p_workout_exercise_id, p_set_number, upper(trim(p_set_type)), p_target_reps,
    p_target_reps_min, p_target_reps_max, p_target_load, lower(trim(p_load_unit)),
    p_duration_seconds, p_distance_value, lower(trim(p_distance_unit)), p_rest_seconds,
    p_target_rpe, nullif(trim(p_notes), '')
  )
  on conflict (id) do update set
    set_number = excluded.set_number,
    set_type = excluded.set_type,
    target_reps = excluded.target_reps,
    target_reps_min = excluded.target_reps_min,
    target_reps_max = excluded.target_reps_max,
    target_load = excluded.target_load,
    load_unit = excluded.load_unit,
    duration_seconds = excluded.duration_seconds,
    distance_value = excluded.distance_value,
    distance_unit = excluded.distance_unit,
    rest_seconds = excluded.rest_seconds,
    target_rpe = excluded.target_rpe,
    notes = excluded.notes;
  perform private.record_workout_draft_update(
    version_id, 'SET_UPSERTED',
    jsonb_build_object('workout_set_id', target_id, 'workout_exercise_id', p_workout_exercise_id)
  );
  return target_id;
end;
$$;

create or replace function public.remove_workout_set(p_workout_set_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  exercise_id uuid;
  version_id uuid;
begin
  select set_row.workout_exercise_id, session.workout_plan_version_id into exercise_id, version_id
  from public.workout_sets set_row
  join public.workout_exercises prescribed on prescribed.id = set_row.workout_exercise_id
  join public.workout_sections section on section.id = prescribed.workout_section_id
  join public.workout_sessions session on session.id = section.workout_session_id
  where set_row.id = p_workout_set_id;
  if not (select private.workout_version_is_mutable(version_id)) then
    raise exception 'workout_set_not_available';
  end if;
  delete from public.workout_sets where id = p_workout_set_id;
  set constraints public.workout_sets_exercise_number_key deferred;
  with ordered as (
    select id, row_number() over (order by set_number, id) as next_number
    from public.workout_sets where workout_exercise_id = exercise_id
  )
  update public.workout_sets set_row set set_number = ordered.next_number
  from ordered where set_row.id = ordered.id;
  perform private.record_workout_draft_update(
    version_id, 'SET_REMOVED', jsonb_build_object('workout_set_id', p_workout_set_id)
  );
end;
$$;

create or replace function public.update_workout_section(
  p_workout_section_id uuid,
  p_section_type text,
  p_name text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  version_id uuid;
  previous_type text;
begin
  select session.workout_plan_version_id, section.section_type into version_id, previous_type
  from public.workout_sections section
  join public.workout_sessions session on session.id = section.workout_session_id
  where section.id = p_workout_section_id;
  if not (select private.workout_version_is_mutable(version_id)) then
    raise exception 'workout_section_not_available';
  end if;
  if upper(trim(p_section_type)) is distinct from previous_type and exists (
    select 1 from public.workout_exercises prescribed where prescribed.workout_section_id = p_workout_section_id
  ) then raise exception 'workout_section_type_requires_empty_section'; end if;
  update public.workout_sections
  set section_type = upper(trim(p_section_type)), name = nullif(trim(p_name), '')
  where id = p_workout_section_id;
  perform private.record_workout_draft_update(
    version_id, 'SECTION_UPDATED', jsonb_build_object('workout_section_id', p_workout_section_id)
  );
end;
$$;

create or replace function public.update_workout_exercise(
  p_workout_exercise_id uuid,
  p_superset_group_key text default null,
  p_trainer_note text default null,
  p_student_instruction text default null,
  p_tempo text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  version_id uuid;
  section_kind text;
begin
  select session.workout_plan_version_id, section.section_type into version_id, section_kind
  from public.workout_exercises prescribed
  join public.workout_sections section on section.id = prescribed.workout_section_id
  join public.workout_sessions session on session.id = section.workout_session_id
  where prescribed.id = p_workout_exercise_id;
  if not (select private.workout_version_is_mutable(version_id)) then
    raise exception 'workout_exercise_not_available';
  end if;
  if (p_superset_group_key is not null and section_kind <> 'SUPERSET')
    or (p_superset_group_key is null and section_kind = 'SUPERSET')
  then raise exception 'invalid_superset_membership'; end if;
  update public.workout_exercises
  set superset_group_key = nullif(trim(p_superset_group_key), ''),
      trainer_note = nullif(trim(p_trainer_note), ''),
      student_instruction = nullif(trim(p_student_instruction), ''),
      tempo = nullif(trim(p_tempo), '')
  where id = p_workout_exercise_id;
  perform private.record_workout_draft_update(
    version_id, 'EXERCISE_UPDATED', jsonb_build_object('workout_exercise_id', p_workout_exercise_id)
  );
end;
$$;

create or replace function public.approve_workout_version(p_workout_plan_version_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  target public.workout_plan_versions;
begin
  select version.* into target from public.workout_plan_versions version
  where version.id = p_workout_plan_version_id for update;
  if current_user_id is null or not (select private.workout_version_is_mutable(target.id)) then
    raise exception 'workout_version_not_available_for_approval';
  end if;
  perform private.validate_workout_version_structure(target.id);
  update public.workout_plan_versions
  set status = 'APPROVED', approved_at = now()
  where id = target.id;
  insert into public.workout_events(
    workout_plan_id, workout_plan_version_id, event_type, actor_user_id,
    metadata
  ) values (
    target.workout_plan_id, target.id, 'APPROVED', current_user_id,
    jsonb_build_object('version_number', target.version_number)
  );
end;
$$;

create or replace function public.publish_workout_version(p_workout_plan_version_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  target public.workout_plan_versions;
  plan public.workout_plans;
  relationship public.trainer_student_relationships;
  previous_published record;
  published_time timestamptz := now();
begin
  select version.* into target from public.workout_plan_versions version
  where version.id = p_workout_plan_version_id for update;
  select candidate.* into plan from public.workout_plans candidate
  where candidate.id = target.workout_plan_id for update;
  select candidate.* into relationship from public.trainer_student_relationships candidate
  where candidate.id = plan.trainer_student_relationship_id for update;
  if current_user_id is null or target.id is null or target.status <> 'APPROVED'
    or plan.status <> 'ACTIVE' or relationship.status <> 'active'
    or not (select private.owns_trainer(relationship.trainer_profile_id))
  then raise exception 'workout_version_not_available_for_publication'; end if;
  perform private.validate_workout_version_structure(target.id);
  for previous_published in
    select version.id, version.version_number
    from public.workout_plan_versions version
    where version.workout_plan_id = plan.id and version.status = 'PUBLISHED'
    for update
  loop
    update public.workout_plan_versions
    set status = 'ARCHIVED', archived_at = published_time
    where id = previous_published.id;
    insert into public.workout_events(
      workout_plan_id, workout_plan_version_id, event_type, actor_user_id, metadata
    ) values (
      plan.id, previous_published.id, 'ARCHIVED', current_user_id,
      jsonb_build_object('reason', 'SUPERSEDED', 'version_number', previous_published.version_number)
    );
  end loop;
  update public.workout_plan_versions
  set status = 'PUBLISHED', published_at = published_time
  where id = target.id;
  insert into public.workout_events(
    workout_plan_id, workout_plan_version_id, event_type, actor_user_id, metadata
  ) values (
    plan.id, target.id, 'PUBLISHED', current_user_id,
    jsonb_build_object('version_number', target.version_number)
  );
end;
$$;

create or replace function public.archive_workout_version(p_workout_plan_version_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  target public.workout_plan_versions;
  relationship public.trainer_student_relationships;
begin
  select version.* into target from public.workout_plan_versions version
  where version.id = p_workout_plan_version_id for update;
  select candidate.* into relationship
  from public.workout_plans plan
  join public.trainer_student_relationships candidate
    on candidate.id = plan.trainer_student_relationship_id
  where plan.id = target.workout_plan_id for update of candidate;
  if current_user_id is null or target.id is null or target.status <> 'PUBLISHED'
    or relationship.status <> 'active'
    or not (select private.owns_trainer(relationship.trainer_profile_id))
  then raise exception 'workout_version_not_available_for_archive'; end if;
  update public.workout_plan_versions
  set status = 'ARCHIVED', archived_at = now()
  where id = target.id;
  insert into public.workout_events(
    workout_plan_id, workout_plan_version_id, event_type, actor_user_id,
    metadata
  ) values (
    target.workout_plan_id, target.id, 'ARCHIVED', current_user_id,
    jsonb_build_object('reason', 'TRAINER_ARCHIVED', 'version_number', target.version_number)
  );
end;
$$;

create or replace function public.create_new_draft_from_published_version(
  p_source_workout_plan_version_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  source_version public.workout_plan_versions;
  plan public.workout_plans;
  relationship public.trainer_student_relationships;
  next_version integer;
  created_version_id uuid;
  source_session record;
  source_section record;
  source_exercise record;
  source_set record;
  created_session_id uuid;
  created_section_id uuid;
  created_exercise_id uuid;
begin
  select version.* into source_version from public.workout_plan_versions version
  where version.id = p_source_workout_plan_version_id for update;
  select candidate.* into plan from public.workout_plans candidate
  where candidate.id = source_version.workout_plan_id for update;
  select candidate.* into relationship from public.trainer_student_relationships candidate
  where candidate.id = plan.trainer_student_relationship_id for update;
  if current_user_id is null or source_version.id is null
    or source_version.status not in ('PUBLISHED', 'ARCHIVED')
    or source_version.published_at is null
    or plan.status <> 'ACTIVE' or relationship.status <> 'active'
    or not (select private.owns_trainer(relationship.trainer_profile_id))
  then raise exception 'published_workout_version_not_available'; end if;
  select coalesce(max(version.version_number), 0) + 1 into next_version
  from public.workout_plan_versions version where version.workout_plan_id = plan.id;
  insert into public.workout_plan_versions(
    workout_plan_id, version_number, source_type, source_assessment_id,
    source_version_id, generation_metadata, created_by
  ) values (
    plan.id, next_version, 'MANUAL', source_version.source_assessment_id,
    source_version.id,
    jsonb_build_object('cloned_from_version_id', source_version.id),
    current_user_id
  ) returning id into created_version_id;

  for source_session in
    select * from public.workout_sessions
    where workout_plan_version_id = source_version.id order by sort_order, id
  loop
    insert into public.workout_sessions(
      workout_plan_version_id, name, description, estimated_duration_minutes, sort_order
    ) values (
      created_version_id, source_session.name, source_session.description,
      source_session.estimated_duration_minutes, source_session.sort_order
    ) returning id into created_session_id;
    for source_section in
      select * from public.workout_sections
      where workout_session_id = source_session.id order by sort_order, id
    loop
      insert into public.workout_sections(workout_session_id, section_type, name, sort_order)
      values (created_session_id, source_section.section_type, source_section.name, source_section.sort_order)
      returning id into created_section_id;
      for source_exercise in
        select * from public.workout_exercises
        where workout_section_id = source_section.id order by sort_order, id
      loop
        insert into public.workout_exercises(
          workout_section_id, exercise_id, sort_order, superset_group_key,
          trainer_note, student_instruction, tempo
        ) values (
          created_section_id, source_exercise.exercise_id, source_exercise.sort_order,
          source_exercise.superset_group_key, source_exercise.trainer_note,
          source_exercise.student_instruction, source_exercise.tempo
        ) returning id into created_exercise_id;
        for source_set in
          select * from public.workout_sets
          where workout_exercise_id = source_exercise.id order by set_number, id
        loop
          insert into public.workout_sets(
            workout_exercise_id, set_number, set_type, target_reps,
            target_reps_min, target_reps_max, target_load, load_unit,
            duration_seconds, distance_value, distance_unit, rest_seconds,
            target_rpe, notes
          ) values (
            created_exercise_id, source_set.set_number, source_set.set_type, source_set.target_reps,
            source_set.target_reps_min, source_set.target_reps_max, source_set.target_load,
            source_set.load_unit, source_set.duration_seconds, source_set.distance_value,
            source_set.distance_unit, source_set.rest_seconds, source_set.target_rpe, source_set.notes
          );
        end loop;
      end loop;
    end loop;
  end loop;
  insert into public.workout_events(
    workout_plan_id, workout_plan_version_id, event_type, actor_user_id,
    metadata
  ) values (
    plan.id, created_version_id, 'NEW_DRAFT_FROM_PUBLISHED', current_user_id,
    jsonb_build_object(
      'source_version_id', source_version.id,
      'source_version_number', source_version.version_number,
      'version_number', next_version
    )
  );
  return created_version_id;
end;
$$;

create or replace function private.build_workout_version_projection(
  p_workout_plan_version_id uuid,
  p_include_trainer_private boolean
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'plan', jsonb_build_object(
      'id', plan.id,
      'trainer_student_relationship_id', plan.trainer_student_relationship_id,
      'name', plan.name,
      'goal', plan.goal,
      'status', plan.status,
      'created_at', plan.created_at,
      'updated_at', plan.updated_at
    ),
    'version', jsonb_strip_nulls(jsonb_build_object(
      'id', version.id,
      'workout_plan_id', version.workout_plan_id,
      'version_number', version.version_number,
      'status', version.status,
      'source_type', case when p_include_trainer_private then version.source_type else null end,
      'source_assessment_id', case when p_include_trainer_private then version.source_assessment_id else null end,
      'source_version_id', case when p_include_trainer_private then version.source_version_id else null end,
      'trainer_prompt', case when p_include_trainer_private then version.trainer_prompt else null end,
      'generation_metadata', case when p_include_trainer_private then version.generation_metadata else null end,
      'approved_at', version.approved_at,
      'published_at', version.published_at,
      'archived_at', version.archived_at,
      'created_at', version.created_at
    )),
    'sessions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', session.id,
        'name', session.name,
        'description', session.description,
        'estimated_duration_minutes', session.estimated_duration_minutes,
        'sort_order', session.sort_order,
        'sections', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', section.id,
            'section_type', section.section_type,
            'name', section.name,
            'sort_order', section.sort_order,
            'exercises', coalesce((
              select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
                'id', prescribed.id,
                'sort_order', prescribed.sort_order,
                'superset_group_key', prescribed.superset_group_key,
                'trainer_note', case when p_include_trainer_private then prescribed.trainer_note else null end,
                'student_instruction', prescribed.student_instruction,
                'tempo', prescribed.tempo,
                'exercise', jsonb_build_object(
                  'id', exercise.id,
                  'source_type', exercise.source_type,
                  'name', exercise.name,
                  'description', exercise.description,
                  'primary_muscle_group', exercise.primary_muscle_group,
                  'secondary_muscle_groups', to_jsonb(exercise.secondary_muscle_groups),
                  'equipment', to_jsonb(exercise.equipment),
                  'movement_pattern', exercise.movement_pattern,
                  'instructions', exercise.instructions,
                  'coaching_cues', to_jsonb(exercise.coaching_cues),
                  'locale', exercise.locale
                ),
                'media', coalesce((
                  select jsonb_agg(jsonb_build_object(
                    'id', media.id,
                    'media_type', media.media_type,
                    'url_or_storage_path', media.url_or_storage_path,
                    'thumbnail_url_or_path', media.thumbnail_url_or_path,
                    'provider', media.provider,
                    'source_url', media.source_url,
                    'license_type', media.license_type,
                    'creator_credit', media.creator_credit,
                    'production_status', media.production_status,
                    'sort_order', media.sort_order
                  ) order by media.sort_order, media.id)
                  from public.exercise_media media
                  where media.exercise_id = exercise.id
                    and (
                      media.production_status = 'APPROVED'
                      or (
                        p_include_trainer_private
                        and exercise.owner_trainer_id = (select private.current_trainer_profile_id())
                      )
                    )
                ), '[]'::jsonb),
                'sets', coalesce((
                  select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
                    'id', set_row.id,
                    'set_number', set_row.set_number,
                    'set_type', set_row.set_type,
                    'target_reps', set_row.target_reps,
                    'target_reps_min', set_row.target_reps_min,
                    'target_reps_max', set_row.target_reps_max,
                    'target_load', set_row.target_load,
                    'load_unit', set_row.load_unit,
                    'duration_seconds', set_row.duration_seconds,
                    'distance_value', set_row.distance_value,
                    'distance_unit', set_row.distance_unit,
                    'rest_seconds', set_row.rest_seconds,
                    'target_rpe', set_row.target_rpe,
                    'notes', set_row.notes
                  )) order by set_row.set_number, set_row.id)
                  from public.workout_sets set_row
                  where set_row.workout_exercise_id = prescribed.id
                ), '[]'::jsonb)
              )) order by prescribed.sort_order, prescribed.id)
              from public.workout_exercises prescribed
              join public.exercises exercise on exercise.id = prescribed.exercise_id
              where prescribed.workout_section_id = section.id
            ), '[]'::jsonb)
          ) order by section.sort_order, section.id)
          from public.workout_sections section
          where section.workout_session_id = session.id
        ), '[]'::jsonb)
      ) order by session.sort_order, session.id)
      from public.workout_sessions session
      where session.workout_plan_version_id = version.id
    ), '[]'::jsonb)
  )
  from public.workout_plan_versions version
  join public.workout_plans plan on plan.id = version.workout_plan_id
  where version.id = p_workout_plan_version_id;
$$;

create or replace function public.get_trainer_workout_version(p_workout_plan_version_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  plan_id uuid;
begin
  select version.workout_plan_id into plan_id
  from public.workout_plan_versions version where version.id = p_workout_plan_version_id;
  if plan_id is null or not (select private.workout_plan_owned_by_current_trainer(plan_id)) then
    raise exception 'workout_version_not_available';
  end if;
  return private.build_workout_version_projection(p_workout_plan_version_id, true);
end;
$$;

create or replace function public.get_student_workout_version(p_workout_plan_version_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  target public.workout_plan_versions;
begin
  select version.* into target from public.workout_plan_versions version
  where version.id = p_workout_plan_version_id;
  if target.id is null or target.status not in ('PUBLISHED', 'ARCHIVED')
    or not (select private.workout_plan_owned_by_current_student(target.workout_plan_id))
  then raise exception 'published_workout_not_available'; end if;
  return private.build_workout_version_projection(target.id, false);
end;
$$;

create or replace function public.list_trainer_workout_plans()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', plan.id,
    'trainer_student_relationship_id', plan.trainer_student_relationship_id,
    'name', plan.name,
    'goal', plan.goal,
    'status', plan.status,
    'created_at', plan.created_at,
    'updated_at', plan.updated_at,
    'versions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', version.id,
        'version_number', version.version_number,
        'status', version.status,
        'source_type', version.source_type,
        'source_assessment_id', version.source_assessment_id,
        'approved_at', version.approved_at,
        'published_at', version.published_at,
        'archived_at', version.archived_at,
        'created_at', version.created_at
      ) order by version.version_number desc)
      from public.workout_plan_versions version where version.workout_plan_id = plan.id
    ), '[]'::jsonb)
  ) order by plan.updated_at desc, plan.id), '[]'::jsonb)
  from public.workout_plans plan
  where (select private.workout_plan_owned_by_current_trainer(plan.id));
$$;

create or replace function public.list_student_published_workouts()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', version.id,
    'workout_plan_id', plan.id,
    'plan_name', plan.name,
    'goal', plan.goal,
    'version_number', version.version_number,
    'status', version.status,
    'published_at', version.published_at,
    'archived_at', version.archived_at
  ) order by version.published_at desc, version.id), '[]'::jsonb)
  from public.workout_plan_versions version
  join public.workout_plans plan on plan.id = version.workout_plan_id
  where version.status in ('PUBLISHED', 'ARCHIVED')
    and (select private.workout_plan_owned_by_current_student(plan.id));
$$;

create or replace function public.search_exercise_library(
  p_query text default null,
  p_limit integer default 50
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  trainer_profile_id uuid := (select private.current_trainer_profile_id());
  normalized_query text := lower(trim(coalesce(p_query, '')));
  safe_limit integer := greatest(1, least(coalesce(p_limit, 50), 100));
  result jsonb;
begin
  if trainer_profile_id is null then raise exception 'trainer_authentication_required'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', exercise.id,
    'source_type', exercise.source_type,
    'name', exercise.name,
    'description', exercise.description,
    'primary_muscle_group', exercise.primary_muscle_group,
    'secondary_muscle_groups', to_jsonb(exercise.secondary_muscle_groups),
    'equipment', to_jsonb(exercise.equipment),
    'movement_pattern', exercise.movement_pattern,
    'instructions', exercise.instructions,
    'coaching_cues', to_jsonb(exercise.coaching_cues),
    'locale', exercise.locale,
    'media', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', media.id,
        'media_type', media.media_type,
        'url_or_storage_path', media.url_or_storage_path,
        'thumbnail_url_or_path', media.thumbnail_url_or_path,
        'provider', media.provider,
        'source_url', media.source_url,
        'license_type', media.license_type,
        'creator_credit', media.creator_credit,
        'production_status', media.production_status,
        'sort_order', media.sort_order
      ) order by media.sort_order, media.id)
      from public.exercise_media media
      where media.exercise_id = exercise.id
        and (
          media.production_status = 'APPROVED'
          or exercise.owner_trainer_id = trainer_profile_id
        )
    ), '[]'::jsonb)
  ) order by
    case when exercise.owner_trainer_id = trainer_profile_id then 0 else 1 end,
    exercise.normalized_name,
    exercise.id), '[]'::jsonb) into result
  from (
    select candidate.*
    from public.exercises candidate
    where candidate.status = 'ACTIVE'
      and (candidate.owner_trainer_id is null or candidate.owner_trainer_id = trainer_profile_id)
      and (
        normalized_query = ''
        or candidate.normalized_name like '%' || normalized_query || '%'
        or candidate.primary_muscle_group = normalized_query
        or normalized_query = any(candidate.equipment)
      )
    order by
      case when candidate.owner_trainer_id = trainer_profile_id then 0 else 1 end,
      candidate.normalized_name,
      candidate.id
    limit safe_limit
  ) exercise;
  return result;
end;
$$;

revoke all on public.exercises, public.exercise_media, public.workout_plans,
  public.workout_plan_versions, public.workout_sessions, public.workout_sections,
  public.workout_exercises, public.workout_sets, public.workout_events
  from public, anon, authenticated;

grant select on public.exercises, public.exercise_media, public.workout_plans,
  public.workout_sessions, public.workout_sections, public.workout_sets,
  public.workout_events to authenticated;
grant select(
  id, workout_plan_id, version_number, status, approved_at, published_at,
  archived_at, created_by, created_at
) on public.workout_plan_versions to authenticated;
grant select(
  id, workout_section_id, exercise_id, sort_order, superset_group_key,
  student_instruction, tempo, created_at, updated_at
) on public.workout_exercises to authenticated;

revoke all on function private.workout_plan_owned_by_current_trainer(uuid),
  private.workout_plan_owned_by_current_student(uuid),
  private.can_read_workout_version(uuid),
  private.workout_version_is_mutable(uuid),
  private.exercise_visible_to_trainer(uuid,uuid),
  private.can_read_exercise(uuid),
  private.can_read_exercise_media(uuid,text),
  private.record_workout_draft_update(uuid,text,jsonb),
  private.validate_workout_version_structure(uuid),
  private.guard_exercise_update(),
  private.guard_exercise_media_change(),
  private.guard_workout_plan_update(),
  private.guard_workout_version_update(),
  private.guard_workout_structure_mutation(),
  private.reject_workout_event_change(),
  private.build_workout_version_projection(uuid,boolean)
  from public, anon, authenticated;

grant execute on function private.workout_plan_owned_by_current_trainer(uuid),
  private.workout_plan_owned_by_current_student(uuid),
  private.can_read_workout_version(uuid),
  private.can_read_exercise(uuid),
  private.can_read_exercise_media(uuid,text)
  to authenticated;

revoke all on function public.create_custom_exercise(text,text,text,text[],text[],text,text,text[],text),
  public.add_custom_exercise_media(uuid,text,text,text,text,text,text,text),
  public.create_workout_plan(uuid,text,text),
  public.create_workout_draft_version(uuid,text,uuid,text,jsonb),
  public.add_workout_session(uuid,text,text,integer),
  public.update_workout_session(uuid,text,text,integer),
  public.reorder_workout_sessions(uuid,uuid[]),
  public.remove_workout_session(uuid),
  public.add_workout_section(uuid,text,text),
  public.update_workout_section(uuid,text,text),
  public.reorder_workout_sections(uuid,uuid[]),
  public.remove_workout_section(uuid),
  public.add_workout_exercise(uuid,uuid,text,text,text,text),
  public.update_workout_exercise(uuid,text,text,text,text),
  public.replace_workout_exercise(uuid,uuid),
  public.reorder_workout_exercises(uuid,uuid[]),
  public.remove_workout_exercise(uuid),
  public.upsert_workout_set(uuid,uuid,integer,text,integer,integer,integer,numeric,text,integer,numeric,text,integer,numeric,text),
  public.remove_workout_set(uuid),
  public.approve_workout_version(uuid),
  public.publish_workout_version(uuid),
  public.archive_workout_version(uuid),
  public.create_new_draft_from_published_version(uuid),
  public.get_trainer_workout_version(uuid),
  public.get_student_workout_version(uuid),
  public.list_trainer_workout_plans(),
  public.list_student_published_workouts(),
  public.search_exercise_library(text,integer)
  from public, anon, authenticated;

grant execute on function public.create_custom_exercise(text,text,text,text[],text[],text,text,text[],text),
  public.add_custom_exercise_media(uuid,text,text,text,text,text,text,text),
  public.create_workout_plan(uuid,text,text),
  public.create_workout_draft_version(uuid,text,uuid,text,jsonb),
  public.add_workout_session(uuid,text,text,integer),
  public.update_workout_session(uuid,text,text,integer),
  public.reorder_workout_sessions(uuid,uuid[]),
  public.remove_workout_session(uuid),
  public.add_workout_section(uuid,text,text),
  public.update_workout_section(uuid,text,text),
  public.reorder_workout_sections(uuid,uuid[]),
  public.remove_workout_section(uuid),
  public.add_workout_exercise(uuid,uuid,text,text,text,text),
  public.update_workout_exercise(uuid,text,text,text,text),
  public.replace_workout_exercise(uuid,uuid),
  public.reorder_workout_exercises(uuid,uuid[]),
  public.remove_workout_exercise(uuid),
  public.upsert_workout_set(uuid,uuid,integer,text,integer,integer,integer,numeric,text,integer,numeric,text,integer,numeric,text),
  public.remove_workout_set(uuid),
  public.approve_workout_version(uuid),
  public.publish_workout_version(uuid),
  public.archive_workout_version(uuid),
  public.create_new_draft_from_published_version(uuid),
  public.get_trainer_workout_version(uuid),
  public.get_student_workout_version(uuid),
  public.list_trainer_workout_plans(),
  public.list_student_published_workouts(),
  public.search_exercise_library(text,integer)
  to authenticated;

alter function private.workout_plan_owned_by_current_trainer(uuid) owner to postgres;
alter function private.workout_plan_owned_by_current_student(uuid) owner to postgres;
alter function private.can_read_workout_version(uuid) owner to postgres;
alter function private.workout_version_is_mutable(uuid) owner to postgres;
alter function private.exercise_visible_to_trainer(uuid,uuid) owner to postgres;
alter function private.can_read_exercise(uuid) owner to postgres;
alter function private.can_read_exercise_media(uuid,text) owner to postgres;
alter function private.record_workout_draft_update(uuid,text,jsonb) owner to postgres;
alter function private.validate_workout_version_structure(uuid) owner to postgres;
alter function private.guard_exercise_update() owner to postgres;
alter function private.guard_exercise_media_change() owner to postgres;
alter function private.guard_workout_plan_update() owner to postgres;
alter function private.guard_workout_version_update() owner to postgres;
alter function private.guard_workout_structure_mutation() owner to postgres;
alter function private.reject_workout_event_change() owner to postgres;
alter function private.build_workout_version_projection(uuid,boolean) owner to postgres;

alter function public.create_custom_exercise(text,text,text,text[],text[],text,text,text[],text) owner to postgres;
alter function public.add_custom_exercise_media(uuid,text,text,text,text,text,text,text) owner to postgres;
alter function public.create_workout_plan(uuid,text,text) owner to postgres;
alter function public.create_workout_draft_version(uuid,text,uuid,text,jsonb) owner to postgres;
alter function public.add_workout_session(uuid,text,text,integer) owner to postgres;
alter function public.update_workout_session(uuid,text,text,integer) owner to postgres;
alter function public.reorder_workout_sessions(uuid,uuid[]) owner to postgres;
alter function public.remove_workout_session(uuid) owner to postgres;
alter function public.add_workout_section(uuid,text,text) owner to postgres;
alter function public.update_workout_section(uuid,text,text) owner to postgres;
alter function public.reorder_workout_sections(uuid,uuid[]) owner to postgres;
alter function public.remove_workout_section(uuid) owner to postgres;
alter function public.add_workout_exercise(uuid,uuid,text,text,text,text) owner to postgres;
alter function public.update_workout_exercise(uuid,text,text,text,text) owner to postgres;
alter function public.replace_workout_exercise(uuid,uuid) owner to postgres;
alter function public.reorder_workout_exercises(uuid,uuid[]) owner to postgres;
alter function public.remove_workout_exercise(uuid) owner to postgres;
alter function public.upsert_workout_set(uuid,uuid,integer,text,integer,integer,integer,numeric,text,integer,numeric,text,integer,numeric,text) owner to postgres;
alter function public.remove_workout_set(uuid) owner to postgres;
alter function public.approve_workout_version(uuid) owner to postgres;
alter function public.publish_workout_version(uuid) owner to postgres;
alter function public.archive_workout_version(uuid) owner to postgres;
alter function public.create_new_draft_from_published_version(uuid) owner to postgres;
alter function public.get_trainer_workout_version(uuid) owner to postgres;
alter function public.get_student_workout_version(uuid) owner to postgres;
alter function public.list_trainer_workout_plans() owner to postgres;
alter function public.list_student_published_workouts() owner to postgres;
alter function public.search_exercise_library(text,integer) owner to postgres;

do $security_gate$
declare
  missing_rls text;
  unsafe_function text;
  workout_tables text[] := array[
    'exercises', 'exercise_media', 'workout_plans', 'workout_plan_versions',
    'workout_sessions', 'workout_sections', 'workout_exercises',
    'workout_sets', 'workout_events'
  ];
begin
  select string_agg(c.relname, ', ' order by c.relname) into missing_rls
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = any(workout_tables)
    and not c.relrowsecurity;
  if missing_rls is not null then raise exception 'workout_rls_missing:%', missing_rls; end if;

  if exists (
    select 1 from information_schema.role_table_grants
    where grantee = 'anon' and table_schema = 'public' and table_name = any(workout_tables)
  ) then raise exception 'anonymous_workout_privilege_detected'; end if;

  if exists (
    select 1 from information_schema.role_table_grants
    where grantee = 'authenticated' and table_schema = 'public'
      and table_name = any(workout_tables)
      and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER')
  ) then raise exception 'direct_workout_mutation_privilege_detected'; end if;

  if has_column_privilege('authenticated', 'public.workout_plan_versions', 'trainer_prompt', 'SELECT')
    or has_column_privilege('authenticated', 'public.workout_plan_versions', 'generation_metadata', 'SELECT')
    or has_column_privilege('authenticated', 'public.workout_exercises', 'trainer_note', 'SELECT')
  then raise exception 'trainer_private_workout_column_exposed'; end if;

  if has_function_privilege('anon', 'public.create_workout_plan(uuid,text,text)', 'EXECUTE')
    or has_function_privilege('anon', 'public.get_student_workout_version(uuid)', 'EXECUTE')
    or not has_function_privilege('authenticated', 'public.create_workout_plan(uuid,text,text)', 'EXECUTE')
  then raise exception 'unsafe_workout_function_grants'; end if;

  select n.nspname || '.' || p.proname into unsafe_function
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where p.prosecdef
    and n.nspname in ('public', 'private')
    and p.proname in (
      'workout_plan_owned_by_current_trainer', 'workout_plan_owned_by_current_student',
      'can_read_workout_version', 'workout_version_is_mutable', 'exercise_visible_to_trainer',
      'can_read_exercise', 'can_read_exercise_media', 'record_workout_draft_update',
      'validate_workout_version_structure', 'guard_exercise_update',
      'guard_exercise_media_change', 'guard_workout_plan_update',
      'guard_workout_version_update', 'guard_workout_structure_mutation',
      'reject_workout_event_change', 'build_workout_version_projection',
      'create_custom_exercise', 'add_custom_exercise_media', 'create_workout_plan',
      'create_workout_draft_version', 'add_workout_session', 'update_workout_session',
      'reorder_workout_sessions', 'remove_workout_session', 'add_workout_section',
      'update_workout_section', 'reorder_workout_sections', 'remove_workout_section',
      'add_workout_exercise', 'update_workout_exercise', 'replace_workout_exercise',
      'reorder_workout_exercises', 'remove_workout_exercise', 'upsert_workout_set',
      'remove_workout_set', 'approve_workout_version', 'publish_workout_version',
      'archive_workout_version', 'create_new_draft_from_published_version',
      'get_trainer_workout_version', 'get_student_workout_version',
      'list_trainer_workout_plans', 'list_student_published_workouts',
      'search_exercise_library'
    )
    and (
      p.proconfig is null
      or array_to_string(p.proconfig, ',') !~ '^search_path=(""|)$'
      or (select owner_role.rolname from pg_roles owner_role where owner_role.oid = p.proowner) <> 'postgres'
    )
  limit 1;
  if unsafe_function is not null then raise exception 'unsafe_workout_function:%', unsafe_function; end if;

  if not exists (
    select 1 from pg_trigger trigger_row
    where trigger_row.tgrelid = 'public.workout_events'::regclass
      and trigger_row.tgname = 'reject_workout_event_change'
      and not trigger_row.tgisinternal
  ) then raise exception 'workout_event_append_only_trigger_missing'; end if;
end;
$security_gate$;
