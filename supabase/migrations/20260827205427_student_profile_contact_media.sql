-- Sprint 2: optional student profile contact and private profile-media metadata.

alter table public.student_profiles
  add column if not exists profile_image_path text,
  add column if not exists whatsapp_e164 text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'student_profiles_profile_image_path_check'
      and conrelid = 'public.student_profiles'::regclass
  ) then
    alter table public.student_profiles add constraint student_profiles_profile_image_path_check check (
      profile_image_path is null
      or (
        char_length(profile_image_path) between 20 and 500
        and profile_image_path ~ '^[0-9a-f-]{36}/profile/[0-9a-f-]{36}\.(jpg|png|webp)$'
      )
    );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'student_profiles_whatsapp_e164_check'
      and conrelid = 'public.student_profiles'::regclass
  ) then
    alter table public.student_profiles add constraint student_profiles_whatsapp_e164_check check (
      whatsapp_e164 is null or whatsapp_e164 ~ '^\+[1-9][0-9]{7,14}$'
    );
  end if;
end $$;

create or replace function public.update_my_student_profile(
  p_preferred_name text,
  p_whatsapp text,
  p_profile_image_path text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  normalized_name text := nullif(trim(p_preferred_name), '');
  raw_whatsapp text := nullif(trim(p_whatsapp), '');
  normalized_whatsapp text;
  normalized_image_path text := nullif(trim(p_profile_image_path), '');
  updated_profile public.student_profiles;
begin
  if current_user_id is null then raise exception 'authentication_required'; end if;
  if not exists (
    select 1 from public.user_roles role
    where role.user_id = current_user_id
      and role.role_code = 'student'
      and role.revoked_at is null
  ) then
    raise exception 'student_role_required';
  end if;

  if normalized_name is not null and char_length(normalized_name) > 120 then
    raise exception 'invalid_preferred_name';
  end if;

  if raw_whatsapp is not null then
    if left(raw_whatsapp, 1) <> '+' then raise exception 'invalid_whatsapp'; end if;
    normalized_whatsapp := '+' || regexp_replace(raw_whatsapp, '[^0-9]', '', 'g');
    if normalized_whatsapp !~ '^\+[1-9][0-9]{7,14}$' then raise exception 'invalid_whatsapp'; end if;
  end if;

  if normalized_image_path is not null and normalized_image_path !~ (
    '^' || current_user_id::text || '/profile/[0-9a-f-]{36}\.(jpg|png|webp)$'
  ) then
    raise exception 'invalid_profile_image_path';
  end if;

  update public.student_profiles profile
  set preferred_name = normalized_name,
      whatsapp_e164 = normalized_whatsapp,
      profile_image_path = normalized_image_path,
      updated_at = now()
  where profile.user_id = current_user_id
  returning profile.* into updated_profile;

  if updated_profile.id is null then raise exception 'student_profile_required'; end if;

  update public.app_users app_user
  set display_name = coalesce(normalized_name, app_user.display_name),
      updated_at = now()
  where app_user.id = current_user_id;

  return jsonb_build_object(
    'id', updated_profile.id,
    'preferred_name', updated_profile.preferred_name,
    'whatsapp_e164', updated_profile.whatsapp_e164,
    'profile_image_path', updated_profile.profile_image_path
  );
end;
$$;

revoke all on function public.update_my_student_profile(text,text,text) from public, anon, authenticated;
grant execute on function public.update_my_student_profile(text,text,text) to authenticated;

create or replace function private.can_manage_student_profile_image(p_storage_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and p_storage_path ~ ('^' || (select auth.uid())::text || '/profile/[0-9a-f-]{36}\.(jpg|png|webp)$')
    and exists (
      select 1 from public.student_profiles profile
      join public.user_roles role on role.user_id = profile.user_id
        and role.role_code = 'student' and role.revoked_at is null
      where profile.user_id = (select auth.uid())
    );
$$;

create policy "students upload own profile image"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'student-private-media'
  and owner_id = (select auth.uid())::text
  and (select private.can_manage_student_profile_image(name))
);

create policy "students update own profile image"
on storage.objects for update to authenticated
using (
  bucket_id = 'student-private-media'
  and owner_id = (select auth.uid())::text
  and (select private.can_manage_student_profile_image(name))
)
with check (
  bucket_id = 'student-private-media'
  and owner_id = (select auth.uid())::text
  and (select private.can_manage_student_profile_image(name))
);
