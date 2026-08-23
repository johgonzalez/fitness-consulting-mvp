-- Sprint 3B.1 transactional security gate. All fixtures and mutations roll back.
begin;

create temp table draft_update_gate_results (
  scenario text primary key,
  passed boolean not null
);
create temp table draft_update_gate_context (
  key text primary key,
  value uuid not null
);
grant select, insert, update on draft_update_gate_results, draft_update_gate_context to authenticated, anon;

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
  ('3b100000-0000-4000-8000-000000000001','authenticated','authenticated','trainer-a-draft-update@example.test','',now(),now(),now()),
  ('3b100000-0000-4000-8000-000000000002','authenticated','authenticated','trainer-b-draft-update@example.test','',now(),now(),now()),
  ('3b100000-0000-4000-8000-000000000003','authenticated','authenticated','student-a-draft-update@example.test','',now(),now(),now()),
  ('3b100000-0000-4000-8000-000000000004','authenticated','authenticated','student-b-draft-update@example.test','',now(),now(),now());

insert into public.trainer_profiles(
  id,user_id,slug,display_name,headline,bio,specialty,service_mode,whatsapp,published
) values
  ('3b110000-0000-4000-8000-000000000001','3b100000-0000-4000-8000-000000000001','draft-update-trainer-a','Draft Update Trainer A','A','A','Treino','online','5500000000101',false),
  ('3b110000-0000-4000-8000-000000000002','3b100000-0000-4000-8000-000000000002','draft-update-trainer-b','Draft Update Trainer B','B','B','Treino','online','5500000000102',false);

insert into public.app_users(id, display_name) values
  ('3b100000-0000-4000-8000-000000000003','Draft Update Student A'),
  ('3b100000-0000-4000-8000-000000000004','Draft Update Student B');
insert into public.user_roles(user_id, role_code)
values
  ('3b100000-0000-4000-8000-000000000003','student'),
  ('3b100000-0000-4000-8000-000000000004','student');
insert into public.student_profiles(id, user_id, preferred_name) values
  ('3b120000-0000-4000-8000-000000000001','3b100000-0000-4000-8000-000000000003','Student A'),
  ('3b120000-0000-4000-8000-000000000002','3b100000-0000-4000-8000-000000000004','Student B');

insert into public.trainer_student_relationships(
  id, trainer_profile_id, student_profile_id, status, origin, created_by_user_id
) values
  ('3b130000-0000-4000-8000-000000000001','3b110000-0000-4000-8000-000000000001','3b120000-0000-4000-8000-000000000001','active','invitation','3b100000-0000-4000-8000-000000000001'),
  ('3b130000-0000-4000-8000-000000000002','3b110000-0000-4000-8000-000000000002','3b120000-0000-4000-8000-000000000002','active','invitation','3b100000-0000-4000-8000-000000000002');

set local role authenticated;
set local request.jwt.claims = '{"sub":"3b100000-0000-4000-8000-000000000001","role":"authenticated"}';
insert into draft_update_gate_context
select 'trainer_a_draft', public.create_assessment_from_template(
  '3b130000-0000-4000-8000-000000000001',
  'a3100000-0000-4000-8000-000000000001',
  'Original Draft title', false, now() + interval '7 days'
);
insert into draft_update_gate_context
select 'trainer_a_sent', public.create_assessment_from_template(
  '3b130000-0000-4000-8000-000000000001',
  'a3100000-0000-4000-8000-000000000002',
  'Sent metadata is immutable', false, null
);
select public.send_assessment((select value from draft_update_gate_context where key = 'trainer_a_sent'));

select public.update_draft_assessment(
  (select value from draft_update_gate_context where key = 'trainer_a_draft'),
  'Updated Draft title', true, now() + interval '14 days'
);

insert into draft_update_gate_results values
  ('Trainer A updates own DRAFT', (
    select title = 'Updated Draft title'
      and is_required is true
      and due_at > now() + interval '13 days'
    from public.assessments
    where id = (select value from draft_update_gate_context where key = 'trainer_a_draft')
  )),
  ('Template version cannot be changed', (
    select template_version_id = 'a3100000-0000-4000-8000-000000000001'::uuid
      and trainer_student_relationship_id = '3b130000-0000-4000-8000-000000000001'::uuid
    from public.assessments
    where id = (select value from draft_update_gate_context where key = 'trainer_a_draft')
  )),
  ('Audit event is written', (
    select count(*) = 1
      and bool_and(actor_user_id = '3b100000-0000-4000-8000-000000000001'::uuid)
      and bool_and(metadata -> 'changed_fields' @> '["title","is_required","due_at"]'::jsonb)
    from public.assessment_events
    where assessment_id = (select value from draft_update_gate_context where key = 'trainer_a_draft')
      and event_type = 'DRAFT_UPDATED'
  )),
  ('SENT assessment rejects update', pg_temp.raises(format(
    'select public.update_draft_assessment(%L::uuid,%L,true,null)',
    (select value from draft_update_gate_context where key = 'trainer_a_sent'), 'Changed after send'
  ))),
  ('Template version rejects direct change', pg_temp.raises(format(
    'update public.assessments set template_version_id=%L::uuid where id=%L::uuid',
    'a3100000-0000-4000-8000-000000000002',
    (select value from draft_update_gate_context where key = 'trainer_a_draft')
  )));

-- A no-op call does not manufacture an audit event.
select public.update_draft_assessment(
  (select value from draft_update_gate_context where key = 'trainer_a_draft'),
  'Updated Draft title', true,
  (select due_at from public.assessments where id = (select value from draft_update_gate_context where key = 'trainer_a_draft'))
);
insert into draft_update_gate_results values
  ('No-op update does not write duplicate audit event', (
    select count(*) = 1 from public.assessment_events
    where assessment_id = (select value from draft_update_gate_context where key = 'trainer_a_draft')
      and event_type = 'DRAFT_UPDATED'
  ));

set local role postgres;
set local role authenticated;
set local request.jwt.claims = '{"sub":"3b100000-0000-4000-8000-000000000002","role":"authenticated"}';
insert into draft_update_gate_context
select 'trainer_b_draft', public.create_assessment_from_template(
  '3b130000-0000-4000-8000-000000000002',
  'a3100000-0000-4000-8000-000000000002',
  'Trainer B private Draft', false, null
);

set local role postgres;
set local role authenticated;
set local request.jwt.claims = '{"sub":"3b100000-0000-4000-8000-000000000001","role":"authenticated"}';
insert into draft_update_gate_results values
  ('Trainer A cannot update Trainer B DRAFT', pg_temp.raises(format(
    'select public.update_draft_assessment(%L::uuid,%L,true,null)',
    (select value from draft_update_gate_context where key = 'trainer_b_draft'), 'Cross tenant update'
  )));

set local role postgres;
update public.trainer_student_relationships
set status = 'inactive', inactive_at = now(), ended_at = null
where id = '3b130000-0000-4000-8000-000000000001';
set local role authenticated;
set local request.jwt.claims = '{"sub":"3b100000-0000-4000-8000-000000000001","role":"authenticated"}';
insert into draft_update_gate_results values
  ('Inactive relationship rejects DRAFT update', pg_temp.raises(format(
    'select public.update_draft_assessment(%L::uuid,%L,true,null)',
    (select value from draft_update_gate_context where key = 'trainer_a_draft'), 'Inactive relationship update'
  )));

set local role postgres;
insert into public.assessments(
  id, trainer_student_relationship_id, template_version_id, status, title, is_required,
  sent_at, answered_at, review_started_at, completed_at, created_by
) values (
  '3b140000-0000-4000-8000-000000000001',
  '3b130000-0000-4000-8000-000000000001',
  'a3100000-0000-4000-8000-000000000003',
  'ANSWERED', 'Answered metadata is immutable', false,
  now() - interval '2 days', now() - interval '1 day', null, null,
  '3b100000-0000-4000-8000-000000000001'
), (
  '3b140000-0000-4000-8000-000000000002',
  '3b130000-0000-4000-8000-000000000001',
  'a3100000-0000-4000-8000-000000000003',
  'COMPLETED', 'Completed metadata is immutable', false,
  now() - interval '4 days', now() - interval '3 days',
  now() - interval '2 days', now() - interval '1 day',
  '3b100000-0000-4000-8000-000000000001'
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"3b100000-0000-4000-8000-000000000001","role":"authenticated"}';
insert into draft_update_gate_results values
  ('ANSWERED assessment rejects update', pg_temp.raises($sql$
    select public.update_draft_assessment(
      '3b140000-0000-4000-8000-000000000001','Changed Answered',true,null
    )
  $sql$)),
  ('COMPLETED assessment rejects update', pg_temp.raises($sql$
    select public.update_draft_assessment(
      '3b140000-0000-4000-8000-000000000002','Changed Completed',true,null
    )
  $sql$));

set local role postgres;
set local role authenticated;
set local request.jwt.claims = '{"sub":"3b100000-0000-4000-8000-000000000003","role":"authenticated"}';
insert into draft_update_gate_results values
  ('Student cannot update DRAFT metadata', pg_temp.raises(format(
    'select public.update_draft_assessment(%L::uuid,%L,true,null)',
    (select value from draft_update_gate_context where key = 'trainer_a_draft'), 'Student update'
  )));

set local role postgres;
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
insert into draft_update_gate_results values
  ('Anonymous cannot execute RPC',
    not has_function_privilege(
      'anon',
      'public.update_draft_assessment(uuid,text,boolean,timestamp with time zone)',
      'EXECUTE'
    )
    and pg_temp.raises(format(
      'select public.update_draft_assessment(%L::uuid,%L,true,null)',
      (select value from draft_update_gate_context where key = 'trainer_a_draft'), 'Anonymous update'
    ))
  );

set local role postgres;
do $$
declare failures text;
begin
  select string_agg(scenario, E'\n' order by scenario) into failures
  from draft_update_gate_results where not passed;
  if failures is not null then
    raise exception E'Sprint 3B.1 gate failures:\n%', failures;
  end if;
end;
$$;

table draft_update_gate_results;
rollback;
