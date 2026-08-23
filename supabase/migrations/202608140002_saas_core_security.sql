-- Additive Sprint 2 migration. The foundation migration remains immutable.
alter table public.trainer_profiles
  add column if not exists professional_name text
  check (professional_name is null or char_length(professional_name) between 2 and 100);

create index if not exists trainer_profiles_user_id_idx on public.trainer_profiles(user_id);

create or replace function public.owns_trainer(p_trainer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.trainer_profiles profile
    where profile.id = p_trainer_id
      and profile.user_id = (select auth.uid())
  );
$$;

revoke all on function public.owns_trainer(uuid) from public, anon;
grant execute on function public.owns_trainer(uuid) to authenticated;

drop policy if exists "published profiles are public" on public.trainer_profiles;
drop policy if exists "owners manage profiles" on public.trainer_profiles;
drop policy if exists "public active services of published trainers" on public.services;
drop policy if exists "owners manage services" on public.services;
drop policy if exists "public testimonials of published trainers" on public.testimonials;
drop policy if exists "owners manage testimonials" on public.testimonials;

create policy "public reads published profiles"
on public.trainer_profiles for select
to anon, authenticated
using (published);

create policy "owners read own profile"
on public.trainer_profiles for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "owners insert own profile"
on public.trainer_profiles for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "owners update own profile"
on public.trainer_profiles for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "owners delete own profile"
on public.trainer_profiles for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "public reads active services"
on public.services for select
to anon, authenticated
using (
  active and exists (
    select 1 from public.trainer_profiles profile
    where profile.id = trainer_id and profile.published
  )
);

create policy "owners read own services"
on public.services for select
to authenticated
using ((select public.owns_trainer(trainer_id)));

create policy "owners insert own services"
on public.services for insert
to authenticated
with check ((select public.owns_trainer(trainer_id)));

create policy "owners update own services"
on public.services for update
to authenticated
using ((select public.owns_trainer(trainer_id)))
with check ((select public.owns_trainer(trainer_id)));

create policy "owners delete own services"
on public.services for delete
to authenticated
using ((select public.owns_trainer(trainer_id)));

create policy "public reads published testimonials"
on public.testimonials for select
to anon, authenticated
using (
  published and exists (
    select 1 from public.trainer_profiles profile
    where profile.id = trainer_id and profile.published
  )
);

create policy "owners read own testimonials"
on public.testimonials for select
to authenticated
using ((select public.owns_trainer(trainer_id)));

create policy "owners insert own testimonials"
on public.testimonials for insert
to authenticated
with check ((select public.owns_trainer(trainer_id)));

create policy "owners update own testimonials"
on public.testimonials for update
to authenticated
using ((select public.owns_trainer(trainer_id)))
with check ((select public.owns_trainer(trainer_id)));

create policy "owners delete own testimonials"
on public.testimonials for delete
to authenticated
using ((select public.owns_trainer(trainer_id)));

create or replace function public.create_trainer_profile(
  p_display_name text,
  p_professional_name text,
  p_specialty text,
  p_whatsapp text,
  p_instagram text,
  p_cref text,
  p_city text,
  p_service_mode public.service_mode,
  p_slug_base text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  normalized_base text := lower(trim(p_slug_base));
  resolved_slug text;
  created_profile public.trainer_profiles;
begin
  if current_user_id is null then raise exception 'authentication_required'; end if;
  if exists (select 1 from public.trainer_profiles where user_id = current_user_id) then
    raise exception 'profile_already_exists';
  end if;
  if normalized_base !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then raise exception 'invalid_slug'; end if;

  resolved_slug := normalized_base;
  if exists (select 1 from public.trainer_profiles where slug = resolved_slug) then
    resolved_slug := normalized_base || '-' || left(replace(current_user_id::text, '-', ''), 6);
  end if;

  insert into public.trainer_profiles (
    user_id, slug, display_name, professional_name, headline, bio, specialty,
    cref, city, service_mode, whatsapp, instagram, template_id, primary_color, published
  ) values (
    current_user_id, resolved_slug, trim(p_display_name), nullif(trim(p_professional_name), ''),
    trim(p_specialty) || ' com acompanhamento personalizado.',
    trim(p_display_name) || ' oferece acompanhamento personalizado para uma rotina de treino consistente e segura.',
    trim(p_specialty), nullif(trim(p_cref), ''), trim(p_city), p_service_mode,
    trim(p_whatsapp), nullif(trim(p_instagram), ''), 'template_01', '#c7ff36', false
  ) returning * into created_profile;

  return created_profile.slug;
end;
$$;

revoke all on function public.create_trainer_profile(text,text,text,text,text,text,text,public.service_mode,text) from public, anon;
grant execute on function public.create_trainer_profile(text,text,text,text,text,text,text,public.service_mode,text) to authenticated;

-- RLS controls rows; column grants keep the ownership UUID out of public REST queries.
revoke select on public.trainer_profiles from anon, authenticated;
grant select (
  id, slug, display_name, professional_name, headline, bio, specialty, cref, city,
  service_mode, profile_image_url, hero_image_url, logo_url, whatsapp, instagram,
  template_id, primary_color, published
) on public.trainer_profiles to anon, authenticated;

create or replace function public.get_my_trainer_profile()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select to_jsonb(profile)
  from public.trainer_profiles profile
  where profile.user_id = (select auth.uid())
  limit 1;
$$;

revoke all on function public.get_my_trainer_profile() from public, anon;
grant execute on function public.get_my_trainer_profile() to authenticated;
