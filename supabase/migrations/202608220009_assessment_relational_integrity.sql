-- Sprint 3A final hardening: preserve relationship/student/source consistency
-- and require timezone-explicit measurement answers.

alter table public.trainer_student_relationships
  add constraint trainer_student_relationships_id_student_unique
  unique (id, student_profile_id);

alter table public.assessments
  add constraint assessments_id_relationship_unique
  unique (id, trainer_student_relationship_id);

alter table public.student_measurements
  add constraint student_measurements_relationship_student_fk
  foreign key (trainer_student_relationship_id, student_profile_id)
  references public.trainer_student_relationships(id, student_profile_id)
  on delete restrict;

alter table public.student_measurements
  add constraint student_measurements_source_relationship_fk
  foreign key (source_assessment_id, trainer_student_relationship_id)
  references public.assessments(id, trainer_student_relationship_id)
  on delete restrict;

alter table public.student_private_media
  add constraint student_private_media_relationship_student_fk
  foreign key (trainer_student_relationship_id, student_profile_id)
  references public.trainer_student_relationships(id, student_profile_id)
  on delete restrict;

alter table public.student_private_media
  add constraint student_private_media_source_relationship_fk
  foreign key (source_assessment_id, trainer_student_relationship_id)
  references public.assessments(id, trainer_student_relationship_id)
  on delete restrict;

do $hardening$
declare
  function_definition text;
  existing_fragment constant text := E'  elsif question_type = ''MEASUREMENT'' then\n    perform (p_value ->> ''measured_at'')::timestamptz;';
  replacement_fragment constant text := E'  elsif question_type = ''MEASUREMENT'' then\n    if coalesce(p_value ->> ''measured_at'', '''') !~ ''^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}(:\\d{2}(\\.\\d{1,6})?)?([zZ]|[+-]\\d{2}:\\d{2})$'' then\n      return false;\n    end if;\n    perform (p_value ->> ''measured_at'')::timestamptz;';
begin
  select pg_get_functiondef('private.validate_assessment_answer(jsonb,jsonb)'::regprocedure)
  into function_definition;
  if strpos(function_definition, existing_fragment) = 0 then
    raise exception 'expected_measurement_timestamp_validator_not_found';
  end if;
  execute replace(function_definition, existing_fragment, replacement_fragment);

  if private.validate_assessment_answer(
    '{"type":"MEASUREMENT","measurement":{"unit_codes":["kg"]}}'::jsonb,
    '{"value":70,"unit_code":"kg","measured_at":"2026-08-23T12:00:00Z"}'::jsonb
  ) is not true then
    raise exception 'timezone_explicit_measurement_was_rejected';
  end if;
  if private.validate_assessment_answer(
    '{"type":"MEASUREMENT","measurement":{"unit_codes":["kg"]}}'::jsonb,
    '{"value":70,"unit_code":"kg","measured_at":"2026-08-23 12:00:00"}'::jsonb
  ) is not false then
    raise exception 'timezone_ambiguous_measurement_was_accepted';
  end if;
end;
$hardening$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'student_measurements_relationship_student_fk'
      and convalidated
  ) or not exists (
    select 1 from pg_constraint
    where conname = 'student_measurements_source_relationship_fk'
      and convalidated
  ) or not exists (
    select 1 from pg_constraint
    where conname = 'student_private_media_relationship_student_fk'
      and convalidated
  ) or not exists (
    select 1 from pg_constraint
    where conname = 'student_private_media_source_relationship_fk'
      and convalidated
  ) then
    raise exception 'assessment_relational_integrity_constraint_missing';
  end if;
end;
$$;
