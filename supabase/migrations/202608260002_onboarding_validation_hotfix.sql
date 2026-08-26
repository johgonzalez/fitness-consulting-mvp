-- Forward-only correction for PostgreSQL ARE repetition limits in Onboarding V2 URL validation.

create or replace function public.save_my_onboarding_identity(
  p_display_name text, p_professional_name text, p_profile_image_url text
) returns void language plpgsql security definer set search_path = '' as $$
declare current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then raise exception 'authentication_required'; end if;
  if char_length(trim(p_display_name)) not between 2 and 100 then raise exception 'invalid_display_name'; end if;
  if p_professional_name is not null and char_length(trim(p_professional_name)) > 100 then raise exception 'invalid_professional_name'; end if;
  if p_profile_image_url is not null and (
    char_length(p_profile_image_url) > 2000 or p_profile_image_url !~ '^https://[^[:space:]]+$'
  ) then raise exception 'invalid_profile_image_url'; end if;
  insert into public.trainer_onboarding_drafts(user_id,display_name,professional_name,profile_image_url,identity_completed_at)
  values(current_user_id,trim(p_display_name),nullif(trim(p_professional_name),''),p_profile_image_url,now())
  on conflict(user_id) do update set display_name=excluded.display_name,professional_name=excluded.professional_name,
    profile_image_url=coalesce(excluded.profile_image_url,public.trainer_onboarding_drafts.profile_image_url),identity_completed_at=now();
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
  if p_youtube is not null and (
    char_length(p_youtube) > 360 or p_youtube !~ '^https://(www\.)?(youtube\.com|youtu\.be)/[^[:space:]]+$'
  ) then raise exception 'invalid_youtube'; end if;
  insert into public.trainer_onboarding_drafts(user_id,whatsapp,instagram,tiktok,youtube,social_completed_at)
  values(current_user_id,p_whatsapp,p_instagram,p_tiktok,p_youtube,now())
  on conflict(user_id) do update set whatsapp=excluded.whatsapp,instagram=excluded.instagram,tiktok=excluded.tiktok,
    youtube=excluded.youtube,social_completed_at=now();
end; $$;

revoke all on function public.save_my_onboarding_identity(text,text,text) from public,anon;
revoke all on function public.save_my_onboarding_social(text,text,text,text) from public,anon;
grant execute on function public.save_my_onboarding_identity(text,text,text) to authenticated;
grant execute on function public.save_my_onboarding_social(text,text,text,text) to authenticated;
