-- Sprint 5A transactional execution, idempotency and cross-tenant gate.
-- Safe for the linked project only while the complete file remains inside this rollback transaction.
begin;

create temp table execution_gate_results (scenario text primary key, passed boolean not null);
create temp table execution_gate_context (key text primary key, value uuid not null);
grant select, insert, update on execution_gate_results, execution_gate_context to authenticated, anon;

create or replace function pg_temp.raises(p_sql text)
returns boolean language plpgsql as $$
begin execute p_sql; return false; exception when others then return true; end;
$$;
grant execute on function pg_temp.raises(text) to authenticated, anon;

insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at)
values
  ('5a000000-0000-4000-8000-000000000001','authenticated','authenticated','trainer-a-execution@example.test','',now(),now(),now()),
  ('5a000000-0000-4000-8000-000000000002','authenticated','authenticated','trainer-b-execution@example.test','',now(),now(),now()),
  ('5a000000-0000-4000-8000-000000000003','authenticated','authenticated','student-a-execution@example.test','',now(),now(),now()),
  ('5a000000-0000-4000-8000-000000000004','authenticated','authenticated','student-b-execution@example.test','',now(),now(),now());

insert into public.trainer_profiles(id,user_id,slug,display_name,headline,bio,specialty,service_mode,whatsapp,published)
values
  ('5a100000-0000-4000-8000-000000000001','5a000000-0000-4000-8000-000000000001','execution-trainer-a','Execution Trainer A','A','A','Treino','online','5500000000511',false),
  ('5a100000-0000-4000-8000-000000000002','5a000000-0000-4000-8000-000000000002','execution-trainer-b','Execution Trainer B','B','B','Treino','online','5500000000512',false);
insert into public.app_users(id,display_name) values
  ('5a000000-0000-4000-8000-000000000003','Execution Student A'),
  ('5a000000-0000-4000-8000-000000000004','Execution Student B');
insert into public.user_roles(user_id,role_code) values
  ('5a000000-0000-4000-8000-000000000003','student'),
  ('5a000000-0000-4000-8000-000000000004','student');
insert into public.student_profiles(id,user_id,preferred_name) values
  ('5a200000-0000-4000-8000-000000000001','5a000000-0000-4000-8000-000000000003','Student A'),
  ('5a200000-0000-4000-8000-000000000002','5a000000-0000-4000-8000-000000000004','Student B');
insert into public.trainer_student_relationships(id,trainer_profile_id,student_profile_id,status,origin,created_by_user_id)
values
  ('5a300000-0000-4000-8000-000000000001','5a100000-0000-4000-8000-000000000001','5a200000-0000-4000-8000-000000000001','active','invitation','5a000000-0000-4000-8000-000000000001'),
  ('5a300000-0000-4000-8000-000000000002','5a100000-0000-4000-8000-000000000002','5a200000-0000-4000-8000-000000000002','active','invitation','5a000000-0000-4000-8000-000000000002');

insert into public.exercises(id,source_type,name,normalized_name,slug,description,primary_muscle_group,secondary_muscle_groups,equipment,movement_pattern,instructions,coaching_cues,locale,status)
values
  ('5a400000-0000-4000-8000-000000000001','PPERFIL_LIBRARY','Execução agachamento','execucao agachamento','qa-execucao-agachamento','Teste.','quadriceps',array['glutes'],array['barbell'],'squat','Execute com controle.',array['Controle.'],'pt-BR','ACTIVE'),
  ('5a400000-0000-4000-8000-000000000002','PPERFIL_LIBRARY','Execução remada','execucao remada','qa-execucao-remada','Teste.','back',array['biceps'],array['cable'],'pull','Execute com controle.',array['Controle.'],'pt-BR','ACTIVE');

-- Trainer A builds published, draft, approved and cross-version prescriptions.
set local role authenticated;
set local request.jwt.claims = '{"sub":"5a000000-0000-4000-8000-000000000001","role":"authenticated"}';

insert into execution_gate_context select 'plan_a', public.create_workout_plan('5a300000-0000-4000-8000-000000000001','Execution Plan A','Foundation');
insert into execution_gate_context select 'version_a', public.create_workout_draft_version((select value from execution_gate_context where key='plan_a'),'MANUAL',null,null,'{}');
insert into execution_gate_context select 'session_a1', public.add_workout_session((select value from execution_gate_context where key='version_a'),'Session A1',null,40);
insert into execution_gate_context select 'section_a1', public.add_workout_section((select value from execution_gate_context where key='session_a1'),'MAIN','Main');
insert into execution_gate_context select 'exercise_a1', public.add_workout_exercise((select value from execution_gate_context where key='section_a1'),'5a400000-0000-4000-8000-000000000001',null,null,'Controle',null);
insert into execution_gate_context select 'set_a1', public.upsert_workout_set(null,(select value from execution_gate_context where key='exercise_a1'),1,'STANDARD',10,null,null,20,'kg',null,null,null,60,7,null);
insert into execution_gate_context select 'session_a2', public.add_workout_session((select value from execution_gate_context where key='version_a'),'Session A2',null,35);
insert into execution_gate_context select 'section_a2', public.add_workout_section((select value from execution_gate_context where key='session_a2'),'SUPERSET','Superset');
insert into execution_gate_context select 'exercise_a2', public.add_workout_exercise((select value from execution_gate_context where key='section_a2'),'5a400000-0000-4000-8000-000000000002','A',null,'Controle',null);
insert into execution_gate_context select 'set_a2', public.upsert_workout_set(null,(select value from execution_gate_context where key='exercise_a2'),1,'STANDARD',12,null,null,null,null,null,null,null,45,7,null);
insert into execution_gate_context select 'exercise_a2b', public.add_workout_exercise((select value from execution_gate_context where key='section_a2'),'5a400000-0000-4000-8000-000000000001','A',null,'Controle',null);
select public.upsert_workout_set(null,(select value from execution_gate_context where key='exercise_a2b'),1,'STANDARD',12,null,null,null,null,null,null,null,45,7,null);
insert into execution_gate_context select 'session_a3', public.add_workout_session((select value from execution_gate_context where key='version_a'),'Session A3',null,20);
insert into execution_gate_context select 'section_a3', public.add_workout_section((select value from execution_gate_context where key='session_a3'),'MAIN',null);
insert into execution_gate_context select 'exercise_a3', public.add_workout_exercise((select value from execution_gate_context where key='section_a3'),'5a400000-0000-4000-8000-000000000001',null,null,null,null);
select public.upsert_workout_set(null,(select value from execution_gate_context where key='exercise_a3'),1,'STANDARD',8,null,null,null,null,null,null,null,30,6,null);
select public.approve_workout_version((select value from execution_gate_context where key='version_a'));
select public.publish_workout_version((select value from execution_gate_context where key='version_a'));

insert into execution_gate_context select 'plan_a_other', public.create_workout_plan('5a300000-0000-4000-8000-000000000001','Execution Plan A Other',null);
insert into execution_gate_context select 'version_a_other', public.create_workout_draft_version((select value from execution_gate_context where key='plan_a_other'),'MANUAL',null,null,'{}');
insert into execution_gate_context select 'session_a_other', public.add_workout_session((select value from execution_gate_context where key='version_a_other'),'Other version session',null,25);
insert into execution_gate_context select 'section_a_other', public.add_workout_section((select value from execution_gate_context where key='session_a_other'),'MAIN',null);
insert into execution_gate_context select 'exercise_a_other', public.add_workout_exercise((select value from execution_gate_context where key='section_a_other'),'5a400000-0000-4000-8000-000000000002',null,null,null,null);
select public.upsert_workout_set(null,(select value from execution_gate_context where key='exercise_a_other'),1,'STANDARD',10,null,null,null,null,null,null,null,30,6,null);
select public.approve_workout_version((select value from execution_gate_context where key='version_a_other'));
select public.publish_workout_version((select value from execution_gate_context where key='version_a_other'));

insert into execution_gate_context select 'draft_plan_a', public.create_workout_plan('5a300000-0000-4000-8000-000000000001','Draft A',null);
insert into execution_gate_context select 'draft_version_a', public.create_workout_draft_version((select value from execution_gate_context where key='draft_plan_a'),'MANUAL',null,null,'{}');
insert into execution_gate_context select 'draft_session_a', public.add_workout_session((select value from execution_gate_context where key='draft_version_a'),'Draft session',null,20);
insert into execution_gate_context select 'draft_section_a', public.add_workout_section((select value from execution_gate_context where key='draft_session_a'),'MAIN',null);
insert into execution_gate_context select 'draft_exercise_a', public.add_workout_exercise((select value from execution_gate_context where key='draft_section_a'),'5a400000-0000-4000-8000-000000000001',null,null,null,null);
select public.upsert_workout_set(null,(select value from execution_gate_context where key='draft_exercise_a'),1,'STANDARD',10,null,null,null,null,null,null,null,30,6,null);

insert into execution_gate_context select 'approved_plan_a', public.create_workout_plan('5a300000-0000-4000-8000-000000000001','Approved A',null);
insert into execution_gate_context select 'approved_version_a', public.create_workout_draft_version((select value from execution_gate_context where key='approved_plan_a'),'MANUAL',null,null,'{}');
insert into execution_gate_context select 'approved_session_a', public.add_workout_session((select value from execution_gate_context where key='approved_version_a'),'Approved session',null,20);
insert into execution_gate_context select 'approved_section_a', public.add_workout_section((select value from execution_gate_context where key='approved_session_a'),'MAIN',null);
insert into execution_gate_context select 'approved_exercise_a', public.add_workout_exercise((select value from execution_gate_context where key='approved_section_a'),'5a400000-0000-4000-8000-000000000001',null,null,null,null);
select public.upsert_workout_set(null,(select value from execution_gate_context where key='approved_exercise_a'),1,'STANDARD',10,null,null,null,null,null,null,null,30,6,null);
select public.approve_workout_version((select value from execution_gate_context where key='approved_version_a'));

-- Trainer B builds an isolated published workout.
set local role postgres;
set local role authenticated;
set local request.jwt.claims = '{"sub":"5a000000-0000-4000-8000-000000000002","role":"authenticated"}';
insert into execution_gate_context select 'plan_b', public.create_workout_plan('5a300000-0000-4000-8000-000000000002','Execution Plan B',null);
insert into execution_gate_context select 'version_b', public.create_workout_draft_version((select value from execution_gate_context where key='plan_b'),'MANUAL',null,null,'{}');
insert into execution_gate_context select 'session_b', public.add_workout_session((select value from execution_gate_context where key='version_b'),'Session B',null,30);
insert into execution_gate_context select 'section_b', public.add_workout_section((select value from execution_gate_context where key='session_b'),'MAIN',null);
insert into execution_gate_context select 'exercise_b', public.add_workout_exercise((select value from execution_gate_context where key='section_b'),'5a400000-0000-4000-8000-000000000001',null,null,null,null);
select public.upsert_workout_set(null,(select value from execution_gate_context where key='exercise_b'),1,'STANDARD',10,null,null,null,null,null,null,null,30,6,null);
select public.approve_workout_version((select value from execution_gate_context where key='version_b'));
select public.publish_workout_version((select value from execution_gate_context where key='version_b'));

-- Student A starts three distinct published sessions.
set local role postgres;
set local role authenticated;
set local request.jwt.claims = '{"sub":"5a000000-0000-4000-8000-000000000003","role":"authenticated"}';
insert into execution_gate_context select 'execution_a1', (public.start_or_resume_workout_execution((select value from execution_gate_context where key='session_a1')) #>> '{execution,id}')::uuid;
insert into execution_gate_context select 'execution_a2', (public.start_or_resume_workout_execution((select value from execution_gate_context where key='session_a2')) #>> '{execution,id}')::uuid;
insert into execution_gate_context select 'execution_a_other', (public.start_or_resume_workout_execution((select value from execution_gate_context where key='session_a_other')) #>> '{execution,id}')::uuid;
insert into execution_gate_context
select 'set_execution_a1', id from public.workout_set_executions where workout_execution_id=(select value from execution_gate_context where key='execution_a1');
insert into execution_gate_context
select 'exercise_execution_a2', id from public.workout_exercise_executions
where workout_execution_id=(select value from execution_gate_context where key='execution_a2')
  and workout_exercise_id=(select value from execution_gate_context where key='exercise_a2');
insert into execution_gate_context
select 'set_execution_a_other', id from public.workout_set_executions where workout_execution_id=(select value from execution_gate_context where key='execution_a_other');

insert into execution_gate_results values
  ('Student starts own PUBLISHED workout', (select count(*)=1 from public.workout_executions where id=(select value from execution_gate_context where key='execution_a1'))),
  ('Start materializes exact exercise and set rows', (
    select (select count(*) from public.workout_exercise_executions where workout_execution_id=(select value from execution_gate_context where key='execution_a1'))=1
      and (select count(*) from public.workout_set_executions where workout_execution_id=(select value from execution_gate_context where key='execution_a1'))=1
  )),
  ('Repeated start resumes without duplicate', (
    select (public.start_or_resume_workout_execution((select value from execution_gate_context where key='session_a1')) #>> '{execution,id}')::uuid=(select value from execution_gate_context where key='execution_a1')
      and (select count(*) from public.workout_executions where student_profile_id='5a200000-0000-4000-8000-000000000001' and workout_session_id=(select value from execution_gate_context where key='session_a1'))=1
  )),
  ('Student cannot execute DRAFT', pg_temp.raises(format('select public.start_or_resume_workout_execution(%L::uuid)',(select value from execution_gate_context where key='draft_session_a')))),
  ('Student cannot execute APPROVED', pg_temp.raises(format('select public.start_or_resume_workout_execution(%L::uuid)',(select value from execution_gate_context where key='approved_session_a')))),
  ('Today projection is explicitly unscheduled', public.get_student_today_workout() #>> '{0,kind}'='AVAILABLE_UNSCHEDULED'),
  ('Cross-version set mutation fails', pg_temp.raises(format(
    'select public.sync_workout_execution(%L::uuid,1,%L::jsonb)',
    (select value from execution_gate_context where key='execution_a1'),
    jsonb_build_array(jsonb_build_object('client_mutation_id','5a500000-0000-4000-8000-000000000001','operation','skip_set','workout_set_execution_id',(select value from execution_gate_context where key='set_execution_a_other')))
  ))),
  ('Cross-session exercise mutation fails', pg_temp.raises(format(
    'select public.sync_workout_execution(%L::uuid,1,%L::jsonb)',
    (select value from execution_gate_context where key='execution_a1'),
    jsonb_build_array(jsonb_build_object('client_mutation_id','5a500000-0000-4000-8000-000000000002','operation','skip_exercise','workout_exercise_execution_id',(select value from execution_gate_context where key='exercise_execution_a2')))
  )));

select public.pause_workout_execution((select value from execution_gate_context where key='execution_a1'),'5a500000-0000-4000-8000-000000000003',1);
insert into execution_gate_results values
  ('Pause transitions to PAUSED', (select status='PAUSED' and server_revision=2 from public.workout_executions where id=(select value from execution_gate_context where key='execution_a1'))),
  ('Duplicate pause mutation is idempotent', (
    select (public.pause_workout_execution((select value from execution_gate_context where key='execution_a1'),'5a500000-0000-4000-8000-000000000003',1) #>> '{execution,server_revision}')::integer=2
      and (select count(*)=1 from public.workout_execution_events where workout_execution_id=(select value from execution_gate_context where key='execution_a1') and client_mutation_id='5a500000-0000-4000-8000-000000000003')
  ));
select public.resume_workout_execution((select value from execution_gate_context where key='execution_a1'),'5a500000-0000-4000-8000-000000000004',2);
insert into execution_gate_results values
  ('Resume transitions to IN_PROGRESS', (select status='IN_PROGRESS' and server_revision=3 from public.workout_executions where id=(select value from execution_gate_context where key='execution_a1'))),
  ('Stale revision rejects new mutation', pg_temp.raises(format(
    'select public.sync_workout_execution(%L::uuid,1,%L::jsonb)',
    (select value from execution_gate_context where key='execution_a1'),
    jsonb_build_array(jsonb_build_object('client_mutation_id','5a500000-0000-4000-8000-000000000005','operation','add_student_note','student_note','stale'))
  )));

select public.sync_workout_execution(
  (select value from execution_gate_context where key='execution_a1'),3,
  jsonb_build_array(jsonb_build_object(
    'client_mutation_id','5a500000-0000-4000-8000-000000000006',
    'operation','complete_set',
    'workout_set_execution_id',(select value from execution_gate_context where key='set_execution_a1'),
    'actuals',jsonb_build_object('actual_reps',10,'actual_load',22.5,'load_unit','kg','actual_rpe',8)
  ))
);
insert into execution_gate_results values
  ('Set actuals are recorded separately from prescription', (
    select status='COMPLETED' and actual_reps=10 and actual_load=22.5 and load_unit='kg' and actual_rpe=8
    from public.workout_set_executions where id=(select value from execution_gate_context where key='set_execution_a1')
  )),
  ('Duplicate set mutation adds no event or revision', (
    select (public.sync_workout_execution(
      (select value from execution_gate_context where key='execution_a1'),3,
      jsonb_build_array(jsonb_build_object(
        'client_mutation_id','5a500000-0000-4000-8000-000000000006','operation','complete_set',
        'workout_set_execution_id',(select value from execution_gate_context where key='set_execution_a1'),
        'actuals',jsonb_build_object('actual_reps',10,'actual_load',22.5,'load_unit','kg','actual_rpe',8)
      ))
    ) #>> '{execution,server_revision}')::integer=4
    and (select count(*)=1 from public.workout_execution_events where workout_execution_id=(select value from execution_gate_context where key='execution_a1') and client_mutation_id='5a500000-0000-4000-8000-000000000006')
  ));

select public.complete_workout_execution((select value from execution_gate_context where key='execution_a1'),'5a500000-0000-4000-8000-000000000007',4);
select public.complete_workout_execution((select value from execution_gate_context where key='execution_a1'),'5a500000-0000-4000-8000-000000000007',4);
select public.record_workout_execution_feedback((select value from execution_gate_context where key='execution_a1'),'GOOD','Treino consistente.','5a500000-0000-4000-8000-000000000008',5);
select public.record_workout_execution_feedback((select value from execution_gate_context where key='execution_a1'),'CHALLENGING','Correção dentro da janela.','5a500000-0000-4000-8000-000000000009',6);
insert into execution_gate_results values
  ('Completion freezes execution with factual metrics', (
    select status='COMPLETED' and completed_at is not null and server_revision=7
    from public.workout_executions where id=(select value from execution_gate_context where key='execution_a1')
  )),
  ('Feedback supports bounded correction', (
    select difficulty='CHALLENGING' and student_note='Correção dentro da janela.' and feedback_recorded_at is not null
    from public.workout_executions where id=(select value from execution_gate_context where key='execution_a1')
  )),
  ('Terminal execution rejects sync mutation', pg_temp.raises(format(
    'select public.sync_workout_execution(%L::uuid,7,%L::jsonb)',
    (select value from execution_gate_context where key='execution_a1'),
    jsonb_build_array(jsonb_build_object('client_mutation_id','5a500000-0000-4000-8000-00000000000a','operation','add_student_note','student_note','blocked'))
  ))),
  ('Previous performance returns completed actuals', public.get_previous_exercise_performance('5a400000-0000-4000-8000-000000000001',null) #>> '{sets,0,actual_reps}'='10'),
  ('Execution events are append only', pg_temp.raises(format(
    'update public.workout_execution_events set metadata=%L::jsonb where workout_execution_id=%L::uuid','{}',(select value from execution_gate_context where key='execution_a1')
  ))),
  ('Student cannot read Trainer completion notification',
    not exists(select 1 from public.trainer_workout_notifications where workout_execution_id=(select value from execution_gate_context where key='execution_a1'))
    and pg_temp.raises('select public.list_trainer_workout_notifications(8)')
  );

-- Trainer reads the owned projection but cannot mutate student facts.
set local role postgres;
set local role authenticated;
set local request.jwt.claims = '{"sub":"5a000000-0000-4000-8000-000000000001","role":"authenticated"}';
insert into execution_gate_results values
  ('Owning trainer reads execution projection', public.get_trainer_workout_execution((select value from execution_gate_context where key='execution_a1')) #>> '{execution,status}'='COMPLETED'),
  ('Owning trainer receives one factual completion notification',
    public.list_trainer_workout_notifications(8) #>> '{0,workout_execution_id}'=(select value::text from execution_gate_context where key='execution_a1')
    and public.list_trainer_workout_notifications(8) #>> '{0,completed_sets}'='1'
  ),
  ('Completion notification is idempotent', (
    select count(*)=1 from public.trainer_workout_notifications
    where workout_execution_id=(select value from execution_gate_context where key='execution_a1')
  )),
  ('Trainer cannot mutate execution', pg_temp.raises(format(
    'select public.sync_workout_execution(%L::uuid,7,%L::jsonb)',
    (select value from execution_gate_context where key='execution_a1'),
    jsonb_build_array(jsonb_build_object('client_mutation_id','5a500000-0000-4000-8000-00000000000b','operation','add_student_note','student_note','trainer blocked'))
  ))),
  ('Authenticated role has no direct execution writes',
    not has_table_privilege('authenticated','public.workout_executions','INSERT,UPDATE,DELETE')
    and not has_table_privilege('authenticated','public.workout_set_executions','INSERT,UPDATE,DELETE')
  );

-- Trainer B and Student B are isolated from Student A execution.
set local role postgres;
set local role authenticated;
set local request.jwt.claims = '{"sub":"5a000000-0000-4000-8000-000000000002","role":"authenticated"}';
insert into execution_gate_results values
  ('Trainer A execution hidden from Trainer B',
    not exists(select 1 from public.workout_executions where id=(select value from execution_gate_context where key='execution_a1'))
    and pg_temp.raises(format('select public.get_trainer_workout_execution(%L::uuid)',(select value from execution_gate_context where key='execution_a1')))
  ),
  ('Trainer A notification hidden from Trainer B',
    not exists(select 1 from public.trainer_workout_notifications where workout_execution_id=(select value from execution_gate_context where key='execution_a1'))
    and public.list_trainer_workout_notifications(8)='[]'::jsonb
  );

set local role postgres;
set local role authenticated;
set local request.jwt.claims = '{"sub":"5a000000-0000-4000-8000-000000000004","role":"authenticated"}';
insert into execution_gate_results values
  ('Student A execution hidden from Student B',
    not exists(select 1 from public.workout_executions where id=(select value from execution_gate_context where key='execution_a1'))
    and pg_temp.raises(format('select public.get_student_workout_execution(%L::uuid)',(select value from execution_gate_context where key='execution_a1')))
  ),
  ('Student B cannot mutate Student A execution', pg_temp.raises(format(
    'select public.sync_workout_execution(%L::uuid,7,%L::jsonb)',
    (select value from execution_gate_context where key='execution_a1'),
    jsonb_build_array(jsonb_build_object('client_mutation_id','5a500000-0000-4000-8000-00000000000c','operation','add_student_note','student_note','cross tenant'))
  ))),
  ('Student B cannot start Student A workout', pg_temp.raises(format('select public.start_or_resume_workout_execution(%L::uuid)',(select value from execution_gate_context where key='session_a3'))));

-- Inactive relationship blocks both new starts and unfinished mutation, while completed history remains readable.
set local role postgres;
update public.trainer_student_relationships set status='inactive',inactive_at=now() where id='5a300000-0000-4000-8000-000000000001';
set local role authenticated;
set local request.jwt.claims = '{"sub":"5a000000-0000-4000-8000-000000000003","role":"authenticated"}';
insert into execution_gate_results values
  ('Inactive relationship blocks new execution', pg_temp.raises(format('select public.start_or_resume_workout_execution(%L::uuid)',(select value from execution_gate_context where key='session_a3')))),
  ('Inactive relationship blocks active execution mutation', pg_temp.raises(format(
    'select public.sync_workout_execution(%L::uuid,1,%L::jsonb)',
    (select value from execution_gate_context where key='execution_a2'),
    jsonb_build_array(jsonb_build_object('client_mutation_id','5a500000-0000-4000-8000-00000000000d','operation','add_student_note','student_note','inactive'))
  ))),
  ('Inactive student retains completed history', public.get_student_workout_execution((select value from execution_gate_context where key='execution_a1')) #>> '{execution,status}'='COMPLETED');

-- Anonymous surface is closed.
set local role postgres;
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
insert into execution_gate_results values
  ('Anonymous cannot read execution tables',
    not has_table_privilege('anon','public.workout_executions','SELECT,INSERT,UPDATE,DELETE')
    and pg_temp.raises('select id from public.workout_executions limit 1')
  ),
  ('Anonymous cannot execute workout execution RPCs',
    not has_function_privilege('anon','public.start_or_resume_workout_execution(uuid)','EXECUTE')
    and pg_temp.raises(format('select public.start_or_resume_workout_execution(%L::uuid)',(select value from execution_gate_context where key='session_b')))
  );

set local role postgres;
do $$
declare failures text;
begin
  select string_agg(scenario,E'\n' order by scenario) into failures from execution_gate_results where not passed;
  if failures is not null then raise exception E'Sprint 5A execution gate failures:\n%',failures; end if;
end;
$$;

table execution_gate_results;
rollback;
