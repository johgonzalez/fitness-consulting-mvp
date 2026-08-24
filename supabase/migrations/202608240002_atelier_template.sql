-- Promote the approved Atelier renderer to the production template catalog.
-- The new enum label is compared as text in this transaction so PostgreSQL
-- never needs to use the freshly-added enum value before commit.

alter type public.template_id add value if not exists 'template_04';

alter table public.trainer_entitlements
  add column if not exists can_use_template_04 boolean not null default true;

comment on column public.trainer_entitlements.can_use_template_04 is
  'Allows the trainer to select and publish the approved Atelier template.';

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

  if p_template::text = 'template_01' and not coalesce(entitlement.can_use_template_01, false) then
    raise exception 'template_entitlement_required';
  end if;
  if p_template::text = 'template_02' and not coalesce(entitlement.can_use_template_02, false) then
    raise exception 'template_entitlement_required';
  end if;
  if p_template::text = 'template_03' and not coalesce(entitlement.can_use_template_03, false) then
    raise exception 'template_entitlement_required';
  end if;
  if p_template::text = 'template_04' and not coalesce(entitlement.can_use_template_04, false) then
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
    if not coalesce(entitlement.can_publish_site, false) then
      raise exception 'publication_entitlement_required';
    end if;
    if profile.template_id::text = 'template_01' and not coalesce(entitlement.can_use_template_01, false) then
      raise exception 'template_entitlement_required';
    end if;
    if profile.template_id::text = 'template_02' and not coalesce(entitlement.can_use_template_02, false) then
      raise exception 'template_entitlement_required';
    end if;
    if profile.template_id::text = 'template_03' and not coalesce(entitlement.can_use_template_03, false) then
      raise exception 'template_entitlement_required';
    end if;
    if profile.template_id::text = 'template_04' and not coalesce(entitlement.can_use_template_04, false) then
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

do $security_gate$
declare
  procedure record;
begin
  if not exists (
    select 1
    from pg_enum enum_value
    join pg_type enum_type on enum_type.oid = enum_value.enumtypid
    join pg_namespace namespace on namespace.oid = enum_type.typnamespace
    where namespace.nspname = 'public'
      and enum_type.typname = 'template_id'
      and enum_value.enumlabel = 'template_04'
  ) then
    raise exception 'Atelier template enum value is missing';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'trainer_entitlements'
      and column_name = 'can_use_template_04'
      and is_nullable = 'NO'
  ) then
    raise exception 'Atelier entitlement column is missing or nullable';
  end if;

  for procedure in
    select p.prosecdef, p.proconfig
    from pg_proc p
    where p.oid in (
      'public.set_my_site_template(public.template_id)'::regprocedure,
      'public.set_my_site_publication(boolean)'::regprocedure
    )
  loop
    if not procedure.prosecdef then
      raise exception 'Atelier template function is not SECURITY DEFINER';
    end if;
    if procedure.proconfig is null
      or array_to_string(procedure.proconfig, ',') !~ '^search_path=(""|)$' then
      raise exception 'Atelier template function search_path is not empty';
    end if;
  end loop;

  if has_function_privilege('anon', 'public.set_my_site_template(public.template_id)', 'EXECUTE')
    or has_function_privilege('anon', 'public.set_my_site_publication(boolean)', 'EXECUTE') then
    raise exception 'Anonymous role can execute an Atelier owner mutation';
  end if;
end;
$security_gate$;
