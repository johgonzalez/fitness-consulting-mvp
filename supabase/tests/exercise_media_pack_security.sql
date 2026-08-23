-- PPerfil Exercise Media Pack V1 integrity, visibility and authorization gate.
-- Safe for the linked project only while the complete file remains inside this rollback transaction.
begin;

create temp table exercise_media_pack_gate_results (
  scenario text primary key,
  passed boolean not null
);
grant select, insert on exercise_media_pack_gate_results to authenticated, anon;

create or replace function pg_temp.raises(p_sql text)
returns boolean language plpgsql as $$
begin
  execute p_sql;
  return false;
exception when others then
  return true;
end;
$$;
grant execute on function pg_temp.raises(text) to authenticated, anon;

create or replace function pg_temp.changes_zero(p_sql text)
returns boolean language plpgsql as $$
declare
  affected integer;
begin
  execute p_sql;
  get diagnostics affected = row_count;
  return affected = 0;
exception when others then
  return true;
end;
$$;
grant execute on function pg_temp.changes_zero(text) to authenticated, anon;

insert into exercise_media_pack_gate_results values
  ('Pack contains exactly 96 records', (select count(*) = 96 from public.exercise_media where provider = 'REPDB_FREE_V1')),
  ('Pack covers exactly 49 SYSTEM exercises', (
    select count(distinct media.exercise_id) = 49
    from public.exercise_media media
    join public.exercises exercise on exercise.id = media.exercise_id
    where media.provider = 'REPDB_FREE_V1'
      and exercise.source_type = 'PPERFIL_LIBRARY'
      and exercise.owner_trainer_id is null
  )),
  ('Every pack record is approved and fully attributed', not exists (
    select 1 from public.exercise_media
    where provider = 'REPDB_FREE_V1'
      and (production_status <> 'APPROVED'
        or license_type <> 'RepDB Free Tier License v1.0'
        or creator_credit <> 'RepDB'
        or source_url not like 'https://exercise-dataset.com/exercise/%'
        or url_or_storage_path not like 'trainer-public-media/system/exercises/repdb-free-v1/%'
        or thumbnail_url_or_path <> url_or_storage_path)
  )),
  ('No premium or evaluation path entered the pack', not exists (
    select 1 from public.exercise_media
    where provider = 'REPDB_FREE_V1'
      and (url_or_storage_path ilike '%premium%' or source_url ilike '%premium%')
  )),
  ('Pack has no duplicate media slots', not exists (
    select exercise_id, sort_order from public.exercise_media
    where provider = 'REPDB_FREE_V1'
    group by exercise_id, sort_order having count(*) > 1
  )),
  ('Controlled public bucket remains configured for WebP', exists (
    select 1 from storage.buckets
    where id = 'trainer-public-media'
      and public
      and 'image/webp' = any(allowed_mime_types)
  )),
  ('Controlled storage prefix contains exactly 96 WebP objects', (
    select count(*) = 96 from storage.objects
    where bucket_id = 'trainer-public-media'
      and name like 'system/exercises/repdb-free-v1/%'
      and metadata->>'mimetype' = 'image/webp'
      and metadata->>'cacheControl' = 'max-age=31536000'
  )),
  ('Trainer custom media remains untouched', (select count(*) = 0 from public.exercise_media media join public.exercises exercise on exercise.id = media.exercise_id where exercise.source_type = 'TRAINER_CUSTOM'));

insert into auth.users(id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values ('4d000000-0000-4000-8000-000000000001','authenticated','authenticated','media-pack-trainer@example.test','',now(),now(),now());
insert into public.trainer_profiles(id,user_id,slug,display_name,headline,bio,specialty,service_mode,whatsapp,published)
values ('4d100000-0000-4000-8000-000000000001','4d000000-0000-4000-8000-000000000001','media-pack-qa-trainer','Media Pack Trainer','QA','QA','Treino','online','5500000000411',false);

set local role authenticated;
set local request.jwt.claims = '{"sub":"4d000000-0000-4000-8000-000000000001","role":"authenticated"}';
insert into exercise_media_pack_gate_results values
  ('Trainer search resolves two ordered squat frames', (
    select jsonb_array_length(result #> '{0,media}') = 2
      and result #>> '{0,media,0,sort_order}' = '0'
      and result #>> '{0,media,1,sort_order}' = '1'
      and result #>> '{0,media,0,provider}' = 'REPDB_FREE_V1'
    from (select public.search_exercise_library('agachamento livre',10) result) searched
  )),
  ('Trainer search keeps an unmapped exercise on fallback', coalesce(jsonb_array_length(public.search_exercise_library('agachamento goblet',10) #> '{0,media}'), 0) = 0),
  ('Authenticated trainer cannot insert SYSTEM media directly', pg_temp.raises($sql$
    insert into public.exercise_media(exercise_id,media_type,url_or_storage_path,production_status,sort_order)
    select id,'IMAGE','unsafe.webp','APPROVED',99 from public.exercises where slug='agachamento-livre'
  $sql$)),
  ('Authenticated trainer cannot update pack metadata directly', pg_temp.raises($sql$
    update public.exercise_media set creator_credit='Unsafe' where provider='REPDB_FREE_V1'
  $sql$)),
  ('Authenticated trainer cannot delete pack media directly', pg_temp.raises($sql$
    delete from public.exercise_media where provider='REPDB_FREE_V1'
  $sql$)),
  ('Authenticated trainer cannot mutate controlled SYSTEM storage objects', pg_temp.changes_zero($sql$
    update storage.objects set metadata = metadata || '{"unsafe":true}'::jsonb
    where bucket_id='trainer-public-media' and name like 'system/exercises/repdb-free-v1/%'
  $sql$));

reset role;
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
insert into exercise_media_pack_gate_results values
  ('Anonymous cannot browse exercise media', pg_temp.raises($sql$select count(*) from public.exercise_media$sql$)),
  ('Anonymous cannot execute catalog search RPC', pg_temp.raises($sql$select public.search_exercise_library('agachamento',10)$sql$));

reset role;
select * from exercise_media_pack_gate_results order by scenario;
rollback;
