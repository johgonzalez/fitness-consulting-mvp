-- Transactional A/B assertions for testimonial ownership. Fixtures are rolled back.
begin;

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('a3500000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'sprint35-a@example.test', '', now(), now(), now()),
  ('b3500000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'sprint35-b@example.test', '', now(), now(), now());

insert into public.trainer_profiles (id,user_id,slug,display_name,headline,bio,specialty,service_mode,whatsapp,published)
values
  ('a3510000-0000-4000-8000-000000000001','a3500000-0000-4000-8000-000000000001','sprint35-a','Trainer A','Headline A','Bio A','Teste','online','5511999993501',false),
  ('b3510000-0000-4000-8000-000000000002','b3500000-0000-4000-8000-000000000002','sprint35-b','Trainer B','Headline B','Bio B','Teste','online','5511999993502',true);

insert into public.testimonials (id,trainer_id,student_name,content,result_context,published)
values
  ('a3520000-0000-4000-8000-000000000001','a3510000-0000-4000-8000-000000000001','Aluno A','Relato A','Contexto A',false),
  ('b3520000-0000-4000-8000-000000000002','b3510000-0000-4000-8000-000000000002','Aluno B','Relato B','Contexto B',true);

set local role authenticated;
set local request.jwt.claims = '{"sub":"a3500000-0000-4000-8000-000000000001","role":"authenticated"}';
update public.testimonials set content='Relato A editado' where id='a3520000-0000-4000-8000-000000000001';
update public.testimonials set content='Ataque' where id='b3520000-0000-4000-8000-000000000002';
delete from public.testimonials where id='b3520000-0000-4000-8000-000000000002';
insert into public.testimonials (trainer_id,student_name,content,published)
values ('a3510000-0000-4000-8000-000000000001','Novo aluno A','Novo relato A',false);

reset role;
set local role postgres;
do $$
begin
  if not exists (select 1 from public.testimonials where id='a3520000-0000-4000-8000-000000000001' and content='Relato A editado') then raise exception 'A cannot update own testimonial'; end if;
  if not exists (select 1 from public.testimonials where id='b3520000-0000-4000-8000-000000000002' and content='Relato B') then raise exception 'A changed or deleted testimonial B'; end if;
  if not exists (select 1 from public.testimonials where trainer_id='a3510000-0000-4000-8000-000000000001' and student_name='Novo aluno A') then raise exception 'A cannot create own testimonial'; end if;
end;
$$;

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
do $$
begin
  if exists (select 1 from public.testimonials where id='a3520000-0000-4000-8000-000000000001') then raise exception 'anon reads unpublished testimonial'; end if;
  if not exists (select 1 from public.testimonials where id='b3520000-0000-4000-8000-000000000002') then raise exception 'anon cannot read published testimonial of published trainer'; end if;
end;
$$;

rollback;
