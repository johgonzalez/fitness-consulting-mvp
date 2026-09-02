-- A discarded Draft remains in the immutable workout history. Only its
-- lifecycle state changes; published prescriptions and executions are untouched.

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
    or (old.status = 'DRAFT' and new.status = 'ARCHIVED' and new.archived_at is not null)
    or (old.status = 'APPROVED' and new.status = 'PUBLISHED' and new.published_at is not null)
    or (old.status = 'PUBLISHED' and new.status = 'ARCHIVED' and new.archived_at is not null)
  ) then raise exception 'invalid_workout_version_transition'; end if;
  return new;
end;
$$;

alter table public.workout_plan_versions
  drop constraint workout_plan_versions_lifecycle_check;

alter table public.workout_plan_versions
  add constraint workout_plan_versions_lifecycle_check check (
    (status = 'DRAFT' and approved_at is null and published_at is null and archived_at is null)
    or (status = 'APPROVED' and approved_at is not null and published_at is null and archived_at is null)
    or (status = 'PUBLISHED' and approved_at is not null and published_at is not null and archived_at is null)
    or (
      status = 'ARCHIVED'
      and archived_at is not null
      and (
        (approved_at is null and published_at is null)
        or (approved_at is not null and published_at is not null)
      )
    )
  );

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
          and version.published_at is not null
          and (select private.workout_plan_owned_by_current_student(version.workout_plan_id))
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
            and version.published_at is not null
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
          and version.published_at is not null
          and (select private.workout_plan_owned_by_current_student(version.workout_plan_id))
      )
    );
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
  if target.id is null
    or target.status not in ('PUBLISHED', 'ARCHIVED')
    or target.published_at is null
    or not (select private.workout_plan_owned_by_current_student(target.workout_plan_id))
  then raise exception 'published_workout_not_available'; end if;
  return private.build_workout_version_projection(target.id, false);
end;
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
    and version.published_at is not null
    and (select private.workout_plan_owned_by_current_student(plan.id));
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
      and version.published_at is not null
      and (select private.owns_student(relationship.student_profile_id))
  ) into allowed;
  if not allowed then raise exception 'workout_session_not_available'; end if;
  return private.build_workout_session_overview(p_workout_session_id);
end;
$$;

create or replace function public.discard_workout_draft(p_workout_plan_version_id uuid)
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
  select version.* into target
  from public.workout_plan_versions version
  where version.id = p_workout_plan_version_id
  for update;

  select candidate.* into relationship
  from public.workout_plans plan
  join public.trainer_student_relationships candidate
    on candidate.id = plan.trainer_student_relationship_id
  where plan.id = target.workout_plan_id
  for update of candidate;

  if current_user_id is null
    or target.id is null
    or target.status <> 'DRAFT'
    or relationship.status <> 'active'
    or not (select private.owns_trainer(relationship.trainer_profile_id))
  then
    raise exception 'workout_draft_not_available_for_discard';
  end if;

  update public.workout_plan_versions
  set status = 'ARCHIVED', archived_at = now()
  where id = target.id;

  insert into public.workout_events(
    workout_plan_id, workout_plan_version_id, event_type, actor_user_id, metadata
  ) values (
    target.workout_plan_id, target.id, 'ARCHIVED', current_user_id,
    jsonb_build_object('reason', 'DRAFT_DISCARDED', 'version_number', target.version_number)
  );
end;
$$;

revoke all on function public.discard_workout_draft(uuid) from public, anon, authenticated;
grant execute on function public.discard_workout_draft(uuid) to authenticated;

alter function private.guard_workout_version_update() owner to postgres;
alter function private.can_read_workout_version(uuid) owner to postgres;
alter function private.can_read_exercise(uuid) owner to postgres;
alter function private.can_read_exercise_media(uuid,text) owner to postgres;
alter function public.discard_workout_draft(uuid) owner to postgres;
alter function public.get_student_workout_version(uuid) owner to postgres;
alter function public.list_student_published_workouts() owner to postgres;
alter function public.get_student_workout_overview(uuid) owner to postgres;
