-- Sprint 4A transactional security, lifecycle and versioning gate.
-- Safe for the linked project only when the entire file remains inside this rollback transaction.
begin;

create temp table workout_gate_results (
  scenario text primary key,
  passed boolean not null
);
create temp table workout_gate_context (
  key text primary key,
  value uuid not null
);
grant select, insert, update on workout_gate_results, workout_gate_context to authenticated, anon;

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
  ('4a000000-0000-4000-8000-000000000001','authenticated','authenticated','trainer-a-workout@example.test','',now(),now(),now()),
  ('4a000000-0000-4000-8000-000000000002','authenticated','authenticated','trainer-b-workout@example.test','',now(),now(),now()),
  ('4a000000-0000-4000-8000-000000000003','authenticated','authenticated','student-a-workout@example.test','',now(),now(),now()),
  ('4a000000-0000-4000-8000-000000000004','authenticated','authenticated','student-b-workout@example.test','',now(),now(),now());

insert into public.trainer_profiles(
  id,user_id,slug,display_name,headline,bio,specialty,service_mode,whatsapp,published
) values
  ('4a100000-0000-4000-8000-000000000001','4a000000-0000-4000-8000-000000000001','workout-trainer-a','Workout Trainer A','A','A','Treino','online','5500000000201',false),
  ('4a100000-0000-4000-8000-000000000002','4a000000-0000-4000-8000-000000000002','workout-trainer-b','Workout Trainer B','B','B','Treino','online','5500000000202',false);

insert into public.app_users(id, display_name) values
  ('4a000000-0000-4000-8000-000000000003','Workout Student A'),
  ('4a000000-0000-4000-8000-000000000004','Workout Student B');
insert into public.user_roles(user_id, role_code) values
  ('4a000000-0000-4000-8000-000000000003','student'),
  ('4a000000-0000-4000-8000-000000000004','student');
insert into public.student_profiles(id, user_id, preferred_name) values
  ('4a200000-0000-4000-8000-000000000001','4a000000-0000-4000-8000-000000000003','Student A'),
  ('4a200000-0000-4000-8000-000000000002','4a000000-0000-4000-8000-000000000004','Student B');
insert into public.trainer_student_relationships(
  id, trainer_profile_id, student_profile_id, status, origin, created_by_user_id
) values
  ('4a300000-0000-4000-8000-000000000001','4a100000-0000-4000-8000-000000000001','4a200000-0000-4000-8000-000000000001','active','invitation','4a000000-0000-4000-8000-000000000001'),
  ('4a300000-0000-4000-8000-000000000002','4a100000-0000-4000-8000-000000000002','4a200000-0000-4000-8000-000000000002','active','invitation','4a000000-0000-4000-8000-000000000002');

insert into public.exercises(
  id, source_type, name, normalized_name, slug, description,
  primary_muscle_group, secondary_muscle_groups, equipment,
  movement_pattern, instructions, coaching_cues, locale, status
) values
  ('4a400000-0000-4000-8000-000000000001','PPERFIL_LIBRARY','Agachamento goblet','agachamento goblet','qa-workout-agachamento-goblet','Agachamento com carga frontal.',
   'quadriceps',array['glutes'],array['dumbbell'],'squat','Mantenha o tronco estável.',array['Joelhos acompanham os pés.'],'pt-BR','ACTIVE'),
  ('4a400000-0000-4000-8000-000000000002','PPERFIL_LIBRARY','Remada baixa','remada baixa','qa-workout-remada-baixa','Remada sentada no cabo.',
   'back',array['biceps'],array['cable'],'pull','Puxe mantendo a coluna neutra.',array['Controle o retorno.'],'pt-BR','ACTIVE');
insert into public.exercise_media(
  id, exercise_id, media_type, url_or_storage_path, provider, source_url,
  license_type, creator_credit, production_status, sort_order
) values (
  '4a410000-0000-4000-8000-000000000001','4a400000-0000-4000-8000-000000000001',
  'VIDEO','https://media.example.test/goblet.mp4','PPerfil','https://source.example.test/goblet',
  'reviewed-demo','PPerfil QA','APPROVED',0
);

insert into public.assessments(
  id, trainer_student_relationship_id, template_version_id, status, title, is_required,
  sent_at, answered_at, review_started_at, completed_at, created_by
) values
  ('4a420000-0000-4000-8000-000000000001','4a300000-0000-4000-8000-000000000001','a3100000-0000-4000-8000-000000000001',
   'COMPLETED','Workout source assessment A',false,now()-interval '4 days',now()-interval '3 days',now()-interval '2 days',now()-interval '1 day','4a000000-0000-4000-8000-000000000001'),
  ('4a420000-0000-4000-8000-000000000002','4a300000-0000-4000-8000-000000000002','a3100000-0000-4000-8000-000000000001',
   'COMPLETED','Workout source assessment B',false,now()-interval '4 days',now()-interval '3 days',now()-interval '2 days',now()-interval '1 day','4a000000-0000-4000-8000-000000000002');

-- Trainer A builds custom library, manual/AI drafts and lifecycle fixtures.
set local role authenticated;
set local request.jwt.claims = '{"sub":"4a000000-0000-4000-8000-000000000001","role":"authenticated"}';

insert into workout_gate_context
select 'custom_a', public.create_custom_exercise(
  'Avanço alternado','Avanço unilateral controlado.','quadriceps',array['glutes'],array['bodyweight'],
  'lunge','Alterne as pernas com estabilidade.',array['Mantenha o joelho alinhado.'],'pt-BR'
);
insert into workout_gate_context
select 'custom_media_a', public.add_custom_exercise_media(
  (select value from workout_gate_context where key='custom_a'),
  'VIDEO','trainer-library/workout-a/lunge.mp4',null,'TRAINER_UPLOAD',null,null,null
);
insert into workout_gate_context
select 'custom_youtube_a', public.add_custom_exercise_media(
  (select value from workout_gate_context where key='custom_a'),
  'VIDEO','https://www.youtube.com/watch?v=AbCdEf_1234',null,'YOUTUBE',
  'https://www.youtube.com/watch?v=AbCdEf_1234',null,null
);
insert into workout_gate_results values
  ('Unsafe YouTube URL is rejected', pg_temp.raises(format(
    'select public.add_custom_exercise_media(%L::uuid,%L,%L,null,%L,%L,null,null)',
    (select value from workout_gate_context where key='custom_a'),
    'VIDEO','https://evil.example.test/watch?v=AbCdEf_1234','YOUTUBE','https://evil.example.test/watch?v=AbCdEf_1234'
  )));

insert into workout_gate_context
select 'draft_plan_a', public.create_workout_plan(
  '4a300000-0000-4000-8000-000000000001','Draft privado A','Força geral'
);
insert into workout_gate_context
select 'draft_version_a', public.create_workout_draft_version(
  (select value from workout_gate_context where key='draft_plan_a'),'MANUAL',null,null,'{}'::jsonb
);
insert into workout_gate_context
select 'draft_session_a', public.add_workout_session(
  (select value from workout_gate_context where key='draft_version_a'),'Treino A',null,45
);
insert into workout_gate_context
select 'draft_section_a', public.add_workout_section(
  (select value from workout_gate_context where key='draft_session_a'),'MAIN','Bloco principal'
);
insert into workout_gate_context
select 'draft_exercise_a', public.add_workout_exercise(
  (select value from workout_gate_context where key='draft_section_a'),
  (select value from workout_gate_context where key='custom_a'),null,'Nota privada do Personal','Controle o movimento','3-1-1'
);
insert into workout_gate_context
select 'draft_set_a', public.upsert_workout_set(
  null,(select value from workout_gate_context where key='draft_exercise_a'),1,'STANDARD',
  10,null,null,20,'kg',null,null,null,60,7.5,'Série de trabalho'
);

insert into workout_gate_context
select 'ai_plan_a', public.create_workout_plan(
  '4a300000-0000-4000-8000-000000000001','AI Draft A','Condicionamento'
);
insert into workout_gate_context
select 'ai_version_a', public.create_workout_draft_version(
  (select value from workout_gate_context where key='ai_plan_a'),'AI_DRAFT',null,
  'Criar uma sugestão de treino de dois dias.',
  '{"schema_version":"workout-ai-draft-v1","generator":"local_fixture","unresolved_exercise_ids":[]}'::jsonb
);

insert into workout_gate_context
select 'approved_plan_a', public.create_workout_plan(
  '4a300000-0000-4000-8000-000000000001','Aprovado A','Mobilidade e força'
);
insert into workout_gate_context
select 'approved_version_a', public.create_workout_draft_version(
  (select value from workout_gate_context where key='approved_plan_a'),'MANUAL',null,null,'{}'::jsonb
);
insert into workout_gate_context
select 'approved_session_a', public.add_workout_session(
  (select value from workout_gate_context where key='approved_version_a'),'Sessão aprovada',null,30
);
insert into workout_gate_context
select 'approved_section_a', public.add_workout_section(
  (select value from workout_gate_context where key='approved_session_a'),'MAIN',null
);
insert into workout_gate_context
select 'approved_exercise_a', public.add_workout_exercise(
  (select value from workout_gate_context where key='approved_section_a'),
  '4a400000-0000-4000-8000-000000000001',null,null,'Execução controlada',null
);
select public.upsert_workout_set(
  null,(select value from workout_gate_context where key='approved_exercise_a'),1,'STANDARD',
  12,null,null,null,null,null,null,null,45,7,null
);
select public.approve_workout_version((select value from workout_gate_context where key='approved_version_a'));

insert into workout_gate_context
select 'published_plan_a', public.create_workout_plan(
  '4a300000-0000-4000-8000-000000000001','Hipertrofia 2x','Força e hipertrofia'
);
insert into workout_gate_context
select 'published_v1_a', public.create_workout_draft_version(
  (select value from workout_gate_context where key='published_plan_a'),'MANUAL',
  '4a420000-0000-4000-8000-000000000001',null,'{"assessment_context_version":"v1"}'::jsonb
);
insert into workout_gate_context
select 'published_session_a1', public.add_workout_session(
  (select value from workout_gate_context where key='published_v1_a'),'Inferiores',null,55
);
insert into workout_gate_context
select 'published_session_a2', public.add_workout_session(
  (select value from workout_gate_context where key='published_v1_a'),'Superiores',null,50
);
select public.reorder_workout_sessions(
  (select value from workout_gate_context where key='published_v1_a'),
  array[
    (select value from workout_gate_context where key='published_session_a2'),
    (select value from workout_gate_context where key='published_session_a1')
  ]
);
insert into workout_gate_context
select 'published_section_main', public.add_workout_section(
  (select value from workout_gate_context where key='published_session_a1'),'MAIN','Força'
);
insert into workout_gate_context
select 'published_exercise_custom', public.add_workout_exercise(
  (select value from workout_gate_context where key='published_section_main'),
  (select value from workout_gate_context where key='custom_a'),null,'Privado','Alterne com estabilidade',null
);
select public.upsert_workout_set(
  null,(select value from workout_gate_context where key='published_exercise_custom'),1,'STANDARD',
  null,8,12,15,'kg',null,null,null,75,8,null
);
insert into workout_gate_context
select 'published_section_superset', public.add_workout_section(
  (select value from workout_gate_context where key='published_session_a2'),'SUPERSET','Puxar e agachar'
);
insert into workout_gate_context
select 'published_exercise_super_1', public.add_workout_exercise(
  (select value from workout_gate_context where key='published_section_superset'),
  '4a400000-0000-4000-8000-000000000001','A',null,'Sem perder a postura',null
);
insert into workout_gate_context
select 'published_exercise_super_2', public.add_workout_exercise(
  (select value from workout_gate_context where key='published_section_superset'),
  '4a400000-0000-4000-8000-000000000002','A',null,'Controle a volta',null
);
select public.upsert_workout_set(
  null,(select value from workout_gate_context where key='published_exercise_super_1'),1,'STANDARD',
  10,null,null,12,'kg',null,null,null,60,7,null
);
select public.upsert_workout_set(
  null,(select value from workout_gate_context where key='published_exercise_super_2'),1,'STANDARD',
  10,null,null,25,'kg',null,null,null,60,7,null
);
select public.approve_workout_version((select value from workout_gate_context where key='published_v1_a'));
select public.publish_workout_version((select value from workout_gate_context where key='published_v1_a'));

insert into workout_gate_context
select 'assessment_plan_a', public.create_workout_plan(
  '4a300000-0000-4000-8000-000000000001','Assessment linked A',null
);
insert into workout_gate_context
select 'assessment_version_a', public.create_workout_draft_version(
  (select value from workout_gate_context where key='assessment_plan_a'),'MANUAL',
  '4a420000-0000-4000-8000-000000000001',null,'{}'::jsonb
);
insert into workout_gate_context
select 'wrong_assessment_plan_a', public.create_workout_plan(
  '4a300000-0000-4000-8000-000000000001','Wrong assessment scope',null
);

insert into workout_gate_results values
  ('Owning trainer reads own private DRAFT', exists(
    select 1 from public.workout_plan_versions
    where id = (select value from workout_gate_context where key='draft_version_a')
  )),
  ('Trainer projection includes private note', (
    select public.get_trainer_workout_version(
      (select value from workout_gate_context where key='draft_version_a')
    ) #>> '{sessions,0,sections,0,exercises,0,trainer_note}' = 'Nota privada do Personal'
  )),
  ('AI output remains DRAFT', (
    select
      public.get_trainer_workout_version(
        (select value from workout_gate_context where key='ai_version_a')
      ) #>> '{version,status}' = 'DRAFT'
      and public.get_trainer_workout_version(
        (select value from workout_gate_context where key='ai_version_a')
      ) #>> '{version,source_type}' = 'AI_DRAFT'
  )),
  ('Malformed AI metadata is rejected', pg_temp.raises(format(
    'select public.create_workout_draft_version(%L::uuid,%L,null,%L,%L::jsonb)',
    (select value from workout_gate_context where key='wrong_assessment_plan_a'),
    'AI_DRAFT','Prompt','[]'
  ))),
  ('Cross-relationship assessment context is rejected', pg_temp.raises(format(
    'select public.create_workout_draft_version(%L::uuid,%L,%L::uuid,null,%L::jsonb)',
    (select value from workout_gate_context where key='wrong_assessment_plan_a'),
    'MANUAL','4a420000-0000-4000-8000-000000000002','{}'
  ))),
  ('Matching completed assessment context is retained', (
    select public.get_trainer_workout_version(
      (select value from workout_gate_context where key='assessment_version_a')
    ) #>> '{version,source_assessment_id}' = '4a420000-0000-4000-8000-000000000001'
  )),
  ('Explicit global-ready load unit is retained', (
    select target_load = 20 and load_unit = 'kg' and target_rpe = 7.5
    from public.workout_sets where id = (select value from workout_gate_context where key='draft_set_a')
  )),
  ('Negative load is rejected', pg_temp.raises(format(
    'select public.upsert_workout_set(null,%L::uuid,2,%L,10,null,null,-1,%L,null,null,null,60,7,null)',
    (select value from workout_gate_context where key='draft_exercise_a'),'STANDARD','kg'
  ))),
  ('Invalid lifecycle transition is rejected', pg_temp.raises(format(
    'select public.publish_workout_version(%L::uuid)',
    (select value from workout_gate_context where key='draft_version_a')
  ))),
  ('Reorder sessions is transactional', (
    select bool_and(
      (id = (select value from workout_gate_context where key='published_session_a2') and sort_order = 0)
      or (id = (select value from workout_gate_context where key='published_session_a1') and sort_order = 1)
    ) and count(*) = 2
    from public.workout_sessions
    where workout_plan_version_id = (select value from workout_gate_context where key='published_v1_a')
  ));

-- Trainer B creates isolated data and proves cross-tenant boundaries.
set local role postgres;
set local role authenticated;
set local request.jwt.claims = '{"sub":"4a000000-0000-4000-8000-000000000002","role":"authenticated"}';
insert into workout_gate_context
select 'custom_b', public.create_custom_exercise(
  'Exercício privado B','Somente Trainer B.','back',array[]::text[],array['cable'],
  'pull','Execute com controle.',array['Controle a escápula.'],'pt-BR'
);
insert into workout_gate_context
select 'draft_plan_b', public.create_workout_plan(
  '4a300000-0000-4000-8000-000000000002','Draft privado B',null
);
insert into workout_gate_context
select 'draft_version_b', public.create_workout_draft_version(
  (select value from workout_gate_context where key='draft_plan_b'),'MANUAL',null,null,'{}'::jsonb
);
insert into workout_gate_context
select 'published_plan_b', public.create_workout_plan(
  '4a300000-0000-4000-8000-000000000002','Published B',null
);
insert into workout_gate_context
select 'published_version_b', public.create_workout_draft_version(
  (select value from workout_gate_context where key='published_plan_b'),'MANUAL',null,null,'{}'::jsonb
);
insert into workout_gate_context
select 'published_session_b', public.add_workout_session(
  (select value from workout_gate_context where key='published_version_b'),'Treino B',null,35
);
insert into workout_gate_context
select 'published_section_b', public.add_workout_section(
  (select value from workout_gate_context where key='published_session_b'),'MAIN',null
);
insert into workout_gate_context
select 'published_exercise_b', public.add_workout_exercise(
  (select value from workout_gate_context where key='published_section_b'),
  (select value from workout_gate_context where key='custom_b'),null,null,'Execução B',null
);
select public.upsert_workout_set(
  null,(select value from workout_gate_context where key='published_exercise_b'),1,'STANDARD',
  10,null,null,20,'kg',null,null,null,60,7,null
);
select public.approve_workout_version((select value from workout_gate_context where key='published_version_b'));
select public.publish_workout_version((select value from workout_gate_context where key='published_version_b'));

insert into workout_gate_context
select 'approved_plan_b', public.create_workout_plan(
  '4a300000-0000-4000-8000-000000000002','Approved B',null
);
insert into workout_gate_context
select 'approved_version_b', public.create_workout_draft_version(
  (select value from workout_gate_context where key='approved_plan_b'),'MANUAL',null,null,'{}'::jsonb
);
insert into workout_gate_context
select 'approved_session_b', public.add_workout_session(
  (select value from workout_gate_context where key='approved_version_b'),'Aprovado B',null,35
);
insert into workout_gate_context
select 'approved_section_b', public.add_workout_section(
  (select value from workout_gate_context where key='approved_session_b'),'MAIN',null
);
insert into workout_gate_context
select 'approved_exercise_b', public.add_workout_exercise(
  (select value from workout_gate_context where key='approved_section_b'),
  '4a400000-0000-4000-8000-000000000001',null,null,'Execução B',null
);
select public.upsert_workout_set(
  null,(select value from workout_gate_context where key='approved_exercise_b'),1,'STANDARD',
  12,null,null,null,null,null,null,null,45,7,null
);
select public.approve_workout_version((select value from workout_gate_context where key='approved_version_b'));

insert into workout_gate_results values
  ('Trainer B cannot read Trainer A DRAFT', not exists(
    select 1 from public.workout_plan_versions
    where id = (select value from workout_gate_context where key='draft_version_a')
  )),
  ('Trainer B cannot get Trainer A projection', pg_temp.raises(format(
    'select public.get_trainer_workout_version(%L::uuid)',
    (select value from workout_gate_context where key='draft_version_a')
  ))),
  ('Trainer B cannot edit Trainer A plan', pg_temp.raises(format(
    'select public.add_workout_session(%L::uuid,%L,null,30)',
    (select value from workout_gate_context where key='draft_version_a'),'Cross tenant session'
  ))),
  ('Trainer B cannot publish to Trainer A student', pg_temp.raises(format(
    'select public.publish_workout_version(%L::uuid)',
    (select value from workout_gate_context where key='approved_version_a')
  ))),
  ('Trainer custom exercise is tenant private', not exists(
    select 1 from public.exercises
    where id = (select value from workout_gate_context where key='custom_a')
  )),
  ('Trainer B cannot attach media to Trainer A custom exercise', pg_temp.raises(format(
    'select public.add_custom_exercise_media(%L::uuid,%L,%L,null,%L,%L,null,null)',
    (select value from workout_gate_context where key='custom_a'),
    'VIDEO','https://www.youtube.com/watch?v=ZyXwVu_9876','YOUTUBE','https://www.youtube.com/watch?v=ZyXwVu_9876'
  ))),
  ('AI_DRAFT has no broader authorization', not exists(
    select 1 from public.workout_plan_versions
    where id = (select value from workout_gate_context where key='ai_version_a')
  ));

-- Student A sees only own published/historical content and no trainer-private fields.
set local role postgres;
set local role authenticated;
set local request.jwt.claims = '{"sub":"4a000000-0000-4000-8000-000000000003","role":"authenticated"}';
insert into workout_gate_results values
  ('Student cannot read DRAFT', not exists(
    select 1 from public.workout_plan_versions
    where id = (select value from workout_gate_context where key='draft_version_a')
  )),
  ('Student cannot read APPROVED', not exists(
    select 1 from public.workout_plan_versions
    where id = (select value from workout_gate_context where key='approved_version_a')
  )),
  ('Student reads own PUBLISHED plan', exists(
    select 1 from public.workout_plan_versions
    where id = (select value from workout_gate_context where key='published_v1_a')
  )),
  ('Student projection returns multi-session workout', (
    select jsonb_array_length(public.get_student_workout_version(
      (select value from workout_gate_context where key='published_v1_a')
    ) -> 'sessions') = 2
  )),
  ('Student projection excludes trainer note', (
    select not (public.get_student_workout_version(
      (select value from workout_gate_context where key='published_v1_a')
    )::text like '%Privado%')
  )),
  ('Assigned student resolves published custom exercise', exists(
    select 1 from public.exercises
    where id = (select value from workout_gate_context where key='custom_a')
  )),
  ('Assigned student sees only approved exercise media', not exists(
    select 1 from public.exercise_media
    where id = (select value from workout_gate_context where key='custom_media_a')
  )),
  ('Assigned student sees approved Trainer YouTube reference', exists(
    select 1 from public.exercise_media
    where id = (select value from workout_gate_context where key='custom_youtube_a')
      and production_status = 'APPROVED'
      and provider = 'YOUTUBE'
  )),
  ('Student projection contains Trainer YouTube reference', (
    select public.get_student_workout_version(
      (select value from workout_gate_context where key='published_v1_a')
    )::text like '%youtube.com%'
  )),
  ('Student cannot mutate workout prescription',
    not has_table_privilege('authenticated','public.workout_sessions','INSERT,UPDATE,DELETE')
    and pg_temp.raises(format(
      'select public.add_workout_session(%L::uuid,%L,null,20)',
      (select value from workout_gate_context where key='draft_version_a'),'Student mutation'
    ))
  ),
  ('Student cannot discard Trainer Draft', pg_temp.raises(format(
    'select public.discard_workout_draft(%L::uuid)',
    (select value from workout_gate_context where key='ai_version_a')
  ))),
  ('Student A cannot read Student B published plan', not exists(
    select 1 from public.workout_plan_versions
    where id = (select value from workout_gate_context where key='published_version_b')
  ));

-- Student B cannot cross tenant.
set local role postgres;
set local role authenticated;
set local request.jwt.claims = '{"sub":"4a000000-0000-4000-8000-000000000004","role":"authenticated"}';
insert into workout_gate_results values
  ('Student B reads own published plan', exists(
    select 1 from public.workout_plan_versions
    where id = (select value from workout_gate_context where key='published_version_b')
  )),
  ('Student A plan is hidden from Student B', not exists(
    select 1 from public.workout_plan_versions
    where id = (select value from workout_gate_context where key='published_v1_a')
  )),
  ('Student B cannot get Student A projection', pg_temp.raises(format(
    'select public.get_student_workout_version(%L::uuid)',
    (select value from workout_gate_context where key='published_v1_a')
  )));

-- Version cloning and republishing preserve historical content.
set local role postgres;
set local role authenticated;
set local request.jwt.claims = '{"sub":"4a000000-0000-4000-8000-000000000001","role":"authenticated"}';
insert into workout_gate_results values
  ('Trainer A cannot read Trainer B private DRAFT', not exists(
    select 1 from public.workout_plan_versions
    where id = (select value from workout_gate_context where key='draft_version_b')
  )),
  ('Trainer A cannot edit Trainer B plan', pg_temp.raises(format(
    'select public.add_workout_session(%L::uuid,%L,null,30)',
    (select value from workout_gate_context where key='draft_version_b'),'Cross tenant A to B'
  ))),
  ('Trainer A cannot publish to Trainer B student', pg_temp.raises(format(
    'select public.publish_workout_version(%L::uuid)',
    (select value from workout_gate_context where key='approved_version_b')
  ))),
  ('Trainer A cannot discard Trainer B Draft', pg_temp.raises(format(
    'select public.discard_workout_draft(%L::uuid)',
    (select value from workout_gate_context where key='draft_version_b')
  )));

select public.discard_workout_draft((select value from workout_gate_context where key='ai_version_a'));
insert into workout_gate_results values
  ('Trainer discards own Draft without deleting history', (
    select status = 'ARCHIVED' and archived_at is not null
    from public.workout_plan_versions
    where id = (select value from workout_gate_context where key='ai_version_a')
  )),
  ('Discard appends an auditable lifecycle event', exists(
    select 1 from public.workout_events
    where workout_plan_version_id = (select value from workout_gate_context where key='ai_version_a')
      and event_type = 'ARCHIVED'
      and actor_user_id = '4a000000-0000-4000-8000-000000000001'::uuid
      and metadata ->> 'reason' = 'DRAFT_DISCARDED'
  )),
  ('Discarded Draft cannot be discarded twice', pg_temp.raises(format(
    'select public.discard_workout_draft(%L::uuid)',
    (select value from workout_gate_context where key='ai_version_a')
  ))),
  ('Approved workout cannot be discarded', pg_temp.raises(format(
    'select public.discard_workout_draft(%L::uuid)',
    (select value from workout_gate_context where key='approved_version_a')
  ))),
  ('Published workout cannot be discarded', pg_temp.raises(format(
    'select public.discard_workout_draft(%L::uuid)',
    (select value from workout_gate_context where key='published_v1_a')
  ))),
  ('Discard preserves the Trainer-Student relationship', exists(
    select 1 from public.trainer_student_relationships
    where id = '4a300000-0000-4000-8000-000000000001'::uuid
      and status = 'active'
  ));

set local role postgres;
set local role authenticated;
set local request.jwt.claims = '{"sub":"4a000000-0000-4000-8000-000000000003","role":"authenticated"}';
insert into workout_gate_results values
  ('Student cannot read a discarded Draft through RLS', not exists(
    select 1 from public.workout_plan_versions
    where id = (select value from workout_gate_context where key='ai_version_a')
  )),
  ('Student cannot open a discarded Draft projection', pg_temp.raises(format(
    'select public.get_student_workout_version(%L::uuid)',
    (select value from workout_gate_context where key='ai_version_a')
  ))),
  ('Discarded Draft is absent from Student workout list', public.list_student_published_workouts()::text not like
    '%' || (select value::text from workout_gate_context where key='ai_version_a') || '%'
  );

set local role postgres;
set local role authenticated;
set local request.jwt.claims = '{"sub":"4a000000-0000-4000-8000-000000000001","role":"authenticated"}';
insert into workout_gate_context
select 'published_v2_draft_a', public.create_new_draft_from_published_version(
  (select value from workout_gate_context where key='published_v1_a')
);
insert into workout_gate_results values
  ('Published clone creates new DRAFT version', (
    select
      public.get_trainer_workout_version(
        (select value from workout_gate_context where key='published_v2_draft_a')
      ) #>> '{version,status}' = 'DRAFT'
      and public.get_trainer_workout_version(
        (select value from workout_gate_context where key='published_v2_draft_a')
      ) #>> '{version,version_number}' = '2'
      and public.get_trainer_workout_version(
        (select value from workout_gate_context where key='published_v2_draft_a')
      ) #>> '{version,source_version_id}' = (
        select value::text from workout_gate_context where key='published_v1_a'
      )
  )),
  ('Clone preserves structured hierarchy', (
    select
      (select count(*) from public.workout_sessions where workout_plan_version_id = (select value from workout_gate_context where key='published_v1_a'))
      =
      (select count(*) from public.workout_sessions where workout_plan_version_id = (select value from workout_gate_context where key='published_v2_draft_a'))
      and
      (select count(*) from public.workout_sets set_row
       join public.workout_exercises prescribed on prescribed.id = set_row.workout_exercise_id
       join public.workout_sections section on section.id = prescribed.workout_section_id
       join public.workout_sessions session on session.id = section.workout_session_id
       where session.workout_plan_version_id = (select value from workout_gate_context where key='published_v1_a'))
      =
      (select count(*) from public.workout_sets set_row
       join public.workout_exercises prescribed on prescribed.id = set_row.workout_exercise_id
       join public.workout_sections section on section.id = prescribed.workout_section_id
       join public.workout_sessions session on session.id = section.workout_session_id
       where session.workout_plan_version_id = (select value from workout_gate_context where key='published_v2_draft_a'))
  )),
  ('Published structure rejects privileged mutation', pg_temp.raises(format(
    'insert into public.workout_sessions(workout_plan_version_id,name,sort_order) values (%L::uuid,%L,99)',
    (select value from workout_gate_context where key='published_v1_a'),'Illegal published mutation'
  )));
select public.approve_workout_version((select value from workout_gate_context where key='published_v2_draft_a'));
select public.publish_workout_version((select value from workout_gate_context where key='published_v2_draft_a'));
insert into workout_gate_results values
  ('Publishing V2 archives V1 atomically', (
    select
      (select status from public.workout_plan_versions where id = (select value from workout_gate_context where key='published_v1_a')) = 'ARCHIVED'
      and
      (select status from public.workout_plan_versions where id = (select value from workout_gate_context where key='published_v2_draft_a')) = 'PUBLISHED'
  )),
  ('Historical published versions are preserved', (
    select count(*) = 2 from public.workout_plan_versions
    where workout_plan_id = (select value from workout_gate_context where key='published_plan_a')
      and published_at is not null
  )),
  ('Lifecycle audit events are appended', (
    select count(*) >= 6 and bool_and(actor_user_id = '4a000000-0000-4000-8000-000000000001'::uuid)
    from public.workout_events
    where workout_plan_id = (select value from workout_gate_context where key='published_plan_a')
      and event_type in ('WORKOUT_CREATED','DRAFT_CREATED','APPROVED','PUBLISHED','ARCHIVED','NEW_DRAFT_FROM_PUBLISHED')
  )),
  ('Workout audit events reject update', pg_temp.raises(format(
    'update public.workout_events set metadata=%L::jsonb where workout_plan_id=%L::uuid',
    '{}',(select value from workout_gate_context where key='published_plan_a')
  )));

-- Relationship deactivation blocks new creation/publication but preserves history.
set local role postgres;
update public.trainer_student_relationships
set status = 'inactive', inactive_at = now(), ended_at = null
where id = '4a300000-0000-4000-8000-000000000001';
set local role authenticated;
set local request.jwt.claims = '{"sub":"4a000000-0000-4000-8000-000000000001","role":"authenticated"}';
insert into workout_gate_results values
  ('Inactive relationship cannot create workout', pg_temp.raises($sql$
    select public.create_workout_plan(
      '4a300000-0000-4000-8000-000000000001','Blocked inactive plan',null
    )
  $sql$)),
  ('Inactive relationship cannot publish workout', pg_temp.raises(format(
    'select public.publish_workout_version(%L::uuid)',
    (select value from workout_gate_context where key='approved_version_a')
  ))),
  ('Inactive trainer retains historical published read', exists(
    select 1 from public.workout_plan_versions
    where id = (select value from workout_gate_context where key='published_v2_draft_a')
  ));

set local role postgres;
set local role authenticated;
set local request.jwt.claims = '{"sub":"4a000000-0000-4000-8000-000000000003","role":"authenticated"}';
insert into workout_gate_results values
  ('Inactive student retains historical published read', exists(
    select 1 from public.workout_plan_versions
    where id in (
      (select value from workout_gate_context where key='published_v1_a'),
      (select value from workout_gate_context where key='published_v2_draft_a')
    )
  ));

-- Anonymous surface is closed.
set local role postgres;
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
insert into workout_gate_results values
  ('Anonymous cannot access workout plans',
    not has_table_privilege('anon','public.workout_plans','SELECT,INSERT,UPDATE,DELETE')
    and pg_temp.raises('select id from public.workout_plans limit 1')
  ),
  ('Anonymous cannot execute workout RPC',
    not has_function_privilege('anon','public.create_workout_plan(uuid,text,text)','EXECUTE')
    and not has_function_privilege('anon','public.discard_workout_draft(uuid)','EXECUTE')
    and pg_temp.raises($sql$
      select public.create_workout_plan(
        '4a300000-0000-4000-8000-000000000001','Anonymous plan',null
      )
    $sql$)
  );

set local role postgres;
do $$
declare failures text;
begin
  select string_agg(scenario, E'\n' order by scenario) into failures
  from workout_gate_results where not passed;
  if failures is not null then
    raise exception E'Sprint 4A workout gate failures:\n%', failures;
  end if;
end;
$$;

table workout_gate_results;
rollback;
