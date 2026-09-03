-- P0 Smart Auth entry: verified-email invitation discovery and explicit acceptance.

create index if not exists student_invitations_pending_email_idx
  on public.student_invitations(invited_email_normalized, expires_at)
  where status = 'pending';

create or replace function private.accept_student_invitation_record(
  p_invitation_id uuid,
  p_preferred_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_email text;
  invitation public.student_invitations;
  student_id uuid;
  created_relationship_id uuid;
  resolved_name text;
  relationship_origin text;
begin
  if current_user_id is null or p_invitation_id is null then
    raise exception 'invitation_invalid';
  end if;
  if p_preferred_name is not null and char_length(trim(p_preferred_name)) not between 1 and 120 then
    raise exception 'invitation_invalid';
  end if;

  select lower(user_record.email) into current_email
  from auth.users user_record
  where user_record.id = current_user_id
    and user_record.email_confirmed_at is not null;
  if current_email is null then raise exception 'invitation_invalid'; end if;

  select candidate.* into invitation
  from public.student_invitations candidate
  where candidate.id = p_invitation_id
  for update;

  if invitation.id is null or invitation.invited_email_normalized <> current_email then
    raise exception 'invitation_invalid';
  end if;

  if invitation.status = 'accepted' then
    if invitation.accepted_by_user_id <> current_user_id then raise exception 'invitation_invalid'; end if;
    select relationship.id into created_relationship_id
    from public.trainer_student_relationships relationship
    join public.student_profiles student on student.id = relationship.student_profile_id
    where relationship.trainer_profile_id = invitation.trainer_profile_id
      and student.user_id = current_user_id;
    if created_relationship_id is null then raise exception 'invitation_invalid'; end if;
    return created_relationship_id;
  end if;

  if invitation.status <> 'pending' or invitation.expires_at <= now() then
    raise exception 'invitation_invalid';
  end if;

  resolved_name := coalesce(nullif(trim(p_preferred_name), ''), invitation.invited_name);
  relationship_origin := case when exists (
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
  update public.student_invitations
  set status = 'accepted', accepted_by_user_id = current_user_id, accepted_at = now(), updated_at = now()
  where id = invitation.id;
  update public.lead_conversions set status = 'completed', student_profile_id = student_id,
    relationship_id = created_relationship_id, completed_at = now()
  where invitation_id = invitation.id;
  return created_relationship_id;
end;
$$;

create or replace function public.accept_student_invitation(p_token text, p_preferred_name text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation_id uuid;
begin
  if (select auth.uid()) is null or p_token is null or p_token !~ '^[a-f0-9]{64}$' then
    raise exception 'invitation_invalid';
  end if;

  select candidate.id into invitation_id
  from public.student_invitations candidate
  where candidate.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
  for update;
  if invitation_id is null then raise exception 'invitation_invalid'; end if;

  return private.accept_student_invitation_record(invitation_id, p_preferred_name);
end;
$$;

create or replace function public.get_my_pending_student_invitations()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with me as (
    select lower(user_record.email) as email
    from auth.users user_record
    where user_record.id = (select auth.uid())
      and user_record.email_confirmed_at is not null
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'invitation_id', invitation.id,
    'trainer_name', coalesce(trainer.professional_name, trainer.display_name),
    'expires_at', invitation.expires_at
  ) order by invitation.created_at), '[]'::jsonb)
  from public.student_invitations invitation
  join me on me.email = invitation.invited_email_normalized
  join public.trainer_profiles trainer on trainer.id = invitation.trainer_profile_id
  where invitation.status = 'pending'
    and invitation.expires_at > now();
$$;

create or replace function public.accept_my_pending_student_invitation(p_invitation_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  return private.accept_student_invitation_record(p_invitation_id, null);
end;
$$;

revoke all on function private.accept_student_invitation_record(uuid,text) from public, anon, authenticated;
revoke all on function public.get_my_pending_student_invitations() from public, anon, authenticated;
revoke all on function public.accept_my_pending_student_invitation(uuid) from public, anon, authenticated;
grant execute on function public.get_my_pending_student_invitations() to authenticated;
grant execute on function public.accept_my_pending_student_invitation(uuid) to authenticated;
