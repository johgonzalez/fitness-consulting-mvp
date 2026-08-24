-- Keep commercial template/publication state behind the entitlement-aware RPCs.
-- Supabase's default table privileges previously allowed authenticated owners to
-- update every column on their own RLS-visible profile row.

revoke insert, update on public.trainer_profiles from authenticated;

grant update (
  display_name,
  professional_name,
  headline,
  bio,
  specialty,
  cref,
  cep,
  city,
  service_mode,
  profile_image_url,
  hero_image_url,
  logo_url,
  whatsapp,
  instagram,
  instagram_handle,
  instagram_url,
  methodology_description,
  testimonials_intro,
  profile_status_enabled,
  profile_status_text,
  profile_status_semantic_tone,
  site_layouts,
  primary_color
) on public.trainer_profiles to authenticated;

do $security_gate$
begin
  if has_table_privilege('authenticated', 'public.trainer_profiles', 'INSERT') then
    raise exception 'Authenticated role can insert trainer profiles outside onboarding RPC';
  end if;

  if has_column_privilege('authenticated', 'public.trainer_profiles', 'template_id', 'UPDATE')
    or has_column_privilege('authenticated', 'public.trainer_profiles', 'published', 'UPDATE')
    or has_column_privilege('authenticated', 'public.trainer_profiles', 'user_id', 'UPDATE')
    or has_column_privilege('authenticated', 'public.trainer_profiles', 'slug', 'UPDATE') then
    raise exception 'Authenticated role can update protected trainer profile columns';
  end if;

  if not has_column_privilege('authenticated', 'public.trainer_profiles', 'headline', 'UPDATE')
    or not has_column_privilege('authenticated', 'public.trainer_profiles', 'site_layouts', 'UPDATE')
    or not has_column_privilege('authenticated', 'public.trainer_profiles', 'profile_status_enabled', 'UPDATE') then
    raise exception 'Authenticated role lost an allowed trainer profile update';
  end if;

  if not has_function_privilege('authenticated', 'public.create_trainer_profile(text,text,text,text,text,text,text,public.service_mode,text)', 'EXECUTE')
    or not has_function_privilege('authenticated', 'public.set_my_site_template(public.template_id)', 'EXECUTE')
    or not has_function_privilege('authenticated', 'public.set_my_site_publication(boolean)', 'EXECUTE') then
    raise exception 'Authenticated role lost an authorized trainer profile RPC';
  end if;
end;
$security_gate$;
