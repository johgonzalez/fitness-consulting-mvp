-- Sprint 3: a Trainer-owned YouTube reference may be visible with a published
-- prescription only after passing this narrow database-side URL contract.
create or replace function public.add_custom_exercise_media(
  p_exercise_id uuid,
  p_media_type text,
  p_url_or_storage_path text,
  p_thumbnail_url_or_path text default null,
  p_provider text default null,
  p_source_url text default null,
  p_license_type text default null,
  p_creator_credit text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  trainer_profile_id uuid := (select private.current_trainer_profile_id());
  next_sort_order integer;
  created_id uuid;
  normalized_media_type text := upper(trim(p_media_type));
  normalized_provider text := upper(trim(coalesce(p_provider, '')));
  normalized_location text := trim(p_url_or_storage_path);
  normalized_source text := trim(coalesce(p_source_url, ''));
  is_safe_youtube boolean;
begin
  if trainer_profile_id is null or not exists (
    select 1 from public.exercises exercise
    where exercise.id = p_exercise_id
      and exercise.source_type = 'TRAINER_CUSTOM'
      and exercise.owner_trainer_id = trainer_profile_id
      and exercise.status = 'ACTIVE'
  ) then raise exception 'custom_exercise_not_available'; end if;

  is_safe_youtube := normalized_media_type = 'VIDEO'
    and normalized_provider = 'YOUTUBE'
    and normalized_location = normalized_source
    and normalized_location ~ '^https://www[.]youtube[.]com/watch[?]v=[A-Za-z0-9_-]{6,20}$';

  if normalized_provider = 'YOUTUBE' and not is_safe_youtube then
    raise exception 'invalid_youtube_url';
  end if;

  select coalesce(max(media.sort_order) + 1, 0) into next_sort_order
  from public.exercise_media media where media.exercise_id = p_exercise_id;

  insert into public.exercise_media(
    exercise_id, media_type, url_or_storage_path, thumbnail_url_or_path,
    provider, source_url, license_type, creator_credit, production_status, sort_order
  ) values (
    p_exercise_id, normalized_media_type, normalized_location, nullif(trim(p_thumbnail_url_or_path), ''),
    nullif(normalized_provider, ''), nullif(normalized_source, ''), nullif(trim(p_license_type), ''),
    nullif(trim(p_creator_credit), ''), case when is_safe_youtube then 'APPROVED' else 'DEVELOPMENT' end,
    next_sort_order
  ) returning id into created_id;
  return created_id;
end;
$$;

revoke all on function public.add_custom_exercise_media(uuid,text,text,text,text,text,text,text)
  from public, anon, authenticated;
grant execute on function public.add_custom_exercise_media(uuid,text,text,text,text,text,text,text)
  to authenticated;
alter function public.add_custom_exercise_media(uuid,text,text,text,text,text,text,text)
  owner to postgres;

comment on function public.add_custom_exercise_media(uuid,text,text,text,text,text,text,text) is
  'Adds media to a current Trainer-owned custom exercise. Canonical HTTPS YouTube references are approved for prescribed Student visibility; other media remains in development.';
