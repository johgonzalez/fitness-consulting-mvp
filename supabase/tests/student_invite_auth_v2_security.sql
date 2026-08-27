-- Sprint 2 Student invite/Auth transactional security gate. Fixtures always roll back.
begin;

create temp table sprint2_results(scenario text primary key, passed boolean not null);
grant select, insert on sprint2_results to authenticated;
create or replace function pg_temp.raises(p_sql text) returns boolean language plpgsql as $$
begin execute p_sql; return false; exception when others then return true; end; $$;
grant execute on function pg_temp.raises(text) to authenticated;
create temp table sprint2_tokens(label text primary key, invitation_id uuid, token text, email text);
grant select, insert, update on sprint2_tokens to authenticated;

insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at) values
('f2000000-0000-4000-8000-000000000001','authenticated','authenticated','trainer-a-s2@example.test','',now(),now(),now()),
('f2000000-0000-4000-8000-000000000002','authenticated','authenticated','trainer-b-s2@example.test','',now(),now(),now()),
('f2000000-0000-4000-8000-000000000003','authenticated','authenticated','student-a-s2@example.test','',now(),now(),now()),
('f2000000-0000-4000-8000-000000000004','authenticated','authenticated','wrong-student-s2@example.test','',now(),now(),now());
insert into public.app_users(id,display_name) values
('f2000000-0000-4000-8000-000000000001','Trainer A'),('f2000000-0000-4000-8000-000000000002','Trainer B');
insert into public.user_roles(user_id,role_code) values
('f2000000-0000-4000-8000-000000000001','trainer'),('f2000000-0000-4000-8000-000000000002','trainer');
insert into public.trainer_profiles(id,user_id,slug,display_name,headline,bio,specialty,service_mode,whatsapp,published) values
('f2100000-0000-4000-8000-000000000001','f2000000-0000-4000-8000-000000000001','trainer-a-sprint2','Trainer A','A','A','Treino','online','5500000000201',false),
('f2100000-0000-4000-8000-000000000002','f2000000-0000-4000-8000-000000000002','trainer-b-sprint2','Trainer B','B','B','Treino','online','5500000000202',false);

set local role authenticated;
set local request.jwt.claims='{"sub":"f2000000-0000-4000-8000-000000000001","role":"authenticated"}';
insert into sprint2_tokens(label,invitation_id,token,email)
select 'primary',(value->>'invitation_id')::uuid,value->>'token',value->>'email'
from (select public.create_student_invitation('student-a-s2@example.test') value) created;
insert into sprint2_results values
('email-only create',(select email='student-a-s2@example.test' and length(token)=64 from sprint2_tokens where label='primary')),
('same email edit unchanged',(public.edit_my_student_invitation_email((select invitation_id from sprint2_tokens where label='primary'),'STUDENT-A-S2@example.test')->>'status')='UNCHANGED');

reset role;
update public.student_invitations set last_delivery_attempt_at=now()-interval '2 minutes'
where id=(select invitation_id from sprint2_tokens where label='primary');
set local role authenticated;
set local request.jwt.claims='{"sub":"f2000000-0000-4000-8000-000000000002","role":"authenticated"}';
insert into sprint2_results values
('cross-trainer resend denied',pg_temp.raises(format('select public.prepare_my_student_invitation_resend(%L)',(select invitation_id from sprint2_tokens where label='primary'))));

set local request.jwt.claims='{"sub":"f2000000-0000-4000-8000-000000000001","role":"authenticated"}';
insert into sprint2_tokens(label,invitation_id,token,email)
select 'resent',(value->>'invitation_id')::uuid,value->>'token',value->>'email'
from (select public.prepare_my_student_invitation_resend((select invitation_id from sprint2_tokens where label='primary')) value) resent;
insert into sprint2_results values
('resend same row',(select p.invitation_id=r.invitation_id from sprint2_tokens p join sprint2_tokens r on r.label='resent' where p.label='primary')),
('resend rotates token',(select p.token<>r.token from sprint2_tokens p join sprint2_tokens r on r.label='resent' where p.label='primary')),
('rapid resend denied',pg_temp.raises(format('select public.prepare_my_student_invitation_resend(%L)',(select invitation_id from sprint2_tokens where label='primary'))));

insert into sprint2_tokens(label,invitation_id,token,email)
select 'edited',(value->>'invitation_id')::uuid,value->>'token',value->>'email'
from (select public.edit_my_student_invitation_email((select invitation_id from sprint2_tokens where label='primary'),'student-a-s2-new@example.test') value) edited;
insert into sprint2_results values
('edit keeps history row',(select p.invitation_id=e.invitation_id from sprint2_tokens p join sprint2_tokens e on e.label='edited' where p.label='primary')),
('edit rotates token',(select r.token<>e.token from sprint2_tokens r join sprint2_tokens e on e.label='edited' where r.label='resent'));

-- Return to the confirmed authoritative recipient and accept once.
insert into sprint2_tokens(label,invitation_id,token,email)
select 'accept',(value->>'invitation_id')::uuid,value->>'token',value->>'email'
from (select public.create_student_invitation('student-a-s2@example.test') value) created;
set local request.jwt.claims='{"sub":"f2000000-0000-4000-8000-000000000004","role":"authenticated"}';
insert into sprint2_results values
('wrong confirmed email denied',pg_temp.raises(format('select public.accept_student_invitation(%L,null)',(select token from sprint2_tokens where label='accept'))));
set local request.jwt.claims='{"sub":"f2000000-0000-4000-8000-000000000003","role":"authenticated"}';
select public.accept_student_invitation((select token from sprint2_tokens where label='accept'),null);
insert into sprint2_results values
('accept creates one relationship',(select count(*)=1 from public.trainer_student_relationships relationship join public.student_profiles profile on profile.id=relationship.student_profile_id where profile.user_id='f2000000-0000-4000-8000-000000000003')),
('accept grants student role',(select count(*)=1 from public.user_roles where user_id='f2000000-0000-4000-8000-000000000003' and role_code='student' and revoked_at is null)),
('same-user replay idempotent',public.accept_student_invitation((select token from sprint2_tokens where label='accept'),null) is not null);
select public.update_my_student_profile('Student A','+1 (415) 555-0123',null);
insert into sprint2_results values
('international phone normalized',(select whatsapp_e164='+14155550123' from public.student_profiles where user_id='f2000000-0000-4000-8000-000000000003'));

reset role;
do $$ begin
  if exists(select 1 from sprint2_results where not passed) then
    raise exception 'Sprint 2 security gate failed: %',(select string_agg(scenario,', ') from sprint2_results where not passed);
  end if;
end $$;
rollback;
