-- Sprint 1 transactional functional and security gate. All fixtures roll back.
begin;

create temp table sprint1_results (
  scenario text primary key,
  passed boolean not null
);
create temp table sprint1_tokens (
  label text primary key,
  token text not null,
  invitation_id uuid not null,
  relationship_id uuid
);
grant select, insert, update on sprint1_results, sprint1_tokens to public;

insert into auth.users(id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at) values
('11000000-0000-4000-8000-000000000001','authenticated','authenticated','trainer-a@example.test','',now(),now(),now()),
('12000000-0000-4000-8000-000000000002','authenticated','authenticated','trainer-b@example.test','',now(),now(),now()),
('13000000-0000-4000-8000-000000000003','authenticated','authenticated','student-a@example.test','',now(),now(),now()),
('14000000-0000-4000-8000-000000000004','authenticated','authenticated','student-b@example.test','',now(),now(),now()),
('15000000-0000-4000-8000-000000000005','authenticated','authenticated','role-only@example.test','',now(),now(),now()),
('16000000-0000-4000-8000-000000000006','authenticated','authenticated','expired@example.test','',now(),now(),now()),
('17000000-0000-4000-8000-000000000007','authenticated','authenticated','revoked@example.test','',now(),now(),now());

insert into public.trainer_profiles(id,user_id,slug,display_name,headline,bio,specialty,city,service_mode,whatsapp,published) values
('11100000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000001','s1-trainer-a','Trainer A','A','A','Strength',null,'online','+15555550101',false),
('12100000-0000-4000-8000-000000000002','12000000-0000-4000-8000-000000000002','s1-trainer-b','Trainer B','B','B','Mobility',null,'online','+15555550102',false);

insert into public.app_users(id, display_name) values
('15000000-0000-4000-8000-000000000005','Role Only');
insert into public.user_roles(user_id, role_code) values
('15000000-0000-4000-8000-000000000005','trainer');

insert into sprint1_results values
('trainer app identities synchronized', (
  select count(*) = 2 from public.app_users where id in (
    '11000000-0000-4000-8000-000000000001','12000000-0000-4000-8000-000000000002'
  )
)),
('trainer roles synchronized', (
  select count(*) = 2 from public.user_roles
  where role_code = 'trainer' and revoked_at is null and user_id in (
    '11000000-0000-4000-8000-000000000001','12000000-0000-4000-8000-000000000002'
  )
));

set local role authenticated;
set local request.jwt.claims = '{"sub":"11000000-0000-4000-8000-000000000001","role":"authenticated"}';
insert into sprint1_tokens(label, token, invitation_id)
select 'trainer-a-student-a', response->>'token', (response->>'invitation_id')::uuid
from (select public.create_student_invitation('Student-A@Example.Test') response) created;
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"12000000-0000-4000-8000-000000000002","role":"authenticated"}';
insert into sprint1_tokens(label, token, invitation_id)
select 'trainer-b-student-b', response->>'token', (response->>'invitation_id')::uuid
from (select public.create_student_invitation('student-b@example.test') response) created;
insert into sprint1_tokens(label, token, invitation_id)
select 'trainer-b-trainer-a', response->>'token', (response->>'invitation_id')::uuid
from (select public.create_student_invitation('trainer-a@example.test') response) created;
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"13000000-0000-4000-8000-000000000003","role":"authenticated"}';
update sprint1_tokens set relationship_id = public.accept_student_invitation(token, 'Student A')
where label = 'trainer-a-student-a';
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"14000000-0000-4000-8000-000000000004","role":"authenticated"}';
update sprint1_tokens set relationship_id = public.accept_student_invitation(token, 'Student B')
where label = 'trainer-b-student-b';
reset role;

-- Existing trainer accepts a student invitation and safely gains a second role.
set local role authenticated;
set local request.jwt.claims = '{"sub":"11000000-0000-4000-8000-000000000001","role":"authenticated"}';
update sprint1_tokens set relationship_id = public.accept_student_invitation(token, 'Trainer A as Student')
where label = 'trainer-b-trainer-a';
reset role;
set local role postgres;

insert into sprint1_results values
('student profiles created on acceptance', (
  select count(*) = 3 from public.student_profiles where user_id in (
    '11000000-0000-4000-8000-000000000001',
    '13000000-0000-4000-8000-000000000003',
    '14000000-0000-4000-8000-000000000004'
  )
)),
('same user supports trainer and student roles', (
  select count(*) = 2 from public.user_roles
  where user_id = '11000000-0000-4000-8000-000000000001' and revoked_at is null
)),
('accepted invitations create active relationships', (
  select count(*) = 3 from public.trainer_student_relationships where status = 'active'
));

-- Trainer A cannot see Trainer B's relationship with Student B.
set local role authenticated;
set local request.jwt.claims = '{"sub":"11000000-0000-4000-8000-000000000001","role":"authenticated"}';
insert into sprint1_results values
('trainer cross-tenant relationship read denied', (
  select count(*) = 0
  from public.trainer_student_relationships relationship
  join public.student_profiles student on student.id = relationship.student_profile_id
  where relationship.trainer_profile_id = '12100000-0000-4000-8000-000000000002'
    and student.user_id = '14000000-0000-4000-8000-000000000004'
)),
('trainer cross-tenant student profile read denied', (
  select count(*) = 0 from public.student_profiles
  where user_id = '14000000-0000-4000-8000-000000000004'
));
reset role;

-- Student A can update self, cannot read or mutate Student B.
set local role authenticated;
set local request.jwt.claims = '{"sub":"13000000-0000-4000-8000-000000000003","role":"authenticated"}';
update public.student_profiles set preferred_name = 'Student A Updated'
where user_id = '13000000-0000-4000-8000-000000000003';
update public.student_profiles set preferred_name = 'Unauthorized Change'
where user_id = '14000000-0000-4000-8000-000000000004';
insert into sprint1_results values
('student cross-tenant profile read denied', (
  select count(*) = 0 from public.student_profiles
  where user_id = '14000000-0000-4000-8000-000000000004'
));
reset role;
set local role postgres;
insert into sprint1_results values
('student owns and updates own profile', (
  select preferred_name = 'Student A Updated' from public.student_profiles
  where user_id = '13000000-0000-4000-8000-000000000003'
)),
('student cross-tenant profile mutation denied', (
  select preferred_name = 'Student B' from public.student_profiles
  where user_id = '14000000-0000-4000-8000-000000000004'
));
reset role;

-- A role row without a trainer profile or relationship grants no student access.
set local role authenticated;
set local request.jwt.claims = '{"sub":"15000000-0000-4000-8000-000000000005","role":"authenticated"}';
insert into sprint1_results values
('trainer role alone grants no student access', (
  select count(*) = 0 from public.student_profiles
  where user_id = '13000000-0000-4000-8000-000000000003'
));
do $$
begin
  begin
    insert into public.user_roles(user_id, role_code)
    values ('15000000-0000-4000-8000-000000000005','student');
    insert into sprint1_results values ('role escalation denied', false);
  exception when insufficient_privilege then
    insert into sprint1_results values ('role escalation denied', true);
  end;
end $$;
reset role;

-- Direct relationship mutation is not granted to authenticated users.
insert into sprint1_results values
('direct relationship mutation privilege denied',
  not has_table_privilege('authenticated','public.trainer_student_relationships','UPDATE')),
('anonymous foundation access denied',
  not has_table_privilege('anon','public.app_users','SELECT')
  and not has_table_privilege('anon','public.user_roles','SELECT')
  and not has_table_privilege('anon','public.student_profiles','SELECT')
  and not has_table_privilege('anon','public.trainer_student_relationships','SELECT')
  and not has_table_privilege('anon','public.student_invitations','SELECT')),
('invitation token hashes cannot be selected',
  not has_column_privilege('authenticated','public.student_invitations','token_hash','SELECT'));

-- Inactive relationships remove trainer access to the student profile.
set local role authenticated;
set local request.jwt.claims = '{"sub":"11000000-0000-4000-8000-000000000001","role":"authenticated"}';
select public.deactivate_my_trainer_student_relationship(
  (select relationship_id from sprint1_tokens where label = 'trainer-a-student-a')
);
insert into sprint1_results values
('inactive relationship removes trainer student access', (
  select count(*) = 0 from public.student_profiles
  where user_id = '13000000-0000-4000-8000-000000000003'
));
insert into sprint1_tokens(label, token, invitation_id)
select 'trainer-a-student-a-reactivation', response->>'token', (response->>'invitation_id')::uuid
from (select public.create_student_invitation('student-a@example.test') response) created;
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"13000000-0000-4000-8000-000000000003","role":"authenticated"}';
update sprint1_tokens set relationship_id = public.accept_student_invitation(token, 'Student A')
where label = 'trainer-a-student-a-reactivation';
reset role;
set local role postgres;
insert into sprint1_results values
('relationship reactivation reuses identity and relationship', (
  select count(*) = 1 and bool_and(status = 'active')
  from public.trainer_student_relationships relationship
  join public.student_profiles student on student.id = relationship.student_profile_id
  where relationship.trainer_profile_id = '11100000-0000-4000-8000-000000000001'
    and student.user_id = '13000000-0000-4000-8000-000000000003'
));
reset role;

-- Expired invitations are rejected.
set local role authenticated;
set local request.jwt.claims = '{"sub":"11000000-0000-4000-8000-000000000001","role":"authenticated"}';
insert into sprint1_tokens(label, token, invitation_id)
select 'expired', response->>'token', (response->>'invitation_id')::uuid
from (select public.create_student_invitation('expired@example.test') response) created;
reset role;
set local role postgres;
update public.student_invitations
set created_at = now() - interval '8 days', expires_at = now() - interval '1 second'
where id = (select invitation_id from sprint1_tokens where label = 'expired');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"16000000-0000-4000-8000-000000000006","role":"authenticated"}';
do $$
begin
  begin
    perform public.accept_student_invitation((select token from sprint1_tokens where label = 'expired'), 'Expired');
    insert into sprint1_results values ('expired invitation rejected', false);
  exception when others then
    insert into sprint1_results values ('expired invitation rejected', sqlerrm = 'invitation_invalid');
  end;
end $$;
reset role;

-- Revoked invitations are rejected.
set local role authenticated;
set local request.jwt.claims = '{"sub":"11000000-0000-4000-8000-000000000001","role":"authenticated"}';
insert into sprint1_tokens(label, token, invitation_id)
select 'revoked', response->>'token', (response->>'invitation_id')::uuid
from (select public.create_student_invitation('revoked@example.test') response) created;
select public.revoke_my_student_invitation((select invitation_id from sprint1_tokens where label = 'revoked'));
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"17000000-0000-4000-8000-000000000007","role":"authenticated"}';
do $$
begin
  begin
    perform public.accept_student_invitation((select token from sprint1_tokens where label = 'revoked'), 'Revoked');
    insert into sprint1_results values ('revoked invitation rejected', false);
  exception when others then
    insert into sprint1_results values ('revoked invitation rejected', sqlerrm = 'invitation_invalid');
  end;
end $$;
reset role;

-- Accepted token cannot be reused.
set local role authenticated;
set local request.jwt.claims = '{"sub":"13000000-0000-4000-8000-000000000003","role":"authenticated"}';
do $$
begin
  begin
    perform public.accept_student_invitation((select token from sprint1_tokens where label = 'trainer-a-student-a-reactivation'), 'Student A');
    insert into sprint1_results values ('accepted invitation cannot be reused', false);
  exception when others then
    insert into sprint1_results values ('accepted invitation cannot be reused', sqlerrm = 'invitation_invalid');
  end;
end $$;
reset role;

-- Existing trainer ownership helper still isolates trainers.
set local role authenticated;
set local request.jwt.claims = '{"sub":"11000000-0000-4000-8000-000000000001","role":"authenticated"}';
insert into sprint1_results values
('existing trainer ownership remains isolated',
  (select private.owns_trainer('11100000-0000-4000-8000-000000000001'))
  and not (select private.owns_trainer('12100000-0000-4000-8000-000000000002')));
reset role;

do $$
declare failures text;
begin
  select string_agg(scenario, ', ' order by scenario) into failures
  from sprint1_results where not passed;
  if failures is not null then
    raise exception 'Sprint 1 identity/security gate failed: %', failures;
  end if;
end $$;

rollback;
