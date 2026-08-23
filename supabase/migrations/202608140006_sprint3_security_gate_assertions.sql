-- Transactional assertions against the linked database. All fixtures are rolled back.
-- Authenticated owners need SELECT on columns referenced by UPDATE/DELETE filters;
-- RLS still limits rows to the owner and anonymous readers continue through the masked RPC.
grant select on public.services to authenticated;

begin;

create temp table sprint3_results (scenario text primary key, passed boolean not null);
grant select, insert on sprint3_results to public;

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('a3000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'sprint3-a@example.test', '', now(), now(), now()),
  ('b3000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'sprint3-b@example.test', '', now(), now(), now());

insert into public.trainer_profiles (id,user_id,slug,display_name,headline,bio,specialty,city,service_mode,whatsapp,published)
values
  ('a3100000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001','sprint3-trainer-a','Trainer A','Headline A','Bio A','Teste','Cidade A','online','5511999990001',false),
  ('b3100000-0000-4000-8000-000000000002','b3000000-0000-4000-8000-000000000002','sprint3-trainer-b','Trainer B','Headline B','Bio B','Teste','Cidade B','both','5511999990002',true);

insert into public.services (id,trainer_id,title,description,service_mode,price,currency,billing_type,price_visibility,price_visible,active)
values
  ('a3200000-0000-4000-8000-000000000001','a3100000-0000-4000-8000-000000000001','Servico A','Privado A','online',100,'BRL','monthly','public',true,true),
  ('b3200000-0000-4000-8000-000000000002','b3100000-0000-4000-8000-000000000002','Servico B','Privado B','both',250,'BRL','package','match_only',false,true);

set local role authenticated;
set local request.jwt.claims = '{"sub":"a3000000-0000-4000-8000-000000000001","role":"authenticated"}';

update public.trainer_profiles set city='Cidade A atualizada' where id='a3100000-0000-4000-8000-000000000001';
update public.trainer_profiles set city='Ataque A em B' where id='b3100000-0000-4000-8000-000000000002';
update public.services set title='Ataque A em B' where id='b3200000-0000-4000-8000-000000000002';
delete from public.services where id='b3200000-0000-4000-8000-000000000002';

insert into public.services (trainer_id,title,description,service_mode,currency,price_visibility,active)
values ('a3100000-0000-4000-8000-000000000001','Novo A','Criado por A','online','BRL','hidden',true);

insert into public.custom_site_requests (trainer_id,brief,references_urls,contact_whatsapp)
values ('a3100000-0000-4000-8000-000000000001','{"objective":"Site A"}'::jsonb,'{}','5511999990001');

do $$
begin
  begin
    insert into public.custom_site_requests (trainer_id,brief,references_urls,contact_whatsapp)
    values ('b3100000-0000-4000-8000-000000000002','{"objective":"Ataque"}'::jsonb,'{}','5511999990001');
    insert into sprint3_results values ('A cannot create request for B', false);
  exception when insufficient_privilege then
    insert into sprint3_results values ('A cannot create request for B', true);
  end;

  begin
    insert into storage.objects (bucket_id,name)
    values ('trainer-public-media','b3000000-0000-4000-8000-000000000002/b3100000-0000-4000-8000-000000000002/profile/attack.webp');
    insert into sprint3_results values ('A cannot overwrite B storage path', false);
  exception when insufficient_privilege then
    insert into sprint3_results values ('A cannot overwrite B storage path', true);
  end;
end;
$$;

insert into storage.objects (bucket_id,name)
values ('trainer-public-media','a3000000-0000-4000-8000-000000000001/a3100000-0000-4000-8000-000000000001/profile/own.webp');
insert into sprint3_results values ('A uploads own image', true);

reset role;
set local role postgres;
insert into sprint3_results values
  ('A updates own profile', (select city='Cidade A atualizada' from public.trainer_profiles where id='a3100000-0000-4000-8000-000000000001')),
  ('A cannot update B profile', (select city='Cidade B' from public.trainer_profiles where id='b3100000-0000-4000-8000-000000000002')),
  ('A cannot update B service', (select title='Servico B' from public.services where id='b3200000-0000-4000-8000-000000000002')),
  ('A cannot delete B service', exists(select 1 from public.services where id='b3200000-0000-4000-8000-000000000002')),
  ('A creates own service', exists(select 1 from public.services where trainer_id='a3100000-0000-4000-8000-000000000001' and title='Novo A')),
  ('A creates own request', exists(select 1 from public.custom_site_requests where trainer_id='a3100000-0000-4000-8000-000000000001')),
  ('defaults are free entitlements', (select can_use_free_template and can_publish_site and not can_use_premium_templates and not can_receive_leads and not can_use_matching from public.trainer_entitlements where trainer_id='a3100000-0000-4000-8000-000000000001'));

update public.trainer_profiles set template_id='template_02' where id='a3100000-0000-4000-8000-000000000001';
set local role authenticated;
set local request.jwt.claims = '{"sub":"a3000000-0000-4000-8000-000000000001","role":"authenticated"}';
do $$
begin
  begin
    perform public.set_my_site_publication(true);
    insert into sprint3_results values ('FREE cannot publish Template 02', false);
  exception when others then
    insert into sprint3_results values ('FREE cannot publish Template 02', sqlerrm like '%premium_entitlement_required%');
  end;
end;
$$;

reset role;
set local role postgres;
update public.trainer_profiles set template_id='template_01' where id='a3100000-0000-4000-8000-000000000001';
set local role authenticated;
set local request.jwt.claims = '{"sub":"a3000000-0000-4000-8000-000000000001","role":"authenticated"}';
select public.set_my_site_publication(true);
select public.set_my_site_publication(false);

reset role;
set local role postgres;
insert into sprint3_results values
  ('FREE publishes Template 01', (select template_id='template_01' from public.trainer_profiles where id='a3100000-0000-4000-8000-000000000001')),
  ('owner can unpublish', (select not published from public.trainer_profiles where id='a3100000-0000-4000-8000-000000000001'));

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
insert into sprint3_results values
  ('anonymous cannot write profiles', not has_table_privilege('anon','public.trainer_profiles','update')),
  ('anonymous cannot access requests', not has_table_privilege('anon','public.custom_site_requests','select')),
  ('public service masks match-only price', (select price is null from public.get_public_services('b3100000-0000-4000-8000-000000000002') limit 1));

reset role;
set local role postgres;
do $$
declare failures text;
begin
  select string_agg(scenario, ', ' order by scenario) into failures from sprint3_results where not passed;
  if failures is not null then raise exception 'Sprint 3 Security Gate failures: %', failures; end if;
end;
$$;

rollback;
