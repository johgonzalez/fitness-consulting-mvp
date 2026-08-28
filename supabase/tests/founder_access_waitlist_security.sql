-- Sprint 1 Identity + Founder Access + Waitlist transactional security gate.
begin;

create temp table sprint1_results(scenario text primary key, passed boolean not null);
grant select, insert on sprint1_results to authenticated, anon, service_role;
create or replace function pg_temp.raises(p_sql text) returns boolean language plpgsql as $$
begin execute p_sql; return false; exception when others then return true; end; $$;
grant execute on function pg_temp.raises(text) to authenticated, anon, service_role;

insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at) values
('f1000000-0000-4000-8000-000000000001','authenticated','authenticated','founder-a@example.test','',now(),now(),now()),
('f1000000-0000-4000-8000-000000000002','authenticated','authenticated','founder-b@example.test','',now(),now(),now());
insert into public.app_users(id,display_name) values
('f1000000-0000-4000-8000-000000000001','Founder A'),
('f1000000-0000-4000-8000-000000000002','Founder B');
insert into public.user_roles(user_id,role_code) values
('f1000000-0000-4000-8000-000000000001','trainer'),
('f1000000-0000-4000-8000-000000000002','trainer');

set local role authenticated;
set local request.jwt.claims='{"sub":"f1000000-0000-4000-8000-000000000001","role":"authenticated"}';
select public.save_my_onboarding_identity('Founder Adult A',date '1990-01-01','Founder A','ela/dela','Personal A',null);
insert into sprint1_results values
('adult identity saved',public.get_my_onboarding_draft()->>'full_name'='Founder Adult A'),
('birth date saved',public.get_my_onboarding_draft()->>'birth_date'='1990-01-01'),
('optional identity preserved',public.get_my_onboarding_draft()->>'pronouns'='ela/dela'),
('underage rejected',pg_temp.raises($sql$select public.save_my_onboarding_identity('Minor',current_date-interval '17 years',null,null,null,null)$sql$)),
('birth date required',pg_temp.raises($sql$select public.save_my_onboarding_identity('No Birth',null,null,null,null,null)$sql$));
select public.save_my_onboarding_professional('strength','Força','online',null,'CREF-1');
select public.save_my_onboarding_social('5511999990001',null,null,null);
select public.save_my_onboarding_template('template_01');
select public.finalize_my_onboarding();

reset role;
insert into public.trainer_profiles(
  id,user_id,slug,display_name,headline,bio,specialty,service_mode,whatsapp,published,
  full_name,birth_date,onboarding_completed_at
) values (
  'f1100000-0000-4000-8000-000000000002','f1000000-0000-4000-8000-000000000002',
  'founder-b','Founder B','B','B','Força','online','5511999990002',true,
  'Founder Adult B','1991-01-01',now()
);

set local role service_role;
select public.create_access_code('FOUNDER-ACCESS-ALPHA','FOUNDER_ACCESS',1,null,'{"campaign":"qa"}'::jsonb);
reset role;
insert into public.access_codes(code_hash,code_type,status,max_redemptions,redemption_count,expires_at)
values
(encode(extensions.digest(convert_to('FOUNDEREXPIRED01','UTF8'),'sha256'),'hex'),'FOUNDER_ACCESS','ACTIVE',1,0,now()-interval '1 day'),
(encode(extensions.digest(convert_to('FOUNDERLIMITED01','UTF8'),'sha256'),'hex'),'FOUNDER_ACCESS','ACTIVE',1,1,null);

set local role anon;
set local request.jwt.claims='{"role":"anon"}';
insert into sprint1_results values
('anonymous redemption denied',pg_temp.raises($sql$select public.redeem_my_access_code('FOUNDER-ACCESS-ALPHA')$sql$));

reset role;
set local role authenticated;
set local request.jwt.claims='{"sub":"f1000000-0000-4000-8000-000000000001","role":"authenticated"}';
insert into sprint1_results values
('invalid code factual',(public.redeem_my_access_code('NOT-A-REAL-CODE')->>'status')='INVALID'),
('expired code factual',(public.redeem_my_access_code('FOUNDER-EXPIRED-01')->>'status')='EXPIRED'),
('limit reached factual',(public.redeem_my_access_code('FOUNDER-LIMITED-01')->>'status')='LIMIT_REACHED');
insert into sprint1_results values
('valid code granted',(public.redeem_my_access_code('FOUNDER-ACCESS-ALPHA')->>'status')='GRANTED');
insert into sprint1_results values
('repeat redemption idempotent',(public.redeem_my_access_code('FOUNDER-ACCESS-ALPHA')->>'status')='ALREADY_ACTIVE');
insert into sprint1_results values
('Founder enables publication',(public.get_my_effective_entitlements()->>'can_publish_site')::boolean),
('Founder enables students',(public.get_my_effective_entitlements()->>'can_manage_students')::boolean),
('Founder enables workouts',(public.get_my_effective_entitlements()->>'can_use_workouts')::boolean),
('Founder access source is distinct',public.get_my_effective_entitlements()->>'access_source'='FOUNDER_ACCESS'),
('Billing remains FREE',public.get_my_billing_summary()->>'billing_state'='FREE');
select public.request_my_site_publication();
select public.join_waitlist('founder-a@example.test','+55 (11) 99999-0001','trainer','onboarding');
select public.join_waitlist('founder-a@example.test','5511999990001','trainer','onboarding');

reset role;
insert into sprint1_results values
('single grant created',(select count(*)=1 from public.access_grants where trainer_user_id='f1000000-0000-4000-8000-000000000001')),
('redemption counted once',(select redemption_count=1 from public.access_codes where metadata->>'campaign'='qa')),
('waitlist duplicate is idempotent',(select count(*)=1 from public.waitlist_entries where email='founder-a@example.test' and audience='trainer')),
('WhatsApp normalized',(select whatsapp='+5511999990001' from public.waitlist_entries where email='founder-a@example.test')),
('waitlist grants nothing',(
  select count(*)=1
  from public.access_grants
  where trainer_user_id='f1000000-0000-4000-8000-000000000001'
) and not exists(
  select 1 from public.access_grants
  where trainer_user_id='f1000000-0000-4000-8000-000000000002'
)),
('publication intent retained',(select publication_requested_at is not null and published from public.trainer_profiles where user_id='f1000000-0000-4000-8000-000000000001'));

set local role authenticated;
set local request.jwt.claims='{"sub":"f1000000-0000-4000-8000-000000000002","role":"authenticated"}';
insert into sprint1_results values
('invalid WhatsApp rejected',pg_temp.raises($sql$select public.join_waitlist('founder-b@example.test','123','trainer','onboarding')$sql$)),
('email ownership enforced',pg_temp.raises($sql$select public.join_waitlist('founder-a@example.test','5511999990002','trainer','onboarding')$sql$)),
('grant cannot be client forged',pg_temp.raises($sql$insert into public.access_grants(trainer_user_id,grant_type) values('f1000000-0000-4000-8000-000000000002','FOUNDER_ACCESS')$sql$));

reset role;
set local role anon;
insert into sprint1_results values
('Founder site is public',exists(select 1 from public.trainer_profiles where slug like 'founder-a%')),
('Other published FREE site is private',not exists(select 1 from public.trainer_profiles where id='f1100000-0000-4000-8000-000000000002'));

reset role;
insert into sprint1_results values
('access codes RLS enabled',(select relrowsecurity from pg_class where oid='public.access_codes'::regclass)),
('access grants RLS enabled',(select relrowsecurity from pg_class where oid='public.access_grants'::regclass)),
('waitlist RLS enabled',(select relrowsecurity from pg_class where oid='public.waitlist_entries'::regclass)),
('raw codes are not stored',not exists(select 1 from information_schema.columns where table_schema='public' and table_name='access_codes' and column_name in('code','raw_code'))),
('authenticated cannot list codes',not has_table_privilege('authenticated','public.access_codes','SELECT')),
('authenticated cannot list waitlist',not has_table_privilege('authenticated','public.waitlist_entries','SELECT'));

do $$ declare failures text; begin
  select string_agg(scenario, E'\n' order by scenario) into failures from sprint1_results where not passed;
  if failures is not null then raise exception E'Sprint 1 security failures:\n%', failures; end if;
end $$;

table sprint1_results;
rollback;
