-- Sprint 3.6: commercial entitlement and purchase-intent foundation.
alter table public.trainer_entitlements
  add column if not exists can_build_site boolean not null default true,
  add column if not exists can_preview_site boolean not null default true,
  add column if not exists can_use_template_01 boolean not null default true,
  add column if not exists can_use_template_02 boolean not null default true;

alter table public.trainer_entitlements alter column can_publish_site set default false;

-- Existing non-premium accounts are FREE under the launch model.
update public.trainer_entitlements
set can_build_site = true,
    can_preview_site = true,
    can_use_template_01 = true,
    can_use_template_02 = true,
    can_publish_site = false
where not can_use_premium_templates;

update public.trainer_profiles profile
set published = false
from public.trainer_entitlements entitlement
where entitlement.trainer_id = profile.id
  and not entitlement.can_publish_site;

create table public.commercial_offers (
  code text primary key check (code ~ '^[a-z0-9_]+$'),
  label text not null check (char_length(label) between 2 and 100),
  price numeric(12,2) not null check (price >= 0),
  currency text not null check (currency = 'BRL'),
  payment_label text not null,
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.commercial_offers (code,label,price,currency,payment_label,enabled)
values ('founder_offer','Oferta Fundadores',350,'BRL','pagamento unico',true)
on conflict (code) do update set label=excluded.label, price=excluded.price, currency=excluded.currency, payment_label=excluded.payment_label, enabled=excluded.enabled, updated_at=now();

create table public.publication_purchase_intents (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.trainer_profiles(id) on delete cascade,
  offer text not null references public.commercial_offers(code),
  price_snapshot numeric(12,2) not null check (price_snapshot >= 0),
  currency text not null check (currency = 'BRL'),
  status text not null default 'interested' check (status in ('interested','contacted','cancelled','paid')),
  created_at timestamptz not null default now(),
  unique (trainer_id,offer,status)
);

create index publication_purchase_intents_trainer_id_idx on public.publication_purchase_intents(trainer_id);

alter table public.commercial_offers enable row level security;
alter table public.publication_purchase_intents enable row level security;

create policy "authenticated reads enabled offers" on public.commercial_offers
for select to authenticated using (enabled);

create policy "owners read own purchase intents" on public.publication_purchase_intents
for select to authenticated using ((select private.owns_trainer(trainer_id)));

revoke all on public.commercial_offers, public.publication_purchase_intents from anon;
revoke insert, update, delete, truncate, references, trigger on public.commercial_offers, public.publication_purchase_intents from authenticated;
grant select on public.commercial_offers, public.publication_purchase_intents to authenticated;

create or replace function public.register_publication_purchase_intent(p_offer text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_trainer_id uuid;
  selected_offer public.commercial_offers;
  intent_id uuid;
begin
  select profile.id into current_trainer_id from public.trainer_profiles profile where profile.user_id=(select auth.uid());
  if current_trainer_id is null then raise exception 'trainer_not_found'; end if;
  select * into selected_offer from public.commercial_offers where code=p_offer and enabled;
  if selected_offer.code is null then raise exception 'offer_unavailable'; end if;
  insert into public.publication_purchase_intents (trainer_id,offer,price_snapshot,currency,status)
  values (current_trainer_id,selected_offer.code,selected_offer.price,selected_offer.currency,'interested')
  on conflict (trainer_id,offer,status) do update set price_snapshot=excluded.price_snapshot,currency=excluded.currency
  returning id into intent_id;
  return intent_id;
end;
$$;

create or replace function public.set_my_site_template(p_template public.template_id)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_trainer_id uuid;
  entitlement public.trainer_entitlements;
begin
  select profile.id into current_trainer_id from public.trainer_profiles profile where profile.user_id=(select auth.uid());
  if current_trainer_id is null then raise exception 'trainer_not_found'; end if;
  select * into entitlement from public.trainer_entitlements where trainer_id=current_trainer_id;
  if p_template='template_01' and not coalesce(entitlement.can_use_template_01,false) then raise exception 'template_entitlement_required'; end if;
  if p_template='template_02' and not coalesce(entitlement.can_use_template_02,false) then raise exception 'template_entitlement_required'; end if;
  update public.trainer_profiles set template_id=p_template where id=current_trainer_id;
end;
$$;

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
  select * into profile from public.trainer_profiles where user_id=(select auth.uid());
  if profile.id is null then raise exception 'trainer_not_found'; end if;
  select * into entitlement from public.trainer_entitlements where trainer_id=profile.id;
  if p_published then
    if not coalesce(entitlement.can_publish_site,false) then raise exception 'publication_entitlement_required'; end if;
    if profile.template_id='template_01' and not coalesce(entitlement.can_use_template_01,false) then raise exception 'template_entitlement_required'; end if;
    if profile.template_id='template_02' and not coalesce(entitlement.can_use_template_02,false) then raise exception 'template_entitlement_required'; end if;
    if nullif(trim(profile.display_name),'') is null or nullif(trim(profile.headline),'') is null or nullif(trim(profile.whatsapp),'') is null then raise exception 'publication_requirements_missing'; end if;
  end if;
  update public.trainer_profiles set published=p_published where id=profile.id;
end;
$$;

revoke all on function public.register_publication_purchase_intent(text) from public,anon;
grant execute on function public.register_publication_purchase_intent(text) to authenticated;
