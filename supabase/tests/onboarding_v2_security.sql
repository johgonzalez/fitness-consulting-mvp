-- Functional Onboarding V2 owner isolation gate. Run in an isolated transaction.
begin;

create temp table onboarding_v2_results(scenario text primary key, passed boolean not null);
grant select,insert on onboarding_v2_results to authenticated,anon,service_role;
create or replace function pg_temp.raises(p_sql text) returns boolean language plpgsql as $$
begin execute p_sql; return false; exception when others then return true; end; $$;
grant execute on function pg_temp.raises(text) to authenticated,anon,service_role;
create or replace function pg_temp.cannot_update_profile(p_profile_id uuid) returns boolean language plpgsql as $$
declare changed integer; begin
  update public.trainer_profiles set tiktok='https://www.tiktok.com/@forged' where id=p_profile_id;
  get diagnostics changed=row_count; return changed=0;
end; $$;
grant execute on function pg_temp.cannot_update_profile(uuid) to authenticated;

insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at) values
('0b200000-0000-4000-8000-000000000001','authenticated','authenticated','onboarding-a@example.test','',now(),now(),now()),
('0b200000-0000-4000-8000-000000000002','authenticated','authenticated','onboarding-b@example.test','',now(),now(),now());
insert into public.app_users(id,display_name) values
('0b200000-0000-4000-8000-000000000001','Trainer A'),
('0b200000-0000-4000-8000-000000000002','Trainer B');
insert into public.user_roles(user_id,role_code) values ('0b200000-0000-4000-8000-000000000002','student');

insert into onboarding_v2_results values
('RLS enabled',(select relrowsecurity from pg_class where oid='public.trainer_onboarding_drafts'::regclass)),
('Authenticated has no direct mutation',not has_table_privilege('authenticated','public.trainer_onboarding_drafts','INSERT,UPDATE,DELETE')),
('Anon cannot read draft',not has_table_privilege('anon','public.trainer_onboarding_drafts','SELECT')),
('Anon cannot finalize',not has_function_privilege('anon','public.finalize_my_onboarding()','EXECUTE')),
('Authenticated cannot reconcile Billing',not has_function_privilege('authenticated','public.reconcile_billing_subscription(uuid,text,text,text,text,text,text,text,text,text,text,text,text,timestamptz,timestamptz,boolean,timestamptz,timestamptz,timestamptz,boolean,boolean)','EXECUTE'));

set local role authenticated;
set local request.jwt.claims='{"sub":"0b200000-0000-4000-8000-000000000001","role":"authenticated"}';
select public.save_my_onboarding_identity('Trainer A','Personal A',null);
insert into onboarding_v2_results values ('Owner reads own draft',(select public.get_my_onboarding_draft()->>'display_name'='Trainer A'));
select public.save_my_onboarding_professional('strength','Força','online',null,null);
select public.save_my_onboarding_social('5511999990001','trainer.a',null,null);
select public.save_my_onboarding_template('template_01');
select public.finalize_my_onboarding();
insert into onboarding_v2_results values
('Owner reads own profile',(select public.get_my_trainer_profile()->>'display_name'='Trainer A')),
('Owner reads own billing state',(select public.get_my_billing_summary()->>'billing_state'='FREE'));

reset role;
set local role authenticated;
set local request.jwt.claims='{"sub":"0b200000-0000-4000-8000-000000000002","role":"authenticated"}';
insert into onboarding_v2_results values
('Other trainer cannot read draft',public.get_my_onboarding_draft() is null),
('Student cannot update Trainer profile',pg_temp.cannot_update_profile((select id from public.trainer_profiles where slug like 'trainer-a%'))),
('Student cannot select Trainer template',pg_temp.raises($sql$select public.set_my_site_template('template_02')$sql$));

reset role;
set local role anon;
insert into onboarding_v2_results values
('Anonymous cannot execute private onboarding RPC',not has_function_privilege('anon','public.get_my_onboarding_draft()','EXECUTE')),
('Unpublished profile is not public',(select count(*)=0 from public.trainer_profiles where slug like 'trainer-a%')),
('Anonymous cannot read Billing',not has_table_privilege('anon','public.billing_subscriptions','SELECT'));

reset role;
do $$ begin
  if exists(select 1 from onboarding_v2_results where not passed) then
    raise exception 'Functional Onboarding V2 security gate failed: %',(select string_agg(scenario,', ') from onboarding_v2_results where not passed);
  end if;
end $$;

rollback;
