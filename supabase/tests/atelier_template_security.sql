-- Atelier template catalog transactional security gate.
begin;

create temp table atelier_template_results (
  scenario text primary key,
  passed boolean not null
);
grant select, insert on atelier_template_results to authenticated, anon;

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
  ('f4a00000-0000-4000-8000-000000000001','authenticated','authenticated','atelier-owner@example.test','',now(),now(),now()),
  ('f4a00000-0000-4000-8000-000000000002','authenticated','authenticated','atelier-other@example.test','',now(),now(),now());

insert into public.trainer_profiles(
  id,user_id,slug,display_name,headline,bio,specialty,service_mode,whatsapp,published
) values
  ('f4a10000-0000-4000-8000-000000000001','f4a00000-0000-4000-8000-000000000001','atelier-owner','Atelier Owner','Headline A','Bio A','Treino','online','5511000000401',false),
  ('f4a10000-0000-4000-8000-000000000002','f4a00000-0000-4000-8000-000000000002','atelier-other','Atelier Other','Headline B','Bio B','Treino','online','5511000000402',false);

insert into public.access_grants(trainer_user_id, grant_type, metadata)
values ('f4a00000-0000-4000-8000-000000000001','FOUNDER_ACCESS','{"source":"atelier_security_gate"}'::jsonb);

update public.trainer_entitlements
set can_publish_site = true,
    can_use_template_04 = trainer_id = 'f4a10000-0000-4000-8000-000000000001'
where trainer_id in (
  'f4a10000-0000-4000-8000-000000000001',
  'f4a10000-0000-4000-8000-000000000002'
);

insert into atelier_template_results values
  ('template_04 enum exists', exists (
    select 1 from pg_enum value
    join pg_type type on type.oid = value.enumtypid
    join pg_namespace namespace on namespace.oid = type.typnamespace
    where namespace.nspname = 'public' and type.typname = 'template_id' and value.enumlabel = 'template_04'
  )),
  ('template_04 entitlement exists', exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'trainer_entitlements' and column_name = 'can_use_template_04'
  )),
  ('authenticated direct template update denied', not has_column_privilege(
    'authenticated', 'public.trainer_profiles', 'template_id', 'UPDATE'
  )),
  ('authenticated direct publication update denied', not has_column_privilege(
    'authenticated', 'public.trainer_profiles', 'published', 'UPDATE'
  )),
  ('authenticated direct profile insert denied', not has_table_privilege(
    'authenticated', 'public.trainer_profiles', 'INSERT'
  )),
  ('authenticated allowed profile update retained', has_column_privilege(
    'authenticated', 'public.trainer_profiles', 'headline', 'UPDATE'
  )),
  ('anonymous template mutation denied', not has_function_privilege('anon', 'public.set_my_site_template(public.template_id)', 'EXECUTE')),
  ('anonymous publication mutation denied', not has_function_privilege('anon', 'public.set_my_site_publication(boolean)', 'EXECUTE'));

set local role authenticated;
set local request.jwt.claims = '{"sub":"f4a00000-0000-4000-8000-000000000001","role":"authenticated"}';
select public.set_my_site_template('template_04');

update public.trainer_profiles
set headline = 'Cross-tenant attempt'
where id = 'f4a10000-0000-4000-8000-000000000002';

insert into atelier_template_results values
  ('entitled owner selects Atelier', (
    select template_id::text = 'template_04'
    from public.trainer_profiles
    where id = 'f4a10000-0000-4000-8000-000000000001'
  ));

reset role;
insert into atelier_template_results values
  ('cross-trainer profile update denied', (
    select headline = 'Headline B'
    from public.trainer_profiles
    where id = 'f4a10000-0000-4000-8000-000000000002'
  ));

set local role authenticated;
set local request.jwt.claims = '{"sub":"f4a00000-0000-4000-8000-000000000002","role":"authenticated"}';
insert into atelier_template_results values
  ('unentitled owner cannot select Atelier',
    pg_temp.raises($sql$select public.set_my_site_template('template_04')$sql$)
  ),
  ('unentitled owner cannot directly select Atelier',
    pg_temp.raises($sql$
      update public.trainer_profiles
      set template_id = 'template_04'
      where id = 'f4a10000-0000-4000-8000-000000000002'
    $sql$)
  ),
  ('unentitled owner cannot directly publish',
    pg_temp.raises($sql$
      update public.trainer_profiles
      set published = true
      where id = 'f4a10000-0000-4000-8000-000000000002'
    $sql$)
  );

reset role;
update public.trainer_entitlements
set can_use_template_04 = false
where trainer_id = 'f4a10000-0000-4000-8000-000000000001';

set local role authenticated;
set local request.jwt.claims = '{"sub":"f4a00000-0000-4000-8000-000000000001","role":"authenticated"}';
insert into atelier_template_results values
  ('Founder Access preserves Atelier entitlement', (
    select can_use_template_04
    from public.trainer_entitlements
    where trainer_id = 'f4a10000-0000-4000-8000-000000000001'
  )
  );

reset role;
update public.trainer_entitlements
set can_use_template_04 = true
where trainer_id = 'f4a10000-0000-4000-8000-000000000001';

set local role authenticated;
set local request.jwt.claims = '{"sub":"f4a00000-0000-4000-8000-000000000001","role":"authenticated"}';
select public.set_my_site_publication(true);
insert into atelier_template_results values
  ('entitled owner publishes Atelier', (
    select published and template_id::text = 'template_04'
    from public.trainer_profiles
    where id = 'f4a10000-0000-4000-8000-000000000001'
  ));

reset role;
do $$
declare failures text;
begin
  select string_agg(scenario, E'\n' order by scenario)
  into failures
  from atelier_template_results
  where not passed;

  if failures is not null then
    raise exception E'Atelier template gate failures:\n%', failures;
  end if;
end;
$$;

table atelier_template_results;
rollback;
