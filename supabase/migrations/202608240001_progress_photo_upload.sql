-- Sprint 6B: narrow student-only upload path for private progress photos.

create or replace function private.can_upload_student_progress_storage_object(
  p_storage_path text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select auth.uid()) is not null
    and exists (
      select 1
      from public.student_profiles profile
      join public.user_roles role
        on role.user_id = profile.user_id
       and role.role_code = 'student'
       and role.revoked_at is null
      join public.trainer_student_relationships relationship
        on relationship.student_profile_id = profile.id
       and relationship.status = 'active'
      where profile.user_id = (select auth.uid())
        and p_storage_path ~ (
          '^' || (select auth.uid())::text || '/' || profile.id::text
          || '/progress/(FRONT|SIDE|BACK)/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
          || '\.(jpg|png|webp)$'
        )
    );
$$;

create policy "student uploads own progress media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'student-private-media'
  and owner_id = (select auth.uid())::text
  and (select private.can_upload_student_progress_storage_object(name))
);

-- Cleanup is limited to an owning student's unregistered upload. Once metadata
-- exists, neither students nor trainers can delete the underlying object.
create policy "student removes unregistered progress upload"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'student-private-media'
  and owner_id = (select auth.uid())::text
  and (select private.can_upload_student_progress_storage_object(name))
  and not exists (
    select 1
    from public.student_private_media media
    where media.storage_path = name
  )
);

create or replace function public.create_progress_photo(
  p_storage_path text,
  p_view_type text,
  p_mime_type text,
  p_file_size bigint,
  p_consent_version text default 'progress-photo-v1'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_student_profile_id uuid;
  v_relationship_id uuid;
  v_object_metadata jsonb;
  v_media_id uuid;
begin
  if v_user_id is null then
    raise exception 'authentication_required';
  end if;

  if p_view_type not in ('FRONT', 'SIDE', 'BACK') then
    raise exception 'invalid_progress_photo_view';
  end if;

  if p_mime_type not in ('image/jpeg', 'image/png', 'image/webp') then
    raise exception 'invalid_progress_photo_mime';
  end if;

  if p_file_size is null or p_file_size < 1 or p_file_size > 10485760 then
    raise exception 'invalid_progress_photo_size';
  end if;

  if p_consent_version is null
    or char_length(trim(p_consent_version)) < 1
    or char_length(trim(p_consent_version)) > 64
  then
    raise exception 'invalid_progress_photo_consent';
  end if;

  if not (select private.can_upload_student_progress_storage_object(p_storage_path)) then
    raise exception 'progress_photo_upload_forbidden';
  end if;

  select profile.id, relationship.id
  into v_student_profile_id, v_relationship_id
  from public.student_profiles profile
  join public.trainer_student_relationships relationship
    on relationship.student_profile_id = profile.id
   and relationship.status = 'active'
  where profile.user_id = v_user_id
    and p_storage_path like (
      v_user_id::text || '/' || profile.id::text || '/progress/' || p_view_type || '/%'
    )
  order by relationship.started_at desc, relationship.created_at desc, relationship.id
  limit 1;

  if v_student_profile_id is null or v_relationship_id is null then
    raise exception 'active_student_relationship_required';
  end if;

  select object.metadata
  into v_object_metadata
  from storage.objects object
  where object.bucket_id = 'student-private-media'
    and object.name = p_storage_path
    and object.owner_id = v_user_id::text;

  if v_object_metadata is null then
    raise exception 'progress_photo_object_missing';
  end if;

  if coalesce(v_object_metadata ->> 'mimetype', '') <> p_mime_type
    or coalesce(v_object_metadata ->> 'size', '') !~ '^[0-9]+$'
    or (v_object_metadata ->> 'size')::bigint <> p_file_size
  then
    raise exception 'progress_photo_object_mismatch';
  end if;

  insert into public.student_private_media(
    student_profile_id,
    trainer_student_relationship_id,
    source_assessment_id,
    storage_path,
    media_type,
    view_type,
    mime_type,
    file_size,
    created_by,
    consent_version,
    consented_at
  ) values (
    v_student_profile_id,
    v_relationship_id,
    null,
    p_storage_path,
    'PROGRESS_PHOTO',
    p_view_type,
    p_mime_type,
    p_file_size,
    v_user_id,
    trim(p_consent_version),
    now()
  )
  returning id into v_media_id;

  return v_media_id;
end;
$$;

revoke all on function private.can_upload_student_progress_storage_object(text)
  from public, anon, authenticated;
grant execute on function private.can_upload_student_progress_storage_object(text)
  to authenticated;

revoke all on function public.create_progress_photo(text, text, text, bigint, text)
  from public, anon;
grant execute on function public.create_progress_photo(text, text, text, bigint, text)
  to authenticated;

do $$
declare
  unsafe_function text;
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'student uploads own progress media'
      and cmd = 'INSERT'
      and roles = array['authenticated']::name[]
  ) then
    raise exception 'progress_photo_upload_policy_missing';
  end if;

  if has_table_privilege('authenticated', 'public.student_private_media', 'INSERT,UPDATE,DELETE') then
    raise exception 'direct_progress_media_mutation_privilege_detected';
  end if;

  if has_function_privilege(
    'anon',
    'public.create_progress_photo(text,text,text,bigint,text)',
    'EXECUTE'
  ) then
    raise exception 'anonymous_progress_photo_rpc_access_detected';
  end if;

  select namespace.nspname || '.' || procedure.proname
  into unsafe_function
  from pg_proc procedure
  join pg_namespace namespace on namespace.oid = procedure.pronamespace
  where procedure.prosecdef
    and (
      (namespace.nspname = 'private' and procedure.proname = 'can_upload_student_progress_storage_object')
      or (namespace.nspname = 'public' and procedure.proname = 'create_progress_photo')
    )
    and (
      procedure.proconfig is null
      or array_to_string(procedure.proconfig, ',') !~ '^search_path=(""|)$'
    )
  limit 1;

  if unsafe_function is not null then
    raise exception 'unsafe_progress_photo_function:%', unsafe_function;
  end if;
end;
$$;
