-- Restore the table privilege required for authenticated trainers to read and
-- mutate their own services. Existing owner-only RLS policies remain the
-- authoritative tenant boundary; anonymous access continues through the
-- explicitly public projection RPC only.

grant select on table public.services to authenticated;

do $services_owner_access_gate$
declare
  required_command text;
begin
  if not (
    select relation.relrowsecurity
    from pg_class relation
    where relation.oid = 'public.services'::regclass
  ) then
    raise exception 'services owner access gate: RLS is disabled';
  end if;

  if not has_table_privilege('authenticated', 'public.services', 'SELECT') then
    raise exception 'services owner access gate: authenticated SELECT is missing';
  end if;

  foreach required_command in array array['SELECT', 'INSERT', 'UPDATE', 'DELETE']
  loop
    if not exists (
      select 1
      from pg_policies policy
      where policy.schemaname = 'public'
        and policy.tablename = 'services'
        and policy.cmd = required_command
        and 'authenticated' = any(policy.roles)
        and policy.policyname = case required_command
          when 'SELECT' then 'owners read own services'
          when 'INSERT' then 'owners insert own services'
          when 'UPDATE' then 'owners update own services'
          when 'DELETE' then 'owners delete own services'
        end
    ) then
      raise exception 'services owner access gate: owner % policy is missing', required_command;
    end if;
  end loop;

  if has_table_privilege('anon', 'public.services', 'SELECT')
    or has_table_privilege('anon', 'public.services', 'INSERT')
    or has_table_privilege('anon', 'public.services', 'UPDATE')
    or has_table_privilege('anon', 'public.services', 'DELETE') then
    raise exception 'services owner access gate: anon has direct table access';
  end if;

  if not has_function_privilege('anon', 'public.get_public_site_services(uuid)', 'EXECUTE') then
    raise exception 'services owner access gate: public projection is unavailable';
  end if;
end;
$services_owner_access_gate$;
