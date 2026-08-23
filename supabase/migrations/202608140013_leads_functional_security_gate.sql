-- Transactional Sprint 4 functional/RLS gate. Fixtures are rolled back.
begin;
create temp table sprint4_results(scenario text primary key,passed boolean not null); grant select,insert on sprint4_results to public;
insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at) values
('a4000000-0000-4000-8000-000000000001','authenticated','authenticated','s4-a@example.test','',now(),now(),now()),
('b4000000-0000-4000-8000-000000000002','authenticated','authenticated','s4-b@example.test','',now(),now(),now()),
('c4000000-0000-4000-8000-000000000003','authenticated','authenticated','s4-free@example.test','',now(),now(),now());
insert into public.trainer_profiles(id,user_id,slug,display_name,headline,bio,specialty,city,service_mode,whatsapp,published) values
('a4100000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000001','s4-trainer-a','Trainer A','A','A','Emagrecimento','Campinas','both','5511999990001',true),
('b4100000-0000-4000-8000-000000000002','b4000000-0000-4000-8000-000000000002','s4-trainer-b','Trainer B','B','B','Performance','Santos','presencial','5511999990002',true),
('c4100000-0000-4000-8000-000000000003','c4000000-0000-4000-8000-000000000003','s4-trainer-free','Trainer Free','C','C','Saude','Campinas','online','5511999990003',false);
insert into public.services(id,trainer_id,title,description,service_mode,price,currency,billing_type,price_visibility,price_visible,active) values
('a4200000-0000-4000-8000-000000000001','a4100000-0000-4000-8000-000000000001','Online A','A','online',200,'BRL','monthly','match_only',false,true),
('b4200000-0000-4000-8000-000000000002','b4100000-0000-4000-8000-000000000002','Presencial B','B','presencial',500,'BRL','monthly','public',true,true),
('c4200000-0000-4000-8000-000000000003','c4100000-0000-4000-8000-000000000003','Online C','C','online',200,'BRL','monthly','public',true,true);
update public.trainer_entitlements set can_receive_leads=true,can_use_matching=true where trainer_id in('a4100000-0000-4000-8000-000000000001','b4100000-0000-4000-8000-000000000002');
insert into public.trainer_lead_settings(trainer_id,objectives,service_mode,city,state,service_ids,accepting_new_clients) values
('a4100000-0000-4000-8000-000000000001','{weight_loss,health}','both','Campinas','SP','{a4200000-0000-4000-8000-000000000001}',true),
('b4100000-0000-4000-8000-000000000002','{performance}','presencial','Santos','SP','{b4200000-0000-4000-8000-000000000002}',true);

set local role anon; set local request.jwt.claims='{"role":"anon"}';
select public.create_student_lead_and_match('Maria','5511988887777',null,'weight_loss','online',null,null,'from_150_to_250',150,250,'now',true,repeat('a',64));
reset role; set local role postgres;
insert into sprint4_results values
('anonymous lead persisted',(select count(*)=1 from public.student_leads where whatsapp='5511988887777' and consent_at is not null)),
('online matching score is 100',(select score=100 from public.lead_matches m join public.student_leads l on l.id=m.lead_id where l.whatsapp='5511988887777' and m.trainer_id='a4100000-0000-4000-8000-000000000001')),
('match-only price remains public-private',(select price is null from public.get_public_services('a4100000-0000-4000-8000-000000000001') limit 1)),
('match generated server-side',(select count(*) between 1 and 3 from public.lead_matches m join public.student_leads l on l.id=m.lead_id where l.whatsapp='5511988887777'));

insert into public.student_leads(id,first_name,whatsapp,goal,service_mode,budget_band,start_timing,consent_at,anonymous_session_hash) values('d4000000-0000-4000-8000-000000000004','Privado A','5511977776666','health','online','unknown','now',now(),repeat('d',64));
insert into public.lead_matches(lead_id,trainer_id,score) values('d4000000-0000-4000-8000-000000000004','a4100000-0000-4000-8000-000000000001',75);

set local role authenticated; set local request.jwt.claims='{"sub":"b4000000-0000-4000-8000-000000000002","role":"authenticated"}';
insert into sprint4_results values('Trainer B cannot read A-exclusive lead',(select count(*)=0 from public.student_leads where id='d4000000-0000-4000-8000-000000000004'));
reset role; set local role authenticated; set local request.jwt.claims='{"sub":"a4000000-0000-4000-8000-000000000001","role":"authenticated"}';
insert into sprint4_results values('Trainer A reads assigned lead',(select count(*)=1 from public.student_leads where id='d4000000-0000-4000-8000-000000000004'));
select public.set_my_lead_match_status((select id from public.lead_matches where lead_id='d4000000-0000-4000-8000-000000000004'),'contacted');
reset role; set local role postgres; insert into sprint4_results values('owner updates only status',(select status='contacted' and score=75 from public.lead_matches where lead_id='d4000000-0000-4000-8000-000000000004'));

set local role authenticated; set local request.jwt.claims='{"sub":"c4000000-0000-4000-8000-000000000003","role":"authenticated"}';
do $$ begin begin perform public.configure_my_leads_beta('{health}','online',null,null,'{c4200000-0000-4000-8000-000000000003}',true);insert into sprint4_results values('FREE entitlement bypass blocked',false);exception when others then insert into sprint4_results values('FREE entitlement bypass blocked',sqlerrm like '%leads_entitlement_required%');end;end $$;

reset role; set local role anon; set local request.jwt.claims='{"role":"anon"}';
select public.record_public_analytics('profile_view','s4-trainer-a',repeat('f',64)); select public.record_public_analytics('profile_view','s4-trainer-a',repeat('f',64)); select public.record_public_analytics('whatsapp_click','s4-trainer-a',repeat('f',64));
reset role; set local role postgres; insert into sprint4_results values
('profile view deduplicated 30 minutes',(select count(*)=1 from public.analytics_events where trainer_id='a4100000-0000-4000-8000-000000000001' and event_type='profile_view' and anonymous_session_hash=repeat('f',64))),
('whatsapp click recorded on event',(select count(*)=1 from public.analytics_events where trainer_id='a4100000-0000-4000-8000-000000000001' and event_type='whatsapp_click')),
('anonymous listing blocked',not has_table_privilege('anon','public.student_leads','select')),
('score manipulation blocked',not has_table_privilege('authenticated','public.lead_matches','update'));
do $$ declare failures text;begin select string_agg(scenario,', ' order by scenario) into failures from sprint4_results where not passed;if failures is not null then raise exception 'Sprint 4 functional gate failed: %',failures;end if;end $$;
rollback;
