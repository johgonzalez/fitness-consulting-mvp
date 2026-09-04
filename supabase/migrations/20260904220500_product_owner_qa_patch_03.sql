-- Product Owner QA Patch 03: relationship-scoped student avatars and an
-- explicit, resumable public-address step for new Trainer onboarding.

alter table public.trainer_onboarding_drafts
  add column if not exists requested_slug text,
  add column if not exists slug_completed_at timestamptz;

create or replace function private.normalize_trainer_slug(p_value text)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select trim(both '-' from regexp_replace(
    translate(lower(trim(p_value)),
      'áàâãäåéèêëíìîïóòôõöúùûüçñýÿ',
      'aaaaaaeeeeiiiiooooouuuucnyy'),
    '[^a-z0-9]+', '-', 'g'));
$$;

create or replace function private.is_reserved_trainer_slug(p_slug text)
returns boolean
language sql
immutable
strict
set search_path = ''
as $$
  select p_slug = any(array[
    'admin','api','auth','dashboard','login','signup','student','students',
    'trainer','trainers','community','settings','billing','onboarding','invite',
    'preview','site-preview','templates','support','help','terms','privacy',
    'cheipi','www'
  ]::text[]);
$$;

revoke all on function private.normalize_trainer_slug(text) from public, anon, authenticated;
revoke all on function private.is_reserved_trainer_slug(text) from public, anon, authenticated;

create or replace function public.check_my_trainer_slug_availability(p_slug text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  normalized_slug text := private.normalize_trainer_slug(coalesce(p_slug, ''));
begin
  if current_user_id is null then raise exception 'authentication_required'; end if;
  if char_length(normalized_slug) not between 3 and 70
    or normalized_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    or private.is_reserved_trainer_slug(normalized_slug) then
    return false;
  end if;
  return not exists (
    select 1 from public.trainer_profiles profile
    where profile.slug = normalized_slug and profile.user_id <> current_user_id
  );
end;
$$;

create or replace function public.save_my_onboarding_slug(p_slug text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  normalized_slug text := private.normalize_trainer_slug(coalesce(p_slug, ''));
  existing_profile public.trainer_profiles;
begin
  if current_user_id is null then raise exception 'authentication_required'; end if;
  if char_length(normalized_slug) not between 3 and 70
    or normalized_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'invalid_slug';
  end if;
  if private.is_reserved_trainer_slug(normalized_slug) then raise exception 'reserved_slug'; end if;

  select * into existing_profile
  from public.trainer_profiles profile
  where profile.user_id = current_user_id
  for update;

  if existing_profile.id is not null and existing_profile.published then
    raise exception 'slug_locked_after_publication';
  end if;
  if exists (
    select 1 from public.trainer_profiles profile
    where profile.slug = normalized_slug and profile.user_id <> current_user_id
  ) then
    raise exception 'slug_unavailable';
  end if;

  insert into public.trainer_onboarding_drafts(user_id, requested_slug, slug_completed_at)
  values(current_user_id, normalized_slug, now())
  on conflict(user_id) do update set
    requested_slug = excluded.requested_slug,
    slug_completed_at = now();

  if existing_profile.id is not null then
    update public.trainer_profiles set slug = normalized_slug where id = existing_profile.id;
  end if;
  return normalized_slug;
exception
  when unique_violation then raise exception 'slug_unavailable';
end;
$$;

revoke all on function public.check_my_trainer_slug_availability(text) from public, anon;
revoke all on function public.save_my_onboarding_slug(text) from public, anon;
grant execute on function public.check_my_trainer_slug_availability(text) to authenticated;
grant execute on function public.save_my_onboarding_slug(text) to authenticated;

create or replace function public.finalize_my_onboarding()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  draft public.trainer_onboarding_drafts;
  existing_profile public.trainer_profiles;
  resolved_slug text;
begin
  if current_user_id is null then raise exception 'authentication_required'; end if;
  select * into draft from public.trainer_onboarding_drafts where user_id = current_user_id for update;
  if draft.identity_completed_at is null or draft.professional_completed_at is null
    or draft.social_completed_at is null or draft.template_completed_at is null then
    raise exception 'onboarding_incomplete';
  end if;
  if draft.full_name is null then raise exception 'full_name_required'; end if;
  if draft.birth_date is null then raise exception 'birth_date_required'; end if;
  if draft.birth_date > (current_date - interval '18 years')::date then raise exception 'trainer_must_be_adult'; end if;

  select * into existing_profile
  from public.trainer_profiles profile
  where profile.user_id = current_user_id
  for update;

  if existing_profile.id is null then
    if draft.slug_completed_at is null or draft.requested_slug is null then raise exception 'slug_required'; end if;
    resolved_slug := private.normalize_trainer_slug(draft.requested_slug);
    if char_length(resolved_slug) not between 3 and 70
      or resolved_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
      or private.is_reserved_trainer_slug(resolved_slug) then
      raise exception 'invalid_slug';
    end if;
    if exists (select 1 from public.trainer_profiles where slug = resolved_slug) then
      raise exception 'slug_unavailable';
    end if;

    insert into public.trainer_profiles (
      user_id, slug, display_name, professional_name, headline, bio, specialty,
      cref, city, service_mode, whatsapp, instagram, template_id, primary_color, published
    ) values (
      current_user_id, resolved_slug, trim(draft.display_name), nullif(trim(draft.professional_name), ''),
      trim(draft.specialty_label) || ' com acompanhamento personalizado.',
      trim(draft.display_name) || ' oferece acompanhamento personalizado para uma rotina de treino consistente e segura.',
      trim(draft.specialty_label), nullif(trim(draft.cref), ''), trim(draft.city), draft.service_mode,
      trim(draft.whatsapp), nullif(trim(draft.instagram), ''), draft.template_id, '#c7ff36', false
    );
  else
    resolved_slug := existing_profile.slug;
    if draft.requested_slug is not null and not existing_profile.published then
      resolved_slug := private.normalize_trainer_slug(draft.requested_slug);
      if exists (
        select 1 from public.trainer_profiles profile
        where profile.slug = resolved_slug and profile.id <> existing_profile.id
      ) then raise exception 'slug_unavailable'; end if;
      update public.trainer_profiles set slug = resolved_slug where id = existing_profile.id;
    end if;
  end if;

  update public.trainer_profiles set
    full_name = draft.full_name,
    birth_date = draft.birth_date,
    preferred_name = draft.preferred_name,
    pronouns = draft.pronouns,
    display_name = coalesce(draft.preferred_name, draft.full_name),
    profile_image_url = draft.profile_image_url,
    specialty_code = draft.specialty_code,
    template_id = draft.template_id,
    tiktok = draft.tiktok,
    youtube = draft.youtube,
    onboarding_completed_at = coalesce(onboarding_completed_at, now())
  where user_id = current_user_id;

  return resolved_slug;
exception
  when unique_violation then raise exception 'slug_unavailable';
end;
$$;

revoke all on function public.finalize_my_onboarding() from public, anon;
grant execute on function public.finalize_my_onboarding() to authenticated;

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
      'profile_image_path', case when relationship.status = 'active' then student.profile_image_path else null end,
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

create or replace function public.get_my_student_detail(p_relationship_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', relationship.id,
    'student_profile_id', student.id,
    'name', coalesce(student.preferred_name, app_user.display_name, 'Aluno'),
    'email', case when relationship.status = 'active' then auth_user.email else null end,
    'profile_image_path', case when relationship.status = 'active' then student.profile_image_path else null end,
    'status', relationship.status,
    'origin', relationship.origin,
    'started_at', relationship.started_at,
    'inactive_at', relationship.inactive_at,
    'ended_at', relationship.ended_at
  )
  from public.trainer_student_relationships relationship
  join public.student_profiles student on student.id = relationship.student_profile_id
  join public.app_users app_user on app_user.id = student.user_id
  join auth.users auth_user on auth_user.id = student.user_id
  where relationship.id = p_relationship_id
    and (select private.owns_trainer(relationship.trainer_profile_id));
$$;

revoke all on function public.get_my_students(), public.get_my_student_detail(uuid) from public, anon;
grant execute on function public.get_my_students(), public.get_my_student_detail(uuid) to authenticated;

do $security_gate$
begin
  if has_function_privilege('anon', 'public.check_my_trainer_slug_availability(text)', 'EXECUTE') then
    raise exception 'anonymous slug enumeration';
  end if;
  if has_function_privilege('anon', 'public.save_my_onboarding_slug(text)', 'EXECUTE') then
    raise exception 'anonymous slug mutation';
  end if;
end
$security_gate$;
