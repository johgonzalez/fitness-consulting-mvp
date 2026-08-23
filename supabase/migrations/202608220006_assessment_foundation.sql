-- Sprint 3A: relationship-scoped, versioned assessment foundation.
-- Assessment UI and private-media upload flows are intentionally out of scope.

create table public.assessment_templates (
  id uuid primary key default gen_random_uuid(),
  system_key text,
  owner_trainer_id uuid references public.trainer_profiles(id) on delete restrict,
  assessment_type text not null,
  name text not null,
  description text not null,
  locale text not null,
  status text not null default 'ACTIVE',
  default_required boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assessment_templates_ownership_check check (
    (system_key is not null and owner_trainer_id is null)
    or (system_key is null and owner_trainer_id is not null)
  ),
  constraint assessment_templates_system_key_check check (
    system_key is null or system_key ~ '^[A-Z][A-Z0-9_]{1,63}$'
  ),
  constraint assessment_templates_type_check check (
    assessment_type in ('INITIAL', 'MONTHLY_CHECKIN', 'REASSESSMENT', 'CUSTOM')
  ),
  constraint assessment_templates_name_check check (char_length(trim(name)) between 2 and 120),
  constraint assessment_templates_description_check check (char_length(trim(description)) between 2 and 1000),
  constraint assessment_templates_locale_check check (locale ~ '^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$'),
  constraint assessment_templates_status_check check (status in ('ACTIVE', 'ARCHIVED')),
  constraint assessment_templates_custom_type_check check (
    owner_trainer_id is null or assessment_type = 'CUSTOM'
  )
);

create unique index assessment_templates_system_key_idx
  on public.assessment_templates(system_key) where system_key is not null;
create index assessment_templates_owner_status_idx
  on public.assessment_templates(owner_trainer_id, status) where owner_trainer_id is not null;

create table public.assessment_template_versions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.assessment_templates(id) on delete restrict,
  version_number integer not null,
  schema jsonb not null,
  created_by uuid references public.app_users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (template_id, version_number),
  constraint assessment_template_versions_number_check check (version_number > 0),
  constraint assessment_template_versions_schema_object_check check (jsonb_typeof(schema) = 'object')
);

create index assessment_template_versions_template_idx
  on public.assessment_template_versions(template_id, version_number desc);

create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  trainer_student_relationship_id uuid not null references public.trainer_student_relationships(id) on delete restrict,
  template_version_id uuid not null references public.assessment_template_versions(id) on delete restrict,
  status text not null default 'DRAFT',
  title text not null,
  is_required boolean not null default false,
  due_at timestamptz,
  sent_at timestamptz,
  answered_at timestamptz,
  review_started_at timestamptz,
  completed_at timestamptz,
  trainer_feedback text,
  created_by uuid not null references public.app_users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assessments_status_check check (
    status in ('DRAFT', 'SENT', 'ANSWERED', 'IN_REVIEW', 'COMPLETED')
  ),
  constraint assessments_title_check check (char_length(trim(title)) between 2 and 160),
  constraint assessments_due_at_check check (due_at is null or due_at > created_at),
  constraint assessments_feedback_check check (
    trainer_feedback is null or char_length(trim(trainer_feedback)) between 1 and 5000
  ),
  constraint assessments_lifecycle_timestamps_check check (
    (status = 'DRAFT' and sent_at is null and answered_at is null and review_started_at is null and completed_at is null)
    or (status = 'SENT' and sent_at is not null and answered_at is null and review_started_at is null and completed_at is null)
    or (status = 'ANSWERED' and sent_at is not null and answered_at is not null and review_started_at is null and completed_at is null)
    or (status = 'IN_REVIEW' and sent_at is not null and answered_at is not null and review_started_at is not null and completed_at is null)
    or (status = 'COMPLETED' and sent_at is not null and answered_at is not null and review_started_at is not null and completed_at is not null)
  ),
  constraint assessments_feedback_visibility_check check (
    status = 'COMPLETED' or trainer_feedback is null
  )
);

create index assessments_relationship_status_idx
  on public.assessments(trainer_student_relationship_id, status, created_at desc);
create index assessments_template_version_idx on public.assessments(template_version_id);

create table public.assessment_answers (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete restrict,
  question_key text not null,
  value jsonb not null,
  answered_by uuid not null references public.app_users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assessment_id, question_key),
  constraint assessment_answers_question_key_check check (question_key ~ '^[a-z][a-z0-9_]{1,63}$')
);

create index assessment_answers_assessment_idx on public.assessment_answers(assessment_id);

create table public.student_measurements (
  id uuid primary key default gen_random_uuid(),
  student_profile_id uuid not null references public.student_profiles(id) on delete restrict,
  trainer_student_relationship_id uuid not null references public.trainer_student_relationships(id) on delete restrict,
  source_assessment_id uuid references public.assessments(id) on delete restrict,
  measurement_code text not null,
  value numeric not null,
  unit_code text not null,
  measured_at timestamptz not null,
  recorded_by uuid not null references public.app_users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint student_measurements_code_check check (measurement_code ~ '^[a-z][a-z0-9_]{1,63}$'),
  constraint student_measurements_unit_check check (unit_code ~ '^[A-Za-z][A-Za-z0-9_%/.-]{0,31}$'),
  constraint student_measurements_value_check check (abs(value) <= 1000000000)
);

create unique index student_measurements_assessment_code_idx
  on public.student_measurements(source_assessment_id, measurement_code)
  where source_assessment_id is not null;
create index student_measurements_student_history_idx
  on public.student_measurements(student_profile_id, measurement_code, measured_at desc);
create index student_measurements_relationship_idx
  on public.student_measurements(trainer_student_relationship_id, measured_at desc);

create table public.student_private_media (
  id uuid primary key default gen_random_uuid(),
  student_profile_id uuid not null references public.student_profiles(id) on delete restrict,
  trainer_student_relationship_id uuid not null references public.trainer_student_relationships(id) on delete restrict,
  source_assessment_id uuid references public.assessments(id) on delete restrict,
  storage_path text not null unique,
  media_type text not null,
  view_type text,
  mime_type text not null,
  file_size bigint not null,
  created_by uuid not null references public.app_users(id) on delete restrict,
  consent_version text not null,
  consented_at timestamptz not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint student_private_media_path_check check (
    char_length(storage_path) between 5 and 512
    and
    storage_path !~ '(^|/)\.\.(/|$)'
    and storage_path ~ '^[a-zA-Z0-9][a-zA-Z0-9/_-]*\.(jpg|jpeg|png|webp)$'
  ),
  constraint student_private_media_type_check check (media_type in ('ASSESSMENT_PHOTO', 'PROGRESS_PHOTO')),
  constraint student_private_media_view_check check (
    view_type is null or view_type in ('FRONT', 'SIDE', 'BACK', 'OTHER')
  ),
  constraint student_private_media_mime_check check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  constraint student_private_media_size_check check (file_size between 1 and 10485760),
  constraint student_private_media_consent_check check (
    char_length(trim(consent_version)) between 1 and 64 and consented_at <= created_at
  ),
  constraint student_private_media_deleted_check check (deleted_at is null or deleted_at >= created_at)
);

create index student_private_media_student_idx
  on public.student_private_media(student_profile_id, created_at desc) where deleted_at is null;
create index student_private_media_relationship_idx
  on public.student_private_media(trainer_student_relationship_id, created_at desc) where deleted_at is null;
create index student_private_media_assessment_idx
  on public.student_private_media(source_assessment_id) where source_assessment_id is not null;

create table public.assessment_events (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete restrict,
  event_type text not null,
  actor_user_id uuid not null references public.app_users(id) on delete restrict,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint assessment_events_type_check check (
    event_type in ('CREATED', 'SENT', 'ANSWER_SAVED', 'SUBMITTED', 'REVIEW_STARTED', 'COMPLETED')
  ),
  constraint assessment_events_metadata_check check (jsonb_typeof(metadata) = 'object')
);

create index assessment_events_assessment_history_idx
  on public.assessment_events(assessment_id, created_at, id);

alter table public.assessment_templates enable row level security;
alter table public.assessment_template_versions enable row level security;
alter table public.assessments enable row level security;
alter table public.assessment_answers enable row level security;
alter table public.student_measurements enable row level security;
alter table public.student_private_media enable row level security;
alter table public.assessment_events enable row level security;

create or replace function private.current_trainer_profile_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select profile.id
  from public.trainer_profiles profile
  where profile.user_id = (select auth.uid())
    and exists (
      select 1
      from public.user_roles role
      where role.user_id = (select auth.uid())
        and role.role_code = 'trainer'
        and role.revoked_at is null
    );
$$;

create or replace function private.can_read_assessment_relationship(p_relationship_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.trainer_student_relationships relationship
    where relationship.id = p_relationship_id
      and (
        (select private.owns_trainer(relationship.trainer_profile_id))
        or (select private.owns_student(relationship.student_profile_id))
      )
  );
$$;

create or replace function private.can_access_student_private_media(
  p_student_profile_id uuid,
  p_relationship_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select private.owns_student(p_student_profile_id))
    or exists (
      select 1
      from public.trainer_student_relationships relationship
      where relationship.id = p_relationship_id
        and relationship.student_profile_id = p_student_profile_id
        and relationship.status = 'active'
        and (select private.owns_trainer(relationship.trainer_profile_id))
    );
$$;

create or replace function private.can_read_student_private_storage_object(p_storage_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.student_private_media media
    where media.storage_path = p_storage_path
      and media.deleted_at is null
      and (select private.can_access_student_private_media(
        media.student_profile_id,
        media.trainer_student_relationship_id
      ))
  );
$$;

create or replace function private.localized_text_is_valid(p_value jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(p_value) = 'object'
    and (select count(*) from jsonb_object_keys(p_value)) > 0
    and not exists (
      select 1
      from jsonb_each(p_value) entry
      where entry.key !~ '^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$'
        or jsonb_typeof(entry.value) <> 'string'
        or char_length(trim(entry.value #>> '{}')) not between 1 and 1000
    );
$$;

create or replace function private.validate_assessment_template_schema(p_schema jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  question jsonb;
  option_value jsonb;
  question_type text;
begin
  if jsonb_typeof(p_schema) <> 'object'
    or jsonb_typeof(p_schema -> 'questions') <> 'array'
    or jsonb_array_length(p_schema -> 'questions') not between 1 and 100
    or exists (
      select 1 from jsonb_object_keys(p_schema) key where key not in ('questions', 'metadata')
    )
    or ((p_schema ? 'metadata') and jsonb_typeof(p_schema -> 'metadata') <> 'object')
  then
    return false;
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_schema -> 'questions') q
    group by q ->> 'key'
    having count(*) > 1
  ) then
    return false;
  end if;

  for question in select value from jsonb_array_elements(p_schema -> 'questions') loop
    if jsonb_typeof(question) <> 'object'
      or coalesce(question ->> 'key', '') !~ '^[a-z][a-z0-9_]{1,63}$'
      or jsonb_typeof(question -> 'required') <> 'boolean'
      or not private.localized_text_is_valid(question -> 'label')
      or ((question ? 'description') and not private.localized_text_is_valid(question -> 'description'))
      or exists (
        select 1 from jsonb_object_keys(question) key
        where key not in ('key', 'type', 'required', 'label', 'description', 'options', 'scale', 'measurement')
      )
    then
      return false;
    end if;

    question_type := question ->> 'type';
    if question_type not in (
      'SHORT_TEXT', 'LONG_TEXT', 'SINGLE_CHOICE', 'MULTI_CHOICE', 'NUMBER',
      'BOOLEAN', 'SCALE', 'DATE', 'MEASUREMENT', 'PHOTO_REQUEST'
    ) then
      return false;
    end if;

    if question_type in ('SINGLE_CHOICE', 'MULTI_CHOICE') then
      if jsonb_typeof(question -> 'options') <> 'array'
        or jsonb_array_length(question -> 'options') not between 1 and 50
      then
        return false;
      end if;
      if exists (
        select 1 from jsonb_array_elements(question -> 'options') option
        where jsonb_typeof(option) <> 'object'
          or coalesce(option ->> 'value', '') !~ '^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$'
          or not private.localized_text_is_valid(option -> 'label')
          or exists (select 1 from jsonb_object_keys(option) key where key not in ('value', 'label'))
      ) or exists (
        select 1 from jsonb_array_elements(question -> 'options') option
        group by option ->> 'value' having count(*) > 1
      ) then
        return false;
      end if;
    elsif question ? 'options' then
      return false;
    end if;

    if question_type = 'SCALE' then
      if jsonb_typeof(question -> 'scale') <> 'object'
        or jsonb_typeof(question -> 'scale' -> 'min') <> 'number'
        or jsonb_typeof(question -> 'scale' -> 'max') <> 'number'
        or (question -> 'scale' ->> 'min')::numeric >= (question -> 'scale' ->> 'max')::numeric
        or ((question -> 'scale' ->> 'max')::numeric - (question -> 'scale' ->> 'min')::numeric) > 100
      then
        return false;
      end if;
    elsif question ? 'scale' then
      return false;
    end if;

    if question_type = 'MEASUREMENT' then
      if jsonb_typeof(question -> 'measurement') <> 'object'
        or coalesce(question -> 'measurement' ->> 'code', '') !~ '^[a-z][a-z0-9_]{1,63}$'
        or jsonb_typeof(question -> 'measurement' -> 'unit_codes') <> 'array'
        or jsonb_array_length(question -> 'measurement' -> 'unit_codes') not between 1 and 20
        or exists (
          select 1 from jsonb_array_elements(question -> 'measurement' -> 'unit_codes') unit
          where jsonb_typeof(unit) <> 'string'
            or (unit #>> '{}') !~ '^[A-Za-z][A-Za-z0-9_%/.-]{0,31}$'
        )
        or exists (
          select 1 from jsonb_array_elements(question -> 'measurement' -> 'unit_codes') unit
          group by unit having count(*) > 1
        )
      then
        return false;
      end if;
    elsif question ? 'measurement' then
      return false;
    end if;
  end loop;

  if exists (
    select 1
    from jsonb_array_elements(p_schema -> 'questions') q
    where q ->> 'type' = 'MEASUREMENT'
    group by q -> 'measurement' ->> 'code'
    having count(*) > 1
  ) then
    return false;
  end if;

  return true;
exception when others then
  return false;
end;
$$;

alter table public.assessment_template_versions
  add constraint assessment_template_versions_schema_check
  check (private.validate_assessment_template_schema(schema));

create or replace function private.validate_assessment_answer(p_question jsonb, p_value jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  question_type text := p_question ->> 'type';
  answer_text text;
begin
  if question_type = 'SHORT_TEXT' then
    return jsonb_typeof(p_value) = 'string' and char_length(trim(p_value #>> '{}')) between 1 and 500;
  elsif question_type = 'LONG_TEXT' then
    return jsonb_typeof(p_value) = 'string' and char_length(trim(p_value #>> '{}')) between 1 and 5000;
  elsif question_type = 'SINGLE_CHOICE' then
    return jsonb_typeof(p_value) = 'string' and exists (
      select 1 from jsonb_array_elements(p_question -> 'options') option
      where option ->> 'value' = p_value #>> '{}'
    );
  elsif question_type = 'MULTI_CHOICE' then
    return jsonb_typeof(p_value) = 'array'
      and jsonb_array_length(p_value) between 1 and 50
      and not exists (
        select 1 from jsonb_array_elements(p_value) selected
        where jsonb_typeof(selected) <> 'string'
          or not exists (
            select 1 from jsonb_array_elements(p_question -> 'options') option
            where option ->> 'value' = selected #>> '{}'
          )
      )
      and not exists (
        select 1 from jsonb_array_elements(p_value) selected group by selected having count(*) > 1
      );
  elsif question_type = 'NUMBER' then
    return jsonb_typeof(p_value) = 'number' and abs((p_value #>> '{}')::numeric) <= 1000000000;
  elsif question_type = 'BOOLEAN' then
    return jsonb_typeof(p_value) = 'boolean';
  elsif question_type = 'SCALE' then
    return jsonb_typeof(p_value) = 'number'
      and (p_value #>> '{}')::numeric between
        (p_question -> 'scale' ->> 'min')::numeric and (p_question -> 'scale' ->> 'max')::numeric;
  elsif question_type = 'DATE' then
    answer_text := p_value #>> '{}';
    perform answer_text::date;
    return jsonb_typeof(p_value) = 'string' and answer_text ~ '^\d{4}-\d{2}-\d{2}$';
  elsif question_type = 'MEASUREMENT' then
    perform (p_value ->> 'measured_at')::timestamptz;
    return jsonb_typeof(p_value) = 'object'
      and jsonb_typeof(p_value -> 'value') = 'number'
      and abs((p_value ->> 'value')::numeric) <= 1000000000
      and jsonb_typeof(p_value -> 'unit_code') = 'string'
      and exists (
        select 1 from jsonb_array_elements(p_question -> 'measurement' -> 'unit_codes') unit
        where unit #>> '{}' = p_value ->> 'unit_code'
      )
      and jsonb_typeof(p_value -> 'measured_at') = 'string';
  elsif question_type = 'PHOTO_REQUEST' then
    return jsonb_typeof(p_value) = 'object'
      and (
        ((p_value ->> 'skipped')::boolean is true)
        or (jsonb_typeof(p_value -> 'media_id') = 'string' and (p_value ->> 'media_id')::uuid is not null)
      );
  end if;
  return false;
exception when others then
  return false;
end;
$$;

create or replace function private.guard_assessment_template_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.system_key is distinct from old.system_key
    or new.owner_trainer_id is distinct from old.owner_trainer_id
  then
    raise exception 'template_ownership_is_immutable';
  end if;
  return new;
end;
$$;

create or replace function private.reject_immutable_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'immutable_record';
end;
$$;

create or replace function private.guard_assessment_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status = 'COMPLETED' then
    raise exception 'completed_assessment_is_immutable';
  end if;
  if new.trainer_student_relationship_id is distinct from old.trainer_student_relationship_id
    or new.template_version_id is distinct from old.template_version_id
    or new.title is distinct from old.title
    or new.is_required is distinct from old.is_required
    or new.due_at is distinct from old.due_at
    or new.created_by is distinct from old.created_by
    or new.created_at is distinct from old.created_at
  then
    raise exception 'assessment_assignment_is_immutable';
  end if;
  if not (
    (old.status = 'DRAFT' and new.status = 'SENT' and new.sent_at is not null)
    or (old.status = 'SENT' and new.status = 'ANSWERED' and new.answered_at is not null)
    or (old.status = 'ANSWERED' and new.status = 'IN_REVIEW' and new.review_started_at is not null)
    or (old.status = 'IN_REVIEW' and new.status = 'COMPLETED' and new.completed_at is not null)
  ) then
    raise exception 'invalid_assessment_transition';
  end if;
  if new.trainer_feedback is distinct from old.trainer_feedback and new.status <> 'COMPLETED' then
    raise exception 'feedback_only_on_completion';
  end if;
  return new;
end;
$$;

create or replace function private.guard_assessment_answer_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_assessment_id uuid := case when tg_op = 'DELETE' then old.assessment_id else new.assessment_id end;
  current_status text;
begin
  if tg_op = 'DELETE' then raise exception 'assessment_answers_are_append_preserved'; end if;
  select assessment.status into current_status
  from public.assessments assessment where assessment.id = target_assessment_id;
  if current_status <> 'SENT' then raise exception 'assessment_answers_are_read_only'; end if;
  if tg_op = 'UPDATE' and (
    new.assessment_id is distinct from old.assessment_id
    or new.question_key is distinct from old.question_key
    or new.answered_by is distinct from old.answered_by
    or new.created_at is distinct from old.created_at
  ) then
    raise exception 'answer_identity_is_immutable';
  end if;
  return new;
end;
$$;

create trigger touch_assessment_templates_updated_at before update on public.assessment_templates
for each row execute function private.touch_updated_at();
create trigger guard_assessment_template_update before update on public.assessment_templates
for each row execute function private.guard_assessment_template_update();
create trigger reject_assessment_template_version_update before update or delete on public.assessment_template_versions
for each row execute function private.reject_immutable_row_change();
create trigger guard_assessment_update before update on public.assessments
for each row execute function private.guard_assessment_update();
create trigger touch_assessments_updated_at before update on public.assessments
for each row execute function private.touch_updated_at();
create trigger guard_assessment_answer_mutation before insert or update or delete on public.assessment_answers
for each row execute function private.guard_assessment_answer_mutation();
create trigger touch_assessment_answers_updated_at before update on public.assessment_answers
for each row execute function private.touch_updated_at();
create trigger reject_student_measurement_update before update or delete on public.student_measurements
for each row execute function private.reject_immutable_row_change();
create trigger reject_assessment_event_update before update or delete on public.assessment_events
for each row execute function private.reject_immutable_row_change();

create policy "trainers read system or owned assessment templates" on public.assessment_templates
for select to authenticated using (
  (system_key is not null and status = 'ACTIVE' and (select private.current_trainer_profile_id()) is not null)
  or (owner_trainer_id is not null and (select private.owns_trainer(owner_trainer_id)))
);
create policy "trainers create owned custom assessment templates" on public.assessment_templates
for insert to authenticated with check (
  system_key is null and owner_trainer_id = (select private.current_trainer_profile_id())
);
create policy "trainers update owned custom assessment templates" on public.assessment_templates
for update to authenticated using ((select private.owns_trainer(owner_trainer_id)))
with check ((select private.owns_trainer(owner_trainer_id)) and system_key is null);
create policy "trainers delete unused owned custom assessment templates" on public.assessment_templates
for delete to authenticated using (
  (select private.owns_trainer(owner_trainer_id))
  and not exists (
    select 1 from public.assessment_template_versions version where version.template_id = id
  )
);

create policy "trainers read system or owned assessment template versions" on public.assessment_template_versions
for select to authenticated using (exists (
  select 1 from public.assessment_templates template
  where template.id = template_id
    and (
      (template.system_key is not null and template.status = 'ACTIVE' and (select private.current_trainer_profile_id()) is not null)
      or (template.owner_trainer_id is not null and (select private.owns_trainer(template.owner_trainer_id)))
    )
));
create policy "trainers create owned custom assessment template versions" on public.assessment_template_versions
for insert to authenticated with check (
  created_by = (select auth.uid())
  and exists (
    select 1 from public.assessment_templates template
    where template.id = template_id
      and template.system_key is null
      and template.status = 'ACTIVE'
      and (select private.owns_trainer(template.owner_trainer_id))
  )
);

create policy "relationship parties read assessment instances" on public.assessments
for select to authenticated using (
  (select private.can_read_assessment_relationship(trainer_student_relationship_id))
);
create policy "relationship parties read assessment answers" on public.assessment_answers
for select to authenticated using (exists (
  select 1 from public.assessments assessment
  where assessment.id = assessment_id
    and (select private.can_read_assessment_relationship(assessment.trainer_student_relationship_id))
));
create policy "relationship parties read student measurements" on public.student_measurements
for select to authenticated using (
  (select private.can_read_assessment_relationship(trainer_student_relationship_id))
);
create policy "student or active trainer reads private media metadata" on public.student_private_media
for select to authenticated using (
  deleted_at is null
  and (select private.can_access_student_private_media(student_profile_id, trainer_student_relationship_id))
);
create policy "relationship parties read assessment events" on public.assessment_events
for select to authenticated using (exists (
  select 1 from public.assessments assessment
  where assessment.id = assessment_id
    and (select private.can_read_assessment_relationship(assessment.trainer_student_relationship_id))
));

create or replace function public.create_assessment_from_template(
  p_relationship_id uuid,
  p_template_version_id uuid,
  p_title text default null,
  p_is_required boolean default null,
  p_due_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  relationship public.trainer_student_relationships;
  template public.assessment_templates;
  created_assessment_id uuid;
begin
  select candidate.* into relationship
  from public.trainer_student_relationships candidate
  where candidate.id = p_relationship_id for update;
  if current_user_id is null or relationship.id is null or relationship.status <> 'active'
    or not (select private.owns_trainer(relationship.trainer_profile_id))
  then raise exception 'assessment_relationship_not_available'; end if;

  select candidate.* into template
  from public.assessment_template_versions version
  join public.assessment_templates candidate on candidate.id = version.template_id
  where version.id = p_template_version_id;
  if template.id is null or template.status <> 'ACTIVE'
    or not (template.system_key is not null or template.owner_trainer_id = relationship.trainer_profile_id)
  then raise exception 'assessment_template_not_available'; end if;
  if p_title is not null and char_length(trim(p_title)) not between 2 and 160 then
    raise exception 'invalid_assessment_title';
  end if;
  if p_due_at is not null and p_due_at <= now() then raise exception 'invalid_assessment_due_at'; end if;

  insert into public.assessments(
    trainer_student_relationship_id, template_version_id, title, is_required, due_at, created_by
  ) values (
    relationship.id, p_template_version_id, coalesce(nullif(trim(p_title), ''), template.name),
    coalesce(p_is_required, template.default_required), p_due_at, current_user_id
  ) returning id into created_assessment_id;
  insert into public.assessment_events(assessment_id, event_type, actor_user_id)
  values (created_assessment_id, 'CREATED', current_user_id);
  return created_assessment_id;
end;
$$;

create or replace function public.send_assessment(p_assessment_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  target public.assessments;
begin
  select assessment.* into target from public.assessments assessment where assessment.id = p_assessment_id for update;
  if target.id is null or target.status <> 'DRAFT' or not exists (
    select 1 from public.trainer_student_relationships relationship
    where relationship.id = target.trainer_student_relationship_id and relationship.status = 'active'
      and (select private.owns_trainer(relationship.trainer_profile_id))
  ) then raise exception 'assessment_not_available_for_send'; end if;
  update public.assessments set status = 'SENT', sent_at = now() where id = target.id;
  insert into public.assessment_events(assessment_id, event_type, actor_user_id)
  values (target.id, 'SENT', current_user_id);
end;
$$;

create or replace function public.save_assessment_answer(
  p_assessment_id uuid,
  p_question_key text,
  p_value jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  target public.assessments;
  relationship public.trainer_student_relationships;
  question jsonb;
  answer_id uuid;
begin
  select assessment.* into target from public.assessments assessment where assessment.id = p_assessment_id for update;
  if target.id is null or target.status <> 'SENT' then raise exception 'assessment_not_available_for_answer'; end if;
  select candidate.* into relationship from public.trainer_student_relationships candidate
  where candidate.id = target.trainer_student_relationship_id;
  if relationship.status <> 'active' or not (select private.owns_student(relationship.student_profile_id)) then
    raise exception 'assessment_not_available_for_answer';
  end if;
  select candidate into question
  from public.assessment_template_versions version,
    jsonb_array_elements(version.schema -> 'questions') candidate
  where version.id = target.template_version_id and candidate ->> 'key' = p_question_key;
  if question is null then raise exception 'unknown_assessment_question'; end if;
  if not private.validate_assessment_answer(question, p_value) then raise exception 'invalid_assessment_answer'; end if;

  insert into public.assessment_answers(assessment_id, question_key, value, answered_by)
  values (target.id, p_question_key, p_value, current_user_id)
  on conflict (assessment_id, question_key) do update set value = excluded.value
  returning id into answer_id;
  insert into public.assessment_events(assessment_id, event_type, actor_user_id, metadata)
  values (target.id, 'ANSWER_SAVED', current_user_id, jsonb_build_object('question_key', p_question_key));
  return answer_id;
end;
$$;

create or replace function public.submit_assessment(p_assessment_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  target public.assessments;
  relationship public.trainer_student_relationships;
  question jsonb;
  answer jsonb;
begin
  select assessment.* into target from public.assessments assessment where assessment.id = p_assessment_id for update;
  if target.id is null or target.status <> 'SENT' then raise exception 'assessment_not_available_for_submit'; end if;
  select candidate.* into relationship from public.trainer_student_relationships candidate
  where candidate.id = target.trainer_student_relationship_id;
  if relationship.status <> 'active' or not (select private.owns_student(relationship.student_profile_id)) then
    raise exception 'assessment_not_available_for_submit';
  end if;

  for question in
    select candidate from public.assessment_template_versions version,
      jsonb_array_elements(version.schema -> 'questions') candidate
    where version.id = target.template_version_id
  loop
    select saved.value into answer from public.assessment_answers saved
    where saved.assessment_id = target.id and saved.question_key = question ->> 'key';
    if (question ->> 'required')::boolean and answer is null then
      raise exception 'required_assessment_answer_missing:%', question ->> 'key';
    end if;
    if answer is not null and not private.validate_assessment_answer(question, answer) then
      raise exception 'invalid_assessment_answer:%', question ->> 'key';
    end if;
    if answer is not null and question ->> 'type' = 'MEASUREMENT' then
      insert into public.student_measurements(
        student_profile_id, trainer_student_relationship_id, source_assessment_id,
        measurement_code, value, unit_code, measured_at, recorded_by
      ) values (
        relationship.student_profile_id, relationship.id, target.id,
        question -> 'measurement' ->> 'code', (answer ->> 'value')::numeric,
        answer ->> 'unit_code', (answer ->> 'measured_at')::timestamptz, current_user_id
      );
    end if;
    answer := null;
  end loop;

  update public.assessments set status = 'ANSWERED', answered_at = now() where id = target.id;
  insert into public.assessment_events(assessment_id, event_type, actor_user_id)
  values (target.id, 'SUBMITTED', current_user_id);
end;
$$;

create or replace function public.start_assessment_review(p_assessment_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  target public.assessments;
begin
  select assessment.* into target from public.assessments assessment where assessment.id = p_assessment_id for update;
  if target.id is null or target.status <> 'ANSWERED' or not exists (
    select 1 from public.trainer_student_relationships relationship
    where relationship.id = target.trainer_student_relationship_id and relationship.status = 'active'
      and (select private.owns_trainer(relationship.trainer_profile_id))
  ) then raise exception 'assessment_not_available_for_review'; end if;
  update public.assessments set status = 'IN_REVIEW', review_started_at = now() where id = target.id;
  insert into public.assessment_events(assessment_id, event_type, actor_user_id)
  values (target.id, 'REVIEW_STARTED', current_user_id);
end;
$$;

create or replace function public.complete_assessment(p_assessment_id uuid, p_trainer_feedback text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  target public.assessments;
begin
  if p_trainer_feedback is null or char_length(trim(p_trainer_feedback)) not between 1 and 5000 then
    raise exception 'invalid_trainer_feedback';
  end if;
  select assessment.* into target from public.assessments assessment where assessment.id = p_assessment_id for update;
  if target.id is null or target.status <> 'IN_REVIEW' or not exists (
    select 1 from public.trainer_student_relationships relationship
    where relationship.id = target.trainer_student_relationship_id and relationship.status = 'active'
      and (select private.owns_trainer(relationship.trainer_profile_id))
  ) then raise exception 'assessment_not_available_for_completion'; end if;
  update public.assessments
  set status = 'COMPLETED', completed_at = now(), trainer_feedback = trim(p_trainer_feedback)
  where id = target.id;
  insert into public.assessment_events(assessment_id, event_type, actor_user_id)
  values (target.id, 'COMPLETED', current_user_id);
end;
$$;

create or replace function public.get_my_assessment(p_assessment_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  target public.assessments;
  relationship public.trainer_student_relationships;
  is_trainer boolean;
begin
  select assessment.* into target from public.assessments assessment where assessment.id = p_assessment_id;
  if target.id is null then raise exception 'assessment_not_available'; end if;
  select candidate.* into relationship from public.trainer_student_relationships candidate
  where candidate.id = target.trainer_student_relationship_id;
  is_trainer := (select private.owns_trainer(relationship.trainer_profile_id));
  if not is_trainer and not (select private.owns_student(relationship.student_profile_id)) then
    raise exception 'assessment_not_available';
  end if;
  return jsonb_build_object(
    'id', target.id,
    'trainer_student_relationship_id', target.trainer_student_relationship_id,
    'template_version_id', target.template_version_id,
    'status', target.status,
    'title', target.title,
    'is_required', target.is_required,
    'due_at', target.due_at,
    'sent_at', target.sent_at,
    'answered_at', target.answered_at,
    'review_started_at', target.review_started_at,
    'completed_at', target.completed_at,
    'trainer_feedback', case when is_trainer or target.status = 'COMPLETED' then target.trainer_feedback else null end,
    'created_at', target.created_at,
    'updated_at', target.updated_at,
    'template_schema', (select version.schema from public.assessment_template_versions version where version.id = target.template_version_id),
    'answers', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', answer.id, 'question_key', answer.question_key, 'value', answer.value,
        'created_at', answer.created_at, 'updated_at', answer.updated_at
      ) order by answer.created_at, answer.id)
      from public.assessment_answers answer where answer.assessment_id = target.id
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.list_my_assessments()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', assessment.id,
    'trainer_student_relationship_id', assessment.trainer_student_relationship_id,
    'template_version_id', assessment.template_version_id,
    'status', assessment.status,
    'title', assessment.title,
    'is_required', assessment.is_required,
    'due_at', assessment.due_at,
    'sent_at', assessment.sent_at,
    'answered_at', assessment.answered_at,
    'review_started_at', assessment.review_started_at,
    'completed_at', assessment.completed_at,
    'created_at', assessment.created_at,
    'updated_at', assessment.updated_at
  ) order by assessment.created_at desc), '[]'::jsonb)
  from public.assessments assessment
  where (select private.can_read_assessment_relationship(assessment.trainer_student_relationship_id));
$$;

-- PPerfil-owned pt-BR templates. UUIDs are deterministic for supportability.
insert into public.assessment_templates(
  id, system_key, assessment_type, name, description, locale, status, default_required
) values
  ('a3000000-0000-4000-8000-000000000001', 'INITIAL_V1', 'INITIAL', 'Avaliação inicial',
   'Conhece objetivo, rotina, experiência, disponibilidade, contexto e medidas iniciais sem realizar diagnóstico médico.', 'pt-BR', 'ACTIVE', true),
  ('a3000000-0000-4000-8000-000000000002', 'MONTHLY_CHECKIN_V1', 'MONTHLY_CHECKIN', 'Check-in mensal',
   'Acompanha consistência, dificuldade, energia, rotina, percepção e obstáculos do período.', 'pt-BR', 'ACTIVE', false),
  ('a3000000-0000-4000-8000-000000000003', 'REASSESSMENT_V1', 'REASSESSMENT', 'Reavaliação',
   'Compara progresso, medidas, objetivos e percepção com avaliações anteriores.', 'pt-BR', 'ACTIVE', false);

insert into public.assessment_template_versions(id, template_id, version_number, schema, created_by) values
('a3100000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000001', 1, $json$
{"metadata":{"when_to_use":{"pt-BR":"Ao iniciar o acompanhamento com um aluno."},"safety":{"pt-BR":"Não substitui avaliação ou diagnóstico de profissional de saúde."}},"questions":[
{"key":"primary_goal","type":"LONG_TEXT","required":true,"label":{"pt-BR":"Qual é o seu principal objetivo?"}},
{"key":"training_experience","type":"SINGLE_CHOICE","required":true,"label":{"pt-BR":"Como você descreve sua experiência com treinos?"},"options":[{"value":"beginner","label":{"pt-BR":"Iniciante"}},{"value":"intermediate","label":{"pt-BR":"Intermediária"}},{"value":"advanced","label":{"pt-BR":"Avançada"}}]},
{"key":"weekly_availability","type":"NUMBER","required":true,"label":{"pt-BR":"Quantos dias por semana você pode treinar?"}},
{"key":"routine_availability","type":"LONG_TEXT","required":true,"label":{"pt-BR":"Conte como é sua rotina e quais horários estão disponíveis."}},
{"key":"training_context","type":"MULTI_CHOICE","required":true,"label":{"pt-BR":"Onde e com quais recursos pretende treinar?"},"options":[{"value":"gym","label":{"pt-BR":"Academia"}},{"value":"home_equipment","label":{"pt-BR":"Em casa com equipamentos"}},{"value":"home_no_equipment","label":{"pt-BR":"Em casa sem equipamentos"}},{"value":"outdoor","label":{"pt-BR":"Ao ar livre"}}]},
{"key":"training_preferences","type":"LONG_TEXT","required":false,"label":{"pt-BR":"Quais atividades ou formatos de treino você prefere?"}},
{"key":"reported_limitations","type":"LONG_TEXT","required":false,"label":{"pt-BR":"Informe limitações, desconfortos ou orientações profissionais que o Personal deva considerar."},"description":{"pt-BR":"Este campo não realiza diagnóstico médico."}},
{"key":"body_weight","type":"MEASUREMENT","required":false,"label":{"pt-BR":"Peso atual (opcional)"},"measurement":{"code":"body_weight","unit_codes":["kg"]}},
{"key":"waist_circumference","type":"MEASUREMENT","required":false,"label":{"pt-BR":"Circunferência da cintura (opcional)"},"measurement":{"code":"waist_circumference","unit_codes":["cm"]}},
{"key":"additional_notes","type":"LONG_TEXT","required":false,"label":{"pt-BR":"Há mais alguma informação que queira compartilhar?"}}
]}$json$::jsonb, null),
('a3100000-0000-4000-8000-000000000002', 'a3000000-0000-4000-8000-000000000002', 1, $json$
{"metadata":{"when_to_use":{"pt-BR":"Ao final de um ciclo mensal de acompanhamento."}},"questions":[
{"key":"sessions_completed","type":"NUMBER","required":true,"label":{"pt-BR":"Quantos treinos você realizou neste período?"}},
{"key":"difficulty_level","type":"SCALE","required":true,"label":{"pt-BR":"Como avalia o nível de dificuldade?"},"scale":{"min":1,"max":10}},
{"key":"energy_level","type":"SCALE","required":true,"label":{"pt-BR":"Como esteve sua energia e disposição?"},"scale":{"min":1,"max":10}},
{"key":"sleep_quality","type":"SCALE","required":false,"label":{"pt-BR":"Como avalia a qualidade do sono?"},"scale":{"min":1,"max":10}},
{"key":"perceived_discomfort","type":"LONG_TEXT","required":false,"label":{"pt-BR":"Percebeu algum desconforto durante o período?"},"description":{"pt-BR":"Descreva sua percepção; este campo não realiza diagnóstico médico."}},
{"key":"training_satisfaction","type":"SCALE","required":true,"label":{"pt-BR":"Qual foi sua satisfação com os treinos?"},"scale":{"min":1,"max":10}},
{"key":"main_obstacles","type":"LONG_TEXT","required":false,"label":{"pt-BR":"Quais foram os principais obstáculos?"}},
{"key":"next_period_goal","type":"LONG_TEXT","required":true,"label":{"pt-BR":"Qual é o foco para o próximo período?"}},
{"key":"optional_weight","type":"MEASUREMENT","required":false,"label":{"pt-BR":"Peso atual (opcional)"},"measurement":{"code":"body_weight","unit_codes":["kg"]}},
{"key":"optional_progress_photo","type":"PHOTO_REQUEST","required":false,"label":{"pt-BR":"Deseja registrar uma foto de progresso?"}}
]}$json$::jsonb, null),
('a3100000-0000-4000-8000-000000000003', 'a3000000-0000-4000-8000-000000000003', 1, $json$
{"metadata":{"when_to_use":{"pt-BR":"Ao revisar objetivos e progresso após um ciclo de acompanhamento."}},"questions":[
{"key":"perceived_changes","type":"LONG_TEXT","required":true,"label":{"pt-BR":"Quais mudanças você percebeu desde a avaliação anterior?"}},
{"key":"goal_progress","type":"SCALE","required":true,"label":{"pt-BR":"Como avalia sua evolução em relação ao objetivo?"},"scale":{"min":1,"max":10}},
{"key":"consistency","type":"SCALE","required":true,"label":{"pt-BR":"Como avalia sua consistência?"},"scale":{"min":1,"max":10}},
{"key":"goal_review","type":"LONG_TEXT","required":true,"label":{"pt-BR":"O que deseja manter ou ajustar nas próximas metas?"}},
{"key":"body_weight","type":"MEASUREMENT","required":false,"label":{"pt-BR":"Peso atual (opcional)"},"measurement":{"code":"body_weight","unit_codes":["kg"]}},
{"key":"waist_circumference","type":"MEASUREMENT","required":false,"label":{"pt-BR":"Circunferência da cintura (opcional)"},"measurement":{"code":"waist_circumference","unit_codes":["cm"]}},
{"key":"progress_photo","type":"PHOTO_REQUEST","required":false,"label":{"pt-BR":"Deseja registrar fotos de progresso?"}},
{"key":"coaching_feedback","type":"LONG_TEXT","required":false,"label":{"pt-BR":"Que feedback você daria sobre o acompanhamento?"}}
]}$json$::jsonb, null);

-- Private progress media: 10 MiB maximum, raster formats only, never public.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values (
  'student-private-media', 'student-private-media', false, 10485760,
  array['image/jpeg', 'image/png', 'image/webp']
);

create policy "authorized relationship reads student private media"
on storage.objects for select to authenticated
using (
  bucket_id = 'student-private-media'
  and (select private.can_read_student_private_storage_object(name))
);

-- There are deliberately no INSERT/UPDATE/DELETE storage policies until the upload service exists.
revoke all on public.assessment_templates, public.assessment_template_versions, public.assessments,
  public.assessment_answers, public.student_measurements, public.student_private_media,
  public.assessment_events from public, anon, authenticated;

grant select, insert, delete on public.assessment_templates to authenticated;
grant update(assessment_type, name, description, locale, status, default_required)
  on public.assessment_templates to authenticated;
grant select, insert on public.assessment_template_versions to authenticated;
grant select(id, trainer_student_relationship_id, template_version_id, status, title, is_required,
  due_at, sent_at, answered_at, review_started_at, completed_at, created_by, created_at, updated_at)
  on public.assessments to authenticated;
grant select on public.assessment_answers, public.student_measurements,
  public.student_private_media, public.assessment_events to authenticated;

revoke all on function private.current_trainer_profile_id(),
  private.can_read_assessment_relationship(uuid),
  private.can_access_student_private_media(uuid,uuid),
  private.can_read_student_private_storage_object(text),
  private.localized_text_is_valid(jsonb),
  private.validate_assessment_template_schema(jsonb),
  private.validate_assessment_answer(jsonb,jsonb),
  private.guard_assessment_template_update(), private.reject_immutable_row_change(),
  private.guard_assessment_update(), private.guard_assessment_answer_mutation()
  from public, anon, authenticated;
grant execute on function private.current_trainer_profile_id(),
  private.can_read_assessment_relationship(uuid),
  private.can_access_student_private_media(uuid,uuid),
  private.can_read_student_private_storage_object(text),
  private.localized_text_is_valid(jsonb),
  private.validate_assessment_template_schema(jsonb) to authenticated;

revoke all on function public.create_assessment_from_template(uuid,uuid,text,boolean,timestamptz),
  public.send_assessment(uuid), public.save_assessment_answer(uuid,text,jsonb),
  public.submit_assessment(uuid), public.start_assessment_review(uuid),
  public.complete_assessment(uuid,text), public.get_my_assessment(uuid),
  public.list_my_assessments() from public, anon;
grant execute on function public.create_assessment_from_template(uuid,uuid,text,boolean,timestamptz),
  public.send_assessment(uuid), public.save_assessment_answer(uuid,text,jsonb),
  public.submit_assessment(uuid), public.start_assessment_review(uuid),
  public.complete_assessment(uuid,text), public.get_my_assessment(uuid),
  public.list_my_assessments() to authenticated;

-- Migration-time security assertions fail closed before the migration commits.
do $$
declare
  missing_rls text;
  unsafe_function text;
begin
  select string_agg(c.relname, ', ' order by c.relname) into missing_rls
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname in ('assessment_templates','assessment_template_versions','assessments',
      'assessment_answers','student_measurements','student_private_media','assessment_events')
    and not c.relrowsecurity;
  if missing_rls is not null then raise exception 'assessment_rls_missing:%', missing_rls; end if;

  if exists (
    select 1 from information_schema.role_table_grants
    where grantee = 'anon' and table_schema = 'public'
      and table_name in ('assessment_templates','assessment_template_versions','assessments',
        'assessment_answers','student_measurements','student_private_media','assessment_events')
  ) then raise exception 'anonymous_assessment_privilege_detected'; end if;

  if has_table_privilege('authenticated', 'public.assessments', 'INSERT,UPDATE,DELETE')
    or has_table_privilege('authenticated', 'public.assessment_answers', 'INSERT,UPDATE,DELETE')
    or has_table_privilege('authenticated', 'public.student_measurements', 'INSERT,UPDATE,DELETE')
    or has_table_privilege('authenticated', 'public.student_private_media', 'INSERT,UPDATE,DELETE')
    or has_table_privilege('authenticated', 'public.assessment_events', 'INSERT,UPDATE,DELETE')
  then raise exception 'direct_assessment_mutation_privilege_detected'; end if;

  if not exists (
    select 1 from storage.buckets where id = 'student-private-media'
      and public is false and file_size_limit = 10485760
      and allowed_mime_types = array['image/jpeg','image/png','image/webp']::text[]
  ) then raise exception 'student_private_media_bucket_is_not_secure'; end if;

  select n.nspname || '.' || p.proname into unsafe_function
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where p.prosecdef
    and n.nspname in ('public','private')
    and p.proname in ('current_trainer_profile_id','can_read_assessment_relationship',
      'can_access_student_private_media','can_read_student_private_storage_object',
      'guard_assessment_template_update','reject_immutable_row_change',
      'guard_assessment_update','guard_assessment_answer_mutation','create_assessment_from_template',
      'send_assessment','save_assessment_answer','submit_assessment','start_assessment_review',
      'complete_assessment','get_my_assessment','list_my_assessments')
    and (p.proconfig is null or array_to_string(p.proconfig, ',') !~ '^search_path=(""|)$') limit 1;
  if unsafe_function is not null then raise exception 'unsafe_assessment_function:%', unsafe_function; end if;
end;
$$;
