-- PPerfil Exercise Catalog V1 search, authorization and Builder integration gate.
-- Safe for the linked project only while the complete file remains inside this rollback transaction.
begin;

create temp table exercise_catalog_gate_results (
  scenario text primary key,
  passed boolean not null
);
create temp table exercise_catalog_gate_context (
  key text primary key,
  value uuid not null
);
grant select, insert, update on exercise_catalog_gate_results, exercise_catalog_gate_context to authenticated, anon;

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
  ('4c000000-0000-4000-8000-000000000001','authenticated','authenticated','catalog-trainer-a@example.test','',now(),now(),now()),
  ('4c000000-0000-4000-8000-000000000002','authenticated','authenticated','catalog-trainer-b@example.test','',now(),now(),now()),
  ('4c000000-0000-4000-8000-000000000003','authenticated','authenticated','catalog-student@example.test','',now(),now(),now());

insert into public.trainer_profiles(
  id,user_id,slug,display_name,headline,bio,specialty,service_mode,whatsapp,published
) values
  ('4c100000-0000-4000-8000-000000000001','4c000000-0000-4000-8000-000000000001','catalog-qa-trainer-a','Catalog Trainer A','A','A','Treino','online','5500000000401',false),
  ('4c100000-0000-4000-8000-000000000002','4c000000-0000-4000-8000-000000000002','catalog-qa-trainer-b','Catalog Trainer B','B','B','Treino','online','5500000000402',false);
insert into public.app_users(id, display_name) values
  ('4c000000-0000-4000-8000-000000000003','Catalog Student');
insert into public.user_roles(user_id, role_code) values
  ('4c000000-0000-4000-8000-000000000003','student');
insert into public.student_profiles(id, user_id, preferred_name) values
  ('4c200000-0000-4000-8000-000000000001','4c000000-0000-4000-8000-000000000003','Catalog Student');
insert into public.trainer_student_relationships(
  id, trainer_profile_id, student_profile_id, status, origin, created_by_user_id
) values (
  '4c300000-0000-4000-8000-000000000001','4c100000-0000-4000-8000-000000000001',
  '4c200000-0000-4000-8000-000000000001','active','invitation','4c000000-0000-4000-8000-000000000001'
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"4c000000-0000-4000-8000-000000000001","role":"authenticated"}';

insert into exercise_catalog_gate_results values
  ('Trainer reads complete SYSTEM catalog through RLS', (select count(*) = 190 from public.exercises where source_type = 'PPERFIL_LIBRARY')),
  ('Search agach returns useful SYSTEM results', jsonb_array_length(public.search_exercise_library('agach',100)) >= 5),
  ('Search peito returns localized results', jsonb_array_length(public.search_exercise_library('peito',100)) >= 2),
  ('Search quadriceps resolves muscle filter', jsonb_array_length(public.search_exercise_library('quadriceps',100)) = 18),
  ('Search halter returns localized results', jsonb_array_length(public.search_exercise_library('halter',100)) >= 10),
  ('Search cabo returns localized results', jsonb_array_length(public.search_exercise_library('cabo',100)) >= 10),
  ('Search costas returns localized results', jsonb_array_length(public.search_exercise_library('costas',100)) >= 2),
  ('SYSTEM catalog exposes no unapproved media', not jsonb_path_exists(public.search_exercise_library('agachamento livre',10), '$[*].media[*]')),
  ('Trainer cannot mutate SYSTEM exercise directly', pg_temp.raises($sql$update public.exercises set name = 'Unsafe' where slug = 'agachamento-livre'$sql$));

insert into exercise_catalog_gate_context
select 'custom_a', public.create_custom_exercise(
  'Catalog QA custom A','Custom owner-scoped exercise.','core',array['shoulders'],array['bodyweight'],
  'anti_rotation','Execute de forma controlada.',array['Mantenha o tronco estável.'],'pt-BR'
);
insert into exercise_catalog_gate_results values
  ('Trainer custom exercise remains distinguishable', public.search_exercise_library('catalog qa custom a',10)->0->>'source_type' = 'TRAINER_CUSTOM');

insert into exercise_catalog_gate_context
select 'plan', public.create_workout_plan(
  '4c300000-0000-4000-8000-000000000001','Catalog Builder QA','Validar catálogo real'
);
insert into exercise_catalog_gate_context
select 'version', public.create_workout_draft_version(
  (select value from exercise_catalog_gate_context where key='plan'),'MANUAL',null,null,'{}'::jsonb
);
insert into exercise_catalog_gate_context
select 'session', public.add_workout_session(
  (select value from exercise_catalog_gate_context where key='version'),'Treino A',null,45
);
insert into exercise_catalog_gate_context
select 'section', public.add_workout_section(
  (select value from exercise_catalog_gate_context where key='session'),'MAIN','Bloco principal'
);
insert into exercise_catalog_gate_context
select 'prescribed', public.add_workout_exercise(
  (select value from exercise_catalog_gate_context where key='section'),
  (select id from public.exercises where slug='supino-reto-com-barra'),null,null,'Controle a execução.',null
);
select public.upsert_workout_set(
  null,(select value from exercise_catalog_gate_context where key='prescribed'),1,'STANDARD',
  10,null,null,null,null,null,null,null,60,7,null
);
insert into exercise_catalog_gate_results values
  ('Builder adds real SYSTEM exercise to DRAFT', public.get_trainer_workout_version((select value from exercise_catalog_gate_context where key='version')) #>> '{sessions,0,sections,0,exercises,0,exercise,name}' = 'Supino reto com barra'),
  ('Builder receives premium media fallback state', coalesce(jsonb_array_length(public.get_trainer_workout_version((select value from exercise_catalog_gate_context where key='version')) #> '{sessions,0,sections,0,exercises,0,exercise,media}'), 0) = 0);

select public.replace_workout_exercise(
  (select value from exercise_catalog_gate_context where key='prescribed'),
  (select id from public.exercises where slug='remada-unilateral')
);
insert into exercise_catalog_gate_results values
  ('Builder replaces exercise using real SYSTEM catalog', public.get_trainer_workout_version((select value from exercise_catalog_gate_context where key='version')) #>> '{sessions,0,sections,0,exercises,0,exercise,name}' = 'Remada unilateral com halter');

set local request.jwt.claims = '{"sub":"4c000000-0000-4000-8000-000000000002","role":"authenticated"}';
insert into exercise_catalog_gate_results values
  ('Unrelated trainer cannot read trainer-owned exercise', not exists (select 1 from public.exercises where id = (select value from exercise_catalog_gate_context where key='custom_a'))),
  ('Unrelated trainer search excludes trainer-owned exercise', jsonb_array_length(public.search_exercise_library('catalog qa custom a',10)) = 0),
  ('Unrelated trainer cannot mutate SYSTEM exercise directly', pg_temp.raises($sql$update public.exercises set name = 'Unsafe B' where slug = 'remada-unilateral'$sql$));

reset role;
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
insert into exercise_catalog_gate_results values
  ('Anonymous cannot browse exercise table', pg_temp.raises($sql$select count(*) from public.exercises$sql$)),
  ('Anonymous cannot execute catalog search RPC', pg_temp.raises($sql$select public.search_exercise_library('agach',10)$sql$));

reset role;
select * from exercise_catalog_gate_results order by scenario;
rollback;
