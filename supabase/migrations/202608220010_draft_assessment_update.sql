-- Sprint 3B.1: narrowly-scoped Draft metadata editing with an append-only audit event.
-- Relationship, template version, answers and lifecycle remain immutable through this operation.

alter table public.assessment_events
  drop constraint assessment_events_type_check;

alter table public.assessment_events
  add constraint assessment_events_type_check check (
    event_type in (
      'CREATED', 'DRAFT_UPDATED', 'SENT', 'ANSWER_SAVED',
      'SUBMITTED', 'REVIEW_STARTED', 'COMPLETED'
    )
  ) not valid;

alter table public.assessment_events
  validate constraint assessment_events_type_check;

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
    or new.created_by is distinct from old.created_by
    or new.created_at is distinct from old.created_at
  then
    raise exception 'assessment_assignment_is_immutable';
  end if;

  -- The only same-state update allowed in V1 is Draft metadata. Lifecycle fields
  -- and trainer feedback cannot be smuggled through the metadata operation.
  if old.status = 'DRAFT' and new.status = 'DRAFT' then
    if new.sent_at is distinct from old.sent_at
      or new.answered_at is distinct from old.answered_at
      or new.review_started_at is distinct from old.review_started_at
      or new.completed_at is distinct from old.completed_at
      or new.trainer_feedback is distinct from old.trainer_feedback
    then
      raise exception 'draft_metadata_update_cannot_change_lifecycle';
    end if;
    return new;
  end if;

  -- Assignment metadata becomes immutable as soon as the Draft is sent.
  if new.title is distinct from old.title
    or new.is_required is distinct from old.is_required
    or new.due_at is distinct from old.due_at
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

create or replace function public.update_draft_assessment(
  p_assessment_id uuid,
  p_title text,
  p_is_required boolean,
  p_due_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  target public.assessments;
  normalized_title text := trim(p_title);
  changed_fields text[] := array[]::text[];
begin
  if current_user_id is null then
    raise exception 'authentication_required';
  end if;
  if p_title is null or char_length(normalized_title) not between 2 and 160 then
    raise exception 'invalid_assessment_title';
  end if;
  if p_is_required is null then
    raise exception 'invalid_assessment_required_state';
  end if;

  select assessment.* into target
  from public.assessments assessment
  where assessment.id = p_assessment_id
  for update;

  if target.id is null
    or target.status <> 'DRAFT'
    or not exists (
      select 1
      from public.trainer_student_relationships relationship
      where relationship.id = target.trainer_student_relationship_id
        and relationship.status = 'active'
        and (select private.owns_trainer(relationship.trainer_profile_id))
    )
  then
    raise exception 'assessment_not_available_for_draft_update';
  end if;

  if p_due_at is distinct from target.due_at
    and p_due_at is not null
    and p_due_at <= now()
  then
    raise exception 'invalid_assessment_due_at';
  end if;

  if normalized_title is distinct from target.title then
    changed_fields := array_append(changed_fields, 'title');
  end if;
  if p_is_required is distinct from target.is_required then
    changed_fields := array_append(changed_fields, 'is_required');
  end if;
  if p_due_at is distinct from target.due_at then
    changed_fields := array_append(changed_fields, 'due_at');
  end if;

  if cardinality(changed_fields) = 0 then
    return;
  end if;

  update public.assessments
  set title = normalized_title,
      is_required = p_is_required,
      due_at = p_due_at
  where id = target.id;

  insert into public.assessment_events(assessment_id, event_type, actor_user_id, metadata)
  values (
    target.id,
    'DRAFT_UPDATED',
    current_user_id,
    jsonb_build_object(
      'changed_fields', to_jsonb(changed_fields),
      'before', jsonb_build_object(
        'title', target.title,
        'is_required', target.is_required,
        'due_at', target.due_at
      ),
      'after', jsonb_build_object(
        'title', normalized_title,
        'is_required', p_is_required,
        'due_at', p_due_at
      )
    )
  );
end;
$$;

alter function public.update_draft_assessment(uuid, text, boolean, timestamptz)
  owner to postgres;

revoke all on function public.update_draft_assessment(uuid, text, boolean, timestamptz)
  from public, anon, authenticated;
grant execute on function public.update_draft_assessment(uuid, text, boolean, timestamptz)
  to authenticated;

do $security_gate$
declare
  function_record record;
  event_constraint text;
begin
  select p.prosecdef, p.proconfig, owner_role.rolname as owner_name
  into function_record
  from pg_proc p
  join pg_roles owner_role on owner_role.oid = p.proowner
  where p.oid = 'public.update_draft_assessment(uuid,text,boolean,timestamp with time zone)'::regprocedure;

  if function_record.owner_name <> 'postgres' then
    raise exception 'draft_assessment_update_owner_must_be_postgres';
  end if;
  if not function_record.prosecdef then
    raise exception 'draft_assessment_update_must_be_security_definer';
  end if;
  if function_record.proconfig is null
    or array_to_string(function_record.proconfig, ',') !~ '^search_path=(""|)$'
  then
    raise exception 'draft_assessment_update_search_path_is_not_empty';
  end if;
  if has_function_privilege(
      'anon',
      'public.update_draft_assessment(uuid,text,boolean,timestamp with time zone)',
      'EXECUTE'
    )
    or not has_function_privilege(
      'authenticated',
      'public.update_draft_assessment(uuid,text,boolean,timestamp with time zone)',
      'EXECUTE'
    )
  then
    raise exception 'draft_assessment_update_grants_are_unsafe';
  end if;
  if has_table_privilege('authenticated', 'public.assessments', 'UPDATE') then
    raise exception 'direct_assessment_update_privilege_detected';
  end if;

  select pg_get_constraintdef(oid) into event_constraint
  from pg_constraint
  where conrelid = 'public.assessment_events'::regclass
    and conname = 'assessment_events_type_check'
    and convalidated;
  if event_constraint is null or event_constraint not like '%DRAFT_UPDATED%' then
    raise exception 'draft_assessment_audit_event_constraint_missing';
  end if;
end;
$security_gate$;
