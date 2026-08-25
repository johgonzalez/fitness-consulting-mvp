-- Run with: supabase test db (or psql against an isolated local Supabase DB).
-- This test creates two temporary auth users, exercises RLS, and rolls back.
begin;

create temp table rls_results (scenario text primary key, passed boolean not null);
grant select, insert on rls_results to authenticated, anon;

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'authenticated', 'authenticated', 'trainer-a@example.test', '', now(), now(), now()),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'authenticated', 'authenticated', 'trainer-b@example.test', '', now(), now(), now());

insert into public.trainer_profiles (id,user_id,slug,display_name,headline,bio,specialty,city,service_mode,whatsapp,published)
values
  ('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','trainer-a-test','Trainer A','A','A','Teste','Cidade A','online','5511000000000',false),
  ('22222222-2222-4222-8222-222222222222','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','trainer-b-test','Trainer B','B','B','Teste','Cidade B','online','5522000000000',true);

update public.trainer_entitlements
set can_publish_site = true
where trainer_id = '22222222-2222-4222-8222-222222222222';

set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}';
insert into rls_results values ('A reads own private profile', (select count(*) = 1 from public.trainer_profiles where id='11111111-1111-4111-8111-111111111111'));
update public.trainer_profiles set city='Cidade A atualizada' where id='11111111-1111-4111-8111-111111111111';
insert into rls_results values ('A updates own private profile', (select city = 'Cidade A atualizada' from public.trainer_profiles where id='11111111-1111-4111-8111-111111111111'));
update public.trainer_profiles set city='Ataque' where id='22222222-2222-4222-8222-222222222222';
insert into rls_results values ('A cannot update B', (select city = 'Cidade B' from public.trainer_profiles where id='22222222-2222-4222-8222-222222222222'));

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}';
update public.trainer_profiles set city='Ataque' where id='11111111-1111-4111-8111-111111111111';

reset role;
insert into rls_results values ('B cannot update A', (select city = 'Cidade A atualizada' from public.trainer_profiles where id='11111111-1111-4111-8111-111111111111'));
insert into rls_results values ('anon cannot update profiles', not has_table_privilege('anon','public.trainer_profiles','update'));
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
insert into rls_results values ('anon cannot read unpublished A', (select count(*) = 0 from public.trainer_profiles where id='11111111-1111-4111-8111-111111111111'));
insert into rls_results values ('anon reads published B', (select count(*) = 1 from public.trainer_profiles where id='22222222-2222-4222-8222-222222222222'));
insert into rls_results values ('anon cannot select ownership UUID', not has_column_privilege('anon','public.trainer_profiles','user_id','select'));

reset role;
table rls_results;
do $$
declare failed_scenarios text;
begin
  select string_agg(scenario, ', ' order by scenario)
  into failed_scenarios
  from rls_results
  where not passed;
  if failed_scenarios is not null then
    raise exception 'RLS failures: %', failed_scenarios;
  end if;
end;
$$;
rollback;
