-- Billing V1 / Sprint 1A: provider-independent billing authority, secure
-- reconciliation and commercial publication enforcement.

create table public.billing_accounts (
  id uuid primary key default gen_random_uuid(),
  app_user_id uuid not null unique references public.app_users(id) on delete restrict,
  provider text,
  provider_customer_id text,
  market text not null default 'BR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billing_accounts_provider_check check (
    provider is null or provider ~ '^[a-z][a-z0-9_]{1,39}$'
  ),
  constraint billing_accounts_customer_check check (
    (provider_customer_id is null) or (provider is not null and char_length(provider_customer_id) between 1 and 255)
  ),
  constraint billing_accounts_market_check check (market ~ '^[A-Z]{2}$')
);

create unique index billing_accounts_provider_customer_idx
  on public.billing_accounts(provider, provider_customer_id)
  where provider is not null and provider_customer_id is not null;

create table public.billing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  billing_account_id uuid not null references public.billing_accounts(id) on delete restrict,
  provider text not null,
  provider_subscription_id text not null,
  provider_product_id text not null,
  provider_price_id text not null,
  latest_provider_invoice_id text,
  product_code text not null,
  market text not null,
  currency text not null,
  billing_interval text not null,
  provider_status text not null,
  billing_state text not null,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  ended_at timestamptz,
  grace_started_at timestamptz,
  grace_until timestamptz,
  suspended_at timestamptz,
  last_synced_at timestamptz not null,
  is_current boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billing_subscriptions_provider_check check (provider ~ '^[a-z][a-z0-9_]{1,39}$'),
  constraint billing_subscriptions_provider_ids_check check (
    char_length(provider_subscription_id) between 1 and 255
    and char_length(provider_product_id) between 1 and 255
    and char_length(provider_price_id) between 1 and 255
    and (latest_provider_invoice_id is null or char_length(latest_provider_invoice_id) between 1 and 255)
  ),
  constraint billing_subscriptions_product_check check (product_code in ('FREE', 'PRO')),
  constraint billing_subscriptions_market_check check (market ~ '^[A-Z]{2}$'),
  constraint billing_subscriptions_currency_check check (currency ~ '^[A-Z]{3}$'),
  constraint billing_subscriptions_interval_check check (billing_interval in ('month', 'year')),
  constraint billing_subscriptions_provider_status_check check (char_length(provider_status) between 1 and 80),
  constraint billing_subscriptions_state_check check (billing_state in ('FREE', 'ACTIVE', 'GRACE', 'SUSPENDED')),
  constraint billing_subscriptions_product_state_check check (
    (product_code = 'FREE' and billing_state = 'FREE')
    or (product_code = 'PRO' and billing_state in ('ACTIVE', 'GRACE', 'SUSPENDED'))
  ),
  constraint billing_subscriptions_period_check check (
    current_period_start is null or current_period_end is null or current_period_end > current_period_start
  ),
  constraint billing_subscriptions_grace_check check (
    (grace_started_at is null and grace_until is null)
    or (grace_started_at is not null and grace_until is not null and grace_until > grace_started_at)
  )
);

create unique index billing_subscriptions_provider_id_idx
  on public.billing_subscriptions(provider, provider_subscription_id);
create unique index billing_subscriptions_current_account_idx
  on public.billing_subscriptions(billing_account_id)
  where is_current;
create index billing_subscriptions_account_idx
  on public.billing_subscriptions(billing_account_id, created_at desc);
create index billing_subscriptions_state_grace_idx
  on public.billing_subscriptions(billing_state, grace_until)
  where is_current;
create index billing_subscriptions_provider_period_idx
  on public.billing_subscriptions(provider, provider_status, current_period_end)
  where is_current;

create table public.billing_checkout_attempts (
  id uuid primary key default gen_random_uuid(),
  billing_account_id uuid not null references public.billing_accounts(id) on delete restrict,
  product_code text not null,
  market text not null,
  currency text not null,
  billing_interval text not null,
  amount_minor bigint,
  provider text not null,
  provider_price_id text,
  provider_idempotency_key text not null,
  provider_checkout_session_id text,
  status text not null default 'CREATED',
  expires_at timestamptz,
  request_fingerprint text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billing_checkout_attempts_product_check check (product_code in ('FREE', 'PRO')),
  constraint billing_checkout_attempts_market_check check (market ~ '^[A-Z]{2}$'),
  constraint billing_checkout_attempts_currency_check check (currency ~ '^[A-Z]{3}$'),
  constraint billing_checkout_attempts_interval_check check (billing_interval in ('month', 'year')),
  constraint billing_checkout_attempts_amount_check check (amount_minor is null or amount_minor >= 0),
  constraint billing_checkout_attempts_provider_check check (provider ~ '^[a-z][a-z0-9_]{1,39}$'),
  constraint billing_checkout_attempts_status_check check (
    status in ('CREATED', 'SESSION_CREATED', 'COMPLETED', 'EXPIRED', 'FAILED', 'CANCELED')
  ),
  constraint billing_checkout_attempts_fingerprint_check check (request_fingerprint ~ '^[a-f0-9]{64}$'),
  constraint billing_checkout_attempts_expiry_check check (expires_at is null or expires_at > created_at)
);

create unique index billing_checkout_attempts_idempotency_idx
  on public.billing_checkout_attempts(provider, provider_idempotency_key);
create unique index billing_checkout_attempts_session_idx
  on public.billing_checkout_attempts(provider, provider_checkout_session_id)
  where provider_checkout_session_id is not null;
create index billing_checkout_attempts_account_status_idx
  on public.billing_checkout_attempts(billing_account_id, status, created_at desc);

create table public.billing_event_receipts (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  provider_object_id text,
  provider_api_version text,
  provider_livemode boolean not null,
  processing_status text not null default 'RECEIVED',
  attempt_count integer not null default 0,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  sanitized_error_code text,
  payload_sha256 text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billing_event_receipts_provider_check check (provider ~ '^[a-z][a-z0-9_]{1,39}$'),
  constraint billing_event_receipts_event_check check (
    char_length(provider_event_id) between 1 and 255
    and char_length(event_type) between 1 and 160
    and (provider_object_id is null or char_length(provider_object_id) between 1 and 255)
  ),
  constraint billing_event_receipts_processing_check check (
    processing_status in ('RECEIVED', 'PROCESSING', 'PROCESSED', 'IGNORED', 'FAILED')
  ),
  constraint billing_event_receipts_attempt_check check (attempt_count between 0 and 1000),
  constraint billing_event_receipts_error_check check (
    sanitized_error_code is null or sanitized_error_code ~ '^[A-Z0-9_]{1,80}$'
  ),
  constraint billing_event_receipts_hash_check check (payload_sha256 ~ '^[a-f0-9]{64}$'),
  constraint billing_event_receipts_processed_check check (
    (processing_status in ('PROCESSED', 'IGNORED') and processed_at is not null)
    or (processing_status not in ('PROCESSED', 'IGNORED'))
  )
);

create unique index billing_event_receipts_provider_event_idx
  on public.billing_event_receipts(provider, provider_event_id);
create index billing_event_receipts_processing_idx
  on public.billing_event_receipts(processing_status, received_at);
create index billing_event_receipts_object_diagnostic_idx
  on public.billing_event_receipts(provider, provider_object_id, received_at desc)
  where provider_object_id is not null;

comment on table public.billing_event_receipts is
  'Sanitized provider event receipt metadata only. No raw payloads or signatures. Operational retention target: 12 months; deletion job deferred.';
comment on column public.billing_checkout_attempts.amount_minor is
  'Money amount in ISO currency minor units. Null until a trusted provider price is selected.';

alter table public.billing_accounts enable row level security;
alter table public.billing_subscriptions enable row level security;
alter table public.billing_checkout_attempts enable row level security;
alter table public.billing_event_receipts enable row level security;

revoke all on public.billing_accounts, public.billing_subscriptions,
  public.billing_checkout_attempts, public.billing_event_receipts
from public, anon, authenticated;

grant select, insert, update, delete on public.billing_accounts,
  public.billing_subscriptions, public.billing_checkout_attempts,
  public.billing_event_receipts to service_role;

create trigger touch_billing_accounts_updated_at
before update on public.billing_accounts
for each row execute function private.touch_updated_at();
create trigger touch_billing_subscriptions_updated_at
before update on public.billing_subscriptions
for each row execute function private.touch_updated_at();
create trigger touch_billing_checkout_attempts_updated_at
before update on public.billing_checkout_attempts
for each row execute function private.touch_updated_at();
create trigger touch_billing_event_receipts_updated_at
before update on public.billing_event_receipts
for each row execute function private.touch_updated_at();

-- Existing template flags remain rollout/catalog controls, not paid tiers.
alter table public.trainer_entitlements
  alter column can_build_site set default true,
  alter column can_preview_site set default true,
  alter column can_use_free_template set default true,
  alter column can_use_premium_templates set default true,
  alter column can_use_template_01 set default true,
  alter column can_use_template_02 set default true,
  alter column can_use_template_03 set default true,
  alter column can_use_template_04 set default true;

update public.trainer_entitlements
set can_build_site = true,
    can_preview_site = true,
    can_use_free_template = true,
    can_use_premium_templates = true,
    can_use_template_01 = true,
    can_use_template_02 = true,
    can_use_template_03 = true,
    can_use_template_04 = true;

create or replace function public.get_my_billing_summary()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when (select auth.uid()) is null then null
    else jsonb_build_object(
      'product_code', coalesce(subscription.product_code, 'FREE'),
      'billing_state', coalesce(subscription.billing_state, 'FREE'),
      'market', coalesce(subscription.market, account.market, 'BR'),
      'currency', subscription.currency,
      'billing_interval', subscription.billing_interval,
      'current_period_end', subscription.current_period_end,
      'cancel_at_period_end', coalesce(subscription.cancel_at_period_end, false),
      'grace_until', subscription.grace_until
    )
  end
  from (select 1) seed
  left join public.billing_accounts account
    on account.app_user_id = (select auth.uid())
  left join public.billing_subscriptions subscription
    on subscription.billing_account_id = account.id
   and subscription.is_current;
$$;

revoke all on function public.get_my_billing_summary() from public, anon;
grant execute on function public.get_my_billing_summary() to authenticated;

create or replace function private.trainer_has_publication_access(p_trainer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select entitlement.can_publish_site
        and subscription.product_code = 'PRO'
        and case subscription.billing_state
          when 'ACTIVE' then not (
            subscription.cancel_at_period_end
            and subscription.current_period_end is not null
            and subscription.current_period_end <= now()
          )
          when 'GRACE' then subscription.grace_until is not null and subscription.grace_until > now()
          else false
        end
      from public.trainer_profiles profile
      join public.trainer_entitlements entitlement on entitlement.trainer_id = profile.id
      join public.billing_accounts account on account.app_user_id = profile.user_id
      join public.billing_subscriptions subscription
        on subscription.billing_account_id = account.id and subscription.is_current
      where profile.id = p_trainer_id
    ),
    (
      select entitlement.can_publish_site
      from public.trainer_entitlements entitlement
      where entitlement.trainer_id = p_trainer_id
    ),
    false
  );
$$;

revoke all on function private.trainer_has_publication_access(uuid) from public;
grant execute on function private.trainer_has_publication_access(uuid) to anon, authenticated, service_role;

drop policy if exists "public reads published profiles" on public.trainer_profiles;
create policy "public reads commercially available profiles"
on public.trainer_profiles for select to anon, authenticated
using (published and (select private.trainer_has_publication_access(id)));

drop policy if exists "public reads published testimonials" on public.testimonials;
create policy "public reads commercially available testimonials"
on public.testimonials for select to anon, authenticated
using (
  published and exists (
    select 1
    from public.trainer_profiles profile
    where profile.id = trainer_id
      and profile.published
      and (select private.trainer_has_publication_access(profile.id))
  )
);

create or replace function public.get_public_services(p_trainer_id uuid)
returns table (
  id uuid,
  trainer_id uuid,
  title text,
  description text,
  service_mode public.service_mode,
  price numeric,
  currency text,
  billing_type text,
  price_visibility text,
  price_visible boolean,
  active boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select service.id, service.trainer_id, service.title, service.description,
    service.service_mode,
    case when service.price_visibility = 'public' then service.price else null end,
    service.currency, service.billing_type, service.price_visibility,
    service.price_visibility = 'public', service.active
  from public.services service
  join public.trainer_profiles profile on profile.id = service.trainer_id
  where service.trainer_id = p_trainer_id
    and service.active
    and profile.published
    and (select private.trainer_has_publication_access(profile.id));
$$;

create or replace function public.get_public_site_services(p_trainer_id uuid)
returns table (
  id uuid,
  trainer_id uuid,
  title text,
  description text,
  service_mode public.service_mode,
  price numeric,
  currency text,
  billing_type text,
  price_visibility text,
  price_visible boolean,
  active boolean,
  benefits text[],
  conversion_mode text
)
language sql
stable
security definer
set search_path = ''
as $$
  select service.id, service.trainer_id, service.title, service.description,
    service.service_mode,
    case when service.price_visibility = 'public' then service.price else null end,
    service.currency, service.billing_type, service.price_visibility,
    service.price_visibility = 'public', service.active,
    service.benefits, service.conversion_mode
  from public.services service
  join public.trainer_profiles profile on profile.id = service.trainer_id
  where service.trainer_id = p_trainer_id
    and service.active
    and profile.published
    and (select private.trainer_has_publication_access(profile.id));
$$;

create or replace function public.get_public_methodology_items(p_trainer_id uuid)
returns table (
  id uuid,
  title text,
  description text,
  "position" integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select item.id, item.title, item.description, item.position
  from public.trainer_methodology_items item
  join public.trainer_profiles profile on profile.id = item.trainer_id
  where item.trainer_id = p_trainer_id
    and profile.published
    and (select private.trainer_has_publication_access(profile.id))
  order by item.position, item.created_at, item.id;
$$;

revoke all on function public.get_public_services(uuid) from public;
grant execute on function public.get_public_services(uuid) to anon, authenticated;
revoke all on function public.get_public_site_services(uuid) from public;
grant execute on function public.get_public_site_services(uuid) to anon, authenticated;
revoke all on function public.get_public_methodology_items(uuid) from public;
grant execute on function public.get_public_methodology_items(uuid) to anon, authenticated;

create or replace function public.set_my_site_publication(p_published boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile public.trainer_profiles;
  entitlement public.trainer_entitlements;
begin
  select * into profile
  from public.trainer_profiles
  where user_id = (select auth.uid());

  if profile.id is null then raise exception 'trainer_not_found'; end if;

  select * into entitlement
  from public.trainer_entitlements
  where trainer_id = profile.id;

  if p_published then
    if not (select private.trainer_has_publication_access(profile.id)) then
      raise exception 'publication_entitlement_required';
    end if;
    if profile.template_id::text = 'template_01' and not coalesce(entitlement.can_use_template_01, false) then
      raise exception 'template_entitlement_required';
    end if;
    if profile.template_id::text = 'template_02' and not coalesce(entitlement.can_use_template_02, false) then
      raise exception 'template_entitlement_required';
    end if;
    if profile.template_id::text = 'template_03' and not coalesce(entitlement.can_use_template_03, false) then
      raise exception 'template_entitlement_required';
    end if;
    if profile.template_id::text = 'template_04' and not coalesce(entitlement.can_use_template_04, false) then
      raise exception 'template_entitlement_required';
    end if;
    if nullif(trim(profile.display_name), '') is null
      or nullif(trim(profile.headline), '') is null
      or nullif(trim(profile.whatsapp), '') is null then
      raise exception 'publication_requirements_missing';
    end if;
  end if;

  update public.trainer_profiles
  set published = p_published
  where id = profile.id;
end;
$$;

revoke all on function public.set_my_site_publication(boolean) from public, anon;
grant execute on function public.set_my_site_publication(boolean) to authenticated;

create or replace function public.reconcile_billing_subscription(
  p_app_user_id uuid,
  p_provider text,
  p_provider_customer_id text,
  p_provider_subscription_id text,
  p_provider_product_id text,
  p_provider_price_id text,
  p_latest_provider_invoice_id text,
  p_product_code text,
  p_market text,
  p_currency text,
  p_billing_interval text,
  p_provider_status text,
  p_billing_state text,
  p_current_period_start timestamptz,
  p_current_period_end timestamptz,
  p_cancel_at_period_end boolean,
  p_canceled_at timestamptz,
  p_ended_at timestamptz,
  p_observed_at timestamptz,
  p_prior_paid_access boolean,
  p_is_current boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  account public.billing_accounts;
  existing_subscription public.billing_subscriptions;
  resolved_state text := p_billing_state;
  resolved_grace_started_at timestamptz;
  resolved_grace_until timestamptz;
  resolved_suspended_at timestamptz;
  subscription_id uuid;
  resolved_trainer_id uuid;
  existing_owner_user_id uuid;
begin
  if p_observed_at is null then raise exception 'billing_observed_at_required'; end if;
  if p_provider !~ '^[a-z][a-z0-9_]{1,39}$' then raise exception 'invalid_billing_provider'; end if;
  if p_product_code not in ('FREE', 'PRO') then raise exception 'invalid_product_code'; end if;
  if p_market !~ '^[A-Z]{2}$' then raise exception 'invalid_market'; end if;
  if p_currency !~ '^[A-Z]{3}$' then raise exception 'invalid_currency'; end if;
  if p_billing_interval not in ('month', 'year') then raise exception 'invalid_billing_interval'; end if;
  if p_billing_state not in ('FREE', 'ACTIVE', 'GRACE', 'SUSPENDED') then raise exception 'invalid_billing_state'; end if;
  if (p_product_code = 'FREE' and p_billing_state <> 'FREE')
    or (p_product_code = 'PRO' and p_billing_state = 'FREE') then
    raise exception 'invalid_product_state';
  end if;
  if nullif(p_provider_customer_id, '') is null
    or nullif(p_provider_subscription_id, '') is null
    or nullif(p_provider_product_id, '') is null
    or nullif(p_provider_price_id, '') is null
    or nullif(p_provider_status, '') is null then
    raise exception 'incomplete_provider_snapshot';
  end if;

  select * into existing_subscription
  from public.billing_subscriptions subscription
  where subscription.provider = p_provider
    and subscription.provider_subscription_id = p_provider_subscription_id
  for update;

  if existing_subscription.id is not null then
    select existing_account.app_user_id into existing_owner_user_id
    from public.billing_accounts existing_account
    where existing_account.id = existing_subscription.billing_account_id;

    if existing_owner_user_id <> p_app_user_id then
      raise exception 'provider_subscription_owner_mismatch';
    end if;

    -- A later normalized snapshot is authoritative. Old/reordered events
    -- cannot roll commercial access backward after newer reconciliation.
    if existing_subscription.last_synced_at > p_observed_at then
      return existing_subscription.id;
    end if;
  end if;

  insert into public.billing_accounts(app_user_id, provider, provider_customer_id, market)
  values (p_app_user_id, p_provider, p_provider_customer_id, p_market)
  on conflict (app_user_id) do update
    set provider = excluded.provider,
        provider_customer_id = excluded.provider_customer_id,
        market = excluded.market
  returning * into account;

  if p_billing_state = 'ACTIVE' and p_cancel_at_period_end then
    if p_current_period_end is null then raise exception 'canceling_period_end_required'; end if;
    if p_current_period_end <= p_observed_at then resolved_state := 'SUSPENDED'; end if;
  end if;

  if resolved_state = 'GRACE' then
    if existing_subscription.billing_state = 'GRACE'
      and existing_subscription.grace_started_at is not null
      and existing_subscription.grace_until is not null then
      resolved_grace_started_at := existing_subscription.grace_started_at;
      resolved_grace_until := existing_subscription.grace_until;
    elsif existing_subscription.billing_state = 'ACTIVE' or p_prior_paid_access then
      resolved_grace_started_at := p_observed_at;
      resolved_grace_until := p_observed_at + interval '7 days';
    else
      raise exception 'grace_requires_prior_paid_access';
    end if;

    if resolved_grace_until <= p_observed_at then
      resolved_state := 'SUSPENDED';
    end if;
  elsif resolved_state = 'ACTIVE' then
    resolved_grace_started_at := null;
    resolved_grace_until := null;
  else
    resolved_grace_started_at := existing_subscription.grace_started_at;
    resolved_grace_until := existing_subscription.grace_until;
  end if;

  if resolved_state = 'SUSPENDED' then
    resolved_suspended_at := coalesce(existing_subscription.suspended_at, p_observed_at);
  else
    resolved_suspended_at := null;
  end if;

  if p_is_current then
    update public.billing_subscriptions
    set is_current = false
    where billing_account_id = account.id
      and is_current
      and id is distinct from existing_subscription.id;
  end if;

  insert into public.billing_subscriptions(
    billing_account_id, provider, provider_subscription_id, provider_product_id,
    provider_price_id, latest_provider_invoice_id, product_code, market, currency,
    billing_interval, provider_status, billing_state, current_period_start,
    current_period_end, cancel_at_period_end, canceled_at, ended_at,
    grace_started_at, grace_until, suspended_at, last_synced_at, is_current
  ) values (
    account.id, p_provider, p_provider_subscription_id, p_provider_product_id,
    p_provider_price_id, p_latest_provider_invoice_id, p_product_code, p_market, p_currency,
    p_billing_interval, p_provider_status, resolved_state, p_current_period_start,
    p_current_period_end, p_cancel_at_period_end, p_canceled_at, p_ended_at,
    resolved_grace_started_at, resolved_grace_until, resolved_suspended_at,
    p_observed_at, p_is_current
  )
  on conflict (provider, provider_subscription_id) do update
  set provider_product_id = excluded.provider_product_id,
      provider_price_id = excluded.provider_price_id,
      latest_provider_invoice_id = excluded.latest_provider_invoice_id,
      product_code = excluded.product_code,
      market = excluded.market,
      currency = excluded.currency,
      billing_interval = excluded.billing_interval,
      provider_status = excluded.provider_status,
      billing_state = excluded.billing_state,
      current_period_start = excluded.current_period_start,
      current_period_end = excluded.current_period_end,
      cancel_at_period_end = excluded.cancel_at_period_end,
      canceled_at = excluded.canceled_at,
      ended_at = excluded.ended_at,
      grace_started_at = excluded.grace_started_at,
      grace_until = excluded.grace_until,
      suspended_at = excluded.suspended_at,
      last_synced_at = excluded.last_synced_at,
      is_current = excluded.is_current
  returning id into subscription_id;

  if p_is_current then
    select profile.id into resolved_trainer_id
    from public.trainer_profiles profile
    where profile.user_id = p_app_user_id;

    if resolved_trainer_id is not null then
      insert into public.trainer_entitlements(trainer_id)
      values (resolved_trainer_id)
      on conflict (trainer_id) do nothing;

      update public.trainer_entitlements entitlement
      set can_build_site = true,
          can_preview_site = true,
          can_use_free_template = true,
          can_use_premium_templates = true,
          can_use_template_01 = true,
          can_use_template_02 = true,
          can_use_template_03 = true,
          can_use_template_04 = true,
          can_publish_site = resolved_state in ('ACTIVE', 'GRACE'),
          can_receive_leads = resolved_state in ('ACTIVE', 'GRACE'),
          can_use_matching = resolved_state in ('ACTIVE', 'GRACE'),
          updated_at = p_observed_at
      where entitlement.trainer_id = resolved_trainer_id;
    end if;
  end if;

  return subscription_id;
end;
$$;

revoke all on function public.reconcile_billing_subscription(
  uuid,text,text,text,text,text,text,text,text,text,text,text,text,
  timestamptz,timestamptz,boolean,timestamptz,timestamptz,timestamptz,boolean,boolean
) from public, anon, authenticated;
grant execute on function public.reconcile_billing_subscription(
  uuid,text,text,text,text,text,text,text,text,text,text,text,text,
  timestamptz,timestamptz,boolean,timestamptz,timestamptz,timestamptz,boolean,boolean
) to service_role;

do $billing_security_gate$
begin
  if exists (
    select 1 from (values
      ('public.billing_accounts'::regclass),
      ('public.billing_subscriptions'::regclass),
      ('public.billing_checkout_attempts'::regclass),
      ('public.billing_event_receipts'::regclass)
    ) as billing_table(oid)
    join pg_class relation on relation.oid = billing_table.oid
    where not relation.relrowsecurity
  ) then raise exception 'Billing foundation: RLS missing'; end if;

  if has_table_privilege('anon', 'public.billing_accounts', 'SELECT')
    or has_table_privilege('authenticated', 'public.billing_accounts', 'SELECT')
    or has_table_privilege('authenticated', 'public.billing_subscriptions', 'UPDATE')
    or has_table_privilege('authenticated', 'public.billing_event_receipts', 'SELECT') then
    raise exception 'Billing foundation: unsafe direct table privilege';
  end if;

  if has_function_privilege('anon', 'public.get_my_billing_summary()', 'EXECUTE')
    or not has_function_privilege('authenticated', 'public.get_my_billing_summary()', 'EXECUTE') then
    raise exception 'Billing foundation: summary privilege mismatch';
  end if;

  if has_function_privilege(
    'authenticated',
    'public.reconcile_billing_subscription(uuid,text,text,text,text,text,text,text,text,text,text,text,text,timestamptz,timestamptz,boolean,timestamptz,timestamptz,timestamptz,boolean,boolean)',
    'EXECUTE'
  ) then raise exception 'Billing foundation: authenticated can reconcile'; end if;
end;
$billing_security_gate$;
