-- Sprint 1: provider-independent access grants and a private waitlist.

create table public.access_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  code_type text not null,
  status text not null default 'ACTIVE',
  max_redemptions integer not null,
  redemption_count integer not null default 0,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint access_codes_hash_check check (code_hash ~ '^[a-f0-9]{64}$'),
  constraint access_codes_type_check check (code_type in ('FOUNDER_ACCESS')),
  constraint access_codes_status_check check (status in ('ACTIVE', 'PAUSED', 'REVOKED')),
  constraint access_codes_redemptions_check check (
    max_redemptions > 0 and redemption_count between 0 and max_redemptions
  ),
  constraint access_codes_metadata_check check (jsonb_typeof(metadata) = 'object')
);

create table public.access_grants (
  id uuid primary key default gen_random_uuid(),
  trainer_user_id uuid not null references public.app_users(id) on delete restrict,
  grant_type text not null,
  source_code_id uuid references public.access_codes(id) on delete restrict,
  status text not null default 'ACTIVE',
  granted_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  constraint access_grants_type_check check (grant_type in ('FOUNDER_ACCESS')),
  constraint access_grants_status_check check (status in ('ACTIVE', 'REVOKED', 'EXPIRED')),
  constraint access_grants_lifecycle_check check (
    (status = 'ACTIVE' and revoked_at is null)
    or (status = 'REVOKED' and revoked_at is not null)
    or status = 'EXPIRED'
  ),
  constraint access_grants_expiry_check check (expires_at is null or expires_at > granted_at),
  constraint access_grants_metadata_check check (jsonb_typeof(metadata) = 'object')
);

create unique index access_grants_one_active_type_idx
  on public.access_grants(trainer_user_id, grant_type)
  where status = 'ACTIVE';
create index access_grants_user_status_idx
  on public.access_grants(trainer_user_id, status, expires_at);
create index access_grants_code_idx on public.access_grants(source_code_id);
create index access_codes_active_expiry_idx
  on public.access_codes(status, expires_at)
  where status = 'ACTIVE';

create table public.waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  whatsapp text not null,
  audience text not null,
  source text not null,
  status text not null default 'WAITING',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint waitlist_email_check check (
    char_length(email) between 5 and 254
    and email = lower(trim(email))
    and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ),
  constraint waitlist_whatsapp_check check (whatsapp ~ '^\+[1-9][0-9]{7,14}$'),
  constraint waitlist_audience_check check (audience in ('trainer', 'student')),
  constraint waitlist_source_check check (source ~ '^[a-z][a-z0-9_]{1,49}$'),
  constraint waitlist_status_check check (status in ('WAITING', 'CONTACTED', 'INVITED', 'CONVERTED', 'REMOVED')),
  unique (email, audience)
);

create index waitlist_entries_status_created_idx on public.waitlist_entries(status, created_at);

alter table public.access_codes enable row level security;
alter table public.access_grants enable row level security;
alter table public.waitlist_entries enable row level security;

revoke all on public.access_codes, public.access_grants, public.waitlist_entries
from public, anon, authenticated;
grant all on public.access_codes, public.access_grants, public.waitlist_entries to service_role;

create trigger touch_waitlist_entries_updated_at
before update on public.waitlist_entries
for each row execute function private.touch_updated_at();

alter table public.trainer_entitlements
  add column if not exists can_manage_students boolean not null default false,
  add column if not exists can_use_assessments boolean not null default false,
  add column if not exists can_use_workouts boolean not null default false,
  add column if not exists can_manage_progress boolean not null default false;

create or replace function private.trainer_has_active_access_grant(
  p_trainer_user_id uuid,
  p_grant_type text,
  p_observed_at timestamptz default now()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.access_grants grant_row
    where grant_row.trainer_user_id = p_trainer_user_id
      and grant_row.grant_type = p_grant_type
      and grant_row.status = 'ACTIVE'
      and (grant_row.expires_at is null or grant_row.expires_at > p_observed_at)
  );
$$;

create or replace function private.trainer_has_active_billing(
  p_trainer_user_id uuid,
  p_observed_at timestamptz default now()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.billing_accounts account
    join public.billing_subscriptions subscription
      on subscription.billing_account_id = account.id and subscription.is_current
    where account.app_user_id = p_trainer_user_id
      and subscription.product_code = 'PRO'
      and case subscription.billing_state
        when 'ACTIVE' then not (
          subscription.cancel_at_period_end
          and subscription.current_period_end is not null
          and subscription.current_period_end <= p_observed_at
        )
        when 'GRACE' then subscription.grace_until is not null and subscription.grace_until > p_observed_at
        else false
      end
  );
$$;

create or replace function private.trainer_has_full_access(
  p_trainer_user_id uuid,
  p_observed_at timestamptz default now()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.trainer_has_active_billing(p_trainer_user_id, p_observed_at)
    or private.trainer_has_active_access_grant(p_trainer_user_id, 'FOUNDER_ACCESS', p_observed_at);
$$;

create or replace function private.trainer_has_publication_access(p_trainer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.trainer_profiles profile
    where profile.id = p_trainer_id
      and private.trainer_has_full_access(profile.user_id, now())
  );
$$;

revoke all on function private.trainer_has_active_access_grant(uuid,text,timestamptz) from public;
revoke all on function private.trainer_has_active_billing(uuid,timestamptz) from public;
revoke all on function private.trainer_has_full_access(uuid,timestamptz) from public;
revoke all on function private.trainer_has_publication_access(uuid) from public;
grant execute on function private.trainer_has_publication_access(uuid) to anon, authenticated, service_role;

create or replace function private.enforce_access_grant_on_entitlements()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_user_id uuid;
begin
  select profile.user_id into owner_user_id
  from public.trainer_profiles profile
  where profile.id = new.trainer_id;

  if owner_user_id is not null
    and private.trainer_has_active_access_grant(owner_user_id, 'FOUNDER_ACCESS', now()) then
    new.can_use_premium_templates := true;
    new.can_use_template_01 := true;
    new.can_use_template_02 := true;
    new.can_use_template_03 := true;
    new.can_use_template_04 := true;
    new.can_publish_site := true;
    new.can_receive_leads := true;
    new.can_use_matching := true;
    new.can_manage_students := true;
    new.can_use_assessments := true;
    new.can_use_workouts := true;
    new.can_manage_progress := true;
  end if;
  return new;
end;
$$;

revoke all on function private.enforce_access_grant_on_entitlements() from public;
create trigger enforce_access_grant_on_entitlements
before update on public.trainer_entitlements
for each row execute function private.enforce_access_grant_on_entitlements();

create or replace function private.refresh_trainer_entitlements(p_trainer_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_trainer_id uuid;
  full_access boolean;
begin
  select profile.id into target_trainer_id
  from public.trainer_profiles profile
  where profile.user_id = p_trainer_user_id;
  if target_trainer_id is null then return; end if;

  full_access := private.trainer_has_full_access(p_trainer_user_id, now());
  insert into public.trainer_entitlements(trainer_id) values (target_trainer_id)
  on conflict (trainer_id) do nothing;

  update public.trainer_entitlements set
    can_build_site = true,
    can_preview_site = true,
    can_use_free_template = true,
    can_use_premium_templates = true,
    can_use_template_01 = true,
    can_use_template_02 = true,
    can_use_template_03 = true,
    can_use_template_04 = true,
    can_publish_site = full_access,
    can_receive_leads = full_access,
    can_use_matching = full_access,
    can_manage_students = full_access,
    can_use_assessments = full_access,
    can_use_workouts = full_access,
    can_manage_progress = full_access,
    updated_at = now()
  where trainer_id = target_trainer_id;
end;
$$;

revoke all on function private.refresh_trainer_entitlements(uuid) from public;

create or replace function private.refresh_entitlements_after_access_grant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.refresh_trainer_entitlements(coalesce(new.trainer_user_id, old.trainer_user_id));
  return coalesce(new, old);
end;
$$;

revoke all on function private.refresh_entitlements_after_access_grant() from public;
create trigger refresh_entitlements_after_access_grant
after insert or update of status, expires_at, revoked_at on public.access_grants
for each row execute function private.refresh_entitlements_after_access_grant();

create or replace function public.create_access_code(
  p_raw_code text,
  p_code_type text,
  p_max_redemptions integer,
  p_expires_at timestamptz default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_code text := upper(regexp_replace(trim(coalesce(p_raw_code, '')), '[^A-Za-z0-9]', '', 'g'));
  created_id uuid;
begin
  if char_length(normalized_code) not between 12 and 64 then raise exception 'invalid_access_code'; end if;
  if p_code_type <> 'FOUNDER_ACCESS' then raise exception 'invalid_access_code_type'; end if;
  if p_max_redemptions is null or p_max_redemptions < 1 then raise exception 'invalid_redemption_limit'; end if;
  if p_expires_at is not null and p_expires_at <= now() then raise exception 'invalid_expiration'; end if;
  if p_metadata is null or jsonb_typeof(p_metadata) <> 'object' then raise exception 'invalid_metadata'; end if;

  insert into public.access_codes(code_hash, code_type, max_redemptions, expires_at, metadata)
  values (encode(extensions.digest(convert_to(normalized_code, 'UTF8'), 'sha256'), 'hex'), p_code_type, p_max_redemptions, p_expires_at, p_metadata)
  returning id into created_id;
  return created_id;
end;
$$;

revoke all on function public.create_access_code(text,text,integer,timestamptz,jsonb)
from public, anon, authenticated;
grant execute on function public.create_access_code(text,text,integer,timestamptz,jsonb) to service_role;

create or replace function public.redeem_my_access_code(p_raw_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  normalized_code text := upper(regexp_replace(trim(coalesce(p_raw_code, '')), '[^A-Za-z0-9]', '', 'g'));
  target_code public.access_codes;
  created_grant_id uuid;
  existing_grant_id uuid;
begin
  if current_user_id is null then raise exception 'authentication_required'; end if;
  if not exists (
    select 1 from public.user_roles role_row
    where role_row.user_id = current_user_id
      and role_row.role_code = 'trainer'
      and role_row.revoked_at is null
  ) then raise exception 'trainer_role_required'; end if;
  if not exists (
    select 1 from public.trainer_profiles profile
    where profile.user_id = current_user_id and profile.onboarding_completed_at is not null
  ) then raise exception 'onboarding_required'; end if;

  select grant_row.id into existing_grant_id
  from public.access_grants grant_row
  where grant_row.trainer_user_id = current_user_id
    and grant_row.grant_type = 'FOUNDER_ACCESS'
    and grant_row.status = 'ACTIVE'
    and (grant_row.expires_at is null or grant_row.expires_at > now())
  limit 1;
  if existing_grant_id is not null then
    perform private.refresh_trainer_entitlements(current_user_id);
    return jsonb_build_object('status', 'ALREADY_ACTIVE', 'grant_id', existing_grant_id);
  end if;

  if char_length(normalized_code) not between 12 and 64 then
    return jsonb_build_object('status', 'INVALID');
  end if;

  select * into target_code
  from public.access_codes code_row
  where code_row.code_hash = encode(extensions.digest(convert_to(normalized_code, 'UTF8'), 'sha256'), 'hex')
  for update;

  if not found then return jsonb_build_object('status', 'INVALID'); end if;
  if target_code.status <> 'ACTIVE' then return jsonb_build_object('status', 'INVALID'); end if;
  if target_code.expires_at is not null and target_code.expires_at <= now() then
    return jsonb_build_object('status', 'EXPIRED');
  end if;
  if target_code.redemption_count >= target_code.max_redemptions then
    return jsonb_build_object('status', 'LIMIT_REACHED');
  end if;

  insert into public.access_grants(trainer_user_id, grant_type, source_code_id, metadata)
  values (current_user_id, target_code.code_type, target_code.id, jsonb_build_object('source', 'founder_code'))
  on conflict (trainer_user_id, grant_type) where status = 'ACTIVE' do nothing
  returning id into created_grant_id;

  if created_grant_id is null then
    select grant_row.id into existing_grant_id
    from public.access_grants grant_row
    where grant_row.trainer_user_id = current_user_id
      and grant_row.grant_type = target_code.code_type
      and grant_row.status = 'ACTIVE'
    limit 1;
    perform private.refresh_trainer_entitlements(current_user_id);
    return jsonb_build_object('status', 'ALREADY_ACTIVE', 'grant_id', existing_grant_id);
  end if;

  update public.access_codes
  set redemption_count = redemption_count + 1
  where id = target_code.id;
  perform private.refresh_trainer_entitlements(current_user_id);
  return jsonb_build_object('status', 'GRANTED', 'grant_id', created_grant_id);
end;
$$;

revoke all on function public.redeem_my_access_code(text) from public, anon;
grant execute on function public.redeem_my_access_code(text) to authenticated;

create or replace function public.join_waitlist(
  p_email text,
  p_whatsapp text,
  p_audience text,
  p_source text default 'onboarding'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  authenticated_email text;
  normalized_email text := lower(trim(coalesce(p_email, '')));
  digits text := regexp_replace(coalesce(p_whatsapp, ''), '[^0-9]', '', 'g');
  normalized_whatsapp text;
  result_id uuid;
begin
  if current_user_id is null then raise exception 'authentication_required'; end if;
  select lower(email) into authenticated_email from auth.users where id = current_user_id;
  if normalized_email = '' or authenticated_email is null or normalized_email <> authenticated_email then
    raise exception 'email_mismatch';
  end if;
  if p_audience not in ('trainer', 'student') then raise exception 'invalid_audience'; end if;
  if not exists (
    select 1 from public.user_roles role_row
    where role_row.user_id = current_user_id
      and role_row.role_code = p_audience
      and role_row.revoked_at is null
  ) then raise exception 'audience_role_required'; end if;
  if digits !~ '^[1-9][0-9]{7,14}$' then raise exception 'invalid_whatsapp'; end if;
  if p_source !~ '^[a-z][a-z0-9_]{1,49}$' then raise exception 'invalid_source'; end if;
  normalized_whatsapp := '+' || digits;

  insert into public.waitlist_entries(email, whatsapp, audience, source)
  values (normalized_email, normalized_whatsapp, p_audience, p_source)
  on conflict (email, audience) do update set
    whatsapp = excluded.whatsapp,
    source = excluded.source,
    updated_at = now()
  returning id into result_id;
  return result_id;
end;
$$;

revoke all on function public.join_waitlist(text,text,text,text) from public, anon;
grant execute on function public.join_waitlist(text,text,text,text) to authenticated;

create or replace function public.get_my_effective_entitlements()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with me as (
    select profile.id as trainer_id, profile.user_id,
      private.trainer_has_full_access(profile.user_id, now()) as full_access
    from public.trainer_profiles profile
    where profile.user_id = (select auth.uid())
  )
  select to_jsonb(entitlement) || jsonb_build_object(
    'can_publish_site', me.full_access,
    'can_receive_leads', me.full_access,
    'can_use_matching', me.full_access,
    'can_manage_students', me.full_access,
    'can_use_assessments', me.full_access,
    'can_use_workouts', me.full_access,
    'can_manage_progress', me.full_access,
    'access_source', case
      when private.trainer_has_active_billing(me.user_id, now()) then 'BILLING'
      when private.trainer_has_active_access_grant(me.user_id, 'FOUNDER_ACCESS', now()) then 'FOUNDER_ACCESS'
      else 'FREE'
    end
  )
  from me
  join public.trainer_entitlements entitlement on entitlement.trainer_id = me.trainer_id;
$$;

create or replace function public.get_my_access_state()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when (select auth.uid()) is null then null else jsonb_build_object(
    'founder_access_active', private.trainer_has_active_access_grant((select auth.uid()), 'FOUNDER_ACCESS', now()),
    'waitlist_joined', exists (
      select 1 from public.waitlist_entries entry
      join auth.users account on lower(account.email) = entry.email
      where account.id = (select auth.uid()) and entry.audience = 'trainer'
    ),
    'entitlements', public.get_my_effective_entitlements()
  ) end;
$$;

revoke all on function public.get_my_effective_entitlements() from public, anon;
revoke all on function public.get_my_access_state() from public, anon;
grant execute on function public.get_my_effective_entitlements() to authenticated;
grant execute on function public.get_my_access_state() to authenticated;

do $access_security_gate$
begin
  if exists (
    select 1 from (values
      ('public.access_codes'::regclass),
      ('public.access_grants'::regclass),
      ('public.waitlist_entries'::regclass)
    ) as protected_table(oid)
    join pg_class relation on relation.oid = protected_table.oid
    where not relation.relrowsecurity
  ) then raise exception 'access foundation: RLS missing'; end if;

  if has_table_privilege('anon', 'public.access_codes', 'SELECT')
    or has_table_privilege('authenticated', 'public.access_codes', 'SELECT')
    or has_table_privilege('authenticated', 'public.access_grants', 'INSERT')
    or has_table_privilege('authenticated', 'public.waitlist_entries', 'SELECT') then
    raise exception 'access foundation: unsafe direct table privilege';
  end if;

  if has_function_privilege('anon', 'public.redeem_my_access_code(text)', 'EXECUTE')
    or has_function_privilege('authenticated', 'public.create_access_code(text,text,integer,timestamptz,jsonb)', 'EXECUTE') then
    raise exception 'access foundation: unsafe function privilege';
  end if;
end;
$access_security_gate$;
