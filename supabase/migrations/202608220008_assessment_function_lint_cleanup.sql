-- Sprint 3A follow-up: remove two declarations that db lint identified as unused.
-- The exact prior definitions are asserted so this forward-only cleanup fails closed.

do $cleanup$
declare
  function_definition text;
begin
  select pg_get_functiondef('private.validate_assessment_template_schema(jsonb)'::regprocedure)
  into function_definition;
  if strpos(function_definition, E'  option_value jsonb;\n') = 0 then
    raise exception 'expected_template_validator_declaration_not_found';
  end if;
  execute replace(function_definition, E'  option_value jsonb;\n', '');

  select pg_get_functiondef('public.get_my_assessment(uuid)'::regprocedure)
  into function_definition;
  if strpos(function_definition, E'  current_user_id uuid := (select auth.uid());\n') = 0 then
    raise exception 'expected_assessment_reader_declaration_not_found';
  end if;
  execute replace(function_definition, E'  current_user_id uuid := (select auth.uid());\n', '');

  if pg_get_functiondef('private.validate_assessment_template_schema(jsonb)'::regprocedure)
      like '%option_value jsonb%'
    or pg_get_functiondef('public.get_my_assessment(uuid)'::regprocedure)
      like '%current_user_id uuid%'
  then
    raise exception 'assessment_function_lint_cleanup_failed';
  end if;
end;
$cleanup$;
