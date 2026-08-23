-- Sprint 3: additive Site Builder, entitlement, pricing and Storage foundation.

alter table public.services
  add column if not exists service_mode public.service_mode not null default 'both',
  add column if not exists currency text not null default 'BRL',
  add column if not exists billing_type text,
  add column if not exists price_visibility text not null default 'hidden';

alter table public.services
  drop constraint if exists services_currency_check,
  add constraint services_currency_check check (currency = 'BRL'),
  drop constraint if exists services_billing_type_check,
  add constraint services_billing_type_check check (
    billing_type is null or billing_type in ('monthly', 'per_session', 'package', 'starting_at')
  ),
  drop constraint if exists services_price_visibility_check,
  add constraint services_price_visibility_check check (
    price_visibility in ('public', 'match_only', 'hidden')
  );

update public.services
set price_visibility = case
  when price_visible then 'public'
  when price is not null then 'match_only'
  else 'hidden'
end;

create table public.trainer_entitlements (
  trainer_id uuid primary key references public.trainer_profiles(id) on delete cascade,
  can_use_free_template boolean not null default true,
  can_use_premium_templates boolean not null default false,
  can_publish_site boolean not null default true,
  can_receive_leads boolean not null default false,
  can_use_matching boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.trainer_entitlements (trainer_id)
select id from public.trainer_profiles
on conflict (trainer_id) do nothing;

create or replace function private.create_default_entitlements()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.trainer_entitlements (trainer_id) values (new.id)
  on conflict (trainer_id) do nothing;
  return new;
end;
$$;

create trigger create_default_trainer_entitlements
after insert on public.trainer_profiles
for each row execute function private.create_default_entitlements();

create table public.custom_site_requests (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.trainer_profiles(id) on delete cascade,
  brief jsonb not null default '{}'::jsonb check (jsonb_typeof(brief) = 'object'),
  references_urls text[] not null default '{}',
  contact_whatsapp text not null check (contact_whatsapp ~ '^[0-9]{10,15}$'),
  status text not null default 'requested' check (
    status in ('requested', 'contacted', 'accepted', 'in_progress', 'delivered', 'cancelled')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index custom_site_requests_trainer_id_idx on public.custom_site_requests(trainer_id);

alter table public.trainer_entitlements enable row level security;
alter table public.custom_site_requests enable row level security;

create policy "owners read own entitlements"
on public.trainer_entitlements for select to authenticated
using ((select private.owns_trainer(trainer_id)));

create policy "owners read own custom requests"
on public.custom_site_requests for select to authenticated
using ((select private.owns_trainer(trainer_id)));

create policy "owners create own custom requests"
on public.custom_site_requests for insert to authenticated
with check ((select private.owns_trainer(trainer_id)));

revoke all on public.trainer_entitlements, public.custom_site_requests from anon;
revoke insert, update, delete, truncate, references, trigger on public.trainer_entitlements from authenticated;
grant select on public.trainer_entitlements to authenticated;
grant select, insert on public.custom_site_requests to authenticated;

-- Public readers receive only display-safe prices. Owners use get_my_services().
drop policy if exists "public reads active services" on public.services;
revoke select on public.services from anon, authenticated;

create or replace function public.get_public_services(p_trainer_id uuid)
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
  active boolean
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
    service.price_visibility = 'public', service.active
  from public.services service
  join public.trainer_profiles profile on profile.id = service.trainer_id
  where service.trainer_id = p_trainer_id
    and service.active
    and profile.published;
$$;

create or replace function public.get_my_services()
returns setof public.services
language sql
stable
security definer
set search_path = ''
as $$
  select service.*
  from public.services service
  where (select private.owns_trainer(service.trainer_id));
$$;

revoke all on function public.get_public_services(uuid) from public;
grant execute on function public.get_public_services(uuid) to anon, authenticated;
revoke all on function public.get_my_services() from public, anon;
grant execute on function public.get_my_services() to authenticated;

create or replace function public.set_my_site_template(p_template public.template_id)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_trainer_id uuid;
  premium_allowed boolean;
begin
  select profile.id into current_trainer_id
  from public.trainer_profiles profile
  where profile.user_id = (select auth.uid());
  if current_trainer_id is null then raise exception 'trainer_not_found'; end if;

  select entitlement.can_use_premium_templates into premium_allowed
  from public.trainer_entitlements entitlement
  where entitlement.trainer_id = current_trainer_id;

  if p_template = 'template_02' and not coalesce(premium_allowed, false) then
    raise exception 'premium_entitlement_required';
  end if;

  update public.trainer_profiles set template_id = p_template where id = current_trainer_id;
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
  select * into profile from public.trainer_profiles
  where user_id = (select auth.uid());
  if profile.id is null then raise exception 'trainer_not_found'; end if;

  select * into entitlement from public.trainer_entitlements
  where trainer_id = profile.id;

  if p_published then
    if not coalesce(entitlement.can_publish_site, false) then raise exception 'publication_entitlement_required'; end if;
    if profile.template_id = 'template_02' and not coalesce(entitlement.can_use_premium_templates, false) then
      raise exception 'premium_entitlement_required';
    end if;
    if nullif(trim(profile.display_name), '') is null
      or nullif(trim(profile.headline), '') is null
      or nullif(trim(profile.whatsapp), '') is null then
      raise exception 'publication_requirements_missing';
    end if;
  end if;

  update public.trainer_profiles set published = p_published where id = profile.id;
end;
$$;

revoke all on function public.set_my_site_template(public.template_id) from public, anon;
grant execute on function public.set_my_site_template(public.template_id) to authenticated;
revoke all on function public.set_my_site_publication(boolean) from public, anon;
grant execute on function public.set_my_site_publication(boolean) to authenticated;

-- Public media is intentionally readable for published sites; writes are tenant-owned.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'trainer-public-media', 'trainer-public-media', true, 5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "trainers upload own public media"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'trainer-public-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "trainers update own public media"
on storage.objects for update to authenticated
using (
  bucket_id = 'trainer-public-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'trainer-public-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "trainers delete own public media"
on storage.objects for delete to authenticated
using (
  bucket_id = 'trainer-public-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

revoke insert, update, delete on storage.objects from anon;
