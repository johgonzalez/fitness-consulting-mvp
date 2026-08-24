-- Template Foundation V1A: central content fields, structured methodology,
-- safe template_03 entitlements and public projections. Additive only.

alter table public.services
  add column if not exists benefits text[] not null default '{}'::text[],
  add column if not exists conversion_mode text;

create or replace function private.service_benefits_are_valid(p_benefits text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select cardinality(p_benefits) <= 12
    and not exists (
      select 1
      from unnest(p_benefits) as benefit(value)
      where value is null
        or char_length(btrim(value)) not between 1 and 160
    );
$$;

revoke all on function private.service_benefits_are_valid(text[]) from public, anon;
grant execute on function private.service_benefits_are_valid(text[]) to authenticated;

do $constraints$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'services_benefits_check'
      and conrelid = 'public.services'::regclass
  ) then
    alter table public.services
      add constraint services_benefits_check check (
        private.service_benefits_are_valid(benefits)
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'services_conversion_mode_check'
      and conrelid = 'public.services'::regclass
  ) then
    alter table public.services
      add constraint services_conversion_mode_check check (
        conversion_mode is null or conversion_mode in ('WHATSAPP', 'INTEREST')
      );
  end if;
end;
$constraints$;

alter table public.trainer_profiles
  add column if not exists profile_status_enabled boolean not null default false,
  add column if not exists profile_status_text text,
  add column if not exists profile_status_semantic_tone text;

do $constraints$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'trainer_profiles_status_text_check'
      and conrelid = 'public.trainer_profiles'::regclass
  ) then
    alter table public.trainer_profiles
      add constraint trainer_profiles_status_text_check check (
        profile_status_text is null
        or char_length(btrim(profile_status_text)) between 1 and 40
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'trainer_profiles_status_tone_check'
      and conrelid = 'public.trainer_profiles'::regclass
  ) then
    alter table public.trainer_profiles
      add constraint trainer_profiles_status_tone_check check (
        profile_status_semantic_tone is null
        or profile_status_semantic_tone in (
          'availability', 'online', 'announcement', 'attention', 'neutral'
        )
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'trainer_profiles_enabled_status_check'
      and conrelid = 'public.trainer_profiles'::regclass
  ) then
    alter table public.trainer_profiles
      add constraint trainer_profiles_enabled_status_check check (
        not profile_status_enabled
        or (
          profile_status_text is not null
          and profile_status_semantic_tone is not null
        )
      );
  end if;
end;
$constraints$;

create table if not exists public.trainer_methodology_items (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.trainer_profiles(id) on delete cascade,
  position integer not null default 0 check (position between 0 and 999),
  title text not null check (char_length(btrim(title)) between 2 and 120),
  description text not null check (char_length(btrim(description)) between 2 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists trainer_methodology_items_trainer_position_idx
  on public.trainer_methodology_items(trainer_id, position, created_at, id);

alter table public.trainer_methodology_items enable row level security;

create policy "owners read own methodology items"
on public.trainer_methodology_items for select to authenticated
using ((select private.owns_trainer(trainer_id)));

create policy "owners insert own methodology items"
on public.trainer_methodology_items for insert to authenticated
with check ((select private.owns_trainer(trainer_id)));

create policy "owners update own methodology items"
on public.trainer_methodology_items for update to authenticated
using ((select private.owns_trainer(trainer_id)))
with check ((select private.owns_trainer(trainer_id)));

create policy "owners delete own methodology items"
on public.trainer_methodology_items for delete to authenticated
using ((select private.owns_trainer(trainer_id)));

revoke all on public.trainer_methodology_items from public, anon;
grant select, insert, update, delete on public.trainer_methodology_items to authenticated;

grant select (
  profile_status_enabled, profile_status_text, profile_status_semantic_tone
) on public.trainer_profiles to anon, authenticated;

grant update (
  profile_status_enabled, profile_status_text, profile_status_semantic_tone
) on public.trainer_profiles to authenticated;

create or replace function public.get_public_site_services(p_trainer_id uuid)
returns table (
  id uuid,
  trainer_id uuid,
  title text,
  description text,
  service_mode public.service_mode,
  price numeric,
  currency text,
  billing_type text,
  price_visibility text,
  price_visible boolean,
  active boolean,
  benefits text[],
  conversion_mode text
)
language sql
stable
security definer
set search_path = ''
as $$
  select service.id, service.trainer_id, service.title, service.description,
    service.service_mode,
    case when service.price_visibility = 'public' then service.price else null end,
    service.currency, service.billing_type, service.price_visibility,
    service.price_visibility = 'public', service.active,
    service.benefits, service.conversion_mode
  from public.services service
  join public.trainer_profiles profile on profile.id = service.trainer_id
  where service.trainer_id = p_trainer_id
    and service.active
    and profile.published;
$$;

create or replace function public.get_public_methodology_items(p_trainer_id uuid)
returns table (
  id uuid,
  title text,
  description text,
  "position" integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select item.id, item.title, item.description, item.position
  from public.trainer_methodology_items item
  join public.trainer_profiles profile on profile.id = item.trainer_id
  where item.trainer_id = p_trainer_id
    and profile.published
  order by item.position, item.created_at, item.id;
$$;

revoke all on function public.get_public_site_services(uuid) from public;
grant execute on function public.get_public_site_services(uuid) to anon, authenticated;
revoke all on function public.get_public_methodology_items(uuid) from public;
grant execute on function public.get_public_methodology_items(uuid) to anon, authenticated;

alter table public.trainer_entitlements
  add column if not exists can_use_template_03 boolean not null default false;

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

  if p_template = 'template_01' and not coalesce(entitlement.can_use_template_01, false) then
    raise exception 'template_entitlement_required';
  end if;
  if p_template = 'template_02' and not coalesce(entitlement.can_use_template_02, false) then
    raise exception 'template_entitlement_required';
  end if;
  if p_template = 'template_03' and not coalesce(entitlement.can_use_template_03, false) then
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
    if profile.template_id = 'template_01' and not coalesce(entitlement.can_use_template_01, false) then
      raise exception 'template_entitlement_required';
    end if;
    if profile.template_id = 'template_02' and not coalesce(entitlement.can_use_template_02, false) then
      raise exception 'template_entitlement_required';
    end if;
    if profile.template_id = 'template_03' and not coalesce(entitlement.can_use_template_03, false) then
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
begin
  if not exists (
    select 1 from pg_enum enum_value
    join pg_type enum_type on enum_type.oid = enum_value.enumtypid
    join pg_namespace namespace on namespace.oid = enum_type.typnamespace
    where namespace.nspname = 'public'
      and enum_type.typname = 'template_id'
      and enum_value.enumlabel = 'template_03'
  ) then
    raise exception 'Template Foundation V1A: template_03 enum value is missing';
  end if;

  if not (select relrowsecurity from pg_class where oid = 'public.trainer_methodology_items'::regclass) then
    raise exception 'Template Foundation V1A: methodology RLS is disabled';
  end if;

  if has_table_privilege('anon', 'public.trainer_methodology_items', 'SELECT') then
    raise exception 'Template Foundation V1A: anon can directly select methodology items';
  end if;

  if not has_function_privilege('anon', 'public.get_public_methodology_items(uuid)', 'EXECUTE') then
    raise exception 'Template Foundation V1A: public methodology projection is unavailable';
  end if;

  if not has_function_privilege('anon', 'public.get_public_site_services(uuid)', 'EXECUTE') then
    raise exception 'Template Foundation V1A: public service projection is unavailable';
  end if;
end;
$security_gate$;
