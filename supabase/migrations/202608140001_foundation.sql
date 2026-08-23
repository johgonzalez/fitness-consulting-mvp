create extension if not exists pgcrypto;

create type public.service_mode as enum ('online', 'presencial', 'both');
create type public.template_id as enum ('template_01', 'template_02');

create table public.trainer_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  display_name text not null check (char_length(display_name) between 2 and 100),
  headline text not null check (char_length(headline) <= 180),
  bio text not null check (char_length(bio) <= 2000),
  specialty text not null check (char_length(specialty) <= 120),
  cref text,
  city text,
  service_mode public.service_mode not null default 'online',
  profile_image_url text,
  hero_image_url text,
  logo_url text,
  whatsapp text not null,
  instagram text,
  template_id public.template_id not null default 'template_01',
  primary_color text not null default '#c7ff36' check (primary_color ~ '^#[0-9a-fA-F]{6}$'),
  published boolean not null default false
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.trainer_profiles(id) on delete cascade,
  title text not null check (char_length(title) <= 120),
  description text not null check (char_length(description) <= 1000),
  price numeric(12,2) check (price is null or price >= 0),
  price_visible boolean not null default false,
  active boolean not null default true
);

create table public.testimonials (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.trainer_profiles(id) on delete cascade,
  student_name text not null check (char_length(student_name) <= 100),
  content text not null check (char_length(content) <= 2000),
  image_url text,
  before_image_url text,
  after_image_url text,
  published boolean not null default false
);

create index services_trainer_id_idx on public.services(trainer_id);
create index testimonials_trainer_id_idx on public.testimonials(trainer_id);
create index trainer_profiles_public_slug_idx on public.trainer_profiles(slug) where published;

alter table public.trainer_profiles enable row level security;
alter table public.services enable row level security;
alter table public.testimonials enable row level security;

create policy "published profiles are public" on public.trainer_profiles for select using (published or auth.uid() = user_id);
create policy "owners manage profiles" on public.trainer_profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "public active services of published trainers" on public.services for select using (active and exists (select 1 from public.trainer_profiles p where p.id = trainer_id and p.published));
create policy "owners manage services" on public.services for all using (exists (select 1 from public.trainer_profiles p where p.id = trainer_id and p.user_id = auth.uid())) with check (exists (select 1 from public.trainer_profiles p where p.id = trainer_id and p.user_id = auth.uid()));
create policy "public testimonials of published trainers" on public.testimonials for select using (published and exists (select 1 from public.trainer_profiles p where p.id = trainer_id and p.published));
create policy "owners manage testimonials" on public.testimonials for all using (exists (select 1 from public.trainer_profiles p where p.id = trainer_id and p.user_id = auth.uid())) with check (exists (select 1 from public.trainer_profiles p where p.id = trainer_id and p.user_id = auth.uid()));
