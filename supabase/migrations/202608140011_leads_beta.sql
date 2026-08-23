-- Sprint 4: controlled public lead capture, deterministic matching and basic analytics.
create table public.trainer_lead_settings (
  trainer_id uuid primary key references public.trainer_profiles(id) on delete cascade,
  objectives text[] not null,
  service_mode public.service_mode not null,
  city text,
  state text,
  service_ids uuid[] not null,
  accepting_new_clients boolean not null default false,
  configured_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trainer_lead_objectives_check check (cardinality(objectives) between 1 and 6 and objectives <@ array['weight_loss','hypertrophy','conditioning','health','performance','other']::text[]),
  constraint trainer_lead_services_check check (cardinality(service_ids) between 1 and 12),
  constraint trainer_lead_location_check check (service_mode = 'online' or (char_length(trim(city)) between 2 and 120 and state ~ '^[A-Z]{2}$'))
);

create table public.student_leads (
  id uuid primary key default gen_random_uuid(),
  first_name text not null check (char_length(first_name) between 2 and 60),
  whatsapp text not null check (whatsapp ~ '^[0-9]{10,15}$'),
  email text check (email is null or char_length(email) between 5 and 254),
  goal text not null check (goal in ('weight_loss','hypertrophy','conditioning','health','performance','other')),
  service_mode public.service_mode not null,
  city text check (city is null or char_length(city) between 2 and 120),
  state text check (state is null or state ~ '^[A-Z]{2}$'),
  budget_band text not null check (budget_band in ('up_to_150','from_150_to_250','from_250_to_400','from_400_to_600','above_600','unknown')),
  budget_min numeric(12,2) check (budget_min is null or budget_min >= 0),
  budget_max numeric(12,2) check (budget_max is null or budget_max >= budget_min),
  start_timing text not null check (start_timing in ('now','seven_days','this_month','researching')),
  status text not null default 'qualified' check (status = 'qualified'),
  consent_at timestamptz not null,
  anonymous_session_hash text not null check (anonymous_session_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  constraint student_lead_location_check check (service_mode = 'online' or (city is not null and state is not null))
);

create table public.lead_matches (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.student_leads(id) on delete cascade,
  trainer_id uuid not null references public.trainer_profiles(id) on delete cascade,
  score smallint not null check (score between 0 and 100),
  status text not null default 'new' check (status in ('new','contacted','won','lost')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lead_id, trainer_id)
);

create table public.analytics_events (
  id bigint generated always as identity primary key,
  event_type text not null check (event_type in ('profile_view','whatsapp_click','lead_form_started','lead_created','match_created')),
  trainer_id uuid references public.trainer_profiles(id) on delete cascade,
  lead_id uuid references public.student_leads(id) on delete cascade,
  anonymous_session_hash text check (anonymous_session_hash is null or anonymous_session_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now()
);

create index trainer_lead_settings_active_idx on public.trainer_lead_settings (accepting_new_clients) where accepting_new_clients;
create index student_leads_session_created_idx on public.student_leads (anonymous_session_hash, created_at desc);
create index lead_matches_trainer_created_idx on public.lead_matches (trainer_id, created_at desc);
create index lead_matches_trainer_status_idx on public.lead_matches (trainer_id, status);
create index analytics_trainer_type_created_idx on public.analytics_events (trainer_id, event_type, created_at desc);
create index analytics_dedupe_idx on public.analytics_events (trainer_id, anonymous_session_hash, created_at desc) where event_type='profile_view';

alter table public.trainer_lead_settings enable row level security;
alter table public.student_leads enable row level security;
alter table public.lead_matches enable row level security;
alter table public.analytics_events enable row level security;

create policy "owners read own lead settings" on public.trainer_lead_settings for select to authenticated using ((select private.owns_trainer(trainer_id)));
create policy "matched trainers read assigned leads" on public.student_leads for select to authenticated using (exists (select 1 from public.lead_matches match where match.lead_id=id and (select private.owns_trainer(match.trainer_id))));
create policy "trainers read own matches" on public.lead_matches for select to authenticated using ((select private.owns_trainer(trainer_id)));

revoke all on public.trainer_lead_settings, public.student_leads, public.lead_matches, public.analytics_events from anon, authenticated;
grant select on public.trainer_lead_settings, public.student_leads, public.lead_matches to authenticated;

create or replace function public.configure_my_leads_beta(p_objectives text[], p_service_mode public.service_mode, p_city text, p_state text, p_service_ids uuid[], p_accepting boolean)
returns void language plpgsql security definer set search_path='' as $$
declare current_trainer uuid; valid_services integer;
begin
  select id into current_trainer from public.trainer_profiles where user_id=(select auth.uid());
  if current_trainer is null then raise exception 'trainer_not_found'; end if;
  if not exists(select 1 from public.trainer_entitlements where trainer_id=current_trainer and can_receive_leads) then raise exception 'leads_entitlement_required'; end if;
  if cardinality(p_objectives) is null or cardinality(p_objectives)=0 or not (p_objectives <@ array['weight_loss','hypertrophy','conditioning','health','performance','other']::text[]) then raise exception 'invalid_objectives'; end if;
  if p_service_mode <> 'online' and (char_length(trim(coalesce(p_city,''))) < 2 or upper(trim(coalesce(p_state,''))) !~ '^[A-Z]{2}$') then raise exception 'location_required'; end if;
  select count(*) into valid_services from public.services where trainer_id=current_trainer and id=any(p_service_ids) and active and price is not null and price_visibility in ('public','match_only');
  if valid_services <> cardinality(p_service_ids) or valid_services=0 then raise exception 'priced_active_service_required'; end if;
  insert into public.trainer_lead_settings(trainer_id,objectives,service_mode,city,state,service_ids,accepting_new_clients)
  values(current_trainer,array(select distinct unnest(p_objectives)),p_service_mode,nullif(trim(p_city),''),case when p_service_mode='online' then null else upper(trim(p_state)) end,p_service_ids,p_accepting)
  on conflict(trainer_id) do update set objectives=excluded.objectives,service_mode=excluded.service_mode,city=excluded.city,state=excluded.state,service_ids=excluded.service_ids,accepting_new_clients=excluded.accepting_new_clients,configured_at=now(),updated_at=now();
end $$;

create or replace function public.create_student_lead_and_match(p_first_name text,p_whatsapp text,p_email text,p_goal text,p_service_mode public.service_mode,p_city text,p_state text,p_budget_band text,p_budget_min numeric,p_budget_max numeric,p_start_timing text,p_consent boolean,p_session_hash text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare new_lead uuid; result jsonb;
begin
  if not p_consent then raise exception 'consent_required'; end if;
  if p_session_hash !~ '^[a-f0-9]{64}$' then raise exception 'invalid_session'; end if;
  if (select count(*) from public.student_leads where anonymous_session_hash=p_session_hash and created_at>now()-interval '1 hour') >= 3 then raise exception 'rate_limited'; end if;
  if exists(select 1 from public.student_leads where anonymous_session_hash=p_session_hash and whatsapp=p_whatsapp and goal=p_goal and created_at>now()-interval '10 minutes') then raise exception 'duplicate_submission'; end if;
  insert into public.student_leads(first_name,whatsapp,email,goal,service_mode,city,state,budget_band,budget_min,budget_max,start_timing,consent_at,anonymous_session_hash)
  values(initcap(trim(p_first_name)),regexp_replace(p_whatsapp,'\D','','g'),nullif(lower(trim(p_email)),''),p_goal,p_service_mode,nullif(initcap(trim(p_city)),''),case when p_service_mode='online' then null else upper(trim(p_state)) end,p_budget_band,p_budget_min,p_budget_max,p_start_timing,now(),p_session_hash) returning id into new_lead;
  with candidates as (
    select s.trainer_id,
      (case when p_goal=any(s.objectives) then 30 else 0 end +
       case when s.service_mode='both' or p_service_mode='both' or s.service_mode=p_service_mode then 25 else 0 end +
       case when p_service_mode='online' or s.service_mode='online' or (lower(s.city)=lower(trim(p_city)) and s.state=upper(trim(p_state))) then 20 else 0 end +
       case when p_budget_band='unknown' or exists(select 1 from public.services sv where sv.id=any(s.service_ids) and sv.price is not null and (p_budget_min is null or sv.price>=p_budget_min) and (p_budget_max is null or sv.price<=p_budget_max)) then 15 else 0 end + 10)::smallint score
    from public.trainer_lead_settings s join public.trainer_entitlements e on e.trainer_id=s.trainer_id and e.can_receive_leads
    where s.accepting_new_clients and exists(select 1 from public.services sv where sv.trainer_id=s.trainer_id and sv.id=any(s.service_ids) and sv.active and sv.price is not null and sv.price_visibility in ('public','match_only'))
    order by score desc,s.trainer_id limit 3
  ), inserted as (
    insert into public.lead_matches(lead_id,trainer_id,score) select new_lead,trainer_id,score from candidates returning trainer_id,score
  )
  select coalesce(jsonb_agg(jsonb_build_object('slug',p.slug,'name',p.display_name,'headline',p.headline,'specialty',p.specialty,'city',p.city,'service_mode',p.service_mode,'photo_url',p.profile_image_url,'score',i.score,'whatsapp_available',nullif(p.whatsapp,'') is not null) order by i.score desc),'[]'::jsonb) into result
  from inserted i join public.trainer_profiles p on p.id=i.trainer_id;
  insert into public.analytics_events(event_type,lead_id,anonymous_session_hash) values('lead_created',new_lead,p_session_hash);
  insert into public.analytics_events(event_type,trainer_id,lead_id,anonymous_session_hash) select 'match_created',trainer_id,new_lead,p_session_hash from public.lead_matches where lead_id=new_lead;
  return jsonb_build_object('lead_id',new_lead,'matches',result);
end $$;

create or replace function public.set_my_lead_match_status(p_match_id uuid,p_status text)
returns void language plpgsql security definer set search_path='' as $$
begin
  if p_status not in ('new','contacted','won','lost') then raise exception 'invalid_status'; end if;
  update public.lead_matches set status=p_status,updated_at=now() where id=p_match_id and (select private.owns_trainer(trainer_id));
  if not found then raise exception 'match_not_found'; end if;
end $$;

create or replace function public.record_public_analytics(p_event text,p_slug text,p_session_hash text)
returns void language plpgsql security definer set search_path='' as $$
declare target_trainer uuid;
begin
  if p_event not in ('profile_view','whatsapp_click') or p_session_hash !~ '^[a-f0-9]{64}$' then raise exception 'invalid_event'; end if;
  select id into target_trainer from public.trainer_profiles where slug=p_slug and published;
  if target_trainer is null then return; end if;
  if p_event='profile_view' and exists(select 1 from public.analytics_events where event_type='profile_view' and trainer_id=target_trainer and anonymous_session_hash=p_session_hash and created_at>now()-interval '30 minutes') then return; end if;
  insert into public.analytics_events(event_type,trainer_id,anonymous_session_hash) values(p_event,target_trainer,p_session_hash);
end $$;

create or replace function public.record_lead_form_started(p_session_hash text)
returns void language plpgsql security definer set search_path='' as $$
begin
  if p_session_hash !~ '^[a-f0-9]{64}$' then raise exception 'invalid_session'; end if;
  if not exists(select 1 from public.analytics_events where event_type='lead_form_started' and anonymous_session_hash=p_session_hash and created_at>now()-interval '30 minutes') then insert into public.analytics_events(event_type,anonymous_session_hash) values('lead_form_started',p_session_hash); end if;
end $$;

create or replace function public.get_my_dashboard_metrics() returns jsonb language sql security definer set search_path='' stable as $$
  with me as (select id from public.trainer_profiles where user_id=(select auth.uid()))
  select jsonb_build_object('profile_views',(select count(*) from public.analytics_events where trainer_id=(select id from me) and event_type='profile_view'),'whatsapp_clicks',(select count(*) from public.analytics_events where trainer_id=(select id from me) and event_type='whatsapp_click'),'leads',(select count(*) from public.lead_matches where trainer_id=(select id from me)));
$$;

revoke all on function public.configure_my_leads_beta(text[],public.service_mode,text,text,uuid[],boolean), public.create_student_lead_and_match(text,text,text,text,public.service_mode,text,text,text,numeric,numeric,text,boolean,text), public.set_my_lead_match_status(uuid,text), public.record_public_analytics(text,text,text), public.record_lead_form_started(text), public.get_my_dashboard_metrics() from public;
grant execute on function public.configure_my_leads_beta(text[],public.service_mode,text,text,uuid[],boolean), public.set_my_lead_match_status(uuid,text), public.get_my_dashboard_metrics() to authenticated;
grant execute on function public.create_student_lead_and_match(text,text,text,text,public.service_mode,text,text,text,numeric,numeric,text,boolean,text), public.record_public_analytics(text,text,text), public.record_lead_form_started(text) to anon,authenticated;
