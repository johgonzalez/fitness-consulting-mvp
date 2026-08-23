begin;
insert into auth.users (id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at)
values ('a3600000-0000-4000-8000-000000000001','authenticated','authenticated','sprint36@example.test','',now(),now(),now());
insert into public.trainer_profiles (id,user_id,slug,display_name,headline,bio,specialty,service_mode,whatsapp,template_id,published)
values ('a3610000-0000-4000-8000-000000000001','a3600000-0000-4000-8000-000000000001','sprint36-free','Trainer Free','Headline','Bio','Teste','online','5511999993601','template_01',false);

set local role authenticated;
set local request.jwt.claims='{"sub":"a3600000-0000-4000-8000-000000000001","role":"authenticated"}';
do $$ begin
  begin perform public.set_my_site_publication(true); raise exception 'FREE publication unexpectedly allowed';
  exception when others then if sqlerrm not like '%publication_entitlement_required%' then raise; end if; end;
end $$;
select public.set_my_site_template('template_02');
select public.register_publication_purchase_intent('founder_offer');
do $$ begin
  begin
    update public.trainer_entitlements set can_publish_site=true where trainer_id='a3610000-0000-4000-8000-000000000001';
    raise exception 'FREE entitlement update unexpectedly allowed';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
set local role postgres;
do $$ begin
  if (select can_publish_site from public.trainer_entitlements where trainer_id='a3610000-0000-4000-8000-000000000001') then raise exception 'FREE changed own entitlement'; end if;
  if not exists(select 1 from public.publication_purchase_intents where trainer_id='a3610000-0000-4000-8000-000000000001' and offer='founder_offer' and price_snapshot=350 and currency='BRL' and status='interested') then raise exception 'purchase intent snapshot failed'; end if;
  update public.trainer_entitlements set can_publish_site=true where trainer_id='a3610000-0000-4000-8000-000000000001';
end $$;

set local role authenticated;
set local request.jwt.claims='{"sub":"a3600000-0000-4000-8000-000000000001","role":"authenticated"}';
select public.set_my_site_publication(true);

reset role;
set local role postgres;
do $$ begin
  if not exists(select 1 from public.trainer_profiles where id='a3610000-0000-4000-8000-000000000001' and published) then raise exception 'founder publication failed'; end if;
end $$;
rollback;
