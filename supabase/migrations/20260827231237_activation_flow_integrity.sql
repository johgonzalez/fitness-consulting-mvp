-- V1 activation flow integrity: factual invite delivery observability and
-- resumable waitlist success data. Existing invitation and access lifecycles
-- remain authoritative.

alter table public.student_invitations
  add column if not exists provider_message_id text;

alter table public.student_invitations
  drop constraint if exists student_invitations_delivery_status_check;

alter table public.student_invitations
  add constraint student_invitations_delivery_status_check check (
    last_delivery_status is null or last_delivery_status in (
      'pending',
      'provider_accepted',
      'provider_rejected',
      'delivery_unknown',
      'delivery_failed',
      -- Kept during the rolling deploy so the previous application build and
      -- historical rows remain compatible.
      'sent',
      'failed'
    )
  );

alter table public.student_invitations
  add constraint student_invitations_provider_message_id_length_check check (
    provider_message_id is null or char_length(provider_message_id) between 1 and 255
  );

create or replace function public.record_my_student_invitation_delivery(
  p_invitation_id uuid,
  p_status text,
  p_provider_message_id text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_status not in ('provider_accepted', 'provider_rejected', 'delivery_unknown', 'delivery_failed') then
    raise exception 'invalid_delivery_status';
  end if;
  if p_status = 'provider_accepted'
    and (p_provider_message_id is null or char_length(p_provider_message_id) not between 1 and 255) then
    raise exception 'provider_message_id_required';
  end if;
  if p_status <> 'provider_accepted' and p_provider_message_id is not null then
    raise exception 'provider_message_id_not_allowed';
  end if;

  update public.student_invitations invitation
  set last_delivery_status = p_status,
      provider_message_id = p_provider_message_id,
      last_delivery_attempt_at = now(),
      updated_at = now()
  where invitation.id = p_invitation_id
    and invitation.status = 'pending'
    and (select private.owns_trainer(invitation.trainer_profile_id));
  if not found then raise exception 'invitation_not_available'; end if;
end;
$$;

revoke all on function public.record_my_student_invitation_delivery(uuid,text,text)
  from public, anon, authenticated;
grant execute on function public.record_my_student_invitation_delivery(uuid,text,text)
  to authenticated;

-- Keep the factual onboarding draft after site generation. It is the
-- resumable source for Back edits; finalization remains idempotent and updates
-- the same trainer profile.
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

  return resolved_slug;
end;
$$;

create or replace function public.get_my_access_state()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with account as (
    select id, lower(email) as email
    from auth.users
    where id = (select auth.uid())
  ), waitlist as (
    select entry.email, entry.whatsapp
    from public.waitlist_entries entry
    join account on account.email = entry.email
    where entry.audience = 'trainer'
    limit 1
  )
  select case when (select id from account) is null then null else jsonb_build_object(
    'founder_access_active', private.trainer_has_active_access_grant((select id from account), 'FOUNDER_ACCESS', now()),
    'waitlist_joined', exists (select 1 from waitlist),
    'waitlist_email', (select email from waitlist),
    'waitlist_whatsapp', (select whatsapp from waitlist),
    'entitlements', public.get_my_effective_entitlements()
  ) end;
$$;

revoke all on function public.get_my_access_state() from public, anon;
grant execute on function public.get_my_access_state() to authenticated;

do $security_gate$
begin
  if has_function_privilege('anon', 'public.record_my_student_invitation_delivery(uuid,text,text)', 'EXECUTE') then
    raise exception 'activation integrity: anonymous delivery mutation';
  end if;
  if not has_function_privilege('authenticated', 'public.record_my_student_invitation_delivery(uuid,text,text)', 'EXECUTE') then
    raise exception 'activation integrity: owner delivery mutation unavailable';
  end if;
  if has_table_privilege('authenticated', 'public.student_invitations', 'UPDATE') then
    raise exception 'activation integrity: unsafe direct invitation update';
  end if;
end;
$security_gate$;
