-- Sprint 3A transactional/RLS/storage gate. Always rolls back fixture data.
-- Run only against an isolated database or in an explicit rollback transaction.
begin;

create temp table assessment_gate_results (
  scenario text primary key,
  passed boolean not null
);
create temp table assessment_gate_context (
  key text primary key,
  value uuid not null
);
grant select, insert, update on assessment_gate_results, assessment_gate_context to authenticated, anon;

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

insert into auth.users(id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('3a000000-0000-4000-8000-000000000001','authenticated','authenticated','trainer-a-assessment@example.test','',now(),now(),now()),
  ('3a000000-0000-4000-8000-000000000002','authenticated','authenticated','trainer-b-assessment@example.test','',now(),now(),now()),
  ('3a000000-0000-4000-8000-000000000003','authenticated','authenticated','student-a-assessment@example.test','',now(),now(),now()),
  ('3a000000-0000-4000-8000-000000000004','authenticated','authenticated','student-b-assessment@example.test','',now(),now(),now()),
  ('3a000000-0000-4000-8000-000000000005','authenticated','authenticated','role-only-assessment@example.test','',now(),now(),now());

insert into public.trainer_profiles(
  id,user_id,slug,display_name,headline,bio,specialty,service_mode,whatsapp,published
) values
  ('3a100000-0000-4000-8000-000000000001','3a000000-0000-4000-8000-000000000001','assessment-trainer-a','Trainer A Assessment','A','A','Treino','online','5500000000001',false),
  ('3a100000-0000-4000-8000-000000000002','3a000000-0000-4000-8000-000000000002','assessment-trainer-b','Trainer B Assessment','B','B','Treino','online','5500000000002',false);

insert into public.app_users(id, display_name) values
  ('3a000000-0000-4000-8000-000000000003','Student A Assessment'),
  ('3a000000-0000-4000-8000-000000000004','Student B Assessment'),
  ('3a000000-0000-4000-8000-000000000005','Role Only Assessment');
insert into public.user_roles(user_id, role_code) values
  ('3a000000-0000-4000-8000-000000000003','student'),
  ('3a000000-0000-4000-8000-000000000004','student'),
  ('3a000000-0000-4000-8000-000000000005','trainer');
insert into public.student_profiles(id, user_id, preferred_name) values
  ('3a200000-0000-4000-8000-000000000001','3a000000-0000-4000-8000-000000000003','Student A'),
  ('3a200000-0000-4000-8000-000000000002','3a000000-0000-4000-8000-000000000004','Student B');
insert into public.trainer_student_relationships(
  id, trainer_profile_id, student_profile_id, status, origin, created_by_user_id
) values
  ('3a300000-0000-4000-8000-000000000001','3a100000-0000-4000-8000-000000000001','3a200000-0000-4000-8000-000000000001','active','invitation','3a000000-0000-4000-8000-000000000001'),
  ('3a300000-0000-4000-8000-000000000002','3a100000-0000-4000-8000-000000000002','3a200000-0000-4000-8000-000000000002','active','invitation','3a000000-0000-4000-8000-000000000002');

-- Trainer A creates one immutable custom template version and two assignments.
set local role authenticated;
set local request.jwt.claims = '{"sub":"3a000000-0000-4000-8000-000000000001","role":"authenticated"}';
insert into public.assessment_templates(
  id, owner_trainer_id, assessment_type, name, description, locale, status, default_required
) values (
  '3a400000-0000-4000-8000-000000000001','3a100000-0000-4000-8000-000000000001',
  'CUSTOM','Gate custom assessment','Template used only by the rollback security gate.','en-US','ACTIVE',true
);
insert into public.assessment_template_versions(id, template_id, version_number, schema, created_by)
values (
  '3a500000-0000-4000-8000-000000000001','3a400000-0000-4000-8000-000000000001',1,
  '{"metadata":{"purpose":"security-gate"},"questions":[
    {"key":"goal","type":"SHORT_TEXT","required":true,"label":{"en-US":"Goal"}},
    {"key":"experience","type":"SINGLE_CHOICE","required":true,"label":{"en-US":"Experience"},"options":[{"value":"beginner","label":{"en-US":"Beginner"}},{"value":"advanced","label":{"en-US":"Advanced"}}]},
    {"key":"weight","type":"MEASUREMENT","required":false,"label":{"en-US":"Weight"},"measurement":{"code":"body_weight","unit_codes":["kg","lb"]}}
  ]}'::jsonb,
  '3a000000-0000-4000-8000-000000000001'
);
insert into assessment_gate_results values
  ('trainer reads active system templates', (select count(*) = 3 from public.assessment_templates where system_key is not null)),
  ('trainer reads own custom template', (select count(*) = 1 from public.assessment_templates where id = '3a400000-0000-4000-8000-000000000001')),
  ('template schema rejects unknown question type', pg_temp.raises($sql$insert into public.assessment_template_versions(id,template_id,version_number,schema,created_by) values ('3a500000-0000-4000-8000-000000000099','3a400000-0000-4000-8000-000000000001',99,'{"questions":[{"key":"bad","type":"UNKNOWN","required":true,"label":{"en-US":"Bad"}}]}'::jsonb,'3a000000-0000-4000-8000-000000000001')$sql$)),
  ('template versions reject update', pg_temp.raises($sql$update public.assessment_template_versions set version_number=2 where id='3a500000-0000-4000-8000-000000000001'$sql$));

insert into assessment_gate_context
select 'assessment_a', public.create_assessment_from_template(
  '3a300000-0000-4000-8000-000000000001','3a500000-0000-4000-8000-000000000001',null,null,now()+interval '7 days'
);
insert into assessment_gate_context
select 'draft_before_inactive', public.create_assessment_from_template(
  '3a300000-0000-4000-8000-000000000001','3a500000-0000-4000-8000-000000000001','Future blocked draft',false,null
);
select public.send_assessment((select value from assessment_gate_context where key='assessment_a'));
insert into assessment_gate_results values
  ('trainer cannot answer as student', pg_temp.raises(format(
    'select public.save_assessment_answer(%L::uuid,%L,%L::jsonb)',
    (select value from assessment_gate_context where key='assessment_a'),'goal','"trainer answer"'
  ))),
  ('invalid lifecycle transition is blocked', pg_temp.raises(format(
    'select public.start_assessment_review(%L::uuid)',
    (select value from assessment_gate_context where key='assessment_a')
  ))),
  ('trainer A cannot create for trainer B student', pg_temp.raises($sql$select public.create_assessment_from_template('3a300000-0000-4000-8000-000000000002','a3100000-0000-4000-8000-000000000001',null,null,null)$sql$));

-- Trainer B creates a foreign assignment used for cross-tenant checks.
set local role postgres;
set local role authenticated;
set local request.jwt.claims = '{"sub":"3a000000-0000-4000-8000-000000000002","role":"authenticated"}';
insert into assessment_gate_context
select 'assessment_b', public.create_assessment_from_template(
  '3a300000-0000-4000-8000-000000000002','a3100000-0000-4000-8000-000000000002','Trainer B private assignment',false,null
);
insert into assessment_gate_results values
  ('trainer B cannot read trainer A assessment', (select count(*) = 0 from public.assessments where id=(select value from assessment_gate_context where key='assessment_a'))),
  ('trainer B cannot read trainer A answers', (select count(*) = 0 from public.assessment_answers where assessment_id=(select value from assessment_gate_context where key='assessment_a')));

-- Student A exercises incremental save, validation and atomic submission.
set local role postgres;
set local role authenticated;
set local request.jwt.claims = '{"sub":"3a000000-0000-4000-8000-000000000003","role":"authenticated"}';
insert into assessment_gate_results values
  ('student cannot browse templates', (select count(*) = 0 from public.assessment_templates)),
  ('student A cannot read student B assessment', (select count(*) = 0 from public.assessments where id=(select value from assessment_gate_context where key='assessment_b'))),
  ('student A cannot write student B answer', pg_temp.raises(format(
    'select public.save_assessment_answer(%L::uuid,%L,%L::jsonb)',
    (select value from assessment_gate_context where key='assessment_b'),'sessions_completed','1'
  ))),
  ('student cannot mutate lifecycle directly', not has_table_privilege('authenticated','public.assessments','UPDATE')),
  ('invalid choice answer is rejected', pg_temp.raises(format(
    'select public.save_assessment_answer(%L::uuid,%L,%L::jsonb)',
    (select value from assessment_gate_context where key='assessment_a'),'experience','"not-an-option"'
  ))),
  ('required answers block submit atomically', pg_temp.raises(format(
    'select public.submit_assessment(%L::uuid)',
    (select value from assessment_gate_context where key='assessment_a')
  )));
select public.save_assessment_answer((select value from assessment_gate_context where key='assessment_a'),'goal','"Build consistency"'::jsonb);
select public.save_assessment_answer((select value from assessment_gate_context where key='assessment_a'),'experience','"beginner"'::jsonb);
select public.save_assessment_answer((select value from assessment_gate_context where key='assessment_a'),'weight',
  jsonb_build_object('value',72.5,'unit_code','kg','measured_at','2026-08-23T12:00:00Z'));
select public.submit_assessment((select value from assessment_gate_context where key='assessment_a'));
insert into assessment_gate_results values
  ('submit transitions to ANSWERED', (select status='ANSWERED' from public.assessments where id=(select value from assessment_gate_context where key='assessment_a'))),
  ('measurement extracted with source and unit', (select count(*)=1 from public.student_measurements where source_assessment_id=(select value from assessment_gate_context where key='assessment_a') and measurement_code='body_weight' and value=72.5 and unit_code='kg')),
  ('student feedback hidden before completion', ((public.get_my_assessment((select value from assessment_gate_context where key='assessment_a'))->'trainer_feedback') = 'null'::jsonb)),
  ('answers read-only after submission', pg_temp.raises(format(
    'select public.save_assessment_answer(%L::uuid,%L,%L::jsonb)',
    (select value from assessment_gate_context where key='assessment_a'),'goal','"Changed after submit"'
  )));

-- Trainer A reviews/completes; lifecycle updates and events remain atomic.
set local role postgres;
set local role authenticated;
set local request.jwt.claims = '{"sub":"3a000000-0000-4000-8000-000000000001","role":"authenticated"}';
select public.start_assessment_review((select value from assessment_gate_context where key='assessment_a'));
select public.complete_assessment((select value from assessment_gate_context where key='assessment_a'),'Excellent baseline. We will review progress next month.');
insert into assessment_gate_results values
  ('lifecycle reaches COMPLETED with all timestamps', (select status='COMPLETED' and sent_at is not null and answered_at is not null and review_started_at is not null and completed_at is not null from public.assessments where id=(select value from assessment_gate_context where key='assessment_a'))),
  ('lifecycle events recorded in same history', (select count(*)=8 from public.assessment_events where assessment_id=(select value from assessment_gate_context where key='assessment_a'))),
  ('completed assessment rejects further transition', pg_temp.raises(format(
    'select public.complete_assessment(%L::uuid,%L)',
    (select value from assessment_gate_context where key='assessment_a'),'Second completion'
  ))),
  ('events reject update', pg_temp.raises(format(
    'update public.assessment_events set metadata=%L::jsonb where assessment_id=%L::uuid',
    '{"tampered":true}',(select value from assessment_gate_context where key='assessment_a')
  )));

-- Add private metadata/objects as a trusted backend would; no client upload policy exists yet.
set local role postgres;
insert into public.student_measurements(
  id,student_profile_id,trainer_student_relationship_id,source_assessment_id,
  measurement_code,value,unit_code,measured_at,recorded_by
) values (
  '3a700000-0000-4000-8000-000000000001','3a200000-0000-4000-8000-000000000002',
  '3a300000-0000-4000-8000-000000000002',null,'body_weight',68.4,'kg',
  '2026-08-22T12:00:00Z','3a000000-0000-4000-8000-000000000004'
);
insert into assessment_gate_results values
  ('measurement relationship and student must match', pg_temp.raises($sql$
    insert into public.student_measurements(
      student_profile_id,trainer_student_relationship_id,measurement_code,value,unit_code,measured_at,recorded_by
    ) values (
      '3a200000-0000-4000-8000-000000000002','3a300000-0000-4000-8000-000000000001',
      'invalid_cross_tenant_measurement',1,'kg','2026-08-23T12:00:00Z','3a000000-0000-4000-8000-000000000003'
    )
  $sql$)),
  ('private media source and relationship must match', pg_temp.raises(format($sql$
    insert into public.student_private_media(
      student_profile_id,trainer_student_relationship_id,source_assessment_id,storage_path,
      media_type,mime_type,file_size,created_by,consent_version,consented_at
    ) values (
      '3a200000-0000-4000-8000-000000000002','3a300000-0000-4000-8000-000000000002',%L::uuid,
      '3a200000-0000-4000-8000-000000000002/invalid-source.jpg','ASSESSMENT_PHOTO','image/jpeg',1,
      '3a000000-0000-4000-8000-000000000004','test-v1',now()
    )
  $sql$, (select value from assessment_gate_context where key='assessment_a'))));
insert into public.student_private_media(
  id,student_profile_id,trainer_student_relationship_id,source_assessment_id,storage_path,
  media_type,view_type,mime_type,file_size,created_by,consent_version,consented_at
) values
  ('3a600000-0000-4000-8000-000000000001','3a200000-0000-4000-8000-000000000001','3a300000-0000-4000-8000-000000000001',
   (select value from assessment_gate_context where key='assessment_a'),'3a200000-0000-4000-8000-000000000001/front/photo-a.jpg',
   'ASSESSMENT_PHOTO','FRONT','image/jpeg',1024,'3a000000-0000-4000-8000-000000000003','test-v1',now()),
  ('3a600000-0000-4000-8000-000000000002','3a200000-0000-4000-8000-000000000002','3a300000-0000-4000-8000-000000000002',
   null,'3a200000-0000-4000-8000-000000000002/front/photo-b.jpg',
   'PROGRESS_PHOTO','FRONT','image/jpeg',1024,'3a000000-0000-4000-8000-000000000004','test-v1',now());
insert into storage.objects(bucket_id,name,metadata) values
  ('student-private-media','3a200000-0000-4000-8000-000000000001/front/photo-a.jpg','{"mimetype":"image/jpeg","size":1024}'::jsonb),
  ('student-private-media','3a200000-0000-4000-8000-000000000002/front/photo-b.jpg','{"mimetype":"image/jpeg","size":1024}'::jsonb);

set local role authenticated;
set local request.jwt.claims = '{"sub":"3a000000-0000-4000-8000-000000000001","role":"authenticated"}';
insert into assessment_gate_results values
  ('active trainer reads related progress measurement', (select count(*)=1 from public.student_measurements where source_assessment_id=(select value from assessment_gate_context where key='assessment_a'))),
  ('active trainer reads related private media metadata', (select count(*)=1 from public.student_private_media)),
  ('active trainer reads related private storage object', (select count(*)=1 from storage.objects where bucket_id='student-private-media')),
  ('trainer A cannot read trainer B measurements', (select count(*)=0 from public.student_measurements where trainer_student_relationship_id='3a300000-0000-4000-8000-000000000002')),
  ('trainer A cannot read trainer B private media', (select count(*)=0 from public.student_private_media where student_profile_id='3a200000-0000-4000-8000-000000000002')),
  ('trainer A cannot read trainer B storage path', (select count(*)=0 from storage.objects where bucket_id='student-private-media' and name like '3a200000-0000-4000-8000-000000000002/%'));

-- Inactive relationships retain non-media history, reject every mutation, and lose trainer photo access.
set local role postgres;
update public.trainer_student_relationships
set status='inactive', inactive_at=now(), ended_at=null
where id='3a300000-0000-4000-8000-000000000001';
set local role authenticated;
set local request.jwt.claims = '{"sub":"3a000000-0000-4000-8000-000000000001","role":"authenticated"}';
insert into assessment_gate_results values
  ('inactive trainer retains historical assessment read', (select count(*)=1 from public.assessments where id=(select value from assessment_gate_context where key='assessment_a'))),
  ('inactive trainer retains historical answers read', (select count(*)=3 from public.assessment_answers where assessment_id=(select value from assessment_gate_context where key='assessment_a'))),
  ('inactive trainer retains historical measurements read', (select count(*)=1 from public.student_measurements where source_assessment_id=(select value from assessment_gate_context where key='assessment_a'))),
  ('inactive trainer loses private media metadata access', (select count(*)=0 from public.student_private_media where student_profile_id='3a200000-0000-4000-8000-000000000001')),
  ('inactive trainer loses private object access', (select count(*)=0 from storage.objects where bucket_id='student-private-media' and name like '3a200000-0000-4000-8000-000000000001/%')),
  ('inactive relationship rejects create', pg_temp.raises($sql$select public.create_assessment_from_template('3a300000-0000-4000-8000-000000000001','3a500000-0000-4000-8000-000000000001',null,null,null)$sql$)),
  ('inactive relationship rejects send', pg_temp.raises(format(
    'select public.send_assessment(%L::uuid)',
    (select value from assessment_gate_context where key='draft_before_inactive')
  )));

-- Student keeps their own historical and media access after relationship deactivation.
set local role postgres;
set local role authenticated;
set local request.jwt.claims = '{"sub":"3a000000-0000-4000-8000-000000000003","role":"authenticated"}';
insert into assessment_gate_results values
  ('inactive student retains historical assessment read', (select count(*)=1 from public.assessments where id=(select value from assessment_gate_context where key='assessment_a'))),
  ('inactive student sees completed feedback', ((public.get_my_assessment((select value from assessment_gate_context where key='assessment_a'))->>'trainer_feedback')='Excellent baseline. We will review progress next month.')),
  ('student reads own progress measurements', (select count(*)=1 from public.student_measurements where student_profile_id='3a200000-0000-4000-8000-000000000001')),
  ('student cannot read another student progress measurements', (select count(*)=0 from public.student_measurements where student_profile_id='3a200000-0000-4000-8000-000000000002')),
  ('student retains own private media access', (select count(*)=1 from public.student_private_media where student_profile_id='3a200000-0000-4000-8000-000000000001')),
  ('student cannot read another student private media', (select count(*)=0 from public.student_private_media where student_profile_id='3a200000-0000-4000-8000-000000000002')),
  ('student retains own private object access', (select count(*)=1 from storage.objects where bucket_id='student-private-media' and name like '3a200000-0000-4000-8000-000000000001/%')),
  ('inactive student cannot mutate historical answer', pg_temp.raises(format(
    'select public.save_assessment_answer(%L::uuid,%L,%L::jsonb)',
    (select value from assessment_gate_context where key='draft_before_inactive'),'goal','"Blocked"'
  )));

-- A role row alone never establishes trainer identity or tenant access.
set local role postgres;
set local role authenticated;
set local request.jwt.claims = '{"sub":"3a000000-0000-4000-8000-000000000005","role":"authenticated"}';
insert into assessment_gate_results values
  ('role assignment alone cannot browse system templates', (select count(*)=0 from public.assessment_templates)),
  ('role assignment alone cannot read assessments', (select count(*)=0 from public.assessments)),
  ('role assignment alone cannot create assessments', pg_temp.raises($sql$select public.create_assessment_from_template('3a300000-0000-4000-8000-000000000002','a3100000-0000-4000-8000-000000000001',null,null,null)$sql$));

-- Anonymous has no assessment or private-storage surface.
set local role postgres;
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
insert into assessment_gate_results values
  ('anonymous has no assessment table access', not has_table_privilege('anon','public.assessments','SELECT,INSERT,UPDATE,DELETE')),
  ('anonymous has no progress measurement table access', not has_table_privilege('anon','public.student_measurements','SELECT,INSERT,UPDATE,DELETE')),
  ('anonymous has no private media metadata access', not has_table_privilege('anon','public.student_private_media','SELECT,INSERT,UPDATE,DELETE')),
  ('anonymous has no assessment RPC access', not has_function_privilege('anon','public.get_my_assessment(uuid)','EXECUTE')),
  ('anonymous sees no public private-media bucket', (select count(*)=0 from storage.buckets where id='student-private-media' and public is true)),
  ('anonymous cannot read private storage', (select count(*)=0 from storage.objects where bucket_id='student-private-media'));

set local role postgres;
do $$
declare failures text;
begin
  select string_agg(scenario, E'\n' order by scenario) into failures
  from assessment_gate_results where not passed;
  if failures is not null then raise exception E'Sprint 3A gate failures:\n%', failures; end if;
end;
$$;

table assessment_gate_results;
rollback;
