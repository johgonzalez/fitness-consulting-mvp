-- Community Social V1 authorization, lifecycle, aggregation and ranking gate.
-- Runs transactionally and always rolls back.
begin;
create temp table community_social_results(scenario text primary key,passed boolean not null);
grant select,insert on community_social_results to authenticated,anon;
create or replace function pg_temp.raises(p_sql text) returns boolean language plpgsql as $$ begin execute p_sql; return false; exception when others then return true; end $$;
grant execute on function pg_temp.raises(text) to authenticated,anon;

insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at) values
('d1000000-0000-4000-8000-000000000001','authenticated','authenticated','social-trainer-a@example.test','',now(),now(),now()),
('d1000000-0000-4000-8000-000000000002','authenticated','authenticated','social-trainer-b@example.test','',now(),now(),now()),
('d1000000-0000-4000-8000-000000000003','authenticated','authenticated','social-student-a@example.test','',now(),now(),now()),
('d1000000-0000-4000-8000-000000000004','authenticated','authenticated','social-student-b@example.test','',now(),now(),now());
insert into public.trainer_profiles(id,user_id,slug,display_name,headline,bio,specialty,service_mode,whatsapp,published) values
('d1100000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001','social-trainer-a','Trainer Social A','A','A','Treino','online','5500000000811',false),
('d1100000-0000-4000-8000-000000000002','d1000000-0000-4000-8000-000000000002','social-trainer-b','Trainer Social B','B','B','Treino','online','5500000000812',false);
insert into public.app_users(id,display_name) values ('d1000000-0000-4000-8000-000000000003','Student Social A'),('d1000000-0000-4000-8000-000000000004','Student Social B');
insert into public.user_roles(user_id,role_code) values ('d1000000-0000-4000-8000-000000000003','student'),('d1000000-0000-4000-8000-000000000004','student');
insert into public.student_profiles(id,user_id,preferred_name) values
('d1200000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000003','Student Social A'),
('d1200000-0000-4000-8000-000000000002','d1000000-0000-4000-8000-000000000004','Student Social B');
insert into public.trainer_student_relationships(id,trainer_profile_id,student_profile_id,status,origin,started_at,created_by_user_id) values
('d1300000-0000-4000-8000-000000000001','d1100000-0000-4000-8000-000000000001','d1200000-0000-4000-8000-000000000001','active','invitation',now()-interval '30 days','d1000000-0000-4000-8000-000000000001'),
('d1300000-0000-4000-8000-000000000002','d1100000-0000-4000-8000-000000000002','d1200000-0000-4000-8000-000000000002','active','invitation',now()-interval '30 days','d1000000-0000-4000-8000-000000000002');
insert into public.access_grants(trainer_user_id,grant_type,metadata) values
('d1000000-0000-4000-8000-000000000001','FOUNDER_ACCESS','{"qa":true}'),
('d1000000-0000-4000-8000-000000000002','FOUNDER_ACCESS','{"qa":true}');

set local role authenticated; set local request.jwt.claims='{"sub":"d1000000-0000-4000-8000-000000000001","role":"authenticated"}';
select public.ensure_my_trainer_community();
select public.create_community_group('Equipe Forte','Grupo social direto','DISCOVERABLE','APPROVAL','ALL_MEMBERS','America/Sao_Paulo',true,'d1400000-0000-4000-8000-000000000001');
insert into community_social_results values
('owner memberships persisted',(select count(*)=2 from public.community_group_memberships where app_user_id='d1000000-0000-4000-8000-000000000001' and role='OWNER' and status='ACTIVE')),
('relationship membership backfilled',(select count(*)=1 from public.community_group_memberships where app_user_id='d1000000-0000-4000-8000-000000000003' and origin='RELATIONSHIP' and status='ACTIVE'));
select public.create_community_post_v1((select id from public.trainer_communities where trainer_profile_id='d1100000-0000-4000-8000-000000000001' and is_default),'TRAINER_ANNOUNCEMENT','Aviso do grupo padrão',null,'d1500000-0000-4000-8000-000000000001');
select public.invite_community_group_member((select id from public.trainer_communities where client_mutation_id='d1400000-0000-4000-8000-000000000001'),'d1000000-0000-4000-8000-000000000003');

set local role postgres; set local role authenticated; set local request.jwt.claims='{"sub":"d1000000-0000-4000-8000-000000000003","role":"authenticated"}';
select public.respond_community_group_membership((select id from public.trainer_communities where client_mutation_id='d1400000-0000-4000-8000-000000000001'),true);
insert into community_social_results values
('active user sees both groups',jsonb_array_length(public.list_my_community_groups())=2),
('aggregated feed includes active groups',jsonb_array_length(public.list_my_community_feed())=1);
select public.create_community_post_v1((select id from public.trainer_communities where client_mutation_id='d1400000-0000-4000-8000-000000000001'),'TEXT','Post do aluno',null,'d1500000-0000-4000-8000-000000000002');
select public.set_community_post_like_v1((select id from public.community_posts where client_mutation_id='d1500000-0000-4000-8000-000000000002'),true,'d1600000-0000-4000-8000-000000000001');
select public.set_community_post_like_v1((select id from public.community_posts where client_mutation_id='d1500000-0000-4000-8000-000000000002'),true,'d1600000-0000-4000-8000-000000000001');
select public.create_community_comment_v1((select id from public.community_posts where client_mutation_id='d1500000-0000-4000-8000-000000000002'),'Comentário idempotente','d1700000-0000-4000-8000-000000000001');
select public.create_community_comment_v1((select id from public.community_posts where client_mutation_id='d1500000-0000-4000-8000-000000000002'),'Comentário idempotente','d1700000-0000-4000-8000-000000000001');
insert into community_social_results values
('reaction idempotent',(select count(*)=1 from public.community_post_reactions where client_mutation_id='d1600000-0000-4000-8000-000000000001')),
('comment idempotent',(select count(*)=1 from public.community_post_comments where client_mutation_id='d1700000-0000-4000-8000-000000000001'));

set local role postgres;
update public.community_group_memberships set joined_at=now()-interval '10 days' where group_id=(select id from public.trainer_communities where client_mutation_id='d1400000-0000-4000-8000-000000000001') and app_user_id='d1000000-0000-4000-8000-000000000003';
insert into public.workout_plans(id,trainer_student_relationship_id,name,status,created_by) values ('d1800000-0000-4000-8000-000000000001','d1300000-0000-4000-8000-000000000001','Plano social','ACTIVE','d1000000-0000-4000-8000-000000000001');
insert into public.workout_plan_versions(id,workout_plan_id,version_number,status,source_type,approved_at,published_at,created_by) values ('d1810000-0000-4000-8000-000000000001','d1800000-0000-4000-8000-000000000001',1,'DRAFT','MANUAL',null,null,'d1000000-0000-4000-8000-000000000001');
insert into public.workout_sessions(id,workout_plan_version_id,name,estimated_duration_minutes,sort_order) values ('d1820000-0000-4000-8000-000000000001','d1810000-0000-4000-8000-000000000001','Treino social',45,0);
insert into public.workout_executions(id,trainer_student_relationship_id,student_profile_id,workout_plan_id,workout_plan_version_id,workout_session_id,status,started_at,completed_at,last_activity_at,created_by) values
('d1830000-0000-4000-8000-000000000001','d1300000-0000-4000-8000-000000000001','d1200000-0000-4000-8000-000000000001','d1800000-0000-4000-8000-000000000001','d1810000-0000-4000-8000-000000000001','d1820000-0000-4000-8000-000000000001','COMPLETED',((current_date-4)::timestamp at time zone 'America/Sao_Paulo')+interval '9 hours',((current_date-4)::timestamp at time zone 'America/Sao_Paulo')+interval '10 hours',((current_date-4)::timestamp at time zone 'America/Sao_Paulo')+interval '10 hours','d1000000-0000-4000-8000-000000000003'),
('d1830000-0000-4000-8000-000000000002','d1300000-0000-4000-8000-000000000001','d1200000-0000-4000-8000-000000000001','d1800000-0000-4000-8000-000000000001','d1810000-0000-4000-8000-000000000001','d1820000-0000-4000-8000-000000000001','COMPLETED',((current_date-4)::timestamp at time zone 'America/Sao_Paulo')+interval '13 hours',((current_date-4)::timestamp at time zone 'America/Sao_Paulo')+interval '14 hours',((current_date-4)::timestamp at time zone 'America/Sao_Paulo')+interval '14 hours','d1000000-0000-4000-8000-000000000003'),
('d1830000-0000-4000-8000-000000000003','d1300000-0000-4000-8000-000000000001','d1200000-0000-4000-8000-000000000001','d1800000-0000-4000-8000-000000000001','d1810000-0000-4000-8000-000000000001','d1820000-0000-4000-8000-000000000001','COMPLETED',((current_date-2)::timestamp at time zone 'America/Sao_Paulo')+interval '9 hours',((current_date-2)::timestamp at time zone 'America/Sao_Paulo')+interval '10 hours',((current_date-2)::timestamp at time zone 'America/Sao_Paulo')+interval '10 hours','d1000000-0000-4000-8000-000000000003'),
('d1830000-0000-4000-8000-000000000004','d1300000-0000-4000-8000-000000000001','d1200000-0000-4000-8000-000000000001','d1800000-0000-4000-8000-000000000001','d1810000-0000-4000-8000-000000000001','d1820000-0000-4000-8000-000000000001','COMPLETED',now()-interval '12 days 1 hour',now()-interval '12 days',now()-interval '12 days','d1000000-0000-4000-8000-000000000003');

set local role authenticated; set local request.jwt.claims='{"sub":"d1000000-0000-4000-8000-000000000003","role":"authenticated"}';
insert into community_social_results values ('ranking counts distinct eligible active days',((public.list_community_group_ranking((select id from public.trainer_communities where client_mutation_id='d1400000-0000-4000-8000-000000000001'),'ALL_TIME')->0->>'active_days')::integer=2));
select public.create_community_post_v1((select id from public.trainer_communities where client_mutation_id='d1400000-0000-4000-8000-000000000001'),'WORKOUT_COMPLETION','Treino compartilhado','d1830000-0000-4000-8000-000000000003','d1500000-0000-4000-8000-000000000003');
insert into community_social_results values ('workout share uses owned completed execution',(select count(*)=1 from public.community_posts where workout_execution_id='d1830000-0000-4000-8000-000000000003'));

set local role postgres; update public.trainer_student_relationships set status='inactive',inactive_at=now() where id='d1300000-0000-4000-8000-000000000001';
set local role authenticated; set local request.jwt.claims='{"sub":"d1000000-0000-4000-8000-000000000003","role":"authenticated"}';
insert into community_social_results values
('relationship membership revoked',(select count(*)=1 from public.community_group_memberships where app_user_id='d1000000-0000-4000-8000-000000000003' and origin='RELATIONSHIP' and status='REVOKED')),
('direct membership survives relationship end',(select count(*)=1 from public.community_group_memberships where app_user_id='d1000000-0000-4000-8000-000000000003' and origin='INVITE' and status='ACTIVE')),
('feed now excludes revoked group',jsonb_array_length(public.list_my_community_feed())=2);

set local role postgres; set local role authenticated; set local request.jwt.claims='{"sub":"d1000000-0000-4000-8000-000000000004","role":"authenticated"}';
insert into community_social_results values
('discoverable metadata visible',jsonb_array_length(public.search_community_groups('Equipe Forte'))=1),
('non-member post feed denied',pg_temp.raises(format('select public.list_community_group_posts(%L::uuid)',(select id from public.trainer_communities where client_mutation_id='d1400000-0000-4000-8000-000000000001'))));

set local role authenticated; set local request.jwt.claims='{"sub":"d1000000-0000-4000-8000-000000000001","role":"authenticated"}';
select public.moderate_community_content((select id from public.community_posts where client_mutation_id='d1500000-0000-4000-8000-000000000002'),null,true);
set local role postgres;
insert into community_social_results values ('moderation hides and audits',(select status='HIDDEN' from public.community_posts where client_mutation_id='d1500000-0000-4000-8000-000000000002') and (select count(*)=1 from public.community_moderation_events where action='CONTENT_HIDDEN'));

set local role anon; set local request.jwt.claims='{"role":"anon"}';
insert into community_social_results values ('anonymous social RPC denied',pg_temp.raises('select public.list_my_community_feed()'));
set local role postgres;
do $$ begin if exists(select 1 from community_social_results where not passed) then raise exception 'community social gate failed: %',(select string_agg(scenario,', ') from community_social_results where not passed); end if; end $$;
rollback;
