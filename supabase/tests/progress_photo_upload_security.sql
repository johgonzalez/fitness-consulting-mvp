-- Sprint 6B transactional security gate. Always rolls back fixtures and media rows.
begin;

create temp table progress_photo_gate_results (
  scenario text primary key,
  passed boolean not null
);
grant select, insert on progress_photo_gate_results to authenticated, anon;

create or replace function pg_temp.raises(p_sql text)
returns boolean
language plpgsql
as $$
begin
  execute p_sql;
  return false;
exception when others then
  return true;
end;
$$;
grant execute on function pg_temp.raises(text) to authenticated, anon;

insert into auth.users(id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('6b000000-0000-4000-8000-000000000001','authenticated','authenticated','trainer-a-progress-photo@example.test','',now(),now(),now()),
  ('6b000000-0000-4000-8000-000000000002','authenticated','authenticated','trainer-b-progress-photo@example.test','',now(),now(),now()),
  ('6b000000-0000-4000-8000-000000000003','authenticated','authenticated','student-a-progress-photo@example.test','',now(),now(),now()),
  ('6b000000-0000-4000-8000-000000000004','authenticated','authenticated','student-b-progress-photo@example.test','',now(),now(),now());

insert into public.trainer_profiles(
  id,user_id,slug,display_name,headline,bio,specialty,service_mode,whatsapp,published
) values
  ('6b100000-0000-4000-8000-000000000001','6b000000-0000-4000-8000-000000000001','progress-photo-trainer-a','Trainer A','A','A','Treino','online','5500000000101',false),
  ('6b100000-0000-4000-8000-000000000002','6b000000-0000-4000-8000-000000000002','progress-photo-trainer-b','Trainer B','B','B','Treino','online','5500000000102',false);

insert into public.app_users(id, display_name) values
  ('6b000000-0000-4000-8000-000000000003','Student A'),
  ('6b000000-0000-4000-8000-000000000004','Student B');
insert into public.user_roles(user_id, role_code) values
  ('6b000000-0000-4000-8000-000000000003','student'),
  ('6b000000-0000-4000-8000-000000000004','student');
insert into public.student_profiles(id, user_id, preferred_name) values
  ('6b200000-0000-4000-8000-000000000001','6b000000-0000-4000-8000-000000000003','Student A'),
  ('6b200000-0000-4000-8000-000000000002','6b000000-0000-4000-8000-000000000004','Student B');
insert into public.trainer_student_relationships(
  id, trainer_profile_id, student_profile_id, status, origin, created_by_user_id
) values
  ('6b300000-0000-4000-8000-000000000001','6b100000-0000-4000-8000-000000000001','6b200000-0000-4000-8000-000000000001','active','invitation','6b000000-0000-4000-8000-000000000001'),
  ('6b300000-0000-4000-8000-000000000002','6b100000-0000-4000-8000-000000000002','6b200000-0000-4000-8000-000000000002','active','invitation','6b000000-0000-4000-8000-000000000002');

set local role authenticated;
set local request.jwt.claims = '{"sub":"6b000000-0000-4000-8000-000000000003","role":"authenticated"}';

insert into storage.objects(bucket_id, name, owner_id, metadata)
values (
  'student-private-media',
  '6b000000-0000-4000-8000-000000000003/6b200000-0000-4000-8000-000000000001/progress/FRONT/6b400000-0000-4000-8000-000000000001.jpg',
  '6b000000-0000-4000-8000-000000000003',
  '{"mimetype":"image/jpeg","size":1024}'::jsonb
);

insert into progress_photo_gate_results values
  ('student cannot upload for another student', pg_temp.raises($sql$
    insert into storage.objects(bucket_id, name, owner_id, metadata) values (
      'student-private-media',
      '6b000000-0000-4000-8000-000000000003/6b200000-0000-4000-8000-000000000002/progress/FRONT/6b400000-0000-4000-8000-000000000002.jpg',
      '6b000000-0000-4000-8000-000000000003',
      '{"mimetype":"image/jpeg","size":1024}'::jsonb
    )
  $sql$)),
  ('student cannot claim another owner id', pg_temp.raises($sql$
    insert into storage.objects(bucket_id, name, owner_id, metadata) values (
      'student-private-media',
      '6b000000-0000-4000-8000-000000000003/6b200000-0000-4000-8000-000000000001/progress/SIDE/6b400000-0000-4000-8000-000000000003.jpg',
      '6b000000-0000-4000-8000-000000000004',
      '{"mimetype":"image/jpeg","size":1024}'::jsonb
    )
  $sql$)),
  ('student cannot register another student path', pg_temp.raises($sql$
    select public.create_progress_photo(
      '6b000000-0000-4000-8000-000000000004/6b200000-0000-4000-8000-000000000002/progress/FRONT/6b400000-0000-4000-8000-000000000004.jpg',
      'FRONT','image/jpeg',1024,'progress-photo-v1'
    )
  $sql$));

select public.create_progress_photo(
  '6b000000-0000-4000-8000-000000000003/6b200000-0000-4000-8000-000000000001/progress/FRONT/6b400000-0000-4000-8000-000000000001.jpg',
  'FRONT','image/jpeg',1024,'progress-photo-v1'
);

insert into progress_photo_gate_results values
  ('student upload own photo', (
    select count(*) = 1
    from public.student_private_media
    where student_profile_id = '6b200000-0000-4000-8000-000000000001'
      and media_type = 'PROGRESS_PHOTO'
      and view_type = 'FRONT'
  )),
  ('student read own photo', (
    select count(*) = 1
    from storage.objects
    where bucket_id = 'student-private-media'
      and name like '6b000000-0000-4000-8000-000000000003/%'
  )),
  ('student cannot read another student', (
    select count(*) = 0
    from public.student_private_media
    where student_profile_id = '6b200000-0000-4000-8000-000000000002'
  )),
  ('finalized object cannot be deleted directly', pg_temp.raises($sql$
    delete from storage.objects
    where bucket_id = 'student-private-media'
      and name = '6b000000-0000-4000-8000-000000000003/6b200000-0000-4000-8000-000000000001/progress/FRONT/6b400000-0000-4000-8000-000000000001.jpg'
  $sql$));

set local role postgres;
insert into storage.objects(bucket_id, name, owner_id, metadata) values (
  'student-private-media',
  '6b000000-0000-4000-8000-000000000004/6b200000-0000-4000-8000-000000000002/progress/BACK/6b400000-0000-4000-8000-000000000005.png',
  '6b000000-0000-4000-8000-000000000004',
  '{"mimetype":"image/png","size":2048}'::jsonb
);
insert into public.student_private_media(
  student_profile_id, trainer_student_relationship_id, storage_path, media_type,
  view_type, mime_type, file_size, created_by, consent_version, consented_at
) values (
  '6b200000-0000-4000-8000-000000000002','6b300000-0000-4000-8000-000000000002',
  '6b000000-0000-4000-8000-000000000004/6b200000-0000-4000-8000-000000000002/progress/BACK/6b400000-0000-4000-8000-000000000005.png',
  'PROGRESS_PHOTO','BACK','image/png',2048,'6b000000-0000-4000-8000-000000000004','progress-photo-v1',now()
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"6b000000-0000-4000-8000-000000000003","role":"authenticated"}';
insert into progress_photo_gate_results values
  ('student cross-tenant metadata denied', (
    select count(*) = 0
    from public.student_private_media
    where student_profile_id = '6b200000-0000-4000-8000-000000000002'
  )),
  ('student cross-tenant storage denied', (
    select count(*) = 0
    from storage.objects
    where bucket_id = 'student-private-media'
      and name like '6b000000-0000-4000-8000-000000000004/%'
  ));

set local role authenticated;
set local request.jwt.claims = '{"sub":"6b000000-0000-4000-8000-000000000001","role":"authenticated"}';
insert into progress_photo_gate_results values
  ('authorized trainer read-only', (
    select count(*) = 1
    from public.student_private_media
    where student_profile_id = '6b200000-0000-4000-8000-000000000001'
  ) and not has_table_privilege('authenticated','public.student_private_media','INSERT,UPDATE,DELETE')),
  ('trainer cannot upload', pg_temp.raises($sql$
    insert into storage.objects(bucket_id, name, owner_id, metadata) values (
      'student-private-media',
      '6b000000-0000-4000-8000-000000000001/6b200000-0000-4000-8000-000000000001/progress/FRONT/6b400000-0000-4000-8000-000000000006.jpg',
      '6b000000-0000-4000-8000-000000000001',
      '{"mimetype":"image/jpeg","size":1024}'::jsonb
    )
  $sql$)),
  ('trainer cannot register student photo', pg_temp.raises($sql$
    select public.create_progress_photo(
      '6b000000-0000-4000-8000-000000000001/6b200000-0000-4000-8000-000000000001/progress/FRONT/6b400000-0000-4000-8000-000000000006.jpg',
      'FRONT','image/jpeg',1024,'progress-photo-v1'
    )
  $sql$)),
  ('other trainer denied', (
    select count(*) = 0
    from public.student_private_media
    where student_profile_id = '6b200000-0000-4000-8000-000000000002'
  ));

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
insert into progress_photo_gate_results values
  ('anonymous denied',
    not has_function_privilege('anon','public.create_progress_photo(text,text,text,bigint,text)','EXECUTE')
    and not has_table_privilege('anon','public.student_private_media','SELECT,INSERT,UPDATE,DELETE')
  ),
  ('public bucket URL unavailable', (
    select count(*) = 0
    from storage.buckets
    where id = 'student-private-media' and public is true
  )),
  ('anonymous storage read denied', (
    select count(*) = 0
    from storage.objects
    where bucket_id = 'student-private-media'
  ));

set local role postgres;
do $$
declare
  failures text;
begin
  select string_agg(scenario, E'\n' order by scenario)
  into failures
  from progress_photo_gate_results
  where not passed;

  if failures is not null then
    raise exception E'Sprint 6B gate failures:\n%', failures;
  end if;
end;
$$;

table progress_photo_gate_results;
rollback;
