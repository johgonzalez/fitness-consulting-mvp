-- Sprint 4: authoritative, trainer-only workout completion notifications.
-- Execution facts remain in the existing execution tables; this table only
-- records the delivery event for the owning Trainer.

create table public.trainer_workout_notifications (
  id uuid primary key default gen_random_uuid(),
  trainer_profile_id uuid not null references public.trainer_profiles(id) on delete restrict,
  trainer_student_relationship_id uuid not null references public.trainer_student_relationships(id) on delete restrict,
  workout_execution_id uuid not null references public.workout_executions(id) on delete restrict,
  notification_type text not null default 'WORKOUT_COMPLETED',
  created_at timestamptz not null default now(),
  constraint trainer_workout_notifications_type_check check (notification_type = 'WORKOUT_COMPLETED'),
  constraint trainer_workout_notifications_execution_unique unique (workout_execution_id, notification_type)
);

create index trainer_workout_notifications_trainer_created_idx
  on public.trainer_workout_notifications(trainer_profile_id, created_at desc, id);
create index trainer_workout_notifications_relationship_created_idx
  on public.trainer_workout_notifications(trainer_student_relationship_id, created_at desc, id);

alter table public.trainer_workout_notifications enable row level security;

create policy "owning trainer reads workout notifications"
on public.trainer_workout_notifications
for select
to authenticated
using ((select private.owns_trainer(trainer_profile_id)));

create or replace function private.notify_trainer_on_workout_completion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.trainer_workout_notifications(
    trainer_profile_id,
    trainer_student_relationship_id,
    workout_execution_id,
    notification_type,
    created_at
  )
  select
    relationship.trainer_profile_id,
    new.trainer_student_relationship_id,
    new.id,
    'WORKOUT_COMPLETED',
    coalesce(new.completed_at, now())
  from public.trainer_student_relationships relationship
  where relationship.id = new.trainer_student_relationship_id
  on conflict (workout_execution_id, notification_type) do nothing;
  return new;
end;
$$;

create trigger notify_trainer_on_workout_completion
after update of status on public.workout_executions
for each row
when (old.status is distinct from new.status and new.status = 'COMPLETED')
execute function private.notify_trainer_on_workout_completion();

create or replace function public.list_trainer_workout_notifications(p_limit integer default 8)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  if not exists (
    select 1
    from public.trainer_profiles trainer
    where (select private.owns_trainer(trainer.id))
  ) then raise exception 'trainer_notification_access_denied'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', notification.id,
    'workout_execution_id', execution.id,
    'trainer_student_relationship_id', notification.trainer_student_relationship_id,
    'created_at', notification.created_at,
    'student_name', coalesce(student.preferred_name, student_user.display_name, 'Aluno'),
    'plan_name', plan.name,
    'session_name', session.name,
    'completed_at', execution.completed_at,
    'active_duration_seconds', greatest(
      0,
      floor(extract(epoch from (execution.completed_at - execution.started_at)))::integer - execution.paused_seconds
    ),
    'completed_sets', (
      select count(*)
      from public.workout_set_executions set_execution
      where set_execution.workout_execution_id = execution.id
        and set_execution.status = 'COMPLETED'
    ),
    'skipped_sets', (
      select count(*)
      from public.workout_set_executions set_execution
      where set_execution.workout_execution_id = execution.id
        and set_execution.status = 'SKIPPED'
    )
  ) order by notification.created_at desc, notification.id), '[]'::jsonb)
  into result
  from (
    select owned.*
    from public.trainer_workout_notifications owned
    where (select private.owns_trainer(owned.trainer_profile_id))
    order by owned.created_at desc, owned.id
    limit greatest(1, least(coalesce(p_limit, 8), 50))
  ) notification
  join public.workout_executions execution on execution.id = notification.workout_execution_id
  join public.workout_plans plan on plan.id = execution.workout_plan_id
  join public.workout_sessions session on session.id = execution.workout_session_id
  join public.student_profiles student on student.id = execution.student_profile_id
  join public.app_users student_user on student_user.id = student.user_id;

  return result;
end;
$$;

revoke all on public.trainer_workout_notifications from public, anon, authenticated;
grant select on public.trainer_workout_notifications to authenticated;

revoke all on function private.notify_trainer_on_workout_completion()
  from public, anon, authenticated;
revoke all on function public.list_trainer_workout_notifications(integer)
  from public, anon, authenticated;
grant execute on function public.list_trainer_workout_notifications(integer)
  to authenticated;

alter function private.notify_trainer_on_workout_completion() owner to postgres;
alter function public.list_trainer_workout_notifications(integer) owner to postgres;

do $security_gate$
declare
  unsafe_function text;
begin
  if not (
    select c.relrowsecurity
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'trainer_workout_notifications'
  ) then raise exception 'trainer_workout_notifications_rls_missing'; end if;

  if has_table_privilege('anon', 'public.trainer_workout_notifications', 'SELECT,INSERT,UPDATE,DELETE')
    or has_table_privilege('authenticated', 'public.trainer_workout_notifications', 'INSERT,UPDATE,DELETE')
  then raise exception 'unsafe_trainer_workout_notification_grant'; end if;

  if has_function_privilege('anon', 'public.list_trainer_workout_notifications(integer)', 'EXECUTE')
    or not has_function_privilege('authenticated', 'public.list_trainer_workout_notifications(integer)', 'EXECUTE')
    or has_function_privilege('authenticated', 'private.notify_trainer_on_workout_completion()', 'EXECUTE')
  then raise exception 'unsafe_trainer_workout_notification_function_grant'; end if;

  select n.nspname || '.' || p.proname into unsafe_function
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where p.prosecdef
    and n.nspname in ('public', 'private')
    and p.proname in ('notify_trainer_on_workout_completion', 'list_trainer_workout_notifications')
    and (
      p.proconfig is null
      or array_to_string(p.proconfig, ',') !~ '^search_path=(""|)$'
      or (select owner_role.rolname from pg_roles owner_role where owner_role.oid = p.proowner) <> 'postgres'
    )
  limit 1;
  if unsafe_function is not null then
    raise exception 'unsafe_trainer_workout_notification_function:%', unsafe_function;
  end if;
end;
$security_gate$;
