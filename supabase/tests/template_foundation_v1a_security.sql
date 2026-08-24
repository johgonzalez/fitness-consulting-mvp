-- Template Foundation V1A transactional security and compatibility gate.
begin;

create temp table template_v1a_results (
  scenario text primary key,
  passed boolean not null
);
grant select, insert on template_v1a_results to authenticated, anon;

create or replace function pg_temp.raises(p_sql text)
returns boolean language plpgsql as $$
begin
  execute p_sql;
  return false;
exception when others then
  return true;
end;
$$;
grant execute on function pg_temp.raises(text) to authenticated, anon;

insert into auth.users(id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('f1a00000-0000-4000-8000-000000000001','authenticated','authenticated','template-v1a-a@example.test','',now(),now(),now()),
  ('f1a00000-0000-4000-8000-000000000002','authenticated','authenticated','template-v1a-b@example.test','',now(),now(),now());

insert into public.trainer_profiles(
  id,user_id,slug,display_name,headline,bio,specialty,service_mode,whatsapp,published
) values
  ('f1a10000-0000-4000-8000-000000000001','f1a00000-0000-4000-8000-000000000001','template-v1a-a','Trainer A','Headline A','Bio A','Treino','online','5511000000001',false),
  ('f1a10000-0000-4000-8000-000000000002','f1a00000-0000-4000-8000-000000000002','template-v1a-b','Trainer B','Headline B','Bio B','Treino','online','5511000000002',true);

insert into public.services(
  id,trainer_id,title,description,service_mode,currency,billing_type,
  price_visibility,price_visible,active,benefits,conversion_mode
) values (
  'f1a20000-0000-4000-8000-000000000002','f1a10000-0000-4000-8000-000000000002',
  'Serviço B','Descrição B','online','BRL',null,'public',true,true,
  array['Benefício público'],'WHATSAPP'
);
insert into public.trainer_methodology_items(
  id,trainer_id,position,title,description
) values (
  'f1a30000-0000-4000-8000-000000000002','f1a10000-0000-4000-8000-000000000002',
  20,'Etapa B','Descrição da etapa B'
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"f1a00000-0000-4000-8000-000000000001","role":"authenticated"}';

insert into public.services(
  id,trainer_id,title,description,service_mode,currency,billing_type,
  price_visibility,price_visible,active,benefits,conversion_mode
) values (
  'f1a20000-0000-4000-8000-000000000001','f1a10000-0000-4000-8000-000000000001',
  'Serviço A','Descrição A','online','BRL','monthly','hidden',false,true,
  array['Benefício um','Benefício dois'],'INTEREST'
);

insert into public.trainer_methodology_items(
  id,trainer_id,position,title,description
) values (
  'f1a30000-0000-4000-8000-000000000001','f1a10000-0000-4000-8000-000000000001',
  10,'Etapa A','Descrição da etapa A'
);

update public.trainer_profiles
set profile_status_enabled = true,
    profile_status_text = 'Agenda aberta',
    profile_status_semantic_tone = 'availability'
where id = 'f1a10000-0000-4000-8000-000000000001';

insert into template_v1a_results values
  ('Owner writes ordered benefits and conversion mode', (
    select benefits = array['Benefício um','Benefício dois']
      and conversion_mode = 'INTEREST'
    from public.services where id = 'f1a20000-0000-4000-8000-000000000001'
  )),
  ('Invalid service benefits are rejected', pg_temp.raises($sql$
    insert into public.services(
      trainer_id,title,description,service_mode,currency,price_visibility,
      price_visible,active,benefits
    ) values (
      'f1a10000-0000-4000-8000-000000000001','Invalid benefits','Invalid benefits',
      'online','BRL','hidden',false,true,array['   ']
    )
  $sql$)),
  ('Owner writes methodology', (
    select title = 'Etapa A' and position = 10
    from public.trainer_methodology_items
    where id = 'f1a30000-0000-4000-8000-000000000001'
  )),
  ('Owner writes profile status', (
    select profile_status_enabled and profile_status_text = 'Agenda aberta'
    from public.trainer_profiles
    where id = 'f1a10000-0000-4000-8000-000000000001'
  ));

update public.services
set title = 'Cross tenant attack'
where trainer_id = 'f1a10000-0000-4000-8000-000000000002';

update public.trainer_methodology_items
set title = 'Cross tenant attack'
where trainer_id = 'f1a10000-0000-4000-8000-000000000002';

update public.trainer_profiles
set profile_status_text = 'Cross tenant attack'
where id = 'f1a10000-0000-4000-8000-000000000002';

reset role;

insert into template_v1a_results values
  ('Cross-trainer service update denied', (
    select title = 'Serviço B' from public.services
    where id = 'f1a20000-0000-4000-8000-000000000002'
  )),
  ('Cross-trainer methodology update denied', (
    select title = 'Etapa B' from public.trainer_methodology_items
    where id = 'f1a30000-0000-4000-8000-000000000002'
  )),
  ('Cross-trainer profile status update denied', (
    select profile_status_text is null from public.trainer_profiles
    where id = 'f1a10000-0000-4000-8000-000000000002'
  ));

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
insert into template_v1a_results values
  ('Anonymous direct methodology read denied',
    not has_table_privilege('anon','public.trainer_methodology_items','select')
  ),
  ('Anonymous cannot read private profile status', (
    select count(*) = 0 from public.trainer_profiles
    where id = 'f1a10000-0000-4000-8000-000000000001'
  )),
  ('Public methodology projection exposes published content only', (
    select count(*) = 1
    from public.get_public_methodology_items('f1a10000-0000-4000-8000-000000000002')
  ) and (
    select count(*) = 0
    from public.get_public_methodology_items('f1a10000-0000-4000-8000-000000000001')
  )),
  ('Public service projection exposes approved fields', (
    select count(*) = 1
      and bool_and(benefits = array['Benefício público'])
      and bool_and(conversion_mode = 'WHATSAPP')
    from public.get_public_site_services('f1a10000-0000-4000-8000-000000000002')
  ));

reset role;
update public.trainer_entitlements
set can_use_template_03 = true,
    can_publish_site = true
where trainer_id = 'f1a10000-0000-4000-8000-000000000001';

set local role authenticated;
set local request.jwt.claims = '{"sub":"f1a00000-0000-4000-8000-000000000001","role":"authenticated"}';
select public.set_my_site_template('template_03');
select public.set_my_site_publication(true);

insert into template_v1a_results values
  ('Entitled trainer selects and publishes template_03', (
    select template_id = 'template_03' and published
    from public.trainer_profiles
    where id = 'f1a10000-0000-4000-8000-000000000001'
  ));

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"f1a00000-0000-4000-8000-000000000002","role":"authenticated"}';
insert into template_v1a_results values
  ('Unentitled trainer cannot select template_03',
    pg_temp.raises($sql$select public.set_my_site_template('template_03')$sql$)
  );

reset role;
do $$
declare failures text;
begin
  select string_agg(scenario, E'\n' order by scenario)
  into failures
  from template_v1a_results
  where not passed;

  if failures is not null then
    raise exception E'Template Foundation V1A gate failures:\n%', failures;
  end if;
end;
$$;

table template_v1a_results;
rollback;
