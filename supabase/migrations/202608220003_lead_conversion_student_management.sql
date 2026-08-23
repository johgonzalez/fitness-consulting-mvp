-- Sprint 2: lead reservation, auditable conversion and trainer student management.

alter table public.lead_matches add column reserved_until timestamptz;
update public.lead_matches set reserved_until = created_at + interval '3 days' where reserved_until is null;
alter table public.lead_matches alter column reserved_until set not null;
alter table public.lead_matches add column rejected_at timestamptz;
alter table public.lead_matches add column converted_at timestamptz;

alter table public.lead_matches drop constraint lead_matches_status_check;
update public.lead_matches set status = case status
  when 'contacted' then 'pending'
  when 'won' then 'converted'
  when 'lost' then 'rejected'
  else status
end;
update public.lead_matches set
  converted_at = case when status = 'converted' then updated_at else null end,
  rejected_at = case when status = 'rejected' then updated_at else null end;
alter table public.lead_matches add constraint lead_matches_status_check
  check (status in ('new', 'pending', 'converted', 'rejected'));
alter table public.lead_matches add constraint lead_matches_terminal_state_check check (
  (status in ('new', 'pending') and rejected_at is null and converted_at is null)
  or (status = 'rejected' and rejected_at is not null and converted_at is null)
  or (status = 'converted' and converted_at is not null and rejected_at is null)
);

create or replace function private.set_lead_reservation()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.reserved_until := new.created_at + interval '3 days';
  return new;
end;
$$;
create trigger set_lead_reservation_before_insert
before insert on public.lead_matches for each row execute function private.set_lead_reservation();

alter table public.student_invitations add column invited_name text;
alter table public.student_invitations add constraint student_invitations_name_check
  check (invited_name is null or char_length(trim(invited_name)) between 1 and 120);

create table public.lead_conversions (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null unique references public.student_leads(id) on delete restrict,
  lead_match_id uuid not null unique references public.lead_matches(id) on delete restrict,
  trainer_profile_id uuid not null references public.trainer_profiles(id) on delete restrict,
  invitation_id uuid not null unique references public.student_invitations(id) on delete restrict,
  student_profile_id uuid references public.student_profiles(id) on delete restrict,
  relationship_id uuid references public.trainer_student_relationships(id) on delete restrict,
  status text not null default 'invited' check (status in ('invited', 'completed')),
  converted_at timestamptz not null default now(),
  completed_at timestamptz,
  created_by_user_id uuid not null references public.app_users(id) on delete restrict,
  constraint lead_conversions_completion_check check (
    (status = 'invited' and student_profile_id is null and relationship_id is null and completed_at is null)
    or (status = 'completed' and student_profile_id is not null and relationship_id is not null and completed_at is not null)
  )
);
create index lead_conversions_trainer_created_idx on public.lead_conversions(trainer_profile_id, converted_at desc);
alter table public.lead_conversions enable row level security;
create policy "trainers read own lead conversions" on public.lead_conversions
for select to authenticated using ((select private.owns_trainer(trainer_profile_id)));
create policy "students read own lead conversion" on public.lead_conversions
for select to authenticated using (student_profile_id is not null and (select private.owns_student(student_profile_id)));
revoke all on public.lead_conversions from public, anon, authenticated;
grant select on public.lead_conversions to authenticated;
grant select(id, trainer_profile_id, invited_email_normalized, invited_name, status, expires_at,
  accepted_by_user_id, accepted_at, revoked_at, created_by_user_id, created_at, updated_at)
  on public.student_invitations to authenticated;

create or replace function public.create_named_student_invitation(p_email text, p_name text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare response jsonb; invitation_id uuid;
begin
  if p_name is null or char_length(trim(p_name)) not between 1 and 120 then
    raise exception 'invalid_invitation_target';
  end if;
  response := public.create_student_invitation(p_email);
  invitation_id := (response->>'invitation_id')::uuid;
  update public.student_invitations set invited_name = trim(p_name)
  where id = invitation_id and (select private.owns_trainer(trainer_profile_id));
  return response;
end;
$$;

create or replace function public.reject_my_lead(p_match_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare target public.lead_matches;
begin
  select candidate.* into target from public.lead_matches candidate
  where candidate.id = p_match_id and (select private.owns_trainer(candidate.trainer_id)) for update;
  if target.id is null then raise exception 'lead_not_available'; end if;
  if target.status not in ('new', 'pending') or target.reserved_until <= now() then
    raise exception 'lead_not_actionable';
  end if;
  update public.lead_matches set status = 'rejected', rejected_at = now(), updated_at = now()
  where id = target.id;
end;
$$;

create or replace function public.convert_my_lead(p_match_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  current_user_id uuid := (select auth.uid());
  target public.lead_matches;
  lead public.student_leads;
  invitation jsonb;
  conversion_id uuid;
begin
  select candidate.* into target from public.lead_matches candidate
  where candidate.id = p_match_id and (select private.owns_trainer(candidate.trainer_id)) for update;
  if target.id is null then raise exception 'lead_not_available'; end if;
  if target.status not in ('new', 'pending') or target.reserved_until <= now() then
    raise exception 'lead_not_actionable';
  end if;
  select source.* into lead from public.student_leads source where source.id = target.lead_id;
  if lead.email is null then raise exception 'lead_email_required'; end if;

  invitation := public.create_student_invitation(lead.email);
  update public.student_invitations set invited_name = lead.first_name
  where id = (invitation->>'invitation_id')::uuid;

  insert into public.lead_conversions(
    lead_id, lead_match_id, trainer_profile_id, invitation_id, created_by_user_id
  ) values (
    target.lead_id, target.id, target.trainer_id,
    (invitation->>'invitation_id')::uuid, current_user_id
  ) returning id into conversion_id;

  update public.lead_matches set status = 'converted', converted_at = now(), updated_at = now()
  where id = target.id;
  -- A lead can have only one V1 conversion. Close other reservations atomically.
  update public.lead_matches set status = 'rejected', rejected_at = now(), updated_at = now()
  where lead_id = target.lead_id and id <> target.id and status in ('new', 'pending');
  return invitation || jsonb_build_object('conversion_id', conversion_id);
exception when unique_violation then
  raise exception 'lead_not_actionable';
end;
$$;

create or replace function public.accept_student_invitation(p_token text, p_preferred_name text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  current_user_id uuid := (select auth.uid());
  current_email text;
  invitation public.student_invitations;
  student_id uuid;
  created_relationship_id uuid;
  resolved_name text;
  relationship_origin text;
begin
  if current_user_id is null or p_token is null or p_token !~ '^[a-f0-9]{64}$' then raise exception 'invitation_invalid'; end if;
  if p_preferred_name is not null and char_length(trim(p_preferred_name)) not between 1 and 120 then raise exception 'invitation_invalid'; end if;
  select lower(user_record.email) into current_email from auth.users user_record
  where user_record.id = current_user_id and user_record.email_confirmed_at is not null;
  if current_email is null then raise exception 'invitation_invalid'; end if;

  select candidate.* into invitation from public.student_invitations candidate
  where candidate.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex') for update;
  if invitation.id is null or invitation.status <> 'pending' or invitation.expires_at <= now()
    or invitation.invited_email_normalized <> current_email then raise exception 'invitation_invalid'; end if;
  resolved_name := coalesce(nullif(trim(p_preferred_name), ''), invitation.invited_name);
  relationship_origin := case when exists(
    select 1 from public.lead_conversions conversion where conversion.invitation_id = invitation.id
  ) then 'lead_conversion' else 'invitation' end;

  insert into public.app_users(id, display_name) values (current_user_id, resolved_name)
  on conflict (id) do update set display_name = coalesce(excluded.display_name, public.app_users.display_name);
  insert into public.user_roles(user_id, role_code) values (current_user_id, 'student')
  on conflict (user_id, role_code) do update set revoked_at = null, granted_at = excluded.granted_at;
  insert into public.student_profiles(user_id, preferred_name) values (current_user_id, resolved_name)
  on conflict (user_id) do update set preferred_name = coalesce(excluded.preferred_name, public.student_profiles.preferred_name)
  returning id into student_id;
  insert into public.trainer_student_relationships(
    trainer_profile_id, student_profile_id, status, origin, created_by_user_id
  ) values (
    invitation.trainer_profile_id, student_id, 'active', relationship_origin, invitation.created_by_user_id
  ) on conflict (trainer_profile_id, student_profile_id) do update set
    status = 'active', inactive_at = null, ended_at = null, end_reason = null, started_at = now()
  returning id into created_relationship_id;
  update public.student_invitations set status = 'accepted', accepted_by_user_id = current_user_id, accepted_at = now()
  where id = invitation.id;
  update public.lead_conversions set status = 'completed', student_profile_id = student_id,
    relationship_id = created_relationship_id, completed_at = now()
  where invitation_id = invitation.id;
  return created_relationship_id;
end;
$$;

create or replace function public.get_my_students()
returns jsonb language sql stable security definer set search_path = '' as $$
  with me as (select id from public.trainer_profiles where user_id = (select auth.uid()))
  select jsonb_build_object(
    'relationships', coalesce((select jsonb_agg(jsonb_build_object(
      'id', relationship.id,
      'student_profile_id', student.id,
      'name', coalesce(student.preferred_name, app_user.display_name, 'Aluno'),
      'email', case when relationship.status = 'active' then auth_user.email else null end,
      'status', relationship.status,
      'origin', relationship.origin,
      'started_at', relationship.started_at,
      'inactive_at', relationship.inactive_at,
      'ended_at', relationship.ended_at
    ) order by relationship.created_at desc)
    from public.trainer_student_relationships relationship
    join public.student_profiles student on student.id = relationship.student_profile_id
    join public.app_users app_user on app_user.id = student.user_id
    join auth.users auth_user on auth_user.id = student.user_id
    where relationship.trainer_profile_id = (select id from me)), '[]'::jsonb),
    'invitations', coalesce((select jsonb_agg(jsonb_build_object(
      'id', invitation.id, 'name', invitation.invited_name,
      'email', invitation.invited_email_normalized,
      'status', case when invitation.status = 'pending' and invitation.expires_at <= now() then 'expired' else invitation.status end,
      'expires_at', invitation.expires_at, 'created_at', invitation.created_at
    ) order by invitation.created_at desc)
    from public.student_invitations invitation
    where invitation.trainer_profile_id = (select id from me)
      and invitation.status in ('pending', 'expired')), '[]'::jsonb)
  );
$$;

create or replace function public.get_my_student_detail(p_relationship_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', relationship.id, 'student_profile_id', student.id,
    'name', coalesce(student.preferred_name, app_user.display_name, 'Aluno'),
    'email', case when relationship.status = 'active' then auth_user.email else null end,
    'status', relationship.status, 'origin', relationship.origin,
    'started_at', relationship.started_at, 'inactive_at', relationship.inactive_at,
    'ended_at', relationship.ended_at
  )
  from public.trainer_student_relationships relationship
  join public.student_profiles student on student.id = relationship.student_profile_id
  join public.app_users app_user on app_user.id = student.user_id
  join auth.users auth_user on auth_user.id = student.user_id
  where relationship.id = p_relationship_id and (select private.owns_trainer(relationship.trainer_profile_id));
$$;

revoke all on function private.set_lead_reservation() from public, anon, authenticated;
revoke all on function public.create_named_student_invitation(text,text), public.reject_my_lead(uuid),
  public.convert_my_lead(uuid), public.get_my_students(), public.get_my_student_detail(uuid) from public, anon;
grant execute on function public.create_named_student_invitation(text,text), public.reject_my_lead(uuid),
  public.convert_my_lead(uuid), public.get_my_students(), public.get_my_student_detail(uuid) to authenticated;
