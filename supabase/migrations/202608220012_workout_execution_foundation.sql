-- Sprint 5A: student workout execution foundation.
-- Prescription remains immutable. These tables record only execution facts.

create table public.workout_executions (
  id uuid primary key default gen_random_uuid(),
  trainer_student_relationship_id uuid not null references public.trainer_student_relationships(id) on delete restrict,
  student_profile_id uuid not null references public.student_profiles(id) on delete restrict,
  workout_plan_id uuid not null references public.workout_plans(id) on delete restrict,
  workout_plan_version_id uuid not null references public.workout_plan_versions(id) on delete restrict,
  workout_session_id uuid not null references public.workout_sessions(id) on delete restrict,
  status text not null default 'IN_PROGRESS',
  started_at timestamptz not null default now(),
  paused_at timestamptz,
  paused_seconds integer not null default 0,
  completed_at timestamptz,
  abandoned_at timestamptz,
  last_activity_at timestamptz not null default now(),
  server_revision integer not null default 1,
  difficulty text,
  student_note text,
  feedback_recorded_at timestamptz,
  created_by uuid not null references public.app_users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workout_executions_status_check check (status in ('IN_PROGRESS', 'PAUSED', 'COMPLETED', 'ABANDONED')),
  constraint workout_executions_paused_seconds_check check (paused_seconds >= 0),
  constraint workout_executions_revision_check check (server_revision > 0),
  constraint workout_executions_difficulty_check check (
    difficulty is null or difficulty in ('EASY', 'GOOD', 'CHALLENGING', 'VERY_HARD')
  ),
  constraint workout_executions_note_check check (
    student_note is null or char_length(trim(student_note)) between 1 and 2000
  ),
  constraint workout_executions_feedback_check check (
    (feedback_recorded_at is null and difficulty is null)
    or (feedback_recorded_at is not null and difficulty is not null)
  ),
  constraint workout_executions_lifecycle_check check (
    (status = 'IN_PROGRESS' and paused_at is null and completed_at is null and abandoned_at is null)
    or (status = 'PAUSED' and paused_at is not null and completed_at is null and abandoned_at is null)
    or (status = 'COMPLETED' and paused_at is null and completed_at is not null and abandoned_at is null)
    or (status = 'ABANDONED' and paused_at is null and completed_at is null and abandoned_at is not null)
  )
);

create unique index workout_executions_one_active_session_idx
  on public.workout_executions(student_profile_id, workout_session_id)
  where status in ('IN_PROGRESS', 'PAUSED');
create index workout_executions_student_history_idx
  on public.workout_executions(student_profile_id, started_at desc, id);
create index workout_executions_relationship_history_idx
  on public.workout_executions(trainer_student_relationship_id, started_at desc, id);
create index workout_executions_session_history_idx
  on public.workout_executions(workout_session_id, started_at desc, id);

create table public.workout_exercise_executions (
  id uuid primary key default gen_random_uuid(),
  workout_execution_id uuid not null references public.workout_executions(id) on delete restrict,
  workout_exercise_id uuid not null references public.workout_exercises(id) on delete restrict,
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  sort_order integer not null,
  status text not null default 'PENDING',
  started_at timestamptz,
  completed_at timestamptz,
  skipped_at timestamptz,
  skip_reason text,
  student_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workout_exercise_executions_order_check check (sort_order >= 0),
  constraint workout_exercise_executions_status_check check (status in ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED')),
  constraint workout_exercise_executions_skip_reason_check check (
    skip_reason is null or skip_reason in ('PAIN', 'EQUIPMENT_UNAVAILABLE', 'FATIGUE', 'TIME', 'OTHER')
  ),
  constraint workout_exercise_executions_note_check check (
    student_note is null or char_length(trim(student_note)) between 1 and 2000
  ),
  constraint workout_exercise_executions_lifecycle_check check (
    (status = 'PENDING' and started_at is null and completed_at is null and skipped_at is null and skip_reason is null)
    or (status = 'IN_PROGRESS' and started_at is not null and completed_at is null and skipped_at is null and skip_reason is null)
    or (status = 'COMPLETED' and started_at is not null and completed_at is not null and skipped_at is null and skip_reason is null)
    or (status = 'SKIPPED' and completed_at is null and skipped_at is not null)
  ),
  unique (workout_execution_id, workout_exercise_id),
  unique (workout_execution_id, sort_order)
);

create index workout_exercise_executions_execution_idx
  on public.workout_exercise_executions(workout_execution_id, sort_order);
create index workout_exercise_executions_previous_idx
  on public.workout_exercise_executions(exercise_id, workout_execution_id);

create table public.workout_set_executions (
  id uuid primary key default gen_random_uuid(),
  workout_execution_id uuid not null references public.workout_executions(id) on delete restrict,
  workout_exercise_execution_id uuid not null references public.workout_exercise_executions(id) on delete restrict,
  workout_set_id uuid not null references public.workout_sets(id) on delete restrict,
  set_number integer not null,
  status text not null default 'PENDING',
  actual_reps integer,
  actual_load numeric,
  load_unit text,
  actual_duration_seconds integer,
  actual_distance numeric,
  distance_unit text,
  actual_rpe numeric(3,1),
  completed_at timestamptz,
  skipped_at timestamptz,
  skip_reason text,
  rest_started_at timestamptz,
  rest_ends_at timestamptz,
  rest_skipped_at timestamptz,
  student_note text,
  revision integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workout_set_executions_number_check check (set_number > 0),
  constraint workout_set_executions_status_check check (status in ('PENDING', 'COMPLETED', 'SKIPPED')),
  constraint workout_set_executions_actual_reps_check check (actual_reps is null or actual_reps >= 0),
  constraint workout_set_executions_actual_load_check check (
    (actual_load is null and load_unit is null)
    or (actual_load is not null and actual_load >= 0 and load_unit in ('kg', 'lb'))
  ),
  constraint workout_set_executions_actual_duration_check check (
    actual_duration_seconds is null or actual_duration_seconds >= 0
  ),
  constraint workout_set_executions_actual_distance_check check (
    (actual_distance is null and distance_unit is null)
    or (actual_distance is not null and actual_distance >= 0 and distance_unit in ('m', 'km', 'mi'))
  ),
  constraint workout_set_executions_actual_rpe_check check (actual_rpe is null or actual_rpe between 0 and 10),
  constraint workout_set_executions_skip_reason_check check (
    skip_reason is null or skip_reason in ('PAIN', 'EQUIPMENT_UNAVAILABLE', 'FATIGUE', 'TIME', 'OTHER')
  ),
  constraint workout_set_executions_note_check check (
    student_note is null or char_length(trim(student_note)) between 1 and 1000
  ),
  constraint workout_set_executions_revision_check check (revision >= 0),
  constraint workout_set_executions_rest_check check (
    (rest_started_at is null and rest_ends_at is null)
    or (rest_started_at is not null and rest_ends_at is not null and rest_ends_at >= rest_started_at)
  ),
  constraint workout_set_executions_lifecycle_check check (
    (status = 'PENDING' and completed_at is null and skipped_at is null and skip_reason is null)
    or (status = 'COMPLETED' and completed_at is not null and skipped_at is null and skip_reason is null)
    or (status = 'SKIPPED' and completed_at is null and skipped_at is not null)
  ),
  unique (workout_execution_id, workout_set_id),
  unique (workout_exercise_execution_id, set_number)
);

create index workout_set_executions_execution_idx
  on public.workout_set_executions(workout_execution_id, workout_exercise_execution_id, set_number);

create table public.workout_execution_events (
  id uuid primary key default gen_random_uuid(),
  workout_execution_id uuid not null references public.workout_executions(id) on delete restrict,
  event_type text not null,
  actor_user_id uuid not null references public.app_users(id) on delete restrict,
  client_mutation_id uuid,
  server_revision integer not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint workout_execution_events_type_check check (event_type in (
    'EXECUTION_STARTED', 'EXECUTION_RESUMED', 'EXECUTION_PAUSED',
    'SET_COMPLETED', 'SET_UPDATED', 'SET_SKIPPED', 'EXERCISE_SKIPPED',
    'EXECUTION_COMPLETED', 'EXECUTION_ABANDONED', 'FEEDBACK_RECORDED'
  )),
  constraint workout_execution_events_revision_check check (server_revision > 0),
  constraint workout_execution_events_metadata_check check (
    jsonb_typeof(metadata) = 'object' and pg_column_size(metadata) <= 32768
  )
);

create unique index workout_execution_events_idempotency_idx
  on public.workout_execution_events(workout_execution_id, actor_user_id, client_mutation_id)
  where client_mutation_id is not null;
create unique index workout_execution_events_revision_idx
  on public.workout_execution_events(workout_execution_id, server_revision);
create index workout_execution_events_history_idx
  on public.workout_execution_events(workout_execution_id, created_at, id);

alter table public.workout_executions enable row level security;
alter table public.workout_exercise_executions enable row level security;
alter table public.workout_set_executions enable row level security;
alter table public.workout_execution_events enable row level security;

create or replace function private.workout_execution_owned_by_current_student(p_workout_execution_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workout_executions execution
    where execution.id = p_workout_execution_id
      and (select private.owns_student(execution.student_profile_id))
  );
$$;

create or replace function private.workout_execution_owned_by_current_trainer(p_workout_execution_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workout_executions execution
    join public.trainer_student_relationships relationship
      on relationship.id = execution.trainer_student_relationship_id
    where execution.id = p_workout_execution_id
      and (select private.owns_trainer(relationship.trainer_profile_id))
  );
$$;

create or replace function private.can_read_workout_execution(p_workout_execution_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select private.workout_execution_owned_by_current_student(p_workout_execution_id))
    or (select private.workout_execution_owned_by_current_trainer(p_workout_execution_id));
$$;

create or replace function private.guard_workout_execution_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  valid_identity boolean;
begin
  if tg_op = 'INSERT' then
    select exists (
      select 1
      from public.trainer_student_relationships relationship
      join public.workout_plans plan on plan.trainer_student_relationship_id = relationship.id
      join public.workout_plan_versions version on version.workout_plan_id = plan.id
      join public.workout_sessions session on session.workout_plan_version_id = version.id
      where relationship.id = new.trainer_student_relationship_id
        and relationship.student_profile_id = new.student_profile_id
        and plan.id = new.workout_plan_id
        and version.id = new.workout_plan_version_id
        and session.id = new.workout_session_id
    ) into valid_identity;
    if not valid_identity then raise exception 'execution_prescription_identity_mismatch'; end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    raise exception 'workout_executions_cannot_be_deleted';
  end if;

  if old.trainer_student_relationship_id is distinct from new.trainer_student_relationship_id
    or old.student_profile_id is distinct from new.student_profile_id
    or old.workout_plan_id is distinct from new.workout_plan_id
    or old.workout_plan_version_id is distinct from new.workout_plan_version_id
    or old.workout_session_id is distinct from new.workout_session_id
    or old.started_at is distinct from new.started_at
    or old.created_by is distinct from new.created_by
    or old.created_at is distinct from new.created_at
  then raise exception 'execution_identity_is_immutable'; end if;

  if old.status in ('COMPLETED', 'ABANDONED') then
    if old.status is distinct from new.status
      or old.paused_at is distinct from new.paused_at
      or old.paused_seconds is distinct from new.paused_seconds
      or old.completed_at is distinct from new.completed_at
      or old.abandoned_at is distinct from new.abandoned_at
    then raise exception 'terminal_execution_is_immutable'; end if;
    if old.status = 'ABANDONED' and (
      old.difficulty is distinct from new.difficulty
      or old.student_note is distinct from new.student_note
      or old.feedback_recorded_at is distinct from new.feedback_recorded_at
    ) then raise exception 'abandoned_execution_feedback_forbidden'; end if;
  end if;
  return new;
end;
$$;

create or replace function private.guard_workout_execution_child()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  execution_id uuid;
  execution_status text;
  valid_identity boolean;
begin
  execution_id := case when tg_op = 'DELETE' then old.workout_execution_id else new.workout_execution_id end;
  select execution.status into execution_status
  from public.workout_executions execution where execution.id = execution_id;

  if tg_op in ('UPDATE', 'DELETE') and execution_status in ('COMPLETED', 'ABANDONED') then
    raise exception 'terminal_execution_children_are_immutable';
  end if;
  if tg_op = 'DELETE' then return old; end if;

  if tg_table_name = 'workout_exercise_executions' then
    if tg_op = 'UPDATE' and (
      old.workout_execution_id is distinct from new.workout_execution_id
      or old.workout_exercise_id is distinct from new.workout_exercise_id
      or old.exercise_id is distinct from new.exercise_id
      or old.sort_order is distinct from new.sort_order
      or old.created_at is distinct from new.created_at
    ) then raise exception 'exercise_execution_identity_is_immutable'; end if;
    select exists (
      select 1
      from public.workout_executions execution
      join public.workout_exercises prescribed on prescribed.id = new.workout_exercise_id
      join public.workout_sections section on section.id = prescribed.workout_section_id
      where execution.id = new.workout_execution_id
        and section.workout_session_id = execution.workout_session_id
        and prescribed.exercise_id = new.exercise_id
    ) into valid_identity;
  else
    if tg_op = 'UPDATE' and (
      old.workout_execution_id is distinct from new.workout_execution_id
      or old.workout_exercise_execution_id is distinct from new.workout_exercise_execution_id
      or old.workout_set_id is distinct from new.workout_set_id
      or old.set_number is distinct from new.set_number
      or old.created_at is distinct from new.created_at
    ) then raise exception 'set_execution_identity_is_immutable'; end if;
    select exists (
      select 1
      from public.workout_exercise_executions exercise_execution
      join public.workout_sets prescribed_set on prescribed_set.id = new.workout_set_id
      where exercise_execution.id = new.workout_exercise_execution_id
        and exercise_execution.workout_execution_id = new.workout_execution_id
        and prescribed_set.workout_exercise_id = exercise_execution.workout_exercise_id
        and prescribed_set.set_number = new.set_number
    ) into valid_identity;
  end if;
  if not valid_identity then raise exception 'execution_child_prescription_mismatch'; end if;
  return new;
end;
$$;

create or replace function private.reject_workout_execution_event_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'workout_execution_events_are_append_only';
end;
$$;

create trigger guard_workout_execution_row
before insert or update or delete on public.workout_executions
for each row execute function private.guard_workout_execution_row();
create trigger touch_workout_executions_updated_at
before update on public.workout_executions
for each row execute function private.touch_updated_at();
create trigger guard_workout_exercise_execution
before insert or update or delete on public.workout_exercise_executions
for each row execute function private.guard_workout_execution_child();
create trigger touch_workout_exercise_executions_updated_at
before update on public.workout_exercise_executions
for each row execute function private.touch_updated_at();
create trigger guard_workout_set_execution
before insert or update or delete on public.workout_set_executions
for each row execute function private.guard_workout_execution_child();
create trigger touch_workout_set_executions_updated_at
before update on public.workout_set_executions
for each row execute function private.touch_updated_at();
create trigger reject_workout_execution_event_update
before update or delete on public.workout_execution_events
for each row execute function private.reject_workout_execution_event_change();

create policy "relationship parties read workout executions" on public.workout_executions
for select to authenticated using ((select private.can_read_workout_execution(id)));
create policy "relationship parties read exercise executions" on public.workout_exercise_executions
for select to authenticated using ((select private.can_read_workout_execution(workout_execution_id)));
create policy "relationship parties read set executions" on public.workout_set_executions
for select to authenticated using ((select private.can_read_workout_execution(workout_execution_id)));
create policy "relationship parties read execution events" on public.workout_execution_events
for select to authenticated using ((select private.can_read_workout_execution(workout_execution_id)));

create or replace function private.build_workout_execution_snapshot(p_workout_execution_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'execution', jsonb_build_object(
      'id', execution.id,
      'trainer_student_relationship_id', execution.trainer_student_relationship_id,
      'student_profile_id', execution.student_profile_id,
      'workout_plan_id', execution.workout_plan_id,
      'workout_plan_version_id', execution.workout_plan_version_id,
      'workout_session_id', execution.workout_session_id,
      'status', execution.status,
      'started_at', execution.started_at,
      'paused_at', execution.paused_at,
      'paused_seconds', execution.paused_seconds,
      'completed_at', execution.completed_at,
      'abandoned_at', execution.abandoned_at,
      'last_activity_at', execution.last_activity_at,
      'server_revision', execution.server_revision,
      'difficulty', execution.difficulty,
      'student_note', execution.student_note,
      'feedback_recorded_at', execution.feedback_recorded_at,
      'created_at', execution.created_at,
      'updated_at', execution.updated_at
    ),
    'plan', jsonb_build_object(
      'id', plan.id,
      'name', plan.name,
      'goal', plan.goal,
      'status', plan.status
    ),
    'version', jsonb_build_object(
      'id', version.id,
      'version_number', version.version_number,
      'status', version.status,
      'published_at', version.published_at,
      'archived_at', version.archived_at
    ),
    'session', jsonb_build_object(
      'id', session.id,
      'name', session.name,
      'description', session.description,
      'estimated_duration_minutes', session.estimated_duration_minutes,
      'sort_order', session.sort_order
    ),
    'sections', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', section.id,
        'section_type', section.section_type,
        'name', section.name,
        'sort_order', section.sort_order,
        'exercises', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', prescribed.id,
            'sort_order', prescribed.sort_order,
            'superset_group_key', prescribed.superset_group_key,
            'student_instruction', prescribed.student_instruction,
            'tempo', prescribed.tempo,
            'exercise', jsonb_build_object(
              'id', exercise.id,
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
              where media.exercise_id = exercise.id and media.production_status = 'APPROVED'
            ), '[]'::jsonb),
            'execution', jsonb_build_object(
              'id', exercise_execution.id,
              'status', exercise_execution.status,
              'started_at', exercise_execution.started_at,
              'completed_at', exercise_execution.completed_at,
              'skipped_at', exercise_execution.skipped_at,
              'skip_reason', exercise_execution.skip_reason,
              'student_note', exercise_execution.student_note
            ),
            'sets', coalesce((
              select jsonb_agg(jsonb_build_object(
                'id', prescribed_set.id,
                'set_number', prescribed_set.set_number,
                'set_type', prescribed_set.set_type,
                'target_reps', prescribed_set.target_reps,
                'target_reps_min', prescribed_set.target_reps_min,
                'target_reps_max', prescribed_set.target_reps_max,
                'target_load', prescribed_set.target_load,
                'load_unit', prescribed_set.load_unit,
                'duration_seconds', prescribed_set.duration_seconds,
                'distance_value', prescribed_set.distance_value,
                'distance_unit', prescribed_set.distance_unit,
                'rest_seconds', prescribed_set.rest_seconds,
                'target_rpe', prescribed_set.target_rpe,
                'notes', prescribed_set.notes,
                'execution', jsonb_build_object(
                  'id', set_execution.id,
                  'status', set_execution.status,
                  'actual_reps', set_execution.actual_reps,
                  'actual_load', set_execution.actual_load,
                  'load_unit', set_execution.load_unit,
                  'actual_duration_seconds', set_execution.actual_duration_seconds,
                  'actual_distance', set_execution.actual_distance,
                  'distance_unit', set_execution.distance_unit,
                  'actual_rpe', set_execution.actual_rpe,
                  'completed_at', set_execution.completed_at,
                  'skipped_at', set_execution.skipped_at,
                  'skip_reason', set_execution.skip_reason,
                  'rest_started_at', set_execution.rest_started_at,
                  'rest_ends_at', set_execution.rest_ends_at,
                  'rest_skipped_at', set_execution.rest_skipped_at,
                  'student_note', set_execution.student_note,
                  'revision', set_execution.revision
                )
              ) order by prescribed_set.set_number, prescribed_set.id)
              from public.workout_sets prescribed_set
              join public.workout_set_executions set_execution
                on set_execution.workout_set_id = prescribed_set.id
               and set_execution.workout_execution_id = execution.id
              where prescribed_set.workout_exercise_id = prescribed.id
            ), '[]'::jsonb)
          ) order by prescribed.sort_order, prescribed.id)
          from public.workout_exercises prescribed
          join public.exercises exercise on exercise.id = prescribed.exercise_id
          join public.workout_exercise_executions exercise_execution
            on exercise_execution.workout_exercise_id = prescribed.id
           and exercise_execution.workout_execution_id = execution.id
          where prescribed.workout_section_id = section.id
        ), '[]'::jsonb)
      ) order by section.sort_order, section.id)
      from public.workout_sections section
      where section.workout_session_id = execution.workout_session_id
    ), '[]'::jsonb),
    'metrics', jsonb_build_object(
      'completed_exercises', (select count(*) from public.workout_exercise_executions item where item.workout_execution_id = execution.id and item.status = 'COMPLETED'),
      'skipped_exercises', (select count(*) from public.workout_exercise_executions item where item.workout_execution_id = execution.id and item.status = 'SKIPPED'),
      'completed_sets', (select count(*) from public.workout_set_executions item where item.workout_execution_id = execution.id and item.status = 'COMPLETED'),
      'skipped_sets', (select count(*) from public.workout_set_executions item where item.workout_execution_id = execution.id and item.status = 'SKIPPED'),
      'total_sets', (select count(*) from public.workout_set_executions item where item.workout_execution_id = execution.id),
      'active_duration_seconds', greatest(0, floor(extract(epoch from (
        coalesce(execution.completed_at, execution.abandoned_at, now()) - execution.started_at
      )))::integer - execution.paused_seconds - case
        when execution.status = 'PAUSED' then floor(extract(epoch from (now() - execution.paused_at)))::integer
        else 0
      end)
    )
  )
  from public.workout_executions execution
  join public.workout_plans plan on plan.id = execution.workout_plan_id
  join public.workout_plan_versions version on version.id = execution.workout_plan_version_id
  join public.workout_sessions session on session.id = execution.workout_session_id
  where execution.id = p_workout_execution_id;
$$;

create or replace function private.build_workout_session_overview(p_workout_session_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'kind', 'AVAILABLE_UNSCHEDULED',
    'plan', jsonb_build_object('id', plan.id, 'name', plan.name, 'goal', plan.goal),
    'version', jsonb_build_object(
      'id', version.id,
      'version_number', version.version_number,
      'status', version.status,
      'published_at', version.published_at,
      'archived_at', version.archived_at
    ),
    'session', jsonb_build_object(
      'id', session.id,
      'name', session.name,
      'description', session.description,
      'estimated_duration_minutes', session.estimated_duration_minutes,
      'sort_order', session.sort_order,
      'section_count', (select count(*) from public.workout_sections section where section.workout_session_id = session.id),
      'exercise_count', (
        select count(*) from public.workout_exercises prescribed
        join public.workout_sections section on section.id = prescribed.workout_section_id
        where section.workout_session_id = session.id
      ),
      'set_count', (
        select count(*) from public.workout_sets prescribed_set
        join public.workout_exercises prescribed on prescribed.id = prescribed_set.workout_exercise_id
        join public.workout_sections section on section.id = prescribed.workout_section_id
        where section.workout_session_id = session.id
      )
    ),
    'first_approved_media', (
      select jsonb_build_object(
        'id', media.id,
        'media_type', media.media_type,
        'url_or_storage_path', media.url_or_storage_path,
        'thumbnail_url_or_path', media.thumbnail_url_or_path,
        'provider', media.provider,
        'creator_credit', media.creator_credit,
        'sort_order', media.sort_order
      )
      from public.workout_sections section
      join public.workout_exercises prescribed on prescribed.workout_section_id = section.id
      join public.exercise_media media on media.exercise_id = prescribed.exercise_id
      where section.workout_session_id = session.id
        and media.production_status = 'APPROVED'
      order by section.sort_order, prescribed.sort_order, media.sort_order, media.id
      limit 1
    ),
    'active_execution', (
      select jsonb_build_object(
        'id', active_execution.id,
        'status', active_execution.status,
        'started_at', active_execution.started_at,
        'last_activity_at', active_execution.last_activity_at,
        'server_revision', active_execution.server_revision
      )
      from public.workout_executions active_execution
      where active_execution.student_profile_id = relationship.student_profile_id
        and active_execution.workout_session_id = session.id
        and active_execution.status in ('IN_PROGRESS', 'PAUSED')
      limit 1
    ),
    'has_terminal_history', exists (
      select 1 from public.workout_executions history
      where history.student_profile_id = relationship.student_profile_id
        and history.workout_session_id = session.id
        and history.status in ('COMPLETED', 'ABANDONED')
    )
  )
  from public.workout_sessions session
  join public.workout_plan_versions version on version.id = session.workout_plan_version_id
  join public.workout_plans plan on plan.id = version.workout_plan_id
  join public.trainer_student_relationships relationship
    on relationship.id = plan.trainer_student_relationship_id
  where session.id = p_workout_session_id;
$$;

create or replace function public.start_or_resume_workout_execution(p_workout_session_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  target record;
  existing public.workout_executions;
  execution_id uuid;
  next_revision integer;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;

  select
    session.id session_id,
    version.id version_id,
    version.status version_status,
    plan.id plan_id,
    plan.status plan_status,
    relationship.id relationship_id,
    relationship.student_profile_id,
    relationship.status relationship_status
  into target
  from public.workout_sessions session
  join public.workout_plan_versions version on version.id = session.workout_plan_version_id
  join public.workout_plans plan on plan.id = version.workout_plan_id
  join public.trainer_student_relationships relationship
    on relationship.id = plan.trainer_student_relationship_id
  where session.id = p_workout_session_id
  for update of session, version, plan, relationship;

  if target.session_id is null or not (select private.owns_student(target.student_profile_id)) then
    raise exception 'workout_session_not_available';
  end if;

  select execution.* into existing
  from public.workout_executions execution
  where execution.student_profile_id = target.student_profile_id
    and execution.workout_session_id = target.session_id
    and execution.status in ('IN_PROGRESS', 'PAUSED')
  for update;

  if existing.id is not null then
    if target.relationship_status <> 'active' then raise exception 'relationship_not_active'; end if;
    if existing.status = 'PAUSED' then
      next_revision := existing.server_revision + 1;
      update public.workout_executions
      set status = 'IN_PROGRESS',
          paused_seconds = paused_seconds + greatest(0, floor(extract(epoch from (now() - paused_at)))::integer),
          paused_at = null,
          last_activity_at = now(),
          server_revision = next_revision
      where id = existing.id;
      insert into public.workout_execution_events(
        workout_execution_id, event_type, actor_user_id, server_revision, metadata
      ) values (
        existing.id, 'EXECUTION_RESUMED', (select auth.uid()), next_revision,
        jsonb_build_object('source', 'start_or_resume')
      );
    end if;
    return private.build_workout_execution_snapshot(existing.id);
  end if;

  if target.relationship_status <> 'active' then raise exception 'relationship_not_active'; end if;
  if target.plan_status <> 'ACTIVE' then raise exception 'workout_plan_not_active'; end if;
  if target.version_status <> 'PUBLISHED' then raise exception 'published_workout_required'; end if;
  if exists (
    select 1 from public.workout_executions history
    where history.student_profile_id = target.student_profile_id
      and history.workout_session_id = target.session_id
      and history.status in ('COMPLETED', 'ABANDONED')
  ) then raise exception 'workout_session_already_executed'; end if;

  insert into public.workout_executions(
    trainer_student_relationship_id, student_profile_id, workout_plan_id,
    workout_plan_version_id, workout_session_id, status, created_by
  ) values (
    target.relationship_id, target.student_profile_id, target.plan_id,
    target.version_id, target.session_id, 'IN_PROGRESS', (select auth.uid())
  ) returning id into execution_id;

  insert into public.workout_exercise_executions(
    workout_execution_id, workout_exercise_id, exercise_id, sort_order
  )
  select
    execution_id,
    prescribed.id,
    prescribed.exercise_id,
    (row_number() over (order by section.sort_order, prescribed.sort_order, prescribed.id) - 1)::integer
  from public.workout_sections section
  join public.workout_exercises prescribed on prescribed.workout_section_id = section.id
  where section.workout_session_id = target.session_id
  order by section.sort_order, prescribed.sort_order, prescribed.id;

  insert into public.workout_set_executions(
    workout_execution_id, workout_exercise_execution_id, workout_set_id, set_number
  )
  select execution_id, exercise_execution.id, prescribed_set.id, prescribed_set.set_number
  from public.workout_exercise_executions exercise_execution
  join public.workout_sets prescribed_set
    on prescribed_set.workout_exercise_id = exercise_execution.workout_exercise_id
  where exercise_execution.workout_execution_id = execution_id
  order by exercise_execution.sort_order, prescribed_set.set_number;

  if not exists (
    select 1 from public.workout_set_executions item where item.workout_execution_id = execution_id
  ) then raise exception 'workout_session_has_no_executable_sets'; end if;

  insert into public.workout_execution_events(
    workout_execution_id, event_type, actor_user_id, server_revision, metadata
  ) values (
    execution_id, 'EXECUTION_STARTED', (select auth.uid()), 1,
    jsonb_build_object('workout_session_id', target.session_id, 'workout_plan_version_id', target.version_id)
  );

  return private.build_workout_execution_snapshot(execution_id);
exception
  when unique_violation then
    select execution.id into execution_id
    from public.workout_executions execution
    where execution.student_profile_id = target.student_profile_id
      and execution.workout_session_id = target.session_id
      and execution.status in ('IN_PROGRESS', 'PAUSED');
    if execution_id is null then raise; end if;
    return private.build_workout_execution_snapshot(execution_id);
end;
$$;

create or replace function public.sync_workout_execution(
  p_workout_execution_id uuid,
  p_expected_server_revision integer,
  p_mutations jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  target public.workout_executions;
  mutation jsonb;
  actuals jsonb;
  mutation_ids uuid[];
  mutation_count integer;
  distinct_mutation_count integer;
  accepted_count integer;
  mutation_id uuid;
  operation text;
  set_id uuid;
  exercise_execution_id uuid;
  set_row record;
  exercise_row public.workout_exercise_executions;
  next_revision integer;
  reason text;
  note_value text;
  actual_reps_value integer;
  actual_load_value numeric;
  load_unit_value text;
  actual_duration_value integer;
  actual_distance_value numeric;
  distance_unit_value text;
  actual_rpe_value numeric;
  rest_seconds_value integer;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  if jsonb_typeof(p_mutations) <> 'array' then raise exception 'mutations_must_be_an_array'; end if;

  select count(*), count(distinct value->>'client_mutation_id'),
         array_agg((value->>'client_mutation_id')::uuid)
  into mutation_count, distinct_mutation_count, mutation_ids
  from jsonb_array_elements(p_mutations);

  if mutation_count < 1 or mutation_count > 25 then raise exception 'mutation_batch_size_invalid'; end if;
  if distinct_mutation_count <> mutation_count or array_position(mutation_ids, null) is not null then
    raise exception 'client_mutation_ids_must_be_unique';
  end if;

  select execution.* into target
  from public.workout_executions execution
  where execution.id = p_workout_execution_id
  for update;
  if target.id is null or not (select private.owns_student(target.student_profile_id)) then
    raise exception 'workout_execution_not_available';
  end if;
  if not exists (
    select 1 from public.trainer_student_relationships relationship
    where relationship.id = target.trainer_student_relationship_id and relationship.status = 'active'
  ) then raise exception 'relationship_not_active'; end if;

  select count(*) into accepted_count
  from public.workout_execution_events event
  where event.workout_execution_id = target.id
    and event.actor_user_id = (select auth.uid())
    and event.client_mutation_id = any(mutation_ids);

  if accepted_count = mutation_count then
    return private.build_workout_execution_snapshot(target.id);
  end if;
  if target.status in ('COMPLETED', 'ABANDONED') then raise exception 'terminal_execution_is_immutable'; end if;
  if p_expected_server_revision is distinct from target.server_revision then
    raise exception 'stale_server_revision';
  end if;

  for mutation in select value from jsonb_array_elements(p_mutations)
  loop
    mutation_id := (mutation->>'client_mutation_id')::uuid;
    operation := mutation->>'operation';
    if operation is null then raise exception 'mutation_operation_required'; end if;
    if exists (
      select 1 from public.workout_execution_events event
      where event.workout_execution_id = target.id
        and event.actor_user_id = (select auth.uid())
        and event.client_mutation_id = mutation_id
    ) then continue; end if;

    next_revision := target.server_revision + 1;

    if operation in ('complete_set', 'edit_completed_set_actuals') then
      set_id := (mutation->>'workout_set_execution_id')::uuid;
      actuals := coalesce(mutation->'actuals', '{}'::jsonb);
      select
        set_execution.id,
        set_execution.status,
        set_execution.workout_exercise_execution_id,
        prescribed.target_reps,
        prescribed.target_reps_min,
        prescribed.duration_seconds,
        prescribed.distance_value,
        prescribed.rest_seconds
      into set_row
      from public.workout_set_executions set_execution
      join public.workout_sets prescribed on prescribed.id = set_execution.workout_set_id
      where set_execution.id = set_id
        and set_execution.workout_execution_id = target.id
      for update of set_execution;
      if set_row.id is null then raise exception 'set_execution_not_available'; end if;
      if operation = 'complete_set' and set_row.status <> 'PENDING' then raise exception 'set_is_not_pending'; end if;
      if operation = 'edit_completed_set_actuals' and set_row.status <> 'COMPLETED' then raise exception 'set_is_not_completed'; end if;

      actual_reps_value := nullif(actuals->>'actual_reps', '')::integer;
      actual_load_value := nullif(actuals->>'actual_load', '')::numeric;
      load_unit_value := nullif(actuals->>'load_unit', '');
      actual_duration_value := nullif(actuals->>'actual_duration_seconds', '')::integer;
      actual_distance_value := nullif(actuals->>'actual_distance', '')::numeric;
      distance_unit_value := nullif(actuals->>'distance_unit', '');
      actual_rpe_value := nullif(actuals->>'actual_rpe', '')::numeric;
      note_value := nullif(btrim(actuals->>'student_note'), '');

      if actual_reps_value is not null and actual_reps_value < 0 then raise exception 'actual_reps_invalid'; end if;
      if actual_load_value is not null and actual_load_value < 0 then raise exception 'actual_load_invalid'; end if;
      if (actual_load_value is null) <> (load_unit_value is null)
        or (load_unit_value is not null and load_unit_value not in ('kg', 'lb'))
      then raise exception 'actual_load_unit_invalid'; end if;
      if actual_duration_value is not null and actual_duration_value < 0 then raise exception 'actual_duration_invalid'; end if;
      if actual_distance_value is not null and actual_distance_value < 0 then raise exception 'actual_distance_invalid'; end if;
      if (actual_distance_value is null) <> (distance_unit_value is null)
        or (distance_unit_value is not null and distance_unit_value not in ('m', 'km', 'mi'))
      then raise exception 'actual_distance_unit_invalid'; end if;
      if actual_rpe_value is not null and (actual_rpe_value < 0 or actual_rpe_value > 10) then raise exception 'actual_rpe_invalid'; end if;
      if note_value is not null and char_length(note_value) > 1000 then raise exception 'set_note_too_long'; end if;
      if (set_row.target_reps is not null or set_row.target_reps_min is not null) and actual_reps_value is null then
        raise exception 'actual_reps_required';
      end if;
      if set_row.duration_seconds is not null and actual_duration_value is null then
        raise exception 'actual_duration_required';
      end if;
      if set_row.distance_value is not null and actual_distance_value is null then
        raise exception 'actual_distance_required';
      end if;

      rest_seconds_value := coalesce(set_row.rest_seconds, 0);
      update public.workout_set_executions
      set status = 'COMPLETED',
          actual_reps = actual_reps_value,
          actual_load = actual_load_value,
          load_unit = load_unit_value,
          actual_duration_seconds = actual_duration_value,
          actual_distance = actual_distance_value,
          distance_unit = distance_unit_value,
          actual_rpe = actual_rpe_value,
          completed_at = case when operation = 'complete_set' then now() else completed_at end,
          skipped_at = null,
          skip_reason = null,
          rest_started_at = case when operation = 'complete_set' and rest_seconds_value > 0 then now() else rest_started_at end,
          rest_ends_at = case when operation = 'complete_set' and rest_seconds_value > 0 then now() + make_interval(secs => rest_seconds_value) else rest_ends_at end,
          student_note = note_value,
          revision = revision + 1
      where id = set_id;

      update public.workout_exercise_executions exercise_execution
      set status = case when not exists (
            select 1 from public.workout_set_executions pending
            where pending.workout_exercise_execution_id = set_row.workout_exercise_execution_id
              and pending.id <> set_id and pending.status = 'PENDING'
          ) then 'COMPLETED' else 'IN_PROGRESS' end,
          started_at = coalesce(started_at, now()),
          completed_at = case when not exists (
            select 1 from public.workout_set_executions pending
            where pending.workout_exercise_execution_id = set_row.workout_exercise_execution_id
              and pending.id <> set_id and pending.status = 'PENDING'
          ) then now() else null end
      where id = set_row.workout_exercise_execution_id;

      insert into public.workout_execution_events(
        workout_execution_id, event_type, actor_user_id, client_mutation_id, server_revision, metadata
      ) values (
        target.id,
        case when operation = 'complete_set' then 'SET_COMPLETED' else 'SET_UPDATED' end,
        (select auth.uid()), mutation_id, next_revision,
        jsonb_build_object('workout_set_execution_id', set_id)
      );

    elsif operation = 'skip_set' then
      set_id := (mutation->>'workout_set_execution_id')::uuid;
      reason := nullif(mutation->>'skip_reason', '');
      note_value := nullif(btrim(mutation->>'student_note'), '');
      if reason is not null and reason not in ('PAIN', 'EQUIPMENT_UNAVAILABLE', 'FATIGUE', 'TIME', 'OTHER') then
        raise exception 'skip_reason_invalid';
      end if;
      select set_execution.id, set_execution.status, set_execution.workout_exercise_execution_id
      into set_row
      from public.workout_set_executions set_execution
      where set_execution.id = set_id and set_execution.workout_execution_id = target.id
      for update;
      if set_row.id is null then raise exception 'set_execution_not_available'; end if;
      if set_row.status <> 'PENDING' then raise exception 'set_is_not_pending'; end if;
      update public.workout_set_executions
      set status = 'SKIPPED', skipped_at = now(), skip_reason = reason,
          student_note = note_value, revision = revision + 1
      where id = set_id;
      update public.workout_exercise_executions exercise_execution
      set status = case when not exists (
            select 1 from public.workout_set_executions pending
            where pending.workout_exercise_execution_id = set_row.workout_exercise_execution_id
              and pending.id <> set_id and pending.status = 'PENDING'
          ) then case when exists (
            select 1 from public.workout_set_executions completed
            where completed.workout_exercise_execution_id = set_row.workout_exercise_execution_id
              and completed.status = 'COMPLETED'
          ) then 'COMPLETED' else 'SKIPPED' end else 'IN_PROGRESS' end,
          started_at = coalesce(started_at, now()),
          completed_at = case when not exists (
            select 1 from public.workout_set_executions pending
            where pending.workout_exercise_execution_id = set_row.workout_exercise_execution_id
              and pending.id <> set_id and pending.status = 'PENDING'
          ) and exists (
            select 1 from public.workout_set_executions completed
            where completed.workout_exercise_execution_id = set_row.workout_exercise_execution_id
              and completed.status = 'COMPLETED'
          ) then now() else null end,
          skipped_at = case when not exists (
            select 1 from public.workout_set_executions remaining
            where remaining.workout_exercise_execution_id = set_row.workout_exercise_execution_id
              and remaining.id <> set_id and remaining.status <> 'SKIPPED'
          ) then now() else null end,
          skip_reason = case when not exists (
            select 1 from public.workout_set_executions remaining
            where remaining.workout_exercise_execution_id = set_row.workout_exercise_execution_id
              and remaining.id <> set_id and remaining.status <> 'SKIPPED'
          ) then reason else null end
      where id = set_row.workout_exercise_execution_id;
      insert into public.workout_execution_events(
        workout_execution_id, event_type, actor_user_id, client_mutation_id, server_revision, metadata
      ) values (
        target.id, 'SET_SKIPPED', (select auth.uid()), mutation_id, next_revision,
        jsonb_strip_nulls(jsonb_build_object('workout_set_execution_id', set_id, 'skip_reason', reason))
      );

    elsif operation = 'skip_exercise' then
      exercise_execution_id := (mutation->>'workout_exercise_execution_id')::uuid;
      reason := nullif(mutation->>'skip_reason', '');
      note_value := nullif(btrim(mutation->>'student_note'), '');
      if reason is not null and reason not in ('PAIN', 'EQUIPMENT_UNAVAILABLE', 'FATIGUE', 'TIME', 'OTHER') then
        raise exception 'skip_reason_invalid';
      end if;
      select exercise_execution.* into exercise_row
      from public.workout_exercise_executions exercise_execution
      where exercise_execution.id = exercise_execution_id
        and exercise_execution.workout_execution_id = target.id
      for update;
      if exercise_row.id is null then raise exception 'exercise_execution_not_available'; end if;
      if exercise_row.status not in ('PENDING', 'IN_PROGRESS') then raise exception 'exercise_is_not_skippable'; end if;
      if exists (
        select 1 from public.workout_set_executions item
        where item.workout_exercise_execution_id = exercise_row.id and item.status = 'COMPLETED'
      ) then raise exception 'exercise_with_completed_sets_cannot_be_skipped'; end if;
      update public.workout_set_executions
      set status = 'SKIPPED', skipped_at = now(), skip_reason = reason, revision = revision + 1
      where workout_exercise_execution_id = exercise_row.id and status = 'PENDING';
      update public.workout_exercise_executions
      set status = 'SKIPPED', started_at = coalesce(started_at, now()),
          skipped_at = now(), skip_reason = reason, student_note = note_value
      where id = exercise_row.id;
      insert into public.workout_execution_events(
        workout_execution_id, event_type, actor_user_id, client_mutation_id, server_revision, metadata
      ) values (
        target.id, 'EXERCISE_SKIPPED', (select auth.uid()), mutation_id, next_revision,
        jsonb_strip_nulls(jsonb_build_object('workout_exercise_execution_id', exercise_row.id, 'skip_reason', reason))
      );

    elsif operation = 'add_student_note' then
      note_value := nullif(btrim(mutation->>'student_note'), '');
      if note_value is not null and char_length(note_value) > 2000 then raise exception 'student_note_too_long'; end if;
      update public.workout_executions set student_note = note_value where id = target.id;
      insert into public.workout_execution_events(
        workout_execution_id, event_type, actor_user_id, client_mutation_id, server_revision, metadata
      ) values (
        target.id, 'SET_UPDATED', (select auth.uid()), mutation_id, next_revision,
        jsonb_build_object('scope', 'execution_note')
      );

    elsif operation = 'pause' then
      if target.status <> 'IN_PROGRESS' then raise exception 'execution_is_not_in_progress'; end if;
      update public.workout_executions set status = 'PAUSED', paused_at = now() where id = target.id;
      insert into public.workout_execution_events(
        workout_execution_id, event_type, actor_user_id, client_mutation_id, server_revision, metadata
      ) values (target.id, 'EXECUTION_PAUSED', (select auth.uid()), mutation_id, next_revision, '{}'::jsonb);

    elsif operation = 'resume' then
      if target.status <> 'PAUSED' then raise exception 'execution_is_not_paused'; end if;
      update public.workout_executions
      set status = 'IN_PROGRESS',
          paused_seconds = paused_seconds + greatest(0, floor(extract(epoch from (now() - paused_at)))::integer),
          paused_at = null
      where id = target.id;
      insert into public.workout_execution_events(
        workout_execution_id, event_type, actor_user_id, client_mutation_id, server_revision, metadata
      ) values (target.id, 'EXECUTION_RESUMED', (select auth.uid()), mutation_id, next_revision, '{}'::jsonb);

    else
      raise exception 'unsupported_execution_mutation:%', operation;
    end if;

    update public.workout_executions
    set server_revision = next_revision, last_activity_at = now()
    where id = target.id;
    select execution.* into target from public.workout_executions execution where execution.id = target.id;
  end loop;

  return private.build_workout_execution_snapshot(target.id);
end;
$$;

create or replace function public.pause_workout_execution(
  p_workout_execution_id uuid,
  p_client_mutation_id uuid,
  p_expected_server_revision integer
)
returns jsonb
language sql
volatile
security definer
set search_path = ''
as $$
  select public.sync_workout_execution(
    p_workout_execution_id,
    p_expected_server_revision,
    jsonb_build_array(jsonb_build_object(
      'client_mutation_id', p_client_mutation_id,
      'operation', 'pause'
    ))
  );
$$;

create or replace function public.resume_workout_execution(
  p_workout_execution_id uuid,
  p_client_mutation_id uuid,
  p_expected_server_revision integer
)
returns jsonb
language sql
volatile
security definer
set search_path = ''
as $$
  select public.sync_workout_execution(
    p_workout_execution_id,
    p_expected_server_revision,
    jsonb_build_array(jsonb_build_object(
      'client_mutation_id', p_client_mutation_id,
      'operation', 'resume'
    ))
  );
$$;

create or replace function public.complete_workout_execution(
  p_workout_execution_id uuid,
  p_client_mutation_id uuid,
  p_expected_server_revision integer
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  target public.workout_executions;
  next_revision integer;
  final_paused_seconds integer;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  select execution.* into target
  from public.workout_executions execution
  where execution.id = p_workout_execution_id
  for update;
  if target.id is null or not (select private.owns_student(target.student_profile_id)) then
    raise exception 'workout_execution_not_available';
  end if;
  if exists (
    select 1 from public.workout_execution_events event
    where event.workout_execution_id = target.id
      and event.actor_user_id = (select auth.uid())
      and event.client_mutation_id = p_client_mutation_id
      and event.event_type = 'EXECUTION_COMPLETED'
  ) then return private.build_workout_execution_snapshot(target.id); end if;
  if not exists (
    select 1 from public.trainer_student_relationships relationship
    where relationship.id = target.trainer_student_relationship_id and relationship.status = 'active'
  ) then raise exception 'relationship_not_active'; end if;
  if target.status not in ('IN_PROGRESS', 'PAUSED') then raise exception 'execution_is_not_completable'; end if;
  if p_expected_server_revision is distinct from target.server_revision then raise exception 'stale_server_revision'; end if;
  if exists (
    select 1 from public.workout_set_executions item
    where item.workout_execution_id = target.id and item.status = 'PENDING'
  ) then raise exception 'pending_sets_must_be_completed_or_skipped'; end if;

  final_paused_seconds := target.paused_seconds + case when target.status = 'PAUSED'
    then greatest(0, floor(extract(epoch from (now() - target.paused_at)))::integer)
    else 0 end;
  next_revision := target.server_revision + 1;
  update public.workout_executions
  set status = 'COMPLETED', paused_at = null, paused_seconds = final_paused_seconds,
      completed_at = now(), last_activity_at = now(), server_revision = next_revision
  where id = target.id;
  insert into public.workout_execution_events(
    workout_execution_id, event_type, actor_user_id, client_mutation_id, server_revision, metadata
  )
  select
    target.id, 'EXECUTION_COMPLETED', (select auth.uid()), p_client_mutation_id, next_revision,
    jsonb_build_object(
      'active_duration_seconds', greatest(0, floor(extract(epoch from (now() - target.started_at)))::integer - final_paused_seconds),
      'completed_exercises', count(*) filter (where exercise_execution.status = 'COMPLETED'),
      'skipped_exercises', count(*) filter (where exercise_execution.status = 'SKIPPED'),
      'completed_sets', (select count(*) from public.workout_set_executions item where item.workout_execution_id = target.id and item.status = 'COMPLETED'),
      'skipped_sets', (select count(*) from public.workout_set_executions item where item.workout_execution_id = target.id and item.status = 'SKIPPED')
    )
  from public.workout_exercise_executions exercise_execution
  where exercise_execution.workout_execution_id = target.id;
  return private.build_workout_execution_snapshot(target.id);
end;
$$;

create or replace function public.abandon_workout_execution(
  p_workout_execution_id uuid,
  p_client_mutation_id uuid,
  p_expected_server_revision integer
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  target public.workout_executions;
  next_revision integer;
  final_paused_seconds integer;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  select execution.* into target from public.workout_executions execution
  where execution.id = p_workout_execution_id for update;
  if target.id is null or not (select private.owns_student(target.student_profile_id)) then
    raise exception 'workout_execution_not_available';
  end if;
  if exists (
    select 1 from public.workout_execution_events event
    where event.workout_execution_id = target.id
      and event.actor_user_id = (select auth.uid())
      and event.client_mutation_id = p_client_mutation_id
      and event.event_type = 'EXECUTION_ABANDONED'
  ) then return private.build_workout_execution_snapshot(target.id); end if;
  if not exists (
    select 1 from public.trainer_student_relationships relationship
    where relationship.id = target.trainer_student_relationship_id and relationship.status = 'active'
  ) then raise exception 'relationship_not_active'; end if;
  if target.status not in ('IN_PROGRESS', 'PAUSED') then raise exception 'execution_is_not_abandonable'; end if;
  if p_expected_server_revision is distinct from target.server_revision then raise exception 'stale_server_revision'; end if;
  final_paused_seconds := target.paused_seconds + case when target.status = 'PAUSED'
    then greatest(0, floor(extract(epoch from (now() - target.paused_at)))::integer)
    else 0 end;
  next_revision := target.server_revision + 1;
  update public.workout_executions
  set status = 'ABANDONED', paused_at = null, paused_seconds = final_paused_seconds,
      abandoned_at = now(), last_activity_at = now(), server_revision = next_revision
  where id = target.id;
  insert into public.workout_execution_events(
    workout_execution_id, event_type, actor_user_id, client_mutation_id, server_revision, metadata
  ) values (
    target.id, 'EXECUTION_ABANDONED', (select auth.uid()), p_client_mutation_id, next_revision,
    jsonb_build_object('active_duration_seconds', greatest(0, floor(extract(epoch from (now() - target.started_at)))::integer - final_paused_seconds))
  );
  return private.build_workout_execution_snapshot(target.id);
end;
$$;

create or replace function public.record_workout_execution_feedback(
  p_workout_execution_id uuid,
  p_difficulty text,
  p_student_note text,
  p_client_mutation_id uuid,
  p_expected_server_revision integer
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  target public.workout_executions;
  next_revision integer;
  clean_note text := nullif(btrim(p_student_note), '');
  first_feedback_at timestamptz;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  if p_difficulty not in ('EASY', 'GOOD', 'CHALLENGING', 'VERY_HARD') then raise exception 'difficulty_invalid'; end if;
  if clean_note is not null and char_length(clean_note) > 2000 then raise exception 'student_note_too_long'; end if;
  select execution.* into target from public.workout_executions execution
  where execution.id = p_workout_execution_id for update;
  if target.id is null or not (select private.owns_student(target.student_profile_id)) then
    raise exception 'workout_execution_not_available';
  end if;
  if exists (
    select 1 from public.workout_execution_events event
    where event.workout_execution_id = target.id
      and event.actor_user_id = (select auth.uid())
      and event.client_mutation_id = p_client_mutation_id
      and event.event_type = 'FEEDBACK_RECORDED'
  ) then return private.build_workout_execution_snapshot(target.id); end if;
  if not exists (
    select 1 from public.trainer_student_relationships relationship
    where relationship.id = target.trainer_student_relationship_id and relationship.status = 'active'
  ) then raise exception 'relationship_not_active'; end if;
  if target.status <> 'COMPLETED' then raise exception 'completed_execution_required'; end if;
  if p_expected_server_revision is distinct from target.server_revision then raise exception 'stale_server_revision'; end if;
  first_feedback_at := target.feedback_recorded_at;
  if first_feedback_at is not null and now() > first_feedback_at + interval '15 minutes' then
    raise exception 'feedback_correction_window_closed';
  end if;
  next_revision := target.server_revision + 1;
  update public.workout_executions
  set difficulty = p_difficulty,
      student_note = clean_note,
      feedback_recorded_at = coalesce(feedback_recorded_at, now()),
      last_activity_at = now(),
      server_revision = next_revision
  where id = target.id;
  insert into public.workout_execution_events(
    workout_execution_id, event_type, actor_user_id, client_mutation_id, server_revision, metadata
  ) values (
    target.id, 'FEEDBACK_RECORDED', (select auth.uid()), p_client_mutation_id, next_revision,
    jsonb_build_object('difficulty', p_difficulty, 'correction', first_feedback_at is not null)
  );
  return private.build_workout_execution_snapshot(target.id);
end;
$$;

create or replace function public.get_student_workout_execution(p_workout_execution_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (select private.workout_execution_owned_by_current_student(p_workout_execution_id)) then
    raise exception 'workout_execution_not_available';
  end if;
  return private.build_workout_execution_snapshot(p_workout_execution_id);
end;
$$;

create or replace function public.get_trainer_workout_execution(p_workout_execution_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (select private.workout_execution_owned_by_current_trainer(p_workout_execution_id)) then
    raise exception 'workout_execution_not_available';
  end if;
  return private.build_workout_execution_snapshot(p_workout_execution_id);
end;
$$;

create or replace function public.get_student_workout_overview(p_workout_session_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  allowed boolean;
begin
  select exists (
    select 1
    from public.workout_sessions session
    join public.workout_plan_versions version on version.id = session.workout_plan_version_id
    join public.workout_plans plan on plan.id = version.workout_plan_id
    join public.trainer_student_relationships relationship
      on relationship.id = plan.trainer_student_relationship_id
    where session.id = p_workout_session_id
      and version.status in ('PUBLISHED', 'ARCHIVED')
      and (select private.owns_student(relationship.student_profile_id))
  ) into allowed;
  if not allowed then raise exception 'workout_session_not_available'; end if;
  return private.build_workout_session_overview(p_workout_session_id);
end;
$$;

create or replace function public.get_student_today_workout()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(private.build_workout_session_overview(session.id)
    order by version.published_at desc, session.sort_order, session.id), '[]'::jsonb)
  from public.workout_sessions session
  join public.workout_plan_versions version on version.id = session.workout_plan_version_id
  join public.workout_plans plan on plan.id = version.workout_plan_id
  join public.trainer_student_relationships relationship
    on relationship.id = plan.trainer_student_relationship_id
  where version.status = 'PUBLISHED'
    and plan.status = 'ACTIVE'
    and relationship.status = 'active'
    and (select private.owns_student(relationship.student_profile_id));
$$;

create or replace function public.get_previous_exercise_performance(
  p_exercise_id uuid,
  p_before_workout_execution_id uuid default null
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select jsonb_build_object(
      'workout_execution_id', execution.id,
      'workout_exercise_execution_id', exercise_execution.id,
      'exercise_id', exercise_execution.exercise_id,
      'completed_at', execution.completed_at,
      'sets', coalesce((
        select jsonb_agg(jsonb_build_object(
          'set_number', set_execution.set_number,
          'status', set_execution.status,
          'actual_reps', set_execution.actual_reps,
          'actual_load', set_execution.actual_load,
          'load_unit', set_execution.load_unit,
          'actual_duration_seconds', set_execution.actual_duration_seconds,
          'actual_distance', set_execution.actual_distance,
          'distance_unit', set_execution.distance_unit,
          'actual_rpe', set_execution.actual_rpe
        ) order by set_execution.set_number)
        from public.workout_set_executions set_execution
        where set_execution.workout_exercise_execution_id = exercise_execution.id
      ), '[]'::jsonb)
    )
    from public.workout_exercise_executions exercise_execution
    join public.workout_executions execution on execution.id = exercise_execution.workout_execution_id
    where exercise_execution.exercise_id = p_exercise_id
      and execution.status = 'COMPLETED'
      and (select private.owns_student(execution.student_profile_id))
      and (
        p_before_workout_execution_id is null
        or execution.completed_at < (
          select boundary.started_at from public.workout_executions boundary
          where boundary.id = p_before_workout_execution_id
            and (select private.owns_student(boundary.student_profile_id))
        )
      )
    order by execution.completed_at desc, execution.id desc
    limit 1
  ), 'null'::jsonb);
$$;

create or replace function public.list_student_workout_execution_history(p_limit integer default 20)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', execution.id,
    'status', execution.status,
    'started_at', execution.started_at,
    'completed_at', execution.completed_at,
    'abandoned_at', execution.abandoned_at,
    'difficulty', execution.difficulty,
    'plan_name', plan.name,
    'session_name', session.name,
    'active_duration_seconds', greatest(0, floor(extract(epoch from (
      coalesce(execution.completed_at, execution.abandoned_at, now()) - execution.started_at
    )))::integer - execution.paused_seconds)
  ) order by execution.started_at desc, execution.id), '[]'::jsonb)
  from (
    select owned.* from public.workout_executions owned
    where (select private.owns_student(owned.student_profile_id))
      and owned.status in ('COMPLETED', 'ABANDONED')
    order by owned.started_at desc, owned.id
    limit greatest(1, least(coalesce(p_limit, 20), 100))
  ) execution
  join public.workout_plans plan on plan.id = execution.workout_plan_id
  join public.workout_sessions session on session.id = execution.workout_session_id;
$$;

create or replace function public.list_trainer_workout_executions(
  p_trainer_student_relationship_id uuid,
  p_limit integer default 50
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if not exists (
    select 1 from public.trainer_student_relationships relationship
    where relationship.id = p_trainer_student_relationship_id
      and (select private.owns_trainer(relationship.trainer_profile_id))
  ) then raise exception 'relationship_not_available'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', execution.id,
    'status', execution.status,
    'started_at', execution.started_at,
    'completed_at', execution.completed_at,
    'abandoned_at', execution.abandoned_at,
    'difficulty', execution.difficulty,
    'student_note', execution.student_note,
    'server_revision', execution.server_revision,
    'plan_name', plan.name,
    'session_name', session.name,
    'completed_sets', (select count(*) from public.workout_set_executions item where item.workout_execution_id = execution.id and item.status = 'COMPLETED'),
    'skipped_sets', (select count(*) from public.workout_set_executions item where item.workout_execution_id = execution.id and item.status = 'SKIPPED')
  ) order by execution.started_at desc, execution.id), '[]'::jsonb)
  into result
  from (
    select owned.* from public.workout_executions owned
    where owned.trainer_student_relationship_id = p_trainer_student_relationship_id
    order by owned.started_at desc, owned.id
    limit greatest(1, least(coalesce(p_limit, 50), 100))
  ) execution
  join public.workout_plans plan on plan.id = execution.workout_plan_id
  join public.workout_sessions session on session.id = execution.workout_session_id;
  return result;
end;
$$;

revoke all on public.workout_executions, public.workout_exercise_executions,
  public.workout_set_executions, public.workout_execution_events
  from public, anon, authenticated;

grant select on public.workout_executions, public.workout_exercise_executions,
  public.workout_set_executions, public.workout_execution_events
  to authenticated;

revoke all on function
  private.workout_execution_owned_by_current_student(uuid),
  private.workout_execution_owned_by_current_trainer(uuid),
  private.can_read_workout_execution(uuid),
  private.guard_workout_execution_row(),
  private.guard_workout_execution_child(),
  private.reject_workout_execution_event_change(),
  private.build_workout_execution_snapshot(uuid),
  private.build_workout_session_overview(uuid)
  from public, anon, authenticated;

grant execute on function
  private.workout_execution_owned_by_current_student(uuid),
  private.workout_execution_owned_by_current_trainer(uuid),
  private.can_read_workout_execution(uuid)
  to authenticated;

revoke all on function
  public.start_or_resume_workout_execution(uuid),
  public.sync_workout_execution(uuid,integer,jsonb),
  public.pause_workout_execution(uuid,uuid,integer),
  public.resume_workout_execution(uuid,uuid,integer),
  public.complete_workout_execution(uuid,uuid,integer),
  public.abandon_workout_execution(uuid,uuid,integer),
  public.record_workout_execution_feedback(uuid,text,text,uuid,integer),
  public.get_student_workout_execution(uuid),
  public.get_trainer_workout_execution(uuid),
  public.get_student_workout_overview(uuid),
  public.get_student_today_workout(),
  public.get_previous_exercise_performance(uuid,uuid),
  public.list_student_workout_execution_history(integer),
  public.list_trainer_workout_executions(uuid,integer)
  from public, anon, authenticated;

grant execute on function
  public.start_or_resume_workout_execution(uuid),
  public.sync_workout_execution(uuid,integer,jsonb),
  public.pause_workout_execution(uuid,uuid,integer),
  public.resume_workout_execution(uuid,uuid,integer),
  public.complete_workout_execution(uuid,uuid,integer),
  public.abandon_workout_execution(uuid,uuid,integer),
  public.record_workout_execution_feedback(uuid,text,text,uuid,integer),
  public.get_student_workout_execution(uuid),
  public.get_trainer_workout_execution(uuid),
  public.get_student_workout_overview(uuid),
  public.get_student_today_workout(),
  public.get_previous_exercise_performance(uuid,uuid),
  public.list_student_workout_execution_history(integer),
  public.list_trainer_workout_executions(uuid,integer)
  to authenticated;

alter function private.workout_execution_owned_by_current_student(uuid) owner to postgres;
alter function private.workout_execution_owned_by_current_trainer(uuid) owner to postgres;
alter function private.can_read_workout_execution(uuid) owner to postgres;
alter function private.guard_workout_execution_row() owner to postgres;
alter function private.guard_workout_execution_child() owner to postgres;
alter function private.reject_workout_execution_event_change() owner to postgres;
alter function private.build_workout_execution_snapshot(uuid) owner to postgres;
alter function private.build_workout_session_overview(uuid) owner to postgres;

alter function public.start_or_resume_workout_execution(uuid) owner to postgres;
alter function public.sync_workout_execution(uuid,integer,jsonb) owner to postgres;
alter function public.pause_workout_execution(uuid,uuid,integer) owner to postgres;
alter function public.resume_workout_execution(uuid,uuid,integer) owner to postgres;
alter function public.complete_workout_execution(uuid,uuid,integer) owner to postgres;
alter function public.abandon_workout_execution(uuid,uuid,integer) owner to postgres;
alter function public.record_workout_execution_feedback(uuid,text,text,uuid,integer) owner to postgres;
alter function public.get_student_workout_execution(uuid) owner to postgres;
alter function public.get_trainer_workout_execution(uuid) owner to postgres;
alter function public.get_student_workout_overview(uuid) owner to postgres;
alter function public.get_student_today_workout() owner to postgres;
alter function public.get_previous_exercise_performance(uuid,uuid) owner to postgres;
alter function public.list_student_workout_execution_history(integer) owner to postgres;
alter function public.list_trainer_workout_executions(uuid,integer) owner to postgres;

do $security_gate$
declare
  missing_rls text;
  unsafe_function text;
  execution_tables text[] := array[
    'workout_executions', 'workout_exercise_executions',
    'workout_set_executions', 'workout_execution_events'
  ];
begin
  select string_agg(c.relname, ', ' order by c.relname) into missing_rls
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = any(execution_tables)
    and not c.relrowsecurity;
  if missing_rls is not null then raise exception 'workout_execution_rls_missing:%', missing_rls; end if;

  if exists (
    select 1 from information_schema.role_table_grants
    where grantee = 'anon' and table_schema = 'public' and table_name = any(execution_tables)
  ) then raise exception 'anonymous_execution_privilege_detected'; end if;

  if exists (
    select 1 from information_schema.role_table_grants
    where grantee = 'authenticated' and table_schema = 'public'
      and table_name = any(execution_tables)
      and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER')
  ) then raise exception 'direct_execution_mutation_privilege_detected'; end if;

  if has_function_privilege('anon', 'public.start_or_resume_workout_execution(uuid)', 'EXECUTE')
    or has_function_privilege('anon', 'public.get_student_today_workout()', 'EXECUTE')
    or not has_function_privilege('authenticated', 'public.sync_workout_execution(uuid,integer,jsonb)', 'EXECUTE')
  then raise exception 'unsafe_workout_execution_function_grants'; end if;

  select n.nspname || '.' || p.proname into unsafe_function
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where p.prosecdef
    and n.nspname in ('public', 'private')
    and p.proname in (
      'workout_execution_owned_by_current_student',
      'workout_execution_owned_by_current_trainer',
      'can_read_workout_execution', 'guard_workout_execution_row',
      'guard_workout_execution_child', 'reject_workout_execution_event_change',
      'build_workout_execution_snapshot', 'build_workout_session_overview',
      'start_or_resume_workout_execution', 'sync_workout_execution',
      'pause_workout_execution', 'resume_workout_execution',
      'complete_workout_execution', 'abandon_workout_execution',
      'record_workout_execution_feedback', 'get_student_workout_execution',
      'get_trainer_workout_execution', 'get_student_workout_overview',
      'get_student_today_workout', 'get_previous_exercise_performance',
      'list_student_workout_execution_history', 'list_trainer_workout_executions'
    )
    and (
      p.proconfig is null
      or array_to_string(p.proconfig, ',') !~ '^search_path=(""|)$'
      or (select owner_role.rolname from pg_roles owner_role where owner_role.oid = p.proowner) <> 'postgres'
    )
  limit 1;
  if unsafe_function is not null then raise exception 'unsafe_workout_execution_function:%', unsafe_function; end if;
end;
$security_gate$;
