-- Services owner access hotfix: transactional tenant and public projection gate.
begin;

create temp table services_owner_access_results (
  scenario text primary key,
  passed boolean not null
);
grant select, insert on services_owner_access_results to authenticated, anon;

insert into auth.users(id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('f1c00000-0000-4000-8000-000000000001','authenticated','authenticated','services-owner-a@example.test','',now(),now(),now()),
  ('f1c00000-0000-4000-8000-000000000002','authenticated','authenticated','services-owner-b@example.test','',now(),now(),now());

insert into public.trainer_profiles(
  id,user_id,slug,display_name,headline,bio,specialty,service_mode,whatsapp,published
) values
  ('f1c10000-0000-4000-8000-000000000001','f1c00000-0000-4000-8000-000000000001','services-owner-a','Trainer A','Headline A','Bio A','Treino','online','5511000000101',false),
  ('f1c10000-0000-4000-8000-000000000002','f1c00000-0000-4000-8000-000000000002','services-owner-b','Trainer B','Headline B','Bio B','Treino','online','5511000000102',true);

insert into public.access_grants(trainer_user_id, grant_type, metadata)
values ('f1c00000-0000-4000-8000-000000000002','FOUNDER_ACCESS','{"source":"services_security_gate"}'::jsonb);

update public.trainer_entitlements
set can_publish_site = true
where trainer_id = 'f1c10000-0000-4000-8000-000000000002';

insert into public.services(
  id,trainer_id,title,description,service_mode,price,currency,billing_type,
  price_visibility,price_visible,active,benefits,conversion_mode
) values
  ('f1c20000-0000-4000-8000-000000000002','f1c10000-0000-4000-8000-000000000002',
   'Serviço público B','Descrição B','online',200,'BRL','monthly','public',true,true,
   array['Benefício público'],'WHATSAPP'),
  ('f1c20000-0000-4000-8000-000000000003','f1c10000-0000-4000-8000-000000000002',
   'Serviço inativo B','Descrição inativa','online',300,'BRL','monthly','public',true,false,
   array['Não deve aparecer'],'INTEREST');

set local role authenticated;
set local request.jwt.claims = '{"sub":"f1c00000-0000-4000-8000-000000000001","role":"authenticated"}';

insert into public.services(
  id,trainer_id,title,description,service_mode,currency,billing_type,
  price_visibility,price_visible,active,benefits,conversion_mode
) values (
  'f1c20000-0000-4000-8000-000000000001','f1c10000-0000-4000-8000-000000000001',
  'Serviço A','Descrição A','online','BRL','monthly','hidden',false,true,
  array['Benefício inicial'],'WHATSAPP'
);

insert into services_owner_access_results values
  ('Owner INSERT own service', (
    select count(*) = 1 from public.services
    where id = 'f1c20000-0000-4000-8000-000000000001'
  )),
  ('Owner SELECT own service', (
    select count(*) = 1 from public.services
    where id = 'f1c20000-0000-4000-8000-000000000001'
      and benefits = array['Benefício inicial']
      and conversion_mode = 'WHATSAPP'
  )),
  ('Other trainer SELECT denied', (
    select count(*) = 0 from public.services
    where trainer_id = 'f1c10000-0000-4000-8000-000000000002'
  ));

update public.services
set benefits = array['Benefício atualizado'],
    conversion_mode = 'INTEREST',
    active = false
where id = 'f1c20000-0000-4000-8000-000000000001';

insert into services_owner_access_results values
  ('Owner UPDATE own service', (
    select count(*) = 1 from public.services
    where id = 'f1c20000-0000-4000-8000-000000000001'
      and benefits = array['Benefício atualizado']
      and conversion_mode = 'INTEREST'
      and not active
  ));

with attempted as (
  update public.services
  set title = 'Cross-tenant update'
  where id = 'f1c20000-0000-4000-8000-000000000002'
  returning id
)
insert into services_owner_access_results
select 'Other trainer UPDATE denied', count(*) = 0 from attempted;

with attempted as (
  delete from public.services
  where id = 'f1c20000-0000-4000-8000-000000000002'
  returning id
)
insert into services_owner_access_results
select 'Other trainer DELETE denied', count(*) = 0 from attempted;

delete from public.services
where id = 'f1c20000-0000-4000-8000-000000000001';

insert into services_owner_access_results values
  ('Owner DELETE own service', (
    select count(*) = 0 from public.services
    where id = 'f1c20000-0000-4000-8000-000000000001'
  ));

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

insert into services_owner_access_results values
  ('Anonymous direct service access denied',
    not has_table_privilege('anon','public.services','select')
  ),
  ('Public projection exposes active published service only', (
    select count(*) = 1
      and bool_and(id = 'f1c20000-0000-4000-8000-000000000002')
      and bool_and(benefits = array['Benefício público'])
      and bool_and(conversion_mode = 'WHATSAPP')
    from public.get_public_site_services('f1c10000-0000-4000-8000-000000000002')
  )),
  ('Public projection hides unpublished trainer services', (
    select count(*) = 0
    from public.get_public_site_services('f1c10000-0000-4000-8000-000000000001')
  ));

reset role;
insert into services_owner_access_results values
  ('Cross-tenant service remained unchanged', (
    select count(*) = 1 from public.services
    where id = 'f1c20000-0000-4000-8000-000000000002'
      and title = 'Serviço público B'
  ));

do $$
declare failures text;
begin
  select string_agg(scenario, E'\n' order by scenario)
  into failures
  from services_owner_access_results
  where not passed;

  if failures is not null then
    raise exception E'Services owner access gate failures:\n%', failures;
  end if;
end;
$$;

table services_owner_access_results;
rollback;
