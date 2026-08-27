-- Sprint 2: owner-managed invitation delivery, safe token rotation and idempotent acceptance.

alter table public.student_invitations
  add column if not exists last_delivery_attempt_at timestamptz,
  add column if not exists last_delivery_status text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'student_invitations_delivery_status_check'
      and conrelid = 'public.student_invitations'::regclass
  ) then
    alter table public.student_invitations add constraint student_invitations_delivery_status_check check (
      last_delivery_status is null or last_delivery_status in ('pending', 'sent', 'failed')
    );
  end if;
end $$;

create or replace function public.create_student_invitation(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_trainer_id uuid;
  normalized_email text := lower(trim(p_email));
  plaintext_token text;
  created_invitation public.student_invitations;
begin
  if current_user_id is null then raise exception 'authentication_required'; end if;
  if normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or char_length(normalized_email) > 320 then
    raise exception 'invalid_invitation_target';
  end if;

  select profile.id into current_trainer_id
  from public.trainer_profiles profile
  where profile.user_id = current_user_id
    and exists (
      select 1 from public.user_roles role
      where role.user_id = current_user_id
        and role.role_code = 'trainer'
        and role.revoked_at is null
    );
  if current_trainer_id is null then raise exception 'trainer_role_required'; end if;

  update public.student_invitations invitation
  set status = case when invitation.expires_at <= now() then 'expired' else 'revoked' end,
      revoked_at = case when invitation.expires_at > now() then now() else null end,
      updated_at = now()
  where invitation.trainer_profile_id = current_trainer_id
    and invitation.invited_email_normalized = normalized_email
    and invitation.status = 'pending';

  plaintext_token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.student_invitations(
    trainer_profile_id, invited_email_normalized, token_hash, expires_at,
    created_by_user_id, last_delivery_attempt_at, last_delivery_status
  ) values (
    current_trainer_id, normalized_email,
    encode(extensions.digest(plaintext_token, 'sha256'), 'hex'),
    now() + interval '7 days', current_user_id, now(), 'pending'
  ) returning * into created_invitation;

  return jsonb_build_object(
    'invitation_id', created_invitation.id,
    'token', plaintext_token,
    'email', created_invitation.invited_email_normalized,
    'expires_at', created_invitation.expires_at
  );
end;
$$;

create or replace function public.prepare_my_student_invitation_resend(p_invitation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation public.student_invitations;
  plaintext_token text;
begin
  select candidate.* into invitation
  from public.student_invitations candidate
  where candidate.id = p_invitation_id
    and (select private.owns_trainer(candidate.trainer_profile_id))
  for update;

  if invitation.id is null or invitation.status <> 'pending' or invitation.expires_at <= now() then
    raise exception 'invitation_not_available';
  end if;
  if invitation.last_delivery_attempt_at is not null
    and invitation.last_delivery_attempt_at > now() - interval '60 seconds' then
    raise exception 'invitation_resend_rate_limited';
  end if;

  plaintext_token := encode(extensions.gen_random_bytes(32), 'hex');
  update public.student_invitations target
  set token_hash = encode(extensions.digest(plaintext_token, 'sha256'), 'hex'),
      last_delivery_attempt_at = now(),
      last_delivery_status = 'pending',
      updated_at = now()
  where target.id = invitation.id;

  return jsonb_build_object(
    'invitation_id', invitation.id,
    'token', plaintext_token,
    'email', invitation.invited_email_normalized,
    'expires_at', invitation.expires_at
  );
end;
$$;

create or replace function public.edit_my_student_invitation_email(
  p_invitation_id uuid,
  p_email text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation public.student_invitations;
  normalized_email text := lower(trim(p_email));
  plaintext_token text;
begin
  if normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or char_length(normalized_email) > 320 then
    raise exception 'invalid_invitation_target';
  end if;

  select candidate.* into invitation
  from public.student_invitations candidate
  where candidate.id = p_invitation_id
    and (select private.owns_trainer(candidate.trainer_profile_id))
  for update;

  if invitation.id is null or invitation.status <> 'pending' or invitation.expires_at <= now() then
    raise exception 'invitation_not_available';
  end if;
  if invitation.invited_email_normalized = normalized_email then
    return jsonb_build_object(
      'status', 'UNCHANGED',
      'invitation_id', invitation.id,
      'email', invitation.invited_email_normalized,
      'expires_at', invitation.expires_at
    );
  end if;
  if exists (
    select 1 from public.student_invitations conflict
    where conflict.trainer_profile_id = invitation.trainer_profile_id
      and conflict.invited_email_normalized = normalized_email
      and conflict.status = 'pending'
      and conflict.id <> invitation.id
  ) then
    raise exception 'invitation_target_already_pending';
  end if;

  plaintext_token := encode(extensions.gen_random_bytes(32), 'hex');
  update public.student_invitations target
  set invited_email_normalized = normalized_email,
      token_hash = encode(extensions.digest(plaintext_token, 'sha256'), 'hex'),
      expires_at = now() + interval '7 days',
      last_delivery_attempt_at = now(),
      last_delivery_status = 'pending',
      updated_at = now()
  where target.id = invitation.id
  returning target.* into invitation;

  return jsonb_build_object(
    'status', 'CHANGED',
    'invitation_id', invitation.id,
    'token', plaintext_token,
    'email', normalized_email,
    'expires_at', invitation.expires_at
  );
end;
$$;

create or replace function public.mark_my_student_invitation_delivery(
  p_invitation_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_status not in ('sent', 'failed') then raise exception 'invalid_delivery_status'; end if;
  update public.student_invitations invitation
  set last_delivery_status = p_status,
      updated_at = now()
  where invitation.id = p_invitation_id
    and invitation.status = 'pending'
    and (select private.owns_trainer(invitation.trainer_profile_id));
  if not found then raise exception 'invitation_not_available'; end if;
end;
$$;

create or replace function public.accept_student_invitation(p_token text, p_preferred_name text default null)
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
  if current_user_id is null or p_token is null or p_token !~ '^[a-f0-9]{64}$' then
    raise exception 'invitation_invalid';
  end if;
  if p_preferred_name is not null and char_length(trim(p_preferred_name)) not between 1 and 120 then
    raise exception 'invitation_invalid';
  end if;

  select lower(user_record.email) into current_email
  from auth.users user_record
  where user_record.id = current_user_id and user_record.email_confirmed_at is not null;
  if current_email is null then raise exception 'invitation_invalid'; end if;

  select candidate.* into invitation
  from public.student_invitations candidate
  where candidate.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
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

create or replace function public.get_my_students()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
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
      'id', invitation.id,
      'name', invitation.invited_name,
      'email', invitation.invited_email_normalized,
      'status', case when invitation.status = 'pending' and invitation.expires_at <= now() then 'expired' else invitation.status end,
      'expires_at', invitation.expires_at,
      'created_at', invitation.created_at,
      'last_delivery_status', invitation.last_delivery_status,
      'last_delivery_attempt_at', invitation.last_delivery_attempt_at
    ) order by invitation.created_at desc)
    from public.student_invitations invitation
    where invitation.trainer_profile_id = (select id from me)
      and invitation.status in ('pending', 'expired')), '[]'::jsonb)
  );
$$;

revoke all on function public.prepare_my_student_invitation_resend(uuid),
  public.edit_my_student_invitation_email(uuid,text),
  public.mark_my_student_invitation_delivery(uuid,text)
  from public, anon, authenticated;
grant execute on function public.prepare_my_student_invitation_resend(uuid),
  public.edit_my_student_invitation_email(uuid,text),
  public.mark_my_student_invitation_delivery(uuid,text)
  to authenticated;
