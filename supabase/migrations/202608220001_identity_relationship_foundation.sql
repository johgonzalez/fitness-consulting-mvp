-- Sprint 1: global-ready application identity, additive roles, students,
-- trainer-student relationships and email invitation lifecycle.

create table public.app_users (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  locale text,
  timezone text,
  country_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint app_users_display_name_check check (display_name is null or char_length(trim(display_name)) between 1 and 120),
  constraint app_users_locale_check check (locale is null or locale ~ '^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$'),
  constraint app_users_timezone_check check (timezone is null or char_length(timezone) between 1 and 100),
  constraint app_users_country_code_check check (country_code is null or country_code ~ '^[A-Z]{2}$')
);

create table public.user_roles (
  user_id uuid not null references public.app_users(id) on delete cascade,
  role_code text not null,
  granted_at timestamptz not null default now(),
  granted_by uuid references public.app_users(id) on delete set null,
  revoked_at timestamptz,
  primary key (user_id, role_code),
  constraint user_roles_role_code_check check (role_code in ('trainer', 'student')),
  constraint user_roles_revocation_check check (revoked_at is null or revoked_at >= granted_at)
);

create table public.student_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.app_users(id) on delete cascade,
  preferred_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_profiles_preferred_name_check check (preferred_name is null or char_length(trim(preferred_name)) between 1 and 120)
);

create table public.trainer_student_relationships (
  id uuid primary key default gen_random_uuid(),
  trainer_profile_id uuid not null references public.trainer_profiles(id) on delete restrict,
  student_profile_id uuid not null references public.student_profiles(id) on delete restrict,
  status text not null default 'active',
  origin text not null default 'invitation',
  started_at timestamptz not null default now(),
  inactive_at timestamptz,
  ended_at timestamptz,
  created_by_user_id uuid not null references public.app_users(id) on delete restrict,
  end_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trainer_profile_id, student_profile_id),
  constraint trainer_student_relationships_status_check check (status in ('active', 'inactive', 'ended')),
  constraint trainer_student_relationships_origin_check check (origin in ('invitation', 'lead_conversion')),
  constraint trainer_student_relationships_lifecycle_check check (
    (status = 'active' and inactive_at is null and ended_at is null)
    or (status = 'inactive' and inactive_at is not null and ended_at is null)
    or (status = 'ended' and ended_at is not null)
  ),
  constraint trainer_student_relationships_end_reason_check check (end_reason is null or char_length(trim(end_reason)) between 1 and 240)
);

create table public.student_invitations (
  id uuid primary key default gen_random_uuid(),
  trainer_profile_id uuid not null references public.trainer_profiles(id) on delete restrict,
  invited_email_normalized text not null,
  token_hash text not null unique,
  status text not null default 'pending',
  expires_at timestamptz not null,
  accepted_by_user_id uuid references public.app_users(id) on delete restrict,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_by_user_id uuid not null references public.app_users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_invitations_email_check check (
    invited_email_normalized = lower(trim(invited_email_normalized))
    and char_length(invited_email_normalized) between 3 and 320
    and invited_email_normalized ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ),
  constraint student_invitations_token_hash_check check (token_hash ~ '^[a-f0-9]{64}$'),
  constraint student_invitations_status_check check (status in ('pending', 'accepted', 'expired', 'revoked')),
  constraint student_invitations_expiry_check check (expires_at > created_at),
  constraint student_invitations_lifecycle_check check (
    (status = 'pending' and accepted_by_user_id is null and accepted_at is null and revoked_at is null)
    or (status = 'accepted' and accepted_by_user_id is not null and accepted_at is not null and revoked_at is null)
    or (status = 'expired' and accepted_by_user_id is null and accepted_at is null and revoked_at is null)
    or (status = 'revoked' and accepted_by_user_id is null and accepted_at is null and revoked_at is not null)
  )
);

create index user_roles_active_user_idx on public.user_roles(user_id) where revoked_at is null;
create index student_profiles_user_idx on public.student_profiles(user_id);
create index trainer_student_relationships_trainer_status_idx on public.trainer_student_relationships(trainer_profile_id, status);
create index trainer_student_relationships_student_status_idx on public.trainer_student_relationships(student_profile_id, status);
create unique index student_invitations_one_pending_target_idx
  on public.student_invitations(trainer_profile_id, invited_email_normalized)
  where status = 'pending';
create index student_invitations_trainer_status_idx on public.student_invitations(trainer_profile_id, status, created_at desc);
create index student_invitations_expiry_idx on public.student_invitations(expires_at) where status = 'pending';

alter table public.app_users enable row level security;
alter table public.user_roles enable row level security;
alter table public.student_profiles enable row level security;
alter table public.trainer_student_relationships enable row level security;
alter table public.student_invitations enable row level security;

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger touch_app_users_updated_at before update on public.app_users
for each row execute function private.touch_updated_at();
create trigger touch_student_profiles_updated_at before update on public.student_profiles
for each row execute function private.touch_updated_at();
create trigger touch_trainer_student_relationships_updated_at before update on public.trainer_student_relationships
for each row execute function private.touch_updated_at();
create trigger touch_student_invitations_updated_at before update on public.student_invitations
for each row execute function private.touch_updated_at();

create or replace function private.owns_student(p_student_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.student_profiles student
    where student.id = p_student_profile_id
      and student.user_id = (select auth.uid())
  );
$$;

create or replace function private.has_active_student_relationship(p_student_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.trainer_student_relationships relationship
    where relationship.student_profile_id = p_student_profile_id
      and relationship.status = 'active'
      and (select private.owns_trainer(relationship.trainer_profile_id))
  );
$$;

create or replace function private.sync_trainer_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.app_users(id, display_name)
  values (new.user_id, nullif(trim(new.display_name), ''))
  on conflict (id) do update
    set display_name = coalesce(public.app_users.display_name, excluded.display_name);

  insert into public.user_roles(user_id, role_code)
  values (new.user_id, 'trainer')
  on conflict (user_id, role_code) do update
    set revoked_at = null, granted_at = excluded.granted_at;

  return new;
end;
$$;

create trigger sync_trainer_identity_after_insert
after insert on public.trainer_profiles
for each row execute function private.sync_trainer_identity();

insert into public.app_users(id, display_name)
select profile.user_id, nullif(trim(profile.display_name), '')
from public.trainer_profiles profile
on conflict (id) do update
  set display_name = coalesce(public.app_users.display_name, excluded.display_name);

insert into public.user_roles(user_id, role_code)
select profile.user_id, 'trainer'
from public.trainer_profiles profile
on conflict (user_id, role_code) do update
  set revoked_at = null;

create or replace function public.ensure_my_app_user(
  p_display_name text default null,
  p_locale text default null,
  p_timezone text default null,
  p_country_code text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  normalized_country text := nullif(upper(trim(p_country_code)), '');
  normalized_locale text := nullif(trim(p_locale), '');
  normalized_timezone text := nullif(trim(p_timezone), '');
begin
  if current_user_id is null then raise exception 'authentication_required'; end if;
  if normalized_country is not null and normalized_country !~ '^[A-Z]{2}$' then raise exception 'invalid_country_code'; end if;
  if normalized_locale is not null and normalized_locale !~ '^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$' then raise exception 'invalid_locale'; end if;
  if normalized_timezone is not null and char_length(normalized_timezone) > 100 then raise exception 'invalid_timezone'; end if;
  if p_display_name is not null and char_length(trim(p_display_name)) not between 1 and 120 then raise exception 'invalid_display_name'; end if;

  insert into public.app_users(id, display_name, locale, timezone, country_code)
  values (current_user_id, nullif(trim(p_display_name), ''), normalized_locale, normalized_timezone, normalized_country)
  on conflict (id) do update set
    display_name = coalesce(excluded.display_name, public.app_users.display_name),
    locale = coalesce(excluded.locale, public.app_users.locale),
    timezone = coalesce(excluded.timezone, public.app_users.timezone),
    country_code = coalesce(excluded.country_code, public.app_users.country_code);

  return current_user_id;
end;
$$;

create or replace function public.get_my_app_identity()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when app_user.id is null then null else jsonb_build_object(
    'id', app_user.id,
    'display_name', app_user.display_name,
    'locale', app_user.locale,
    'timezone', app_user.timezone,
    'country_code', app_user.country_code,
    'roles', coalesce((
      select jsonb_agg(role.role_code order by role.role_code)
      from public.user_roles role
      where role.user_id = app_user.id and role.revoked_at is null
    ), '[]'::jsonb)
  ) end
  from (select (select auth.uid()) as id) current_identity
  left join public.app_users app_user on app_user.id = current_identity.id;
$$;

create or replace function public.create_student_invitation(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_trainer_id uuid;
  normalized_email text := lower(trim(p_email));
  plaintext_token text;
  created_invitation public.student_invitations;
begin
  if current_user_id is null then raise exception 'authentication_required'; end if;
  if normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or char_length(normalized_email) > 320 then
    raise exception 'invalid_invitation_target';
  end if;

  select profile.id into current_trainer_id
  from public.trainer_profiles profile
  where profile.user_id = current_user_id
    and exists (
      select 1 from public.user_roles role
      where role.user_id = current_user_id and role.role_code = 'trainer' and role.revoked_at is null
    );
  if current_trainer_id is null then raise exception 'trainer_role_required'; end if;

  update public.student_invitations invitation
  set status = case when invitation.expires_at <= now() then 'expired' else 'revoked' end,
      revoked_at = case when invitation.expires_at > now() then now() else null end
  where invitation.trainer_profile_id = current_trainer_id
    and invitation.invited_email_normalized = normalized_email
    and invitation.status = 'pending';

  plaintext_token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.student_invitations(
    trainer_profile_id, invited_email_normalized, token_hash, expires_at, created_by_user_id
  ) values (
    current_trainer_id,
    normalized_email,
    encode(extensions.digest(plaintext_token, 'sha256'), 'hex'),
    now() + interval '7 days',
    current_user_id
  ) returning * into created_invitation;

  return jsonb_build_object(
    'invitation_id', created_invitation.id,
    'token', plaintext_token,
    'expires_at', created_invitation.expires_at
  );
end;
$$;

create or replace function public.revoke_my_student_invitation(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.student_invitations invitation
  set status = 'revoked', revoked_at = now()
  where invitation.id = p_invitation_id
    and invitation.status = 'pending'
    and (select private.owns_trainer(invitation.trainer_profile_id));
  if not found then raise exception 'invitation_not_available'; end if;
end;
$$;

create or replace function public.accept_student_invitation(p_token text, p_preferred_name text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_email text;
  invitation public.student_invitations;
  student_id uuid;
  relationship_id uuid;
begin
  if current_user_id is null then raise exception 'invitation_invalid'; end if;
  if p_token is null or p_token !~ '^[a-f0-9]{64}$' then raise exception 'invitation_invalid'; end if;
  if p_preferred_name is not null and char_length(trim(p_preferred_name)) not between 1 and 120 then raise exception 'invitation_invalid'; end if;

  select lower(user_record.email) into current_email
  from auth.users user_record
  where user_record.id = current_user_id and user_record.email_confirmed_at is not null;
  if current_email is null then raise exception 'invitation_invalid'; end if;

  select candidate.* into invitation
  from public.student_invitations candidate
  where candidate.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
  for update;

  if invitation.id is null
    or invitation.status <> 'pending'
    or invitation.expires_at <= now()
    or invitation.invited_email_normalized <> current_email
  then
    raise exception 'invitation_invalid';
  end if;

  insert into public.app_users(id, display_name)
  values (current_user_id, nullif(trim(p_preferred_name), ''))
  on conflict (id) do update
    set display_name = coalesce(excluded.display_name, public.app_users.display_name);

  insert into public.user_roles(user_id, role_code)
  values (current_user_id, 'student')
  on conflict (user_id, role_code) do update
    set revoked_at = null, granted_at = excluded.granted_at;

  insert into public.student_profiles(user_id, preferred_name)
  values (current_user_id, nullif(trim(p_preferred_name), ''))
  on conflict (user_id) do update
    set preferred_name = coalesce(excluded.preferred_name, public.student_profiles.preferred_name)
  returning id into student_id;

  insert into public.trainer_student_relationships(
    trainer_profile_id, student_profile_id, status, origin, created_by_user_id
  ) values (
    invitation.trainer_profile_id, student_id, 'active', 'invitation', invitation.created_by_user_id
  )
  on conflict (trainer_profile_id, student_profile_id) do update set
    status = 'active',
    inactive_at = null,
    ended_at = null,
    end_reason = null,
    started_at = now()
  returning id into relationship_id;

  update public.student_invitations accepted
  set status = 'accepted', accepted_by_user_id = current_user_id, accepted_at = now()
  where accepted.id = invitation.id;

  return relationship_id;
end;
$$;

create or replace function public.deactivate_my_trainer_student_relationship(p_relationship_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.trainer_student_relationships relationship
  set status = 'inactive', inactive_at = now(), ended_at = null
  where relationship.id = p_relationship_id
    and relationship.status = 'active'
    and (
      (select private.owns_trainer(relationship.trainer_profile_id))
      or (select private.owns_student(relationship.student_profile_id))
    );
  if not found then raise exception 'relationship_not_available'; end if;
end;
$$;

create policy "users read own app identity" on public.app_users
for select to authenticated using (id = (select auth.uid()));
create policy "users update own app identity" on public.app_users
for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "users read own roles" on public.user_roles
for select to authenticated using (user_id = (select auth.uid()));

create policy "students read own profile" on public.student_profiles
for select to authenticated using (user_id = (select auth.uid()));
create policy "students update own profile" on public.student_profiles
for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "active trainers read related student profiles" on public.student_profiles
for select to authenticated using ((select private.has_active_student_relationship(id)));

create policy "trainers read own student relationships" on public.trainer_student_relationships
for select to authenticated using ((select private.owns_trainer(trainer_profile_id)));
create policy "students read own trainer relationships" on public.trainer_student_relationships
for select to authenticated using ((select private.owns_student(student_profile_id)));

create policy "trainers read own invitations" on public.student_invitations
for select to authenticated using ((select private.owns_trainer(trainer_profile_id)));

revoke all on public.app_users, public.user_roles, public.student_profiles,
  public.trainer_student_relationships, public.student_invitations from public, anon, authenticated;
grant select, update(display_name, locale, timezone, country_code) on public.app_users to authenticated;
grant select on public.user_roles to authenticated;
grant select, update(preferred_name) on public.student_profiles to authenticated;
grant select on public.trainer_student_relationships to authenticated;
grant select(id, trainer_profile_id, invited_email_normalized, status, expires_at,
  accepted_by_user_id, accepted_at, revoked_at, created_by_user_id, created_at, updated_at)
  on public.student_invitations to authenticated;

revoke all on function private.touch_updated_at(), private.owns_student(uuid),
  private.has_active_student_relationship(uuid), private.sync_trainer_identity() from public, anon, authenticated;
grant execute on function private.owns_student(uuid), private.has_active_student_relationship(uuid) to authenticated;

revoke all on function public.ensure_my_app_user(text,text,text,text), public.get_my_app_identity(),
  public.create_student_invitation(text), public.revoke_my_student_invitation(uuid),
  public.accept_student_invitation(text,text), public.deactivate_my_trainer_student_relationship(uuid)
  from public, anon;
grant execute on function public.ensure_my_app_user(text,text,text,text), public.get_my_app_identity(),
  public.create_student_invitation(text), public.revoke_my_student_invitation(uuid),
  public.accept_student_invitation(text,text), public.deactivate_my_trainer_student_relationship(uuid)
  to authenticated;
