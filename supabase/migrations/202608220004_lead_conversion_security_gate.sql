-- Sprint 2 static and transactional security gate. Fixtures roll back.
do $$
declare failures text[] := '{}'; function_record record;
begin
  if not (select relrowsecurity from pg_class where oid='public.lead_conversions'::regclass) then failures:=array_append(failures,'lead_conversions RLS disabled'); end if;
  if has_table_privilege('anon','public.lead_conversions','SELECT') then failures:=array_append(failures,'anonymous conversion read'); end if;
  if has_table_privilege('authenticated','public.lead_conversions','INSERT') or has_table_privilege('authenticated','public.lead_matches','UPDATE') then failures:=array_append(failures,'direct lifecycle mutation granted'); end if;
  if has_column_privilege('authenticated','public.student_invitations','token_hash','SELECT') then failures:=array_append(failures,'invitation token hash exposed'); end if;
  if has_function_privilege('anon','public.convert_my_lead(uuid)','EXECUTE') or has_function_privilege('anon','public.get_my_students()','EXECUTE') then failures:=array_append(failures,'anonymous Sprint 2 RPC access'); end if;
  for function_record in select p.oid, p.prosecdef, p.proconfig from pg_proc p where p.oid in (
    'public.create_named_student_invitation(text,text)'::regprocedure,
    'public.reject_my_lead(uuid)'::regprocedure, 'public.convert_my_lead(uuid)'::regprocedure,
    'public.accept_student_invitation(text,text)'::regprocedure,
    'public.get_my_students()'::regprocedure, 'public.get_my_student_detail(uuid)'::regprocedure
  ) loop
    if not function_record.prosecdef then failures:=array_append(failures,'Sprint 2 function is not SECURITY DEFINER'); end if;
    if function_record.proconfig is null or array_to_string(function_record.proconfig, ',') !~ '^search_path=(""|)$' then failures:=array_append(failures,'Sprint 2 function search_path is not empty'); end if;
  end loop;
  if cardinality(failures)>0 then raise exception 'Sprint 2 static gate failed: %',array_to_string(failures,', '); end if;
end $$;

begin;
create temp table sprint2_results(scenario text primary key, passed boolean not null);
create temp table sprint2_tokens(label text primary key, token text, invitation_id uuid, relationship_id uuid);
grant select,insert,update on sprint2_results,sprint2_tokens to public;

insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at) values
('21000000-0000-4000-8000-000000000001','authenticated','authenticated','s2-trainer-a@example.test','',now(),now(),now()),
('22000000-0000-4000-8000-000000000002','authenticated','authenticated','s2-trainer-b@example.test','',now(),now(),now()),
('23000000-0000-4000-8000-000000000003','authenticated','authenticated','new.student@example.test','',now(),now(),now()),
('24000000-0000-4000-8000-000000000004','authenticated','authenticated','existing.student@example.test','',now(),now(),now()),
('25000000-0000-4000-8000-000000000005','authenticated','authenticated','other.student@example.test','',now(),now(),now());
insert into public.trainer_profiles(id,user_id,slug,display_name,headline,bio,specialty,service_mode,whatsapp,published) values
('21100000-0000-4000-8000-000000000001','21000000-0000-4000-8000-000000000001','s2-trainer-a','Trainer A','A','A','Strength','online','+15555550101',false),
('22100000-0000-4000-8000-000000000002','22000000-0000-4000-8000-000000000002','s2-trainer-b','Trainer B','B','B','Mobility','online','+15555550102',false);
insert into public.app_users(id,display_name) values
('24000000-0000-4000-8000-000000000004','Existing Student'),
('25000000-0000-4000-8000-000000000005','Other Student');
insert into public.user_roles(user_id,role_code) values
('24000000-0000-4000-8000-000000000004','student'),('25000000-0000-4000-8000-000000000005','student');
insert into public.student_profiles(id,user_id,preferred_name) values
('24100000-0000-4000-8000-000000000004','24000000-0000-4000-8000-000000000004','Existing Student'),
('25100000-0000-4000-8000-000000000005','25000000-0000-4000-8000-000000000005','Other Student');

insert into public.student_leads(id,first_name,whatsapp,email,goal,service_mode,budget_band,start_timing,consent_at,anonymous_session_hash) values
('21200000-0000-4000-8000-000000000001','New Student','15555550111','new.student@example.test','health','online','unknown','now',now(),repeat('a',64)),
('21200000-0000-4000-8000-000000000002','Expired Lead','15555550112','expired@example.test','health','online','unknown','now',now(),repeat('b',64)),
('21200000-0000-4000-8000-000000000003','Rejected Lead','15555550113','rejected@example.test','health','online','unknown','now',now(),repeat('c',64));
insert into public.lead_matches(id,lead_id,trainer_id,score,status,created_at) values
('21300000-0000-4000-8000-000000000001','21200000-0000-4000-8000-000000000001','21100000-0000-4000-8000-000000000001',90,'new',now()),
('21300000-0000-4000-8000-000000000002','21200000-0000-4000-8000-000000000001','22100000-0000-4000-8000-000000000002',80,'new',now()),
('21300000-0000-4000-8000-000000000003','21200000-0000-4000-8000-000000000002','21100000-0000-4000-8000-000000000001',70,'new',now()-interval '4 days'),
('21300000-0000-4000-8000-000000000004','21200000-0000-4000-8000-000000000003','21100000-0000-4000-8000-000000000001',60,'new',now());

-- Cross-tenant mutations are indistinguishable from unavailable resources.
set local role authenticated; set local request.jwt.claims='{"sub":"21000000-0000-4000-8000-000000000001","role":"authenticated"}';
do $$ begin
  begin perform public.convert_my_lead('21300000-0000-4000-8000-000000000002'); insert into sprint2_results values('cross-trainer convert denied',false);
  exception when others then insert into sprint2_results values('cross-trainer convert denied',sqlerrm='lead_not_available'); end;
  begin perform public.reject_my_lead('21300000-0000-4000-8000-000000000002'); insert into sprint2_results values('cross-trainer reject denied',false);
  exception when others then insert into sprint2_results values('cross-trainer reject denied',sqlerrm='lead_not_available'); end;
end $$;
insert into sprint2_tokens(label,token,invitation_id)
select 'converted',response->>'token',(response->>'invitation_id')::uuid
from (select public.convert_my_lead('21300000-0000-4000-8000-000000000001') response) converted;
select public.reject_my_lead('21300000-0000-4000-8000-000000000004');
do $$ begin
  begin perform public.convert_my_lead('21300000-0000-4000-8000-000000000001'); insert into sprint2_results values('duplicate conversion denied',false);
  exception when others then insert into sprint2_results values('duplicate conversion denied',sqlerrm='lead_not_actionable'); end;
  begin perform public.convert_my_lead('21300000-0000-4000-8000-000000000003'); insert into sprint2_results values('expired conversion denied',false);
  exception when others then insert into sprint2_results values('expired conversion denied',sqlerrm='lead_not_actionable'); end;
  begin perform public.convert_my_lead('21300000-0000-4000-8000-000000000004'); insert into sprint2_results values('rejected conversion denied',false);
  exception when others then insert into sprint2_results values('rejected conversion denied',sqlerrm='lead_not_actionable'); end;
end $$;
reset role; set local role postgres;

insert into sprint2_results values
('conversion preserves lead',exists(select 1 from public.student_leads where id='21200000-0000-4000-8000-000000000001')),
('single conversion audit created',(select count(*)=1 from public.lead_conversions where lead_id='21200000-0000-4000-8000-000000000001')),
('other trainer reservation closed',(select status='rejected' from public.lead_matches where id='21300000-0000-4000-8000-000000000002')),
('rejection recorded',(select status='rejected' and rejected_at is not null from public.lead_matches where id='21300000-0000-4000-8000-000000000004'));

set local role authenticated; set local request.jwt.claims='{"sub":"23000000-0000-4000-8000-000000000003","role":"authenticated"}';
update sprint2_tokens set relationship_id=public.accept_student_invitation(token,null) where label='converted';
reset role; set local role postgres;
insert into sprint2_results values
('conversion acceptance linked',(select status='completed' and student_profile_id is not null and relationship_id is not null from public.lead_conversions where lead_id='21200000-0000-4000-8000-000000000001')),
('conversion relationship active',(select status='active' and origin='lead_conversion' from public.trainer_student_relationships where id=(select relationship_id from sprint2_tokens where label='converted')));

-- Existing student profile and inactive relationship are reused by a manual invitation.
insert into public.trainer_student_relationships(id,trainer_profile_id,student_profile_id,status,origin,started_at,inactive_at,created_by_user_id) values
('24200000-0000-4000-8000-000000000004','21100000-0000-4000-8000-000000000001','24100000-0000-4000-8000-000000000004','inactive','invitation',now()-interval '30 days',now()-interval '1 day','21000000-0000-4000-8000-000000000001');
set local role authenticated; set local request.jwt.claims='{"sub":"21000000-0000-4000-8000-000000000001","role":"authenticated"}';
insert into sprint2_tokens(label,token,invitation_id) select 'manual',response->>'token',(response->>'invitation_id')::uuid from (select public.create_named_student_invitation('existing.student@example.test','Existing Student') response) invited;
insert into sprint2_results values('trainer sees only own students',jsonb_array_length(public.get_my_students()->'relationships')=2);
reset role; set local role postgres;
set local role authenticated; set local request.jwt.claims='{"sub":"24000000-0000-4000-8000-000000000004","role":"authenticated"}';
update sprint2_tokens set relationship_id=public.accept_student_invitation(token,null) where label='manual';
reset role; set local role postgres;
insert into sprint2_results values
('manual invitation reuses student profile',(select count(*)=1 from public.student_profiles where user_id='24000000-0000-4000-8000-000000000004')),
('reactivation reuses relationship',(select count(*)=1 and bool_and(status='active') from public.trainer_student_relationships where trainer_profile_id='21100000-0000-4000-8000-000000000001' and student_profile_id='24100000-0000-4000-8000-000000000004'));

set local role authenticated; set local request.jwt.claims='{"sub":"22000000-0000-4000-8000-000000000002","role":"authenticated"}';
insert into sprint2_results values
('cross-tenant relationship read denied',(select count(*)=0 from public.trainer_student_relationships where trainer_profile_id='21100000-0000-4000-8000-000000000001')),
('cross-tenant conversion read denied',(select count(*)=0 from public.lead_conversions where trainer_profile_id='21100000-0000-4000-8000-000000000001'));
do $$ begin begin perform public.deactivate_my_trainer_student_relationship('24200000-0000-4000-8000-000000000004');insert into sprint2_results values('cross-tenant relationship mutation denied',false);exception when others then insert into sprint2_results values('cross-tenant relationship mutation denied',sqlerrm='relationship_not_available');end;end $$;
reset role; set local role postgres;

set local role authenticated; set local request.jwt.claims='{"sub":"23000000-0000-4000-8000-000000000003","role":"authenticated"}';
insert into sprint2_results values('student cross-tenant profile denied',(select count(*)=0 from public.student_profiles where user_id='25000000-0000-4000-8000-000000000005'));
reset role; set local role postgres;

do $$ declare failures text; begin select string_agg(scenario,', ' order by scenario) into failures from sprint2_results where not passed;if failures is not null then raise exception 'Sprint 2 functional/security gate failed: %',failures;end if;end $$;
rollback;
