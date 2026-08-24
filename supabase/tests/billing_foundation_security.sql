-- Billing V1 foundation: transactional privilege, reconciliation and public
-- availability security gate. Run only against an isolated/test transaction.
begin;

create temp table billing_results (
  scenario text primary key,
  passed boolean not null
);
grant select, insert on billing_results to authenticated, anon, service_role;

create or replace function pg_temp.raises(p_sql text)
returns boolean language plpgsql as $$
begin
  execute p_sql;
  return false;
exception when others then
  return true;
end;
$$;
grant execute on function pg_temp.raises(text) to authenticated, anon, service_role;

insert into auth.users(id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('b1a00000-0000-4000-8000-000000000001','authenticated','authenticated','billing-a@example.test','',now(),now(),now()),
  ('b1a00000-0000-4000-8000-000000000002','authenticated','authenticated','billing-b@example.test','',now(),now(),now()),
  ('b1a00000-0000-4000-8000-000000000003','authenticated','authenticated','billing-c@example.test','',now(),now(),now());

insert into public.trainer_profiles(
  id,user_id,slug,display_name,headline,bio,specialty,service_mode,whatsapp,published
) values
  ('b1a10000-0000-4000-8000-000000000001','b1a00000-0000-4000-8000-000000000001','billing-a','Billing A','Headline A','Bio A','Treino','online','5511000001001',true),
  ('b1a10000-0000-4000-8000-000000000002','b1a00000-0000-4000-8000-000000000002','billing-b','Billing B','Headline B','Bio B','Treino','online','5511000001002',true),
  ('b1a10000-0000-4000-8000-000000000003','b1a00000-0000-4000-8000-000000000003','billing-c','Billing C','Headline C','Bio C','Treino','online','5511000001003',true);

insert into public.services(
  id,trainer_id,title,description,service_mode,currency,price_visibility,price_visible,active,benefits
) values
  ('b1a20000-0000-4000-8000-000000000001','b1a10000-0000-4000-8000-000000000001','Service A','Description A','online','BRL','hidden',false,true,array['Benefit A']),
  ('b1a20000-0000-4000-8000-000000000002','b1a10000-0000-4000-8000-000000000002','Service B','Description B','online','BRL','hidden',false,true,array['Benefit B']);

insert into public.testimonials(id,trainer_id,student_name,content,published)
values
  ('b1a30000-0000-4000-8000-000000000001','b1a10000-0000-4000-8000-000000000001','Student A','Testimonial A',true),
  ('b1a30000-0000-4000-8000-000000000002','b1a10000-0000-4000-8000-000000000002','Student B','Testimonial B',true);

insert into public.trainer_methodology_items(id,trainer_id,position,title,description)
values
  ('b1a40000-0000-4000-8000-000000000001','b1a10000-0000-4000-8000-000000000001',1,'Step A','Method A'),
  ('b1a40000-0000-4000-8000-000000000002','b1a10000-0000-4000-8000-000000000002',1,'Step B','Method B');

insert into billing_results values
  ('RLS enabled on billing_accounts', (select relrowsecurity from pg_class where oid='public.billing_accounts'::regclass)),
  ('RLS enabled on billing_subscriptions', (select relrowsecurity from pg_class where oid='public.billing_subscriptions'::regclass)),
  ('RLS enabled on checkout attempts', (select relrowsecurity from pg_class where oid='public.billing_checkout_attempts'::regclass)),
  ('RLS enabled on event receipts', (select relrowsecurity from pg_class where oid='public.billing_event_receipts'::regclass)),
  ('Anon cannot read billing', not has_table_privilege('anon','public.billing_accounts','select')),
  ('Authenticated cannot read billing account internals', not has_table_privilege('authenticated','public.billing_accounts','select')),
  ('Authenticated cannot read event receipts', not has_table_privilege('authenticated','public.billing_event_receipts','select')),
  ('Authenticated cannot write billing accounts', not has_table_privilege('authenticated','public.billing_accounts','insert')),
  ('Authenticated cannot write subscriptions', not has_table_privilege('authenticated','public.billing_subscriptions','update')),
  ('Authenticated cannot execute reconciliation', not has_function_privilege(
    'authenticated',
    'public.reconcile_billing_subscription(uuid,text,text,text,text,text,text,text,text,text,text,text,text,timestamptz,timestamptz,boolean,timestamptz,timestamptz,timestamptz,boolean,boolean)',
    'execute'
  ));

set local role authenticated;
set local request.jwt.claims = '{"sub":"b1a00000-0000-4000-8000-000000000001","role":"authenticated"}';
insert into billing_results values
  ('Client cannot insert billing account', pg_temp.raises($sql$
    insert into public.billing_accounts(app_user_id,market) values ('b1a00000-0000-4000-8000-000000000001','BR')
  $sql$)),
  ('Client cannot forge subscription state', pg_temp.raises($sql$
    update public.billing_subscriptions set billing_state='ACTIVE'
  $sql$)),
  ('Client cannot forge product', pg_temp.raises($sql$
    update public.billing_subscriptions set product_code='PRO'
  $sql$)),
  ('Client cannot forge provider IDs', pg_temp.raises($sql$
    update public.billing_subscriptions set provider_price_id='price_forged'
  $sql$)),
  ('Client cannot forge grace', pg_temp.raises($sql$
    update public.billing_subscriptions set grace_until=now()+interval '7 days'
  $sql$)),
  ('Client cannot mark subscription current', pg_temp.raises($sql$
    update public.billing_subscriptions set is_current=true
  $sql$));

reset role;
set local role service_role;

-- FREE establishes a canonical non-paid state for Trainer A.
select public.reconcile_billing_subscription(
  'b1a00000-0000-4000-8000-000000000001','stripe','cus_billing_a','sub_billing_a',
  'prod_pro','price_br_monthly',null,'FREE','BR','BRL','month','incomplete','FREE',
  '2026-08-24T00:00:00Z','2026-09-24T00:00:00Z',false,null,null,
  '2026-08-24T00:00:00Z',false,true
);

-- ACTIVE establishes paid authority for Trainer B.
select public.reconcile_billing_subscription(
  'b1a00000-0000-4000-8000-000000000002','stripe','cus_billing_b','sub_billing_b',
  'prod_pro','price_br_monthly','in_billing_b','PRO','BR','BRL','month','active','ACTIVE',
  '2026-08-24T00:00:00Z','2026-09-24T00:00:00Z',false,null,null,
  '2026-08-24T00:00:00Z',true,true
);

insert into billing_results values
  ('Trusted role reconciles FREE', exists(
    select 1 from public.billing_subscriptions subscription
    join public.billing_accounts account on account.id=subscription.billing_account_id
    where account.app_user_id='b1a00000-0000-4000-8000-000000000001'
      and subscription.billing_state='FREE' and subscription.is_current
  )),
  ('Trusted role reconciles ACTIVE', exists(
    select 1 from public.billing_subscriptions subscription
    join public.billing_accounts account on account.id=subscription.billing_account_id
    where account.app_user_id='b1a00000-0000-4000-8000-000000000002'
      and subscription.billing_state='ACTIVE' and subscription.is_current
  )),
  ('First payment failure receives no grace', pg_temp.raises($sql$
    select public.reconcile_billing_subscription(
      'b1a00000-0000-4000-8000-000000000003','stripe','cus_billing_c','sub_billing_c',
      'prod_pro','price_br_monthly',null,'PRO','BR','BRL','month','past_due','GRACE',
      '2026-08-24T00:00:00Z','2026-09-24T00:00:00Z',false,null,null,
      '2026-08-24T00:00:00Z',false,true
    )
  $sql$)),
  ('FREE product cannot claim ACTIVE state', pg_temp.raises($sql$
    select public.reconcile_billing_subscription(
      'b1a00000-0000-4000-8000-000000000003','stripe','cus_billing_c','sub_billing_c',
      'prod_pro','price_br_monthly',null,'FREE','BR','BRL','month','active','ACTIVE',
      '2026-08-24T00:00:00Z','2026-09-24T00:00:00Z',false,null,null,
      '2026-08-24T00:00:00Z',false,true
    )
  $sql$)),
  ('All templates remain available on FREE', exists(
    select 1 from public.trainer_entitlements
    where trainer_id='b1a10000-0000-4000-8000-000000000001'
      and can_build_site and can_preview_site
      and can_use_template_01 and can_use_template_02
      and can_use_template_03 and can_use_template_04
  )),
  ('FREE projection blocks paid capabilities', exists(
    select 1 from public.trainer_entitlements
    where trainer_id='b1a10000-0000-4000-8000-000000000001'
      and not can_publish_site and not can_receive_leads and not can_use_matching
  )),
  ('ACTIVE projection enables current commercial flags', exists(
    select 1 from public.trainer_entitlements
    where trainer_id='b1a10000-0000-4000-8000-000000000002'
      and can_publish_site and can_receive_leads and can_use_matching
  ));

reset role;
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
insert into billing_results values
  ('Published FREE site is offline', not exists(select 1 from public.trainer_profiles where id='b1a10000-0000-4000-8000-000000000001')),
  ('Published ACTIVE site is online', exists(select 1 from public.trainer_profiles where id='b1a10000-0000-4000-8000-000000000002')),
  ('FREE public services are offline', (select count(*)=0 from public.get_public_site_services('b1a10000-0000-4000-8000-000000000001'))),
  ('ACTIVE public services are online', (select count(*)=1 from public.get_public_site_services('b1a10000-0000-4000-8000-000000000002'))),
  ('FREE public methodology is offline', (select count(*)=0 from public.get_public_methodology_items('b1a10000-0000-4000-8000-000000000001'))),
  ('ACTIVE public methodology is online', (select count(*)=1 from public.get_public_methodology_items('b1a10000-0000-4000-8000-000000000002'))),
  ('FREE public testimonials are offline', not exists(select 1 from public.testimonials where trainer_id='b1a10000-0000-4000-8000-000000000001')),
  ('ACTIVE public testimonials are online', exists(select 1 from public.testimonials where trainer_id='b1a10000-0000-4000-8000-000000000002'));

reset role;
update public.trainer_profiles set published=false where id='b1a10000-0000-4000-8000-000000000002';
set local role anon;
insert into billing_results values
  ('Unpublished ACTIVE site remains offline', not exists(select 1 from public.trainer_profiles where id='b1a10000-0000-4000-8000-000000000002'));

reset role;
update public.trainer_profiles set published=true where id='b1a10000-0000-4000-8000-000000000002';
set local role service_role;

-- Renewal failure after ACTIVE enters a fixed seven-day GRACE.
select public.reconcile_billing_subscription(
  'b1a00000-0000-4000-8000-000000000002','stripe','cus_billing_b','sub_billing_b',
  'prod_pro','price_br_monthly','in_billing_b_2','PRO','BR','BRL','month','past_due','GRACE',
  '2026-08-24T00:00:00Z','2026-09-24T00:00:00Z',false,null,null,
  '2026-08-25T00:00:00Z',true,true
);
select public.reconcile_billing_subscription(
  'b1a00000-0000-4000-8000-000000000002','stripe','cus_billing_b','sub_billing_b',
  'prod_pro','price_br_monthly','in_billing_b_3','PRO','BR','BRL','month','past_due','GRACE',
  '2026-08-24T00:00:00Z','2026-09-24T00:00:00Z',false,null,null,
  '2026-08-26T00:00:00Z',true,true
);

insert into billing_results values
  ('GRACE window is seven days', exists(
    select 1 from public.billing_subscriptions
    where provider='stripe' and provider_subscription_id='sub_billing_b'
      and billing_state='GRACE'
      and grace_started_at='2026-08-25T00:00:00Z'
      and grace_until='2026-09-01T00:00:00Z'
  )),
  ('Repeated event does not extend grace', exists(
    select 1 from public.billing_subscriptions
    where provider='stripe' and provider_subscription_id='sub_billing_b'
      and grace_until='2026-09-01T00:00:00Z'
  ));

reset role;
set local role anon;
insert into billing_results values
  ('GRACE remains public', exists(select 1 from public.trainer_profiles where id='b1a10000-0000-4000-8000-000000000002'));

reset role;
set local role service_role;
select public.reconcile_billing_subscription(
  'b1a00000-0000-4000-8000-000000000002','stripe','cus_billing_b','sub_billing_b',
  'prod_pro','price_br_monthly','in_billing_b_3','PRO','BR','BRL','month','unpaid','SUSPENDED',
  '2026-08-24T00:00:00Z','2026-09-24T00:00:00Z',false,null,null,
  '2026-08-27T00:00:00Z',true,true
);

reset role;
insert into billing_results values
  ('Suspension preserves publication intent', (select published from public.trainer_profiles where id='b1a10000-0000-4000-8000-000000000002'));
set local role anon;
insert into billing_results values
  ('SUSPENDED site is offline', not exists(select 1 from public.trainer_profiles where id='b1a10000-0000-4000-8000-000000000002')),
  ('SUSPENDED services are offline', (select count(*)=0 from public.get_public_site_services('b1a10000-0000-4000-8000-000000000002'))),
  ('SUSPENDED methodology is offline', (select count(*)=0 from public.get_public_methodology_items('b1a10000-0000-4000-8000-000000000002'))),
  ('SUSPENDED testimonials are offline', not exists(select 1 from public.testimonials where trainer_id='b1a10000-0000-4000-8000-000000000002'));

reset role;
set local role service_role;
select public.reconcile_billing_subscription(
  'b1a00000-0000-4000-8000-000000000002','stripe','cus_billing_b','sub_billing_b',
  'prod_pro','price_br_monthly','in_billing_b_4','PRO','BR','BRL','month','active','ACTIVE',
  '2026-08-27T00:00:00Z','2026-09-27T00:00:00Z',false,null,null,
  '2026-08-28T00:00:00Z',true,true
);

reset role;
set local role anon;
insert into billing_results values
  ('Payment recovery restores site without republish', exists(select 1 from public.trainer_profiles where id='b1a10000-0000-4000-8000-000000000002'));

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"b1a00000-0000-4000-8000-000000000001","role":"authenticated"}';
insert into billing_results values
  ('Summary returns own FREE state', public.get_my_billing_summary()->>'billing_state'='FREE'),
  ('Summary omits provider identifiers', not (public.get_my_billing_summary() ?| array[
    'provider','provider_customer_id','provider_subscription_id','provider_product_id',
    'provider_price_id','latest_provider_invoice_id','provider_status'
  ])),
  ('Summary exposes only approved keys', (
    select array_agg(key order by key)=array[
      'billing_interval','billing_state','cancel_at_period_end','currency',
      'current_period_end','grace_until','market','product_code'
    ] from jsonb_object_keys(public.get_my_billing_summary()) key
  ));

set local request.jwt.claims = '{"sub":"b1a00000-0000-4000-8000-000000000002","role":"authenticated"}';
insert into billing_results values
  ('Summary returns only current user ACTIVE state', public.get_my_billing_summary()->>'billing_state'='ACTIVE');

reset role;
do $$
declare failures text;
begin
  select string_agg(scenario, E'\n' order by scenario)
  into failures from billing_results where not passed;
  if failures is not null then
    raise exception E'Billing foundation gate failures:\n%', failures;
  end if;
end;
$$;

table billing_results;
rollback;
