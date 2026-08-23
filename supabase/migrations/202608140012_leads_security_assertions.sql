-- Sprint 4 security gate assertions and qualified cross-table RLS reference.
drop policy if exists "matched trainers read assigned leads" on public.student_leads;
create policy "matched trainers read assigned leads" on public.student_leads
for select to authenticated using (
  exists (select 1 from public.lead_matches match where match.lead_id=student_leads.id and (select private.owns_trainer(match.trainer_id)))
);

-- Supabase roles may retain explicit EXECUTE grants independently of PUBLIC.
revoke all on function public.configure_my_leads_beta(text[],public.service_mode,text,text,uuid[],boolean), public.set_my_lead_match_status(uuid,text), public.get_my_dashboard_metrics() from anon;
revoke all on function public.configure_my_leads_beta(text[],public.service_mode,text,text,uuid[],boolean), public.set_my_lead_match_status(uuid,text), public.get_my_dashboard_metrics() from public;
grant execute on function public.configure_my_leads_beta(text[],public.service_mode,text,text,uuid[],boolean), public.set_my_lead_match_status(uuid,text), public.get_my_dashboard_metrics() to authenticated;

do $$
declare failures text[] := '{}';
begin
  if not (select relrowsecurity from pg_class where oid='public.student_leads'::regclass) then failures:=array_append(failures,'student_leads RLS disabled'); end if;
  if not (select relrowsecurity from pg_class where oid='public.lead_matches'::regclass) then failures:=array_append(failures,'lead_matches RLS disabled'); end if;
  if not (select relrowsecurity from pg_class where oid='public.analytics_events'::regclass) then failures:=array_append(failures,'analytics_events RLS disabled'); end if;
  if has_table_privilege('anon','public.student_leads','SELECT') or has_table_privilege('anon','public.lead_matches','SELECT') then failures:=array_append(failures,'anonymous listing privilege'); end if;
  if has_table_privilege('authenticated','public.lead_matches','INSERT') or has_table_privilege('authenticated','public.lead_matches','UPDATE') then failures:=array_append(failures,'trainer can manipulate matches'); end if;
  if has_table_privilege('authenticated','public.trainer_lead_settings','INSERT') or has_table_privilege('authenticated','public.trainer_lead_settings','UPDATE') then failures:=array_append(failures,'trainer can bypass settings RPC'); end if;
  if has_table_privilege('anon','public.analytics_events','SELECT') or has_table_privilege('authenticated','public.analytics_events','SELECT') then failures:=array_append(failures,'raw analytics exposed'); end if;
  if not has_function_privilege('anon','public.create_student_lead_and_match(text,text,text,text,public.service_mode,text,text,text,numeric,numeric,text,boolean,text)','EXECUTE') then failures:=array_append(failures,'controlled anonymous lead creation unavailable'); end if;
  if has_function_privilege('anon','public.configure_my_leads_beta(text[],public.service_mode,text,text,uuid[],boolean)','EXECUTE') then failures:=array_append(failures,'anonymous can configure trainer'); end if;
  if cardinality(failures)>0 then raise exception 'Sprint 4 security assertions failed: %',array_to_string(failures,', '); end if;
end $$;
