-- PPerfil local/development demo seed.
-- Run only through scripts/seed-local-demo.ps1 or `supabase db reset --local`.
-- Never pass --linked and never execute this file against the hosted project.

begin;

do $$
begin
  if current_database() <> 'postgres' then
    raise exception 'PPERFIL local seed expects the local Supabase database named postgres';
  end if;
end;
$$;

-- Deterministic local identities. Password for every seeded login: PPerfilDemo#2026
insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('70000000-0000-4000-8000-000000000001','authenticated','authenticated','thiago.demo@pperfil.local',extensions.crypt('PPerfilDemo#2026',extensions.gen_salt('bf')),now(),' {"provider":"email","providers":["email"]}'::jsonb,'{"name":"Thiago Costa"}'::jsonb,now()-interval '1 year',now()),
  ('76000000-0000-4000-8000-000000000001','authenticated','authenticated','mariana.demo@pperfil.local',extensions.crypt('PPerfilDemo#2026',extensions.gen_salt('bf')),now(),' {"provider":"email","providers":["email"]}'::jsonb,'{"name":"Mariana Souza"}'::jsonb,now()-interval '10 months',now()),
  ('76000000-0000-4000-8000-000000000002','authenticated','authenticated','lucas.demo@pperfil.local',extensions.crypt('PPerfilDemo#2026',extensions.gen_salt('bf')),now(),' {"provider":"email","providers":["email"]}'::jsonb,'{"name":"Lucas Prado"}'::jsonb,now()-interval '8 months',now()),
  ('76000000-0000-4000-8000-000000000003','authenticated','authenticated','fernanda.demo@pperfil.local',extensions.crypt('PPerfilDemo#2026',extensions.gen_salt('bf')),now(),' {"provider":"email","providers":["email"]}'::jsonb,'{"name":"Fernanda Rocha"}'::jsonb,now()-interval '6 months',now()),
  ('76000000-0000-4000-8000-000000000004','authenticated','authenticated','gabriel.demo@pperfil.local',extensions.crypt('PPerfilDemo#2026',extensions.gen_salt('bf')),now(),' {"provider":"email","providers":["email"]}'::jsonb,'{"name":"Gabriel Lima"}'::jsonb,now()-interval '4 months',now())
on conflict (id) do update set
  email = excluded.email,
  encrypted_password = excluded.encrypted_password,
  email_confirmed_at = excluded.email_confirmed_at,
  raw_app_meta_data = excluded.raw_app_meta_data,
  raw_user_meta_data = excluded.raw_user_meta_data,
  updated_at = now();

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at) values
  ('77000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000001','thiago.demo@pperfil.local','{"sub":"70000000-0000-4000-8000-000000000001","email":"thiago.demo@pperfil.local"}'::jsonb,'email',now(),now(),now()),
  ('77000000-0000-4000-8000-000000000002','76000000-0000-4000-8000-000000000001','mariana.demo@pperfil.local','{"sub":"76000000-0000-4000-8000-000000000001","email":"mariana.demo@pperfil.local"}'::jsonb,'email',now(),now(),now()),
  ('77000000-0000-4000-8000-000000000003','76000000-0000-4000-8000-000000000002','lucas.demo@pperfil.local','{"sub":"76000000-0000-4000-8000-000000000002","email":"lucas.demo@pperfil.local"}'::jsonb,'email',now(),now(),now()),
  ('77000000-0000-4000-8000-000000000004','76000000-0000-4000-8000-000000000003','fernanda.demo@pperfil.local','{"sub":"76000000-0000-4000-8000-000000000003","email":"fernanda.demo@pperfil.local"}'::jsonb,'email',now(),now(),now()),
  ('77000000-0000-4000-8000-000000000005','76000000-0000-4000-8000-000000000004','gabriel.demo@pperfil.local','{"sub":"76000000-0000-4000-8000-000000000004","email":"gabriel.demo@pperfil.local"}'::jsonb,'email',now(),now(),now())
on conflict (provider_id, provider) do update set identity_data = excluded.identity_data, updated_at = now();

insert into public.trainer_profiles (
  id, user_id, slug, display_name, professional_name, headline, bio, specialty,
  cref, city, service_mode, profile_image_url, hero_image_url, whatsapp, instagram,
  template_id, primary_color, published
) values (
  '71000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000001',
  'thiago-costa', 'Thiago Costa', 'Thiago Costa',
  'Treino personalizado para hipertrofia, emagrecimento e performance.',
  'Personal Trainer com foco em acompanhamento individual, evolução sustentável e estratégia de treino para resultados reais. Há 8 anos transformando objetivos em uma rotina de movimento possível.',
  'Hipertrofia · Emagrecimento · Condicionamento físico · Performance',
  '123456-G/SP', 'São Paulo, SP', 'both',
  '/images/motion/thiago-coaching.png', '/images/motion/thiago-motion-hero.png',
  '5511999999999', '@thiagocosta.movimento', 'template_02', '#6e42f5', true
)
on conflict (id) do update set
  display_name = excluded.display_name, professional_name = excluded.professional_name,
  headline = excluded.headline, bio = excluded.bio, specialty = excluded.specialty,
  cref = excluded.cref, city = excluded.city, service_mode = excluded.service_mode,
  profile_image_url = excluded.profile_image_url, hero_image_url = excluded.hero_image_url,
  whatsapp = excluded.whatsapp, instagram = excluded.instagram,
  template_id = excluded.template_id, primary_color = excluded.primary_color, published = excluded.published;

insert into public.app_users (id, display_name, locale, timezone, country_code) values
  ('70000000-0000-4000-8000-000000000001','Thiago Costa','pt-BR','America/Sao_Paulo','BR'),
  ('76000000-0000-4000-8000-000000000001','Mariana Souza','pt-BR','America/Sao_Paulo','BR'),
  ('76000000-0000-4000-8000-000000000002','Lucas Prado','pt-BR','America/Sao_Paulo','BR'),
  ('76000000-0000-4000-8000-000000000003','Fernanda Rocha','pt-BR','America/Sao_Paulo','BR'),
  ('76000000-0000-4000-8000-000000000004','Gabriel Lima','pt-BR','America/Sao_Paulo','BR')
on conflict (id) do update set display_name=excluded.display_name,locale=excluded.locale,timezone=excluded.timezone,country_code=excluded.country_code;

insert into public.user_roles (user_id, role_code) values
  ('70000000-0000-4000-8000-000000000001','trainer'),
  ('76000000-0000-4000-8000-000000000001','student'),
  ('76000000-0000-4000-8000-000000000002','student'),
  ('76000000-0000-4000-8000-000000000003','student'),
  ('76000000-0000-4000-8000-000000000004','student')
on conflict (user_id, role_code) do update set revoked_at=null, granted_at=excluded.granted_at;

insert into public.trainer_entitlements (
  trainer_id, can_build_site, can_preview_site, can_use_template_01, can_use_template_02,
  can_use_free_template, can_use_premium_templates, can_publish_site, can_receive_leads, can_use_matching
) values ('71000000-0000-4000-8000-000000000001',true,true,true,true,true,true,true,true,true)
on conflict (trainer_id) do update set
  can_build_site=true, can_preview_site=true, can_use_template_01=true, can_use_template_02=true,
  can_use_free_template=true, can_use_premium_templates=true, can_publish_site=true,
  can_receive_leads=true, can_use_matching=true;

insert into public.services (
  id, trainer_id, title, description, price, price_visible, active,
  service_mode, currency, billing_type, price_visibility
) values
  ('72000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000001','Acompanhamento Online','Treino personalizado, ajustes recorrentes e acompanhamento de evolução.',199,true,true,'online','BRL','monthly','public'),
  ('72000000-0000-4000-8000-000000000002','71000000-0000-4000-8000-000000000001','Consultoria Premium','Plano individual com acompanhamento próximo e avaliação frequente.',349,true,true,'online','BRL','monthly','public'),
  ('72000000-0000-4000-8000-000000000003','71000000-0000-4000-8000-000000000001','Personal Presencial','Treinamento presencial individual em São Paulo.',499,true,true,'presencial','BRL','monthly','public')
on conflict (id) do update set title=excluded.title,description=excluded.description,price=excluded.price,
  price_visible=excluded.price_visible,active=excluded.active,service_mode=excluded.service_mode,
  currency=excluded.currency,billing_type=excluded.billing_type,price_visibility=excluded.price_visibility;

insert into public.testimonials (
  id, trainer_id, student_name, content, image_url, before_image_url, after_image_url, result_context, published
) values
  ('73000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000001','Mariana S.','Consegui voltar a treinar com consistência e me senti muito acompanhada durante todo o processo.',null,null,'/images/motion/thiago-lateral-bound.png','Mais constância, melhor rotina e maior adesão ao treino.',true),
  ('73000000-0000-4000-8000-000000000002','71000000-0000-4000-8000-000000000001','Lucas P.','O treino ficou muito mais organizado e prático. Evoluí bastante em poucos meses.',null,null,'/images/motion/thiago-coaching.png','Plano estruturado com progressão e acompanhamento.',true),
  ('73000000-0000-4000-8000-000000000003','71000000-0000-4000-8000-000000000001','Fernanda R.','Gostei muito da atenção aos detalhes e do acompanhamento constante.',null,null,null,'Acompanhamento próximo e ajustes coerentes com a rotina.',true)
on conflict (id) do update set student_name=excluded.student_name,content=excluded.content,
  image_url=excluded.image_url,before_image_url=excluded.before_image_url,after_image_url=excluded.after_image_url,
  result_context=excluded.result_context,published=excluded.published;

insert into public.trainer_lead_settings (trainer_id,objectives,service_mode,city,state,service_ids,accepting_new_clients) values (
  '71000000-0000-4000-8000-000000000001',
  array['hypertrophy','weight_loss','conditioning','performance']::text[],
  'both','São Paulo','SP',
  array['72000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000002','72000000-0000-4000-8000-000000000003']::uuid[],true
)
on conflict (trainer_id) do update set objectives=excluded.objectives,service_mode=excluded.service_mode,
  city=excluded.city,state=excluded.state,service_ids=excluded.service_ids,accepting_new_clients=true,updated_at=now();

insert into public.student_leads (
  id,first_name,whatsapp,email,goal,service_mode,city,state,budget_band,budget_min,budget_max,
  start_timing,status,consent_at,anonymous_session_hash,created_at
) values
  ('74000000-0000-4000-8000-000000000001','Ana','5511981111001','ana.lead@example.test','hypertrophy','online',null,null,'from_150_to_250',150,250,'now','qualified',now(),repeat('1',64),now()-interval '3 hours'),
  ('74000000-0000-4000-8000-000000000002','Bruno','5511981111002','bruno.lead@example.test','performance','presencial','São Paulo','SP','from_400_to_600',400,600,'seven_days','qualified',now(),repeat('2',64),now()-interval '8 hours'),
  ('74000000-0000-4000-8000-000000000003','Carla','5511981111003','carla.lead@example.test','weight_loss','online',null,null,'from_250_to_400',250,400,'this_month','qualified',now(),repeat('3',64),now()-interval '1 day'),
  ('74000000-0000-4000-8000-000000000004','Diego','5511981111004','diego.lead@example.test','conditioning','both','São Paulo','SP','above_600',600,null,'now','qualified',now(),repeat('4',64),now()-interval '2 days'),
  ('74000000-0000-4000-8000-000000000005','Elisa','5511981111005','elisa.lead@example.test','health','online',null,null,'unknown',null,null,'researching','qualified',now(),repeat('5',64),now()-interval '7 days'),
  ('74000000-0000-4000-8000-000000000006','Felipe','5511981111006','felipe.lead@example.test','hypertrophy','presencial','São Paulo','SP','from_400_to_600',400,600,'seven_days','qualified',now(),repeat('6',64),now()-interval '4 hours'),
  ('74000000-0000-4000-8000-000000000007','Giovana','5511981111007','giovana.lead@example.test','weight_loss','online',null,null,'from_150_to_250',150,250,'this_month','qualified',now(),repeat('7',64),now()-interval '12 hours'),
  ('74000000-0000-4000-8000-000000000008','Henrique','5511981111008','henrique.lead@example.test','performance','both','São Paulo','SP','from_250_to_400',250,400,'now','qualified',now(),repeat('8',64),now()-interval '2 days')
on conflict (id) do update set first_name=excluded.first_name,whatsapp=excluded.whatsapp,email=excluded.email,
  goal=excluded.goal,service_mode=excluded.service_mode,city=excluded.city,state=excluded.state,
  budget_band=excluded.budget_band,budget_min=excluded.budget_min,budget_max=excluded.budget_max,
  start_timing=excluded.start_timing,consent_at=excluded.consent_at,anonymous_session_hash=excluded.anonymous_session_hash,created_at=excluded.created_at;

insert into public.lead_matches (
  id,lead_id,trainer_id,score,status,reserved_until,rejected_at,converted_at,created_at,updated_at
) values
  ('75000000-0000-4000-8000-000000000001','74000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000001',96,'new',now()+interval '2 days',null,null,now()-interval '3 hours',now()-interval '3 hours'),
  ('75000000-0000-4000-8000-000000000002','74000000-0000-4000-8000-000000000002','71000000-0000-4000-8000-000000000001',91,'pending',now()+interval '2 days',null,null,now()-interval '8 hours',now()-interval '2 hours'),
  ('75000000-0000-4000-8000-000000000003','74000000-0000-4000-8000-000000000003','71000000-0000-4000-8000-000000000001',88,'converted',now()+interval '2 days',null,now()-interval '18 hours',now()-interval '1 day',now()-interval '18 hours'),
  ('75000000-0000-4000-8000-000000000004','74000000-0000-4000-8000-000000000004','71000000-0000-4000-8000-000000000001',82,'rejected',now()+interval '1 day',now()-interval '1 day',null,now()-interval '2 days',now()-interval '1 day'),
  ('75000000-0000-4000-8000-000000000005','74000000-0000-4000-8000-000000000005','71000000-0000-4000-8000-000000000001',76,'new',now()-interval '4 days',null,null,now()-interval '7 days',now()-interval '7 days'),
  ('75000000-0000-4000-8000-000000000006','74000000-0000-4000-8000-000000000006','71000000-0000-4000-8000-000000000001',93,'new',now()+interval '2 days',null,null,now()-interval '4 hours',now()-interval '4 hours'),
  ('75000000-0000-4000-8000-000000000007','74000000-0000-4000-8000-000000000007','71000000-0000-4000-8000-000000000001',84,'pending',now()+interval '2 days',null,null,now()-interval '12 hours',now()-interval '5 hours'),
  ('75000000-0000-4000-8000-000000000008','74000000-0000-4000-8000-000000000008','71000000-0000-4000-8000-000000000001',79,'converted',now()+interval '1 day',null,now()-interval '1 day',now()-interval '2 days',now()-interval '1 day')
on conflict (id) do update set score=excluded.score,status=excluded.status,reserved_until=excluded.reserved_until,
  rejected_at=excluded.rejected_at,converted_at=excluded.converted_at,created_at=excluded.created_at,updated_at=excluded.updated_at;

insert into public.student_profiles (id,user_id,preferred_name) values
  ('76100000-0000-4000-8000-000000000001','76000000-0000-4000-8000-000000000001','Mariana Souza'),
  ('76100000-0000-4000-8000-000000000002','76000000-0000-4000-8000-000000000002','Lucas Prado'),
  ('76100000-0000-4000-8000-000000000003','76000000-0000-4000-8000-000000000003','Fernanda Rocha'),
  ('76100000-0000-4000-8000-000000000004','76000000-0000-4000-8000-000000000004','Gabriel Lima')
on conflict (id) do update set preferred_name=excluded.preferred_name,updated_at=now();

insert into public.trainer_student_relationships (
  id,trainer_profile_id,student_profile_id,status,origin,started_at,inactive_at,ended_at,created_by_user_id,end_reason
) values
  ('76200000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000001','76100000-0000-4000-8000-000000000001','active','lead_conversion',now()-interval '7 months',null,null,'70000000-0000-4000-8000-000000000001',null),
  ('76200000-0000-4000-8000-000000000002','71000000-0000-4000-8000-000000000001','76100000-0000-4000-8000-000000000002','active','invitation',now()-interval '5 months',null,null,'70000000-0000-4000-8000-000000000001',null),
  ('76200000-0000-4000-8000-000000000003','71000000-0000-4000-8000-000000000001','76100000-0000-4000-8000-000000000003','active','invitation',now()-interval '3 months',null,null,'70000000-0000-4000-8000-000000000001',null),
  ('76200000-0000-4000-8000-000000000004','71000000-0000-4000-8000-000000000001','76100000-0000-4000-8000-000000000004','inactive','invitation',now()-interval '4 months',now()-interval '12 days',null,'70000000-0000-4000-8000-000000000001','Pausa solicitada pelo aluno')
on conflict (id) do update set status=excluded.status,origin=excluded.origin,started_at=excluded.started_at,
  inactive_at=excluded.inactive_at,ended_at=excluded.ended_at,end_reason=excluded.end_reason,updated_at=now();

insert into public.student_invitations (
  id,trainer_profile_id,invited_email_normalized,invited_name,token_hash,status,expires_at,created_by_user_id,created_at
) values
  ('76300000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000001','paula.convidada@example.test','Paula Martins',encode(extensions.digest('thiago-demo-paula','sha256'),'hex'),'pending',now()+interval '6 days','70000000-0000-4000-8000-000000000001',now()-interval '1 day'),
  ('76300000-0000-4000-8000-000000000002','71000000-0000-4000-8000-000000000001','renato.convidado@example.test','Renato Alves',encode(extensions.digest('thiago-demo-renato','sha256'),'hex'),'pending',now()+interval '4 days','70000000-0000-4000-8000-000000000001',now()-interval '3 days')
on conflict (id) do update set invited_email_normalized=excluded.invited_email_normalized,
  invited_name=excluded.invited_name,token_hash=excluded.token_hash,status='pending',expires_at=excluded.expires_at,
  accepted_by_user_id=null,accepted_at=null,revoked_at=null,created_at=excluded.created_at,updated_at=now();

delete from public.analytics_events
where trainer_id='71000000-0000-4000-8000-000000000001'
  and anonymous_session_hash=repeat('d',64);

insert into public.analytics_events (event_type,trainer_id,anonymous_session_hash,created_at)
select 'profile_view','71000000-0000-4000-8000-000000000001',repeat('d',64),now()-(series||' hours')::interval
from generate_series(1,24) series;

insert into public.analytics_events (event_type,trainer_id,anonymous_session_hash,created_at)
select 'whatsapp_click','71000000-0000-4000-8000-000000000001',repeat('d',64),now()-(series||' days')::interval
from generate_series(1,8) series;

commit;
