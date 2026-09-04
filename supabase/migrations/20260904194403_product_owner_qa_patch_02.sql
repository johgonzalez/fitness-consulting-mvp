-- Product Owner QA Patch 02:
-- preserve Templates 01-04, add approved Templates 05-06, and allow the
-- canonical private Student avatar to be read only by its legitimate contexts.

alter type public.template_id add value if not exists 'template_05';
alter type public.template_id add value if not exists 'template_06';

alter table public.trainer_entitlements
  add column if not exists can_use_template_05 boolean not null default true,
  add column if not exists can_use_template_06 boolean not null default true;

comment on column public.trainer_entitlements.can_use_template_05 is
  'Allows the trainer to select and publish approved Template 05.';
comment on column public.trainer_entitlements.can_use_template_06 is
  'Allows the trainer to select and publish approved Template 06.';

update public.trainer_entitlements
set can_use_template_05 = true,
    can_use_template_06 = true;

create or replace function public.set_my_site_template(p_template public.template_id)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_trainer_id uuid;
  entitlement public.trainer_entitlements;
begin
  select profile.id into current_trainer_id
  from public.trainer_profiles profile
  where profile.user_id = (select auth.uid());

  if current_trainer_id is null then raise exception 'trainer_not_found'; end if;

  select * into entitlement
  from public.trainer_entitlements
  where trainer_id = current_trainer_id;

  if p_template::text = 'template_01' and not coalesce(entitlement.can_use_template_01, false)
    or p_template::text = 'template_02' and not coalesce(entitlement.can_use_template_02, false)
    or p_template::text = 'template_03' and not coalesce(entitlement.can_use_template_03, false)
    or p_template::text = 'template_04' and not coalesce(entitlement.can_use_template_04, false)
    or p_template::text = 'template_05' and not coalesce(entitlement.can_use_template_05, false)
    or p_template::text = 'template_06' and not coalesce(entitlement.can_use_template_06, false) then
    raise exception 'template_entitlement_required';
  end if;

  update public.trainer_profiles
  set template_id = p_template
  where id = current_trainer_id;
end;
$$;

create or replace function public.set_my_site_publication(p_published boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile public.trainer_profiles;
  entitlement public.trainer_entitlements;
begin
  select * into profile
  from public.trainer_profiles
  where user_id = (select auth.uid());

  if profile.id is null then raise exception 'trainer_not_found'; end if;

  select * into entitlement
  from public.trainer_entitlements
  where trainer_id = profile.id;

  if p_published then
    if not (select private.trainer_has_publication_access(profile.id)) then
      raise exception 'publication_entitlement_required';
    end if;
    if profile.template_id::text = 'template_01' and not coalesce(entitlement.can_use_template_01, false)
      or profile.template_id::text = 'template_02' and not coalesce(entitlement.can_use_template_02, false)
      or profile.template_id::text = 'template_03' and not coalesce(entitlement.can_use_template_03, false)
      or profile.template_id::text = 'template_04' and not coalesce(entitlement.can_use_template_04, false)
      or profile.template_id::text = 'template_05' and not coalesce(entitlement.can_use_template_05, false)
      or profile.template_id::text = 'template_06' and not coalesce(entitlement.can_use_template_06, false) then
      raise exception 'template_entitlement_required';
    end if;
    if nullif(trim(profile.display_name), '') is null
      or nullif(trim(profile.headline), '') is null
      or nullif(trim(profile.whatsapp), '') is null then
      raise exception 'publication_requirements_missing';
    end if;
  end if;

  update public.trainer_profiles
  set published = p_published
  where id = profile.id;
end;
$$;

revoke all on function public.set_my_site_template(public.template_id) from public, anon;
grant execute on function public.set_my_site_template(public.template_id) to authenticated;
revoke all on function public.set_my_site_publication(boolean) from public, anon;
grant execute on function public.set_my_site_publication(boolean) to authenticated;

create or replace function private.enforce_access_grant_on_entitlements()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_user_id uuid;
begin
  select profile.user_id into owner_user_id
  from public.trainer_profiles profile
  where profile.id = new.trainer_id;

  if owner_user_id is not null
    and private.trainer_has_active_access_grant(owner_user_id, 'FOUNDER_ACCESS', now()) then
    new.can_use_premium_templates := true;
    new.can_use_template_01 := true;
    new.can_use_template_02 := true;
    new.can_use_template_03 := true;
    new.can_use_template_04 := true;
    new.can_use_template_05 := true;
    new.can_use_template_06 := true;
    new.can_publish_site := true;
    new.can_receive_leads := true;
    new.can_use_matching := true;
    new.can_manage_students := true;
    new.can_use_assessments := true;
    new.can_use_workouts := true;
    new.can_manage_progress := true;
    new.can_use_community_feed := true;
  end if;
  return new;
end;
$$;

create or replace function private.refresh_trainer_entitlements(p_trainer_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_trainer_id uuid;
  full_access boolean;
begin
  select profile.id into target_trainer_id
  from public.trainer_profiles profile
  where profile.user_id = p_trainer_user_id;
  if target_trainer_id is null then return; end if;

  full_access := private.trainer_has_full_access(p_trainer_user_id, now());
  insert into public.trainer_entitlements(trainer_id) values (target_trainer_id)
  on conflict (trainer_id) do nothing;

  update public.trainer_entitlements set
    can_build_site = true,
    can_preview_site = true,
    can_use_free_template = true,
    can_use_premium_templates = true,
    can_use_template_01 = true,
    can_use_template_02 = true,
    can_use_template_03 = true,
    can_use_template_04 = true,
    can_use_template_05 = true,
    can_use_template_06 = true,
    can_publish_site = full_access,
    can_receive_leads = full_access,
    can_use_matching = full_access,
    can_manage_students = full_access,
    can_use_assessments = full_access,
    can_use_workouts = full_access,
    can_manage_progress = full_access,
    can_use_community_feed = full_access,
    updated_at = now()
  where trainer_id = target_trainer_id;
end;
$$;

revoke all on function private.enforce_access_grant_on_entitlements() from public, anon, authenticated;
revoke all on function private.refresh_trainer_entitlements(uuid) from public, anon, authenticated;

create or replace function private.can_read_student_private_storage_object(p_storage_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.student_private_media media
    where media.storage_path = p_storage_path
      and media.deleted_at is null
      and (select private.can_access_student_private_media(
        media.student_profile_id,
        media.trainer_student_relationship_id
      ))
  )
  or exists (
    select 1
    from public.student_profiles student
    where student.profile_image_path = p_storage_path
      and p_storage_path ~ '^[0-9a-f-]{36}/profile/[0-9a-f-]{36}\.(jpg|png|webp)$'
      and (
        student.user_id = (select auth.uid())
        or exists (
          select 1
          from public.trainer_student_relationships relationship
          where relationship.student_profile_id = student.id
            and relationship.status = 'active'
            and (select private.owns_trainer(relationship.trainer_profile_id))
        )
        or exists (
          select 1
          from public.community_group_memberships viewer
          join public.community_group_memberships subject
            on subject.group_id = viewer.group_id
          join public.trainer_communities community
            on community.id = viewer.group_id
          where viewer.app_user_id = (select auth.uid())
            and viewer.status = 'ACTIVE'
            and subject.app_user_id = student.user_id
            and subject.status = 'ACTIVE'
            and community.status = 'ACTIVE'
            and community.archived_at is null
        )
      )
  );
$$;

revoke all on function private.can_read_student_private_storage_object(text) from public, anon, authenticated;
grant execute on function private.can_read_student_private_storage_object(text) to authenticated;

do $product_owner_qa_patch_02_gate$
begin
  if not exists (
    select 1 from pg_enum enum_value
    join pg_type enum_type on enum_type.oid = enum_value.enumtypid
    join pg_namespace namespace on namespace.oid = enum_type.typnamespace
    where namespace.nspname = 'public'
      and enum_type.typname = 'template_id'
      and enum_value.enumlabel = 'template_05'
  ) or not exists (
    select 1 from pg_enum enum_value
    join pg_type enum_type on enum_type.oid = enum_value.enumtypid
    join pg_namespace namespace on namespace.oid = enum_type.typnamespace
    where namespace.nspname = 'public'
      and enum_type.typname = 'template_id'
      and enum_value.enumlabel = 'template_06'
  ) then
    raise exception 'template_catalog_enum_incomplete';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'trainer_entitlements'
      and column_name = 'can_use_template_05'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'trainer_entitlements'
      and column_name = 'can_use_template_06'
  ) then
    raise exception 'template_catalog_entitlements_incomplete';
  end if;

  if has_function_privilege('anon', 'private.can_read_student_private_storage_object(text)', 'EXECUTE')
    or not has_function_privilege('authenticated', 'private.can_read_student_private_storage_object(text)', 'EXECUTE') then
    raise exception 'student_avatar_storage_privileges_invalid';
  end if;
end;
$product_owner_qa_patch_02_gate$;
