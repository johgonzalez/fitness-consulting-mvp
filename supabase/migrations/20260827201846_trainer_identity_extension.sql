-- Sprint 1: factual Trainer identity. Existing profiles remain readable while
-- every newly finalized Onboarding V2 profile must provide an adult identity.

alter table public.trainer_profiles
  add column if not exists full_name text,
  add column if not exists birth_date date,
  add column if not exists preferred_name text,
  add column if not exists pronouns text;

alter table public.trainer_onboarding_drafts
  add column if not exists full_name text,
  add column if not exists birth_date date,
  add column if not exists preferred_name text,
  add column if not exists pronouns text;

update public.trainer_profiles
set full_name = display_name
where full_name is null;

update public.trainer_onboarding_drafts
set full_name = display_name
where full_name is null and display_name is not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'trainer_profiles_identity_lengths_check'
      and conrelid = 'public.trainer_profiles'::regclass
  ) then
    alter table public.trainer_profiles add constraint trainer_profiles_identity_lengths_check check (
      (full_name is null or char_length(trim(full_name)) between 2 and 160)
      and (preferred_name is null or char_length(trim(preferred_name)) between 2 and 100)
      and (pronouns is null or char_length(trim(pronouns)) between 1 and 40)
    );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'trainer_profiles_birth_date_range_check'
      and conrelid = 'public.trainer_profiles'::regclass
  ) then
    alter table public.trainer_profiles add constraint trainer_profiles_birth_date_range_check check (
      birth_date is null or birth_date >= date '1900-01-01'
    );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'trainer_onboarding_identity_lengths_check'
      and conrelid = 'public.trainer_onboarding_drafts'::regclass
  ) then
    alter table public.trainer_onboarding_drafts add constraint trainer_onboarding_identity_lengths_check check (
      (full_name is null or char_length(trim(full_name)) between 2 and 160)
      and (preferred_name is null or char_length(trim(preferred_name)) between 2 and 100)
      and (pronouns is null or char_length(trim(pronouns)) between 1 and 40)
    );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'trainer_onboarding_birth_date_range_check'
      and conrelid = 'public.trainer_onboarding_drafts'::regclass
  ) then
    alter table public.trainer_onboarding_drafts add constraint trainer_onboarding_birth_date_range_check check (
      birth_date is null or birth_date >= date '1900-01-01'
    );
  end if;
end $$;

create or replace function public.save_my_onboarding_identity(
  p_full_name text,
  p_birth_date date,
  p_preferred_name text,
  p_pronouns text,
  p_professional_name text,
  p_profile_image_url text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  resolved_full_name text := trim(coalesce(p_full_name, ''));
  resolved_preferred_name text := nullif(trim(coalesce(p_preferred_name, '')), '');
  resolved_display_name text;
begin
  if current_user_id is null then raise exception 'authentication_required'; end if;
  if char_length(resolved_full_name) not between 2 and 160 then raise exception 'invalid_full_name'; end if;
  if p_birth_date is null then raise exception 'birth_date_required'; end if;
  if p_birth_date < date '1900-01-01' or p_birth_date > current_date then raise exception 'invalid_birth_date'; end if;
  if p_birth_date > (current_date - interval '18 years')::date then raise exception 'trainer_must_be_adult'; end if;
  if resolved_preferred_name is not null and char_length(resolved_preferred_name) not between 2 and 100 then raise exception 'invalid_preferred_name'; end if;
  if p_pronouns is not null and char_length(trim(p_pronouns)) not between 1 and 40 then raise exception 'invalid_pronouns'; end if;
  if p_professional_name is not null and char_length(trim(p_professional_name)) > 100 then raise exception 'invalid_professional_name'; end if;
  if p_profile_image_url is not null and (
    char_length(p_profile_image_url) > 2000 or p_profile_image_url !~ '^https://[^[:space:]]+$'
  ) then raise exception 'invalid_profile_image_url'; end if;

  resolved_display_name := coalesce(resolved_preferred_name, resolved_full_name);

  insert into public.trainer_onboarding_drafts(
    user_id, display_name, full_name, birth_date, preferred_name, pronouns,
    professional_name, profile_image_url, identity_completed_at
  ) values (
    current_user_id, resolved_display_name, resolved_full_name, p_birth_date,
    resolved_preferred_name, nullif(trim(p_pronouns), ''),
    nullif(trim(p_professional_name), ''), p_profile_image_url, now()
  )
  on conflict(user_id) do update set
    display_name = excluded.display_name,
    full_name = excluded.full_name,
    birth_date = excluded.birth_date,
    preferred_name = excluded.preferred_name,
    pronouns = excluded.pronouns,
    professional_name = excluded.professional_name,
    profile_image_url = coalesce(excluded.profile_image_url, public.trainer_onboarding_drafts.profile_image_url),
    identity_completed_at = now();
end;
$$;

create or replace function public.finalize_my_onboarding()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  draft public.trainer_onboarding_drafts;
  resolved_slug text;
  slug_base text;
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

  select profile.slug into resolved_slug
  from public.trainer_profiles profile
  where profile.user_id = current_user_id;

  if resolved_slug is null then
    slug_base := trim(both '-' from regexp_replace(lower(draft.display_name), '[^a-z0-9]+', '-', 'g'));
    if slug_base !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
      slug_base := 'personal-' || left(replace(current_user_id::text, '-', ''), 8);
    end if;
    resolved_slug := public.create_trainer_profile(
      draft.display_name, draft.professional_name, draft.specialty_label,
      draft.whatsapp, draft.instagram, draft.cref, draft.city,
      draft.service_mode, slug_base
    );
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

  delete from public.trainer_onboarding_drafts where user_id = current_user_id;
  return resolved_slug;
end;
$$;

-- Retire the old identity writer so no client can bypass birth-date validation.
revoke all on function public.save_my_onboarding_identity(text,text,text) from public, anon, authenticated;
revoke all on function public.save_my_onboarding_identity(text,date,text,text,text,text) from public, anon;
grant execute on function public.save_my_onboarding_identity(text,date,text,text,text,text) to authenticated;

revoke all on function public.finalize_my_onboarding() from public, anon;
grant execute on function public.finalize_my_onboarding() to authenticated;

do $identity_security_gate$
begin
  if has_function_privilege('authenticated', 'public.save_my_onboarding_identity(text,text,text)', 'EXECUTE') then
    raise exception 'legacy identity writer remains executable';
  end if;
  if has_function_privilege('anon', 'public.save_my_onboarding_identity(text,date,text,text,text,text)', 'EXECUTE') then
    raise exception 'anonymous identity write';
  end if;
end;
$identity_security_gate$;
