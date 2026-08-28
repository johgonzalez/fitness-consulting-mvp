-- Sprint 2B: authoritative Student entry state and role-free waitlist enrollment.

create or replace function public.get_my_student_entry_state()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with me as (
    select auth_user.id, lower(auth_user.email) as email
    from auth.users auth_user
    where auth_user.id = (select auth.uid())
  ), student as (
    select profile.id
    from public.student_profiles profile
    join me on me.id = profile.user_id
    limit 1
  ), waitlist as (
    select entry.email, entry.whatsapp, entry.status
    from public.waitlist_entries entry
    join me on me.email = entry.email
    where entry.audience = 'student'
      and entry.status <> 'REMOVED'
    limit 1
  )
  select jsonb_build_object(
    'authenticated', exists (select 1 from me),
    'student_role_active', exists (
      select 1 from public.user_roles role_row
      join me on me.id = role_row.user_id
      where role_row.role_code = 'student'
        and role_row.revoked_at is null
    ),
    'active_relationship', exists (
      select 1
      from public.trainer_student_relationships relationship
      join student on student.id = relationship.student_profile_id
      where relationship.status = 'active'
    ),
    'waitlist_joined', exists (select 1 from waitlist),
    'waitlist_email', (select email from waitlist),
    'waitlist_whatsapp', (select whatsapp from waitlist)
  );
$$;

create or replace function public.join_my_student_waitlist(p_whatsapp text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  authenticated_email text;
  digits text := regexp_replace(coalesce(p_whatsapp, ''), '[^0-9]', '', 'g');
  result_id uuid;
begin
  if current_user_id is null then raise exception 'authentication_required'; end if;

  select lower(email) into authenticated_email
  from auth.users
  where id = current_user_id;

  if authenticated_email is null then raise exception 'authenticated_email_required'; end if;
  if digits !~ '^[1-9][0-9]{7,14}$' then raise exception 'invalid_whatsapp'; end if;

  insert into public.waitlist_entries(email, whatsapp, audience, source)
  values (authenticated_email, '+' || digits, 'student', 'unified_auth')
  on conflict (email, audience) do update set
    whatsapp = excluded.whatsapp,
    source = excluded.source,
    status = case when public.waitlist_entries.status = 'REMOVED' then 'WAITING' else public.waitlist_entries.status end,
    updated_at = now()
  returning id into result_id;

  return result_id;
end;
$$;

revoke all on function public.get_my_student_entry_state() from public, anon;
revoke all on function public.join_my_student_waitlist(text) from public, anon;
grant execute on function public.get_my_student_entry_state() to authenticated;
grant execute on function public.join_my_student_waitlist(text) to authenticated;
