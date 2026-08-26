-- Functional Onboarding V2: resumable trainer activation without client-owned progress.

alter table public.trainer_profiles
  add column if not exists specialty_code text,
  add column if not exists tiktok text,
  add column if not exists youtube text,
  add column if not exists publication_requested_at timestamptz,
  add column if not exists onboarding_completed_at timestamptz;

create table public.trainer_onboarding_drafts (
  user_id uuid primary key references public.app_users(id) on delete cascade,
  display_name text,
  professional_name text,
  profile_image_url text,
  specialty_code text,
  specialty_label text,
  service_mode public.service_mode,
  city text,
  cref text,
  whatsapp text,
  instagram text,
  tiktok text,
  youtube text,
  template_id public.template_id,
  identity_completed_at timestamptz,
  professional_completed_at timestamptz,
  social_completed_at timestamptz,
  template_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.trainer_onboarding_drafts enable row level security;
revoke all on public.trainer_onboarding_drafts from public, anon, authenticated;
grant all on public.trainer_onboarding_drafts to service_role;

create policy "owners read onboarding draft"
on public.trainer_onboarding_drafts for select to authenticated
using (user_id = (select auth.uid()));

create or replace function private.touch_onboarding_draft()
returns trigger language plpgsql security definer set search_path = '' as $$
begin new.updated_at := now(); return new; end;
$$;
revoke all on function private.touch_onboarding_draft() from public;
create trigger touch_trainer_onboarding_draft
before update on public.trainer_onboarding_drafts
for each row execute function private.touch_onboarding_draft();

create or replace function public.get_my_onboarding_draft()
returns jsonb language sql stable security definer set search_path = '' as $$
  select to_jsonb(draft) from public.trainer_onboarding_drafts draft
  where draft.user_id = (select auth.uid());
$$;
revoke all on function public.get_my_onboarding_draft() from public, anon;
grant execute on function public.get_my_onboarding_draft() to authenticated;

create or replace function public.save_my_onboarding_identity(
  p_display_name text, p_professional_name text, p_profile_image_url text
) returns void language plpgsql security definer set search_path = '' as $$
declare current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then raise exception 'authentication_required'; end if;
  if char_length(trim(p_display_name)) not between 2 and 100 then raise exception 'invalid_display_name'; end if;
  if p_professional_name is not null and char_length(trim(p_professional_name)) > 100 then raise exception 'invalid_professional_name'; end if;
  if p_profile_image_url is not null and p_profile_image_url !~ '^https://[^[:space:]]{1,1900}$' then raise exception 'invalid_profile_image_url'; end if;
  insert into public.trainer_onboarding_drafts(user_id,display_name,professional_name,profile_image_url,identity_completed_at)
  values(current_user_id,trim(p_display_name),nullif(trim(p_professional_name),''),p_profile_image_url,now())
  on conflict(user_id) do update set display_name=excluded.display_name,professional_name=excluded.professional_name,
    profile_image_url=coalesce(excluded.profile_image_url,public.trainer_onboarding_drafts.profile_image_url),identity_completed_at=now();
end; $$;

create or replace function public.save_my_onboarding_professional(
  p_specialty_code text, p_specialty_label text, p_service_mode public.service_mode, p_city text, p_cref text
) returns void language plpgsql security definer set search_path = '' as $$
declare current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then raise exception 'authentication_required'; end if;
  if p_specialty_code !~ '^[a-z][a-z0-9_]{1,39}$' or char_length(trim(p_specialty_label)) not between 2 and 120 then raise exception 'invalid_specialty'; end if;
  if p_city is not null and char_length(trim(p_city)) > 120 then raise exception 'invalid_city'; end if;
  if p_cref is not null and char_length(trim(p_cref)) > 60 then raise exception 'invalid_cref'; end if;
  insert into public.trainer_onboarding_drafts(user_id,specialty_code,specialty_label,service_mode,city,cref,professional_completed_at)
  values(current_user_id,p_specialty_code,trim(p_specialty_label),p_service_mode,nullif(trim(p_city),''),nullif(trim(p_cref),''),now())
  on conflict(user_id) do update set specialty_code=excluded.specialty_code,specialty_label=excluded.specialty_label,
    service_mode=excluded.service_mode,city=excluded.city,cref=excluded.cref,professional_completed_at=now();
end; $$;

create or replace function public.save_my_onboarding_social(
  p_whatsapp text, p_instagram text, p_tiktok text, p_youtube text
) returns void language plpgsql security definer set search_path = '' as $$
declare current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then raise exception 'authentication_required'; end if;
  if p_whatsapp !~ '^[0-9]{10,15}$' then raise exception 'invalid_whatsapp'; end if;
  if p_instagram is not null and p_instagram !~ '^[A-Za-z0-9._]{1,30}$' then raise exception 'invalid_instagram'; end if;
  if p_tiktok is not null and p_tiktok !~ '^https://(www\.)?tiktok\.com/@[A-Za-z0-9._-]{1,40}/?$' then raise exception 'invalid_tiktok'; end if;
  if p_youtube is not null and p_youtube !~ '^https://(www\.)?(youtube\.com|youtu\.be)/[^[:space:]]{1,300}$' then raise exception 'invalid_youtube'; end if;
  insert into public.trainer_onboarding_drafts(user_id,whatsapp,instagram,tiktok,youtube,social_completed_at)
  values(current_user_id,p_whatsapp,p_instagram,p_tiktok,p_youtube,now())
  on conflict(user_id) do update set whatsapp=excluded.whatsapp,instagram=excluded.instagram,tiktok=excluded.tiktok,
    youtube=excluded.youtube,social_completed_at=now();
end; $$;

create or replace function public.save_my_onboarding_template(p_template public.template_id)
returns void language plpgsql security definer set search_path = '' as $$
declare current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then raise exception 'authentication_required'; end if;
  insert into public.trainer_onboarding_drafts(user_id,template_id,template_completed_at)
  values(current_user_id,p_template,now()) on conflict(user_id) do update
  set template_id=excluded.template_id,template_completed_at=now();
end; $$;

create or replace function public.finalize_my_onboarding()
returns text language plpgsql security definer set search_path = '' as $$
declare current_user_id uuid := (select auth.uid()); draft public.trainer_onboarding_drafts; resolved_slug text; slug_base text;
begin
  if current_user_id is null then raise exception 'authentication_required'; end if;
  select * into draft from public.trainer_onboarding_drafts where user_id=current_user_id for update;
  if draft.identity_completed_at is null or draft.professional_completed_at is null or draft.social_completed_at is null or draft.template_completed_at is null then raise exception 'onboarding_incomplete'; end if;
  select profile.slug into resolved_slug from public.trainer_profiles profile where profile.user_id=current_user_id;
  if resolved_slug is null then
    slug_base := trim(both '-' from regexp_replace(lower(draft.display_name),'[^a-z0-9]+','-','g'));
    if slug_base !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then slug_base := 'personal-' || left(replace(current_user_id::text,'-',''),8); end if;
    resolved_slug := public.create_trainer_profile(draft.display_name,draft.professional_name,draft.specialty_label,draft.whatsapp,draft.instagram,draft.cref,draft.city,draft.service_mode,
      slug_base);
  end if;
  update public.trainer_profiles set profile_image_url=draft.profile_image_url,specialty_code=draft.specialty_code,template_id=draft.template_id,
    tiktok=draft.tiktok,youtube=draft.youtube,onboarding_completed_at=coalesce(onboarding_completed_at,now())
  where user_id=current_user_id;
  delete from public.trainer_onboarding_drafts where user_id=current_user_id;
  return resolved_slug;
end; $$;

create or replace function public.request_my_site_publication()
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.trainer_profiles set publication_requested_at=coalesce(publication_requested_at,now()) where user_id=(select auth.uid());
  if not found then raise exception 'trainer_not_found'; end if;
  update public.trainer_profiles profile set published=true
  where profile.user_id=(select auth.uid()) and (select private.trainer_has_publication_access(profile.id));
end; $$;

create or replace function private.publish_requested_site_on_entitlement()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.can_publish_site and not old.can_publish_site then
    update public.trainer_profiles set published=true
    where id=new.trainer_id and publication_requested_at is not null;
  end if;
  return new;
end; $$;
revoke all on function private.publish_requested_site_on_entitlement() from public;
create trigger publish_requested_site_on_entitlement
after update of can_publish_site on public.trainer_entitlements
for each row execute function private.publish_requested_site_on_entitlement();

revoke all on function public.save_my_onboarding_identity(text,text,text) from public,anon;
revoke all on function public.save_my_onboarding_professional(text,text,public.service_mode,text,text) from public,anon;
revoke all on function public.save_my_onboarding_social(text,text,text,text) from public,anon;
revoke all on function public.save_my_onboarding_template(public.template_id) from public,anon;
revoke all on function public.finalize_my_onboarding() from public,anon;
revoke all on function public.request_my_site_publication() from public,anon;
grant execute on function public.save_my_onboarding_identity(text,text,text) to authenticated;
grant execute on function public.save_my_onboarding_professional(text,text,public.service_mode,text,text) to authenticated;
grant execute on function public.save_my_onboarding_social(text,text,text,text) to authenticated;
grant execute on function public.save_my_onboarding_template(public.template_id) to authenticated;
grant execute on function public.finalize_my_onboarding() to authenticated;
grant execute on function public.request_my_site_publication() to authenticated;

grant select (tiktok,youtube) on public.trainer_profiles to anon,authenticated;
grant update (specialty_code,tiktok,youtube) on public.trainer_profiles to authenticated;

do $security_gate$ begin
  if has_table_privilege('authenticated','public.trainer_onboarding_drafts','INSERT,UPDATE,DELETE') then raise exception 'unsafe onboarding draft mutation grant'; end if;
  if has_function_privilege('anon','public.finalize_my_onboarding()','EXECUTE') then raise exception 'anonymous onboarding finalization'; end if;
  if has_function_privilege('authenticated','public.reconcile_billing_subscription(uuid,text,text,text,text,text,text,text,text,text,text,text,text,timestamptz,timestamptz,boolean,timestamptz,timestamptz,timestamptz,boolean,boolean)','EXECUTE') then raise exception 'client billing reconciliation'; end if;
end $security_gate$;
