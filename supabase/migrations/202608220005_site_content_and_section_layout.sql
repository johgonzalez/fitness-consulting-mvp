-- Additive content-assistant, Instagram identity and template section-layout foundation.
-- Existing RLS policies continue to scope profile/testimonial rows by trainer ownership.

alter table public.trainer_profiles
  add column if not exists cep text,
  add column if not exists instagram_handle text,
  add column if not exists instagram_url text,
  add column if not exists methodology_description text,
  add column if not exists testimonials_intro text,
  add column if not exists site_layouts jsonb not null default '{}'::jsonb;

alter table public.trainer_profiles
  drop constraint if exists trainer_profiles_cep_check,
  add constraint trainer_profiles_cep_check check (cep is null or cep ~ '^[0-9]{8}$'),
  drop constraint if exists trainer_profiles_instagram_handle_check,
  add constraint trainer_profiles_instagram_handle_check check (instagram_handle is null or instagram_handle ~ '^[A-Za-z0-9._]{1,30}$'),
  drop constraint if exists trainer_profiles_instagram_url_check,
  add constraint trainer_profiles_instagram_url_check check (instagram_url is null or char_length(instagram_url) <= 300),
  drop constraint if exists trainer_profiles_methodology_description_check,
  add constraint trainer_profiles_methodology_description_check check (methodology_description is null or char_length(methodology_description) <= 1000),
  drop constraint if exists trainer_profiles_testimonials_intro_check,
  add constraint trainer_profiles_testimonials_intro_check check (testimonials_intro is null or char_length(testimonials_intro) <= 500),
  drop constraint if exists trainer_profiles_site_layouts_check,
  add constraint trainer_profiles_site_layouts_check check (jsonb_typeof(site_layouts) = 'object');

with candidates as (
  select id,
    nullif(regexp_replace(regexp_replace(coalesce(instagram, ''), '^https?://(www\.)?instagram\.com/', '', 'i'), '^@|/$', '', 'g'), '') as handle
  from public.trainer_profiles
  where instagram_handle is null and instagram is not null
)
update public.trainer_profiles profile
set instagram_handle = candidates.handle
from candidates
where profile.id = candidates.id
  and candidates.handle ~ '^[A-Za-z0-9._]{1,30}$';

update public.trainer_profiles
set instagram_url = 'https://www.instagram.com/' || instagram_handle || '/'
where instagram_url is null and instagram_handle is not null;

alter table public.testimonials
  add column if not exists instagram_handle text,
  add column if not exists instagram_url text;

alter table public.testimonials
  drop constraint if exists testimonials_instagram_handle_check,
  add constraint testimonials_instagram_handle_check check (instagram_handle is null or instagram_handle ~ '^[A-Za-z0-9._]{1,30}$'),
  drop constraint if exists testimonials_instagram_url_check,
  add constraint testimonials_instagram_url_check check (instagram_url is null or char_length(instagram_url) <= 300);

grant select (
  instagram_handle, instagram_url, methodology_description, testimonials_intro, site_layouts
) on public.trainer_profiles to anon, authenticated;

grant update (
  cep, cref, instagram, instagram_handle, instagram_url,
  methodology_description, testimonials_intro, site_layouts
) on public.trainer_profiles to authenticated;

grant select, insert, update, delete on public.testimonials to authenticated;
grant select on public.testimonials to anon;

-- CEP is owner-private. Owners read it through get_my_trainer_profile(), whose
-- auth.uid() filter is evaluated by the existing authenticated-only RPC.
do $migration_005_security$
begin
  if has_column_privilege('anon', 'public.trainer_profiles', 'cep', 'SELECT') then
    raise exception 'migration 005 security gate: anon can select trainer_profiles.cep';
  end if;
  if has_column_privilege('authenticated', 'public.trainer_profiles', 'cep', 'SELECT') then
    raise exception 'migration 005 security gate: authenticated can directly select trainer_profiles.cep';
  end if;
  if not has_column_privilege('authenticated', 'public.trainer_profiles', 'cep', 'UPDATE') then
    raise exception 'migration 005 security gate: authenticated cannot update trainer_profiles.cep';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.trainer_profiles'::regclass) then
    raise exception 'migration 005 security gate: trainer_profiles RLS is disabled';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.testimonials'::regclass) then
    raise exception 'migration 005 security gate: testimonials RLS is disabled';
  end if;
  if has_table_privilege('anon', 'public.trainer_profiles', 'UPDATE') then
    raise exception 'migration 005 security gate: anon can update trainer_profiles';
  end if;
  if has_function_privilege('anon', 'public.get_my_trainer_profile()', 'EXECUTE') then
    raise exception 'migration 005 security gate: anon can execute get_my_trainer_profile';
  end if;
  if not has_function_privilege('authenticated', 'public.get_my_trainer_profile()', 'EXECUTE') then
    raise exception 'migration 005 security gate: authenticated cannot execute get_my_trainer_profile';
  end if;
end;
$migration_005_security$;
