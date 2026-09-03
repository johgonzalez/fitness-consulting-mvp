-- P0 Smart Auth security gate. All fixtures roll back.
begin;

create temp table smart_auth_results(scenario text primary key, passed boolean not null);
grant select, insert on smart_auth_results to authenticated;
create or replace function pg_temp.raises(p_sql text) returns boolean language plpgsql as $$
begin execute p_sql; return false; exception when others then return true; end; $$;
grant execute on function pg_temp.raises(text) to authenticated;
create temp table smart_auth_invite(invitation_id uuid, token text);
grant select, insert on smart_auth_invite to authenticated;

insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at) values
('a3000000-0000-4000-8000-000000000001','authenticated','authenticated','smart-trainer@example.test','',now(),now(),now()),
('a3000000-0000-4000-8000-000000000002','authenticated','authenticated','smart-student@example.test','',null,now(),now()),
('a3000000-0000-4000-8000-000000000003','authenticated','authenticated','smart-wrong@example.test','',now(),now(),now());
insert into public.app_users(id,display_name) values
('a3000000-0000-4000-8000-000000000001','Trainer Smart');
insert into public.user_roles(user_id,role_code) values
('a3000000-0000-4000-8000-000000000001','trainer');
insert into public.trainer_profiles(id,user_id,slug,display_name,professional_name,headline,bio,specialty,service_mode,whatsapp,published) values
('a3100000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001','trainer-smart-auth','Trainer Smart','Thiago Smart','A','A','Treino','online','5500000000301',false);

set local role authenticated;
set local request.jwt.claims='{"sub":"a3000000-0000-4000-8000-000000000001","role":"authenticated"}';
insert into smart_auth_invite(invitation_id,token)
select (value->>'invitation_id')::uuid,value->>'token'
from (select public.create_student_invitation('smart-student@example.test') value) created;

set local request.jwt.claims='{"sub":"a3000000-0000-4000-8000-000000000002","role":"authenticated"}';
insert into smart_auth_results values
('unconfirmed email sees no invitation',jsonb_array_length(public.get_my_pending_student_invitations())=0),
('unconfirmed email cannot accept',pg_temp.raises(format('select public.accept_my_pending_student_invitation(%L)',(select invitation_id from smart_auth_invite))));

reset role;
update auth.users set email_confirmed_at=now() where id='a3000000-0000-4000-8000-000000000002';
set local role authenticated;
set local request.jwt.claims='{"sub":"a3000000-0000-4000-8000-000000000003","role":"authenticated"}';
insert into smart_auth_results values
('different email sees no invitation',jsonb_array_length(public.get_my_pending_student_invitations())=0),
('different email cannot accept',pg_temp.raises(format('select public.accept_my_pending_student_invitation(%L)',(select invitation_id from smart_auth_invite))));

set local request.jwt.claims='{"sub":"a3000000-0000-4000-8000-000000000002","role":"authenticated"}';
insert into smart_auth_results values
('confirmed matching email sees one invitation',jsonb_array_length(public.get_my_pending_student_invitations())=1),
('lookup returns only safe keys',(select item ?& array['invitation_id','trainer_name','expires_at'] and not item ?| array['token','token_hash','email','trainer_profile_id'] from jsonb_array_elements(public.get_my_pending_student_invitations()) item));
select public.accept_my_pending_student_invitation((select invitation_id from smart_auth_invite));
insert into smart_auth_results values
('accept creates one relationship',(select count(*)=1 from public.trainer_student_relationships relationship join public.student_profiles student on student.id=relationship.student_profile_id where student.user_id='a3000000-0000-4000-8000-000000000002')),
('accept grants student role',(select count(*)=1 from public.user_roles where user_id='a3000000-0000-4000-8000-000000000002' and role_code='student' and revoked_at is null)),
('accepted invitation leaves pending lookup',jsonb_array_length(public.get_my_pending_student_invitations())=0),
('same-user direct replay is idempotent',public.accept_my_pending_student_invitation((select invitation_id from smart_auth_invite)) is not null),
('same-user token replay remains idempotent',public.accept_student_invitation((select token from smart_auth_invite),null) is not null),
('relationship remains unique',(select count(*)=1 from public.trainer_student_relationships relationship join public.student_profiles student on student.id=relationship.student_profile_id where student.user_id='a3000000-0000-4000-8000-000000000002'));

reset role;
insert into smart_auth_results values
('anon lookup denied',not has_function_privilege('anon','public.get_my_pending_student_invitations()','execute')),
('anon acceptance denied',not has_function_privilege('anon','public.accept_my_pending_student_invitation(uuid)','execute'));

do $$ begin
  if exists(select 1 from smart_auth_results where not passed) then
    raise exception 'Smart Auth security gate failed: %',(select string_agg(scenario,', ' order by scenario) from smart_auth_results where not passed);
  end if;
end $$;
rollback;
