-- Sprint 03 Community transactional authorization gate. Always rolled back.
begin;
create temp table community_gate_results(scenario text primary key, passed boolean not null);
grant select,insert on community_gate_results to authenticated,anon;
create or replace function pg_temp.raises(p_sql text) returns boolean language plpgsql as $$ begin execute p_sql; return false; exception when others then return true; end $$;
grant execute on function pg_temp.raises(text) to authenticated,anon;

insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at) values
('c1000000-0000-4000-8000-000000000001','authenticated','authenticated','community-trainer-a@example.test','',now(),now(),now()),
('c1000000-0000-4000-8000-000000000002','authenticated','authenticated','community-trainer-b@example.test','',now(),now(),now()),
('c1000000-0000-4000-8000-000000000003','authenticated','authenticated','community-student-a@example.test','',now(),now(),now()),
('c1000000-0000-4000-8000-000000000004','authenticated','authenticated','community-student-b@example.test','',now(),now(),now());
insert into public.trainer_profiles(id,user_id,slug,display_name,headline,bio,specialty,service_mode,whatsapp,published) values
('c1100000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000001','community-trainer-a','Trainer A','A','A','Treino','online','5500000000711',false),
('c1100000-0000-4000-8000-000000000002','c1000000-0000-4000-8000-000000000002','community-trainer-b','Trainer B','B','B','Treino','online','5500000000712',false);
insert into public.app_users(id,display_name) values ('c1000000-0000-4000-8000-000000000003','Student A'),('c1000000-0000-4000-8000-000000000004','Student B');
insert into public.user_roles(user_id,role_code) values ('c1000000-0000-4000-8000-000000000003','student'),('c1000000-0000-4000-8000-000000000004','student');
insert into public.student_profiles(id,user_id,preferred_name) values ('c1200000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000003','Student A'),('c1200000-0000-4000-8000-000000000002','c1000000-0000-4000-8000-000000000004','Student B');
insert into public.trainer_student_relationships(id,trainer_profile_id,student_profile_id,status,origin,created_by_user_id) values
('c1300000-0000-4000-8000-000000000001','c1100000-0000-4000-8000-000000000001','c1200000-0000-4000-8000-000000000001','active','invitation','c1000000-0000-4000-8000-000000000001'),
('c1300000-0000-4000-8000-000000000002','c1100000-0000-4000-8000-000000000002','c1200000-0000-4000-8000-000000000002','active','invitation','c1000000-0000-4000-8000-000000000002');
insert into public.access_grants(trainer_user_id,grant_type,metadata) values ('c1000000-0000-4000-8000-000000000001','FOUNDER_ACCESS','{"qa":true}'),('c1000000-0000-4000-8000-000000000002','FOUNDER_ACCESS','{"qa":true}');

set local role authenticated; set local request.jwt.claims='{"sub":"c1000000-0000-4000-8000-000000000001","role":"authenticated"}';
select public.ensure_my_trainer_community(); select public.ensure_my_trainer_community();
insert into community_gate_results values ('one community per Trainer',(select count(*)=1 from public.trainer_communities where trainer_profile_id='c1100000-0000-4000-8000-000000000001'));
select public.ensure_my_trainer_community();
select public.create_community_post((select id from public.trainer_communities where trainer_profile_id='c1100000-0000-4000-8000-000000000001'),'TRAINER_ANNOUNCEMENT','Aviso seguro',null);
insert into community_gate_results values ('Trainer announcement',(select count(*)=1 from public.community_posts where post_type='TRAINER_ANNOUNCEMENT'));

set local role postgres; set local role authenticated; set local request.jwt.claims='{"sub":"c1000000-0000-4000-8000-000000000003","role":"authenticated"}';
insert into community_gate_results values
('active Student access',jsonb_array_length(public.get_my_communities())=1),
('Student announcement denied',pg_temp.raises(format('select public.create_community_post(%L::uuid,''TRAINER_ANNOUNCEMENT'',''No'',null)',(select id from public.trainer_communities where trainer_profile_id='c1100000-0000-4000-8000-000000000001')))),
('incomplete workout rejected',pg_temp.raises(format('select public.create_community_post(%L::uuid,''WORKOUT_COMPLETION'',null,%L::uuid)',(select id from public.trainer_communities where trainer_profile_id='c1100000-0000-4000-8000-000000000001'),'c1400000-0000-4000-8000-000000000001')));
select public.create_community_post((select id from public.trainer_communities where trainer_profile_id='c1100000-0000-4000-8000-000000000001'),'TEXT','Constância hoje',null);
select public.set_community_post_like((select id from public.community_posts where author_user_id='c1000000-0000-4000-8000-000000000003'),true);
select public.set_community_post_like((select id from public.community_posts where author_user_id='c1000000-0000-4000-8000-000000000003'),true);
insert into community_gate_results values ('like idempotent',(select count(*)=1 from public.community_post_reactions where user_id='c1000000-0000-4000-8000-000000000003'));
select public.set_community_post_like((select id from public.community_posts where author_user_id='c1000000-0000-4000-8000-000000000003'),false);
insert into community_gate_results values ('unlike',(select count(*)=0 from public.community_post_reactions where user_id='c1000000-0000-4000-8000-000000000003'));
select public.create_community_comment((select id from public.community_posts where author_user_id='c1000000-0000-4000-8000-000000000003'),'Comentário');
select public.report_community_content((select id from public.community_posts where author_user_id='c1000000-0000-4000-8000-000000000003'),null,'OTHER',null);
set local role postgres;
insert into community_gate_results values ('comment and report recorded',(select count(*)=1 from public.community_post_comments) and (select count(*)=1 from public.community_content_reports));

set local role authenticated; set local request.jwt.claims='{"sub":"c1000000-0000-4000-8000-000000000004","role":"authenticated"}';
insert into community_gate_results values ('cross Trainer isolation',pg_temp.raises(format('select public.list_my_community_posts(%L::uuid)',(select id from public.trainer_communities where trainer_profile_id='c1100000-0000-4000-8000-000000000001'))));

set local role postgres; update public.trainer_student_relationships set status='inactive',inactive_at=now() where id='c1300000-0000-4000-8000-000000000001';
set local role authenticated; set local request.jwt.claims='{"sub":"c1000000-0000-4000-8000-000000000003","role":"authenticated"}';
insert into community_gate_results values ('relationship deactivation denies',jsonb_array_length(public.get_my_communities())=0);

set local role postgres; update public.access_grants set status='REVOKED',revoked_at=now() where trainer_user_id='c1000000-0000-4000-8000-000000000001';
insert into community_gate_results values ('entitlement loss preserves data',(select count(*)>=2 from public.community_posts));
set local role anon; set local request.jwt.claims='{"role":"anon"}';
insert into community_gate_results values ('anonymous denied',pg_temp.raises('select public.get_my_communities()'));
set local role postgres;
do $$ begin if exists(select 1 from community_gate_results where not passed) then raise exception 'community gate failed: %',(select string_agg(scenario,', ') from community_gate_results where not passed); end if; end $$;
rollback;
