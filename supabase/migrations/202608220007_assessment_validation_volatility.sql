-- Sprint 3A follow-up: timezone/date casts are STABLE, not IMMUTABLE.
-- Forward-only because migration 006 was already applied before db lint exposed this warning.

alter function private.validate_assessment_answer(jsonb, jsonb) stable;

do $$
declare
  function_record record;
begin
  select p.provolatile, p.prosecdef, p.proconfig
  into function_record
  from pg_proc p
  where p.oid = 'private.validate_assessment_answer(jsonb,jsonb)'::regprocedure;

  if function_record.provolatile <> 's' then
    raise exception 'assessment_answer_validator_must_be_stable';
  end if;
  if function_record.prosecdef then
    raise exception 'assessment_answer_validator_must_remain_security_invoker';
  end if;
  if function_record.proconfig is null
    or array_to_string(function_record.proconfig, ',') !~ '^search_path=(""|)$'
  then
    raise exception 'assessment_answer_validator_search_path_is_not_empty';
  end if;
end;
$$;
