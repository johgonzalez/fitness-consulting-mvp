-- Cheipi Sprint 03: private, trainer-led Community feed MVP.
-- Membership is derived from the existing active trainer/student relationship.

alter table public.trainer_entitlements
  add column can_use_community_feed boolean not null default false;

create table public.trainer_communities (
  id uuid primary key default gen_random_uuid(),
  trainer_profile_id uuid not null unique references public.trainer_profiles(id) on delete restrict,
  name text not null,
  status text not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trainer_communities_name_check check (char_length(trim(name)) between 1 and 120),
  constraint trainer_communities_status_check check (status in ('ACTIVE', 'DISABLED'))
);

create table public.community_posts (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.trainer_communities(id) on delete restrict,
  author_user_id uuid not null references public.app_users(id) on delete restrict,
  post_type text not null,
  body text,
  workout_execution_id uuid references public.workout_executions(id) on delete restrict,
  status text not null default 'PUBLISHED',
  pinned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint community_posts_type_check check (post_type in ('TEXT','PHOTO','WORKOUT_COMPLETION','TRAINER_ANNOUNCEMENT')),
  constraint community_posts_status_check check (status in ('PUBLISHED','HIDDEN','DELETED')),
  constraint community_posts_body_check check (body is null or char_length(trim(body)) between 1 and 2000),
  constraint community_posts_workout_shape_check check ((post_type = 'WORKOUT_COMPLETION') = (workout_execution_id is not null)),
  constraint community_posts_pin_check check (pinned_at is null or post_type = 'TRAINER_ANNOUNCEMENT'),
  constraint community_posts_delete_check check ((status = 'DELETED') = (deleted_at is not null))
);

create unique index community_posts_execution_author_active_idx
  on public.community_posts(workout_execution_id, author_user_id)
  where workout_execution_id is not null and status <> 'DELETED';
create unique index community_posts_one_pinned_announcement_idx
  on public.community_posts(community_id)
  where post_type = 'TRAINER_ANNOUNCEMENT' and pinned_at is not null and status = 'PUBLISHED';
create index community_posts_feed_idx on public.community_posts(community_id, created_at desc, id desc)
  where status = 'PUBLISHED';
create index community_posts_author_idx on public.community_posts(author_user_id, created_at desc);

create table public.community_post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete restrict,
  storage_path text not null unique,
  mime_type text not null,
  file_size integer not null,
  sort_order integer not null,
  created_at timestamptz not null default now(),
  constraint community_post_media_mime_check check (mime_type in ('image/jpeg','image/png','image/webp')),
  constraint community_post_media_size_check check (file_size between 1 and 8388608),
  constraint community_post_media_order_check check (sort_order between 0 and 3),
  constraint community_post_media_path_check check (storage_path !~ '(^|/)\.\.(/|$)' and char_length(storage_path) between 20 and 500),
  unique(post_id, sort_order)
);
create index community_post_media_post_idx on public.community_post_media(post_id, sort_order);

create table public.community_post_reactions (
  post_id uuid not null references public.community_posts(id) on delete restrict,
  user_id uuid not null references public.app_users(id) on delete restrict,
  reaction_type text not null default 'LIKE',
  created_at timestamptz not null default now(),
  primary key(post_id, user_id, reaction_type),
  constraint community_reaction_type_check check (reaction_type = 'LIKE')
);
create index community_post_reactions_user_idx on public.community_post_reactions(user_id, created_at desc);

create table public.community_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete restrict,
  author_user_id uuid not null references public.app_users(id) on delete restrict,
  body text not null,
  status text not null default 'PUBLISHED',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint community_comments_body_check check (char_length(trim(body)) between 1 and 1000),
  constraint community_comments_status_check check (status in ('PUBLISHED','HIDDEN','DELETED')),
  constraint community_comments_delete_check check ((status = 'DELETED') = (deleted_at is not null))
);
create index community_post_comments_post_idx on public.community_post_comments(post_id, created_at, id)
  where status = 'PUBLISHED';
create index community_post_comments_author_idx on public.community_post_comments(author_user_id, created_at desc);

create table public.community_content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid not null references public.app_users(id) on delete restrict,
  post_id uuid references public.community_posts(id) on delete restrict,
  comment_id uuid references public.community_post_comments(id) on delete restrict,
  reason_code text not null,
  details text,
  status text not null default 'OPEN',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint community_reports_target_check check ((post_id is not null)::integer + (comment_id is not null)::integer = 1),
  constraint community_reports_reason_check check (reason_code in ('SPAM','HARASSMENT','PRIVACY','INAPPROPRIATE','OTHER')),
  constraint community_reports_details_check check (details is null or char_length(trim(details)) between 1 and 1000),
  constraint community_reports_status_check check (status in ('OPEN','REVIEWED','DISMISSED','ACTIONED'))
);
create unique index community_reports_open_target_idx
  on public.community_content_reports(reporter_user_id, coalesce(post_id, '00000000-0000-0000-0000-000000000000'::uuid), coalesce(comment_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where status = 'OPEN';

alter table public.trainer_communities enable row level security;
alter table public.community_posts enable row level security;
alter table public.community_post_media enable row level security;
alter table public.community_post_reactions enable row level security;
alter table public.community_post_comments enable row level security;
alter table public.community_content_reports enable row level security;

create or replace function private.community_member_role(p_community_id uuid, p_user_id uuid default auth.uid())
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when exists (
      select 1 from public.trainer_communities community
      join public.trainer_profiles trainer on trainer.id = community.trainer_profile_id
      where community.id = p_community_id and community.status = 'ACTIVE'
        and trainer.user_id = p_user_id
        and private.trainer_has_full_access(trainer.user_id, now())
    ) then 'TRAINER'
    when exists (
      select 1 from public.trainer_communities community
      join public.trainer_profiles trainer on trainer.id = community.trainer_profile_id
      join public.trainer_student_relationships relationship
        on relationship.trainer_profile_id = trainer.id and relationship.status = 'active'
      join public.student_profiles student on student.id = relationship.student_profile_id
      where community.id = p_community_id and community.status = 'ACTIVE'
        and student.user_id = p_user_id
        and private.trainer_has_full_access(trainer.user_id, now())
    ) then 'STUDENT'
    else null
  end;
$$;

create or replace function private.can_access_community_path(p_community_id text, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_community_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    and exists (
      select 1 from public.trainer_communities community
      where community.id::text = p_community_id
        and private.community_member_role(community.id, p_user_id) is not null
    );
$$;

create policy "authorized members read communities" on public.trainer_communities
  for select to authenticated using (private.community_member_role(id) is not null);
create policy "authorized members read published posts" on public.community_posts
  for select to authenticated using (private.community_member_role(community_id) is not null and status = 'PUBLISHED');
create policy "authorized members read published media" on public.community_post_media
  for select to authenticated using (exists (
    select 1 from public.community_posts post
    where post.id = post_id and post.status = 'PUBLISHED' and private.community_member_role(post.community_id) is not null
  ));
create policy "authorized members read published reactions" on public.community_post_reactions
  for select to authenticated using (exists (
    select 1 from public.community_posts post
    where post.id = post_id and post.status = 'PUBLISHED' and private.community_member_role(post.community_id) is not null
  ));
create policy "authorized members read published comments" on public.community_post_comments
  for select to authenticated using (status = 'PUBLISHED' and exists (
    select 1 from public.community_posts post
    where post.id = post_id and post.status = 'PUBLISHED' and private.community_member_role(post.community_id) is not null
  ));

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('community-post-media','community-post-media',false,8388608,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "community members read private post media" on storage.objects
  for select to authenticated using (
    bucket_id = 'community-post-media'
    and private.can_access_community_path((storage.foldername(name))[1])
  );

create or replace function public.ensure_my_trainer_community()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  trainer public.trainer_profiles;
  community public.trainer_communities;
  first_name text;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  select * into trainer from public.trainer_profiles where user_id = (select auth.uid());
  if trainer.id is null or not private.trainer_has_full_access(trainer.user_id, now()) then
    raise exception 'community_entitlement_required';
  end if;
  first_name := split_part(trim(coalesce(nullif(trainer.preferred_name,''), trainer.display_name, 'Personal')), ' ', 1);
  insert into public.trainer_communities(trainer_profile_id, name)
  values (trainer.id, 'Clube ' || case when lower(first_name) ~ 'a$' then 'da ' else 'do ' end || first_name)
  on conflict(trainer_profile_id) do nothing;
  select * into community from public.trainer_communities where trainer_profile_id = trainer.id;
  return jsonb_build_object('id',community.id,'name',community.name,'role','TRAINER','trainer_name',coalesce(trainer.preferred_name,trainer.display_name),'trainer_image_url',trainer.profile_image_url);
end;
$$;

create or replace function public.get_my_communities()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(item order by (item->>'role') desc, item->>'name'), '[]'::jsonb)
  from (
    select jsonb_build_object(
      'id', community.id,
      'name', community.name,
      'role', private.community_member_role(community.id),
      'trainer_name', coalesce(trainer.preferred_name, trainer.display_name),
      'trainer_image_url', trainer.profile_image_url
    ) item
    from public.trainer_communities community
    join public.trainer_profiles trainer on trainer.id = community.trainer_profile_id
    where private.community_member_role(community.id) is not null
  ) allowed;
$$;

create or replace function public.list_my_community_posts(
  p_community_id uuid,
  p_filter text default 'ALL',
  p_limit integer default 20,
  p_before_created_at timestamptz default null,
  p_before_id uuid default null,
  p_only_post_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare result jsonb;
begin
  if private.community_member_role(p_community_id) is null then raise exception 'community_access_denied'; end if;
  if p_filter not in ('ALL','WORKOUTS','ANNOUNCEMENTS') then raise exception 'invalid_filter'; end if;
  if (p_before_created_at is null) <> (p_before_id is null) then raise exception 'invalid_cursor'; end if;
  select coalesce(jsonb_agg(post_json order by created_at desc, id desc),'[]'::jsonb) into result
  from (
    select post.id, post.created_at, jsonb_build_object(
      'id',post.id,'community_id',post.community_id,'post_type',post.post_type,'body',post.body,
      'status',post.status,'pinned_at',post.pinned_at,'created_at',post.created_at,'updated_at',post.updated_at,
      'author',jsonb_build_object(
        'user_id',post.author_user_id,
        'name',coalesce(student.preferred_name, trainer_author.preferred_name, trainer_author.display_name, author.display_name, 'Membro'),
        'image_url',coalesce(student.profile_image_path, trainer_author.profile_image_url),
        'role',case when trainer_author.id = community.trainer_profile_id then 'TRAINER' else 'STUDENT' end
      ),
      'media',coalesce((select jsonb_agg(jsonb_build_object('id',media.id,'storage_path',media.storage_path,'mime_type',media.mime_type,'sort_order',media.sort_order) order by media.sort_order) from public.community_post_media media where media.post_id=post.id),'[]'::jsonb),
      'workout',case when execution.id is null then null else jsonb_build_object(
        'execution_id',execution.id,'session_name',session.name,'completed_at',execution.completed_at,
        'duration_seconds',greatest(0,floor(extract(epoch from (execution.completed_at-execution.started_at)))::integer-execution.paused_seconds),
        'completed_exercises',(select count(*) from public.workout_exercise_executions x where x.workout_execution_id=execution.id and x.status='COMPLETED'),
        'completed_sets',(select count(*) from public.workout_set_executions x where x.workout_execution_id=execution.id and x.status='COMPLETED'),
        'can_open_detail',post.author_user_id=(select auth.uid()) or private.community_member_role(post.community_id)='TRAINER'
      ) end,
      'like_count',(select count(*) from public.community_post_reactions r where r.post_id=post.id and r.reaction_type='LIKE'),
      'liked_by_me',exists(select 1 from public.community_post_reactions r where r.post_id=post.id and r.user_id=(select auth.uid()) and r.reaction_type='LIKE'),
      'comments',coalesce((select jsonb_agg(jsonb_build_object(
        'id',comment.id,'body',comment.body,'created_at',comment.created_at,'author_user_id',comment.author_user_id,
        'author_name',coalesce(comment_student.preferred_name,comment_trainer.preferred_name,comment_trainer.display_name,comment_user.display_name,'Membro'),
        'author_image_url',coalesce(comment_student.profile_image_path,comment_trainer.profile_image_url),
        'can_delete',comment.author_user_id=(select auth.uid()),
        'can_moderate',private.community_member_role(post.community_id)='TRAINER'
      ) order by comment.created_at,comment.id)
        from public.community_post_comments comment
        join public.app_users comment_user on comment_user.id=comment.author_user_id
        left join public.student_profiles comment_student on comment_student.user_id=comment.author_user_id
        left join public.trainer_profiles comment_trainer on comment_trainer.user_id=comment.author_user_id
        where comment.post_id=post.id and comment.status='PUBLISHED'),'[]'::jsonb),
      'can_edit',post.author_user_id=(select auth.uid()),
      'can_moderate',private.community_member_role(post.community_id)='TRAINER'
    ) post_json
    from public.community_posts post
    join public.trainer_communities community on community.id=post.community_id
    join public.app_users author on author.id=post.author_user_id
    left join public.student_profiles student on student.user_id=post.author_user_id
    left join public.trainer_profiles trainer_author on trainer_author.user_id=post.author_user_id
    left join public.workout_executions execution on execution.id=post.workout_execution_id
    left join public.workout_sessions session on session.id=execution.workout_session_id
    where post.community_id=p_community_id and post.status='PUBLISHED' and (p_only_post_id is null or post.id=p_only_post_id)
      and (p_filter='ALL' or (p_filter='WORKOUTS' and post.post_type='WORKOUT_COMPLETION') or (p_filter='ANNOUNCEMENTS' and post.post_type='TRAINER_ANNOUNCEMENT'))
      and (p_before_created_at is null or (post.created_at,post.id)<(p_before_created_at,p_before_id))
    order by (post.pinned_at is not null) desc, post.created_at desc, post.id desc
    limit greatest(1,least(coalesce(p_limit,20),20))
  ) page;
  return result;
end;
$$;

create or replace function private.assert_community_rate(p_kind text, p_user_id uuid)
returns void language plpgsql stable security definer set search_path='' as $$
begin
  if p_kind='POST' and (select count(*) from public.community_posts where author_user_id=p_user_id and created_at>now()-interval '1 minute')>=6 then raise exception 'community_rate_limited'; end if;
  if p_kind='COMMENT' and (select count(*) from public.community_post_comments where author_user_id=p_user_id and created_at>now()-interval '1 minute')>=20 then raise exception 'community_rate_limited'; end if;
  if p_kind='REPORT' and (select count(*) from public.community_content_reports where reporter_user_id=p_user_id and created_at>now()-interval '1 hour')>=5 then raise exception 'community_rate_limited'; end if;
end;
$$;

create or replace function public.create_community_post(p_community_id uuid,p_post_type text,p_body text default null,p_workout_execution_id uuid default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=(select auth.uid()); actor_role text; created_id uuid; clean_body text:=nullif(trim(coalesce(p_body,'')),'');
begin
  if actor is null then raise exception 'authentication_required'; end if;
  actor_role:=private.community_member_role(p_community_id,actor);
  if actor_role is null then raise exception 'community_access_denied'; end if;
  perform private.assert_community_rate('POST',actor);
  if p_post_type not in ('TEXT','WORKOUT_COMPLETION','TRAINER_ANNOUNCEMENT') then raise exception 'unsupported_post_type'; end if;
  if p_post_type in ('TEXT','TRAINER_ANNOUNCEMENT') and clean_body is null then raise exception 'post_body_required'; end if;
  if clean_body is not null and char_length(clean_body)>2000 then raise exception 'post_body_too_long'; end if;
  if p_post_type='TRAINER_ANNOUNCEMENT' and actor_role<>'TRAINER' then raise exception 'trainer_only'; end if;
  if p_post_type='WORKOUT_COMPLETION' then
    if actor_role<>'STUDENT' or not exists(
      select 1 from public.workout_executions execution
      join public.student_profiles student on student.id=execution.student_profile_id
      join public.trainer_student_relationships relationship on relationship.id=execution.trainer_student_relationship_id
      join public.trainer_communities community on community.trainer_profile_id=relationship.trainer_profile_id
      where execution.id=p_workout_execution_id and execution.status='COMPLETED' and student.user_id=actor
        and relationship.status='active' and community.id=p_community_id
    ) then raise exception 'completed_workout_not_authorized'; end if;
  elsif p_workout_execution_id is not null then raise exception 'invalid_workout_reference'; end if;
  insert into public.community_posts(community_id,author_user_id,post_type,body,workout_execution_id)
  values(p_community_id,actor,p_post_type,clean_body,p_workout_execution_id)
  on conflict(workout_execution_id,author_user_id) where workout_execution_id is not null and status<>'DELETED'
  do update set body=coalesce(excluded.body,public.community_posts.body),updated_at=now()
  returning id into created_id;
  return created_id;
end; $$;

create or replace function public.update_my_community_post(p_post_id uuid,p_body text)
returns void language plpgsql security definer set search_path='' as $$
declare clean_body text:=nullif(trim(coalesce(p_body,'')),'');
begin
  if clean_body is null or char_length(clean_body)>2000 then raise exception 'invalid_post_body'; end if;
  update public.community_posts set body=clean_body,updated_at=now()
  where id=p_post_id and author_user_id=(select auth.uid()) and status='PUBLISHED';
  if not found then raise exception 'post_update_denied'; end if;
end; $$;

create or replace function public.delete_my_community_post(p_post_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  update public.community_posts set status='DELETED',deleted_at=now(),pinned_at=null,updated_at=now()
  where id=p_post_id and author_user_id=(select auth.uid()) and status<>'DELETED';
  if not found then raise exception 'post_delete_denied'; end if;
end; $$;

create or replace function public.set_community_post_like(p_post_id uuid,p_liked boolean)
returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=(select auth.uid()); target public.community_posts;
begin
  select * into target from public.community_posts where id=p_post_id and status='PUBLISHED';
  if actor is null or target.id is null or private.community_member_role(target.community_id,actor) is null then raise exception 'community_access_denied'; end if;
  if p_liked then insert into public.community_post_reactions(post_id,user_id) values(p_post_id,actor) on conflict do nothing;
  else delete from public.community_post_reactions where post_id=p_post_id and user_id=actor and reaction_type='LIKE'; end if;
end; $$;

create or replace function public.create_community_comment(p_post_id uuid,p_body text)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=(select auth.uid()); target public.community_posts; created_id uuid; clean_body text:=trim(coalesce(p_body,''));
begin
  select * into target from public.community_posts where id=p_post_id and status='PUBLISHED';
  if actor is null or target.id is null or private.community_member_role(target.community_id,actor) is null then raise exception 'community_access_denied'; end if;
  if char_length(clean_body) not between 1 and 1000 then raise exception 'invalid_comment_body'; end if;
  perform private.assert_community_rate('COMMENT',actor);
  insert into public.community_post_comments(post_id,author_user_id,body) values(p_post_id,actor,clean_body) returning id into created_id;
  return created_id;
end; $$;

create or replace function public.delete_my_community_comment(p_comment_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  update public.community_post_comments set status='DELETED',deleted_at=now(),updated_at=now()
  where id=p_comment_id and author_user_id=(select auth.uid()) and status<>'DELETED';
  if not found then raise exception 'comment_delete_denied'; end if;
end; $$;

create or replace function public.moderate_community_content(p_post_id uuid default null,p_comment_id uuid default null,p_hidden boolean default true)
returns void language plpgsql security definer set search_path='' as $$
declare community_id uuid;
begin
  if (p_post_id is not null)::integer+(p_comment_id is not null)::integer<>1 then raise exception 'invalid_moderation_target'; end if;
  if p_post_id is not null then select post.community_id into community_id from public.community_posts post where post.id=p_post_id;
  else select post.community_id into community_id from public.community_post_comments comment join public.community_posts post on post.id=comment.post_id where comment.id=p_comment_id; end if;
  if private.community_member_role(community_id)<>'TRAINER' then raise exception 'trainer_only'; end if;
  if p_post_id is not null then update public.community_posts set status=case when p_hidden then 'HIDDEN' else 'PUBLISHED' end,pinned_at=case when p_hidden then null else pinned_at end,updated_at=now() where id=p_post_id and status<>'DELETED';
  else update public.community_post_comments set status=case when p_hidden then 'HIDDEN' else 'PUBLISHED' end,updated_at=now() where id=p_comment_id and status<>'DELETED'; end if;
end; $$;

create or replace function public.set_community_announcement_pin(p_post_id uuid,p_pinned boolean)
returns void language plpgsql security definer set search_path='' as $$
declare target public.community_posts;
begin
  select * into target from public.community_posts where id=p_post_id and post_type='TRAINER_ANNOUNCEMENT' and status='PUBLISHED' for update;
  if target.id is null or private.community_member_role(target.community_id)<>'TRAINER' then raise exception 'trainer_only'; end if;
  if p_pinned then update public.community_posts set pinned_at=null,updated_at=now() where community_id=target.community_id and pinned_at is not null; end if;
  update public.community_posts set pinned_at=case when p_pinned then now() else null end,updated_at=now() where id=p_post_id;
end; $$;

create or replace function public.report_community_content(p_post_id uuid default null,p_comment_id uuid default null,p_reason_code text default 'OTHER',p_details text default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=(select auth.uid()); community_id uuid; result_id uuid;
begin
  if actor is null or (p_post_id is not null)::integer+(p_comment_id is not null)::integer<>1 then raise exception 'invalid_report_target'; end if;
  if p_post_id is not null then select post.community_id into community_id from public.community_posts post where post.id=p_post_id and post.status='PUBLISHED';
  else select post.community_id into community_id from public.community_post_comments comment join public.community_posts post on post.id=comment.post_id where comment.id=p_comment_id and comment.status='PUBLISHED' and post.status='PUBLISHED'; end if;
  if private.community_member_role(community_id,actor) is null then raise exception 'community_access_denied'; end if;
  if p_reason_code not in ('SPAM','HARASSMENT','PRIVACY','INAPPROPRIATE','OTHER') or char_length(coalesce(trim(p_details),''))>1000 then raise exception 'invalid_report'; end if;
  perform private.assert_community_rate('REPORT',actor);
  insert into public.community_content_reports(reporter_user_id,post_id,comment_id,reason_code,details)
  values(actor,p_post_id,p_comment_id,p_reason_code,nullif(trim(coalesce(p_details,'')),''))
  on conflict(reporter_user_id,(coalesce(post_id,'00000000-0000-0000-0000-000000000000'::uuid)),(coalesce(comment_id,'00000000-0000-0000-0000-000000000000'::uuid))) where status='OPEN'
  do update set details=coalesce(excluded.details,public.community_content_reports.details)
  returning id into result_id;
  return result_id;
end; $$;

create or replace function public.create_community_photo_post_as(p_actor_user_id uuid,p_community_id uuid,p_post_id uuid,p_body text,p_media jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare role text; clean_body text:=nullif(trim(coalesce(p_body,'')),''); item jsonb;
begin
  role:=private.community_member_role(p_community_id,p_actor_user_id);
  if role is null then raise exception 'community_access_denied'; end if;
  if jsonb_typeof(p_media)<>'array' or jsonb_array_length(p_media) not between 1 and 4 then raise exception 'invalid_media_count'; end if;
  if clean_body is not null and char_length(clean_body)>2000 then raise exception 'post_body_too_long'; end if;
  perform private.assert_community_rate('POST',p_actor_user_id);
  insert into public.community_posts(id,community_id,author_user_id,post_type,body) values(p_post_id,p_community_id,p_actor_user_id,'PHOTO',clean_body);
  for item in select value from jsonb_array_elements(p_media) loop
    if item->>'storage_path' not like p_community_id::text||'/'||p_actor_user_id::text||'/%' then raise exception 'invalid_media_path'; end if;
    insert into public.community_post_media(post_id,storage_path,mime_type,file_size,sort_order)
    values(p_post_id,item->>'storage_path',item->>'mime_type',(item->>'file_size')::integer,(item->>'sort_order')::integer);
  end loop;
  return p_post_id;
end; $$;

create or replace function private.enforce_access_grant_on_entitlements()
returns trigger language plpgsql security definer set search_path='' as $$
declare owner_user_id uuid;
begin
  select profile.user_id into owner_user_id from public.trainer_profiles profile where profile.id=new.trainer_id;
  if owner_user_id is not null and private.trainer_has_active_access_grant(owner_user_id,'FOUNDER_ACCESS',now()) then
    new.can_use_premium_templates:=true; new.can_use_template_01:=true; new.can_use_template_02:=true; new.can_use_template_03:=true; new.can_use_template_04:=true;
    new.can_publish_site:=true; new.can_receive_leads:=true; new.can_use_matching:=true; new.can_manage_students:=true; new.can_use_assessments:=true; new.can_use_workouts:=true; new.can_manage_progress:=true; new.can_use_community_feed:=true;
  end if;
  return new;
end; $$;

create or replace function private.refresh_trainer_entitlements(p_trainer_user_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare target_trainer_id uuid; full_access boolean;
begin
  select profile.id into target_trainer_id from public.trainer_profiles profile where profile.user_id=p_trainer_user_id;
  if target_trainer_id is null then return; end if;
  full_access:=private.trainer_has_full_access(p_trainer_user_id,now());
  insert into public.trainer_entitlements(trainer_id) values(target_trainer_id) on conflict(trainer_id) do nothing;
  update public.trainer_entitlements set can_build_site=true,can_preview_site=true,can_use_free_template=true,can_use_premium_templates=true,
    can_use_template_01=true,can_use_template_02=true,can_use_template_03=true,can_use_template_04=true,
    can_publish_site=full_access,can_receive_leads=full_access,can_use_matching=full_access,can_manage_students=full_access,
    can_use_assessments=full_access,can_use_workouts=full_access,can_manage_progress=full_access,can_use_community_feed=full_access,updated_at=now()
  where trainer_id=target_trainer_id;
end; $$;

create or replace function public.get_my_effective_entitlements()
returns jsonb language sql stable security definer set search_path='' as $$
  with me as (select profile.id trainer_id,profile.user_id,private.trainer_has_full_access(profile.user_id,now()) full_access from public.trainer_profiles profile where profile.user_id=(select auth.uid()))
  select to_jsonb(entitlement)||jsonb_build_object(
    'can_publish_site',me.full_access,'can_receive_leads',me.full_access,'can_use_matching',me.full_access,
    'can_manage_students',me.full_access,'can_use_assessments',me.full_access,'can_use_workouts',me.full_access,
    'can_manage_progress',me.full_access,'can_use_community_feed',me.full_access,
    'access_source',case when private.trainer_has_active_billing(me.user_id,now()) then 'BILLING' when private.trainer_has_active_access_grant(me.user_id,'FOUNDER_ACCESS',now()) then 'FOUNDER_ACCESS' else 'FREE' end)
  from me join public.trainer_entitlements entitlement on entitlement.trainer_id=me.trainer_id;
$$;

revoke all on public.trainer_communities,public.community_posts,public.community_post_media,public.community_post_reactions,public.community_post_comments,public.community_content_reports from public,anon,authenticated;
grant select on public.trainer_communities,public.community_posts,public.community_post_media,public.community_post_reactions,public.community_post_comments to authenticated;

revoke all on function private.community_member_role(uuid,uuid),private.can_access_community_path(text,uuid),private.assert_community_rate(text,uuid) from public,anon,authenticated;
grant execute on function private.community_member_role(uuid,uuid),private.can_access_community_path(text,uuid) to authenticated;
revoke all on function public.ensure_my_trainer_community(),public.get_my_communities(),public.list_my_community_posts(uuid,text,integer,timestamptz,uuid,uuid),public.create_community_post(uuid,text,text,uuid),public.update_my_community_post(uuid,text),public.delete_my_community_post(uuid),public.set_community_post_like(uuid,boolean),public.create_community_comment(uuid,text),public.delete_my_community_comment(uuid),public.moderate_community_content(uuid,uuid,boolean),public.set_community_announcement_pin(uuid,boolean),public.report_community_content(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.ensure_my_trainer_community(),public.get_my_communities(),public.list_my_community_posts(uuid,text,integer,timestamptz,uuid,uuid),public.create_community_post(uuid,text,text,uuid),public.update_my_community_post(uuid,text),public.delete_my_community_post(uuid),public.set_community_post_like(uuid,boolean),public.create_community_comment(uuid,text),public.delete_my_community_comment(uuid),public.moderate_community_content(uuid,uuid,boolean),public.set_community_announcement_pin(uuid,boolean),public.report_community_content(uuid,uuid,text,text) to authenticated;
revoke all on function public.create_community_photo_post_as(uuid,uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.create_community_photo_post_as(uuid,uuid,uuid,text,jsonb) to service_role;

revoke all on function private.enforce_access_grant_on_entitlements(),private.refresh_trainer_entitlements(uuid) from public,anon,authenticated;
revoke all on function public.get_my_effective_entitlements() from public,anon;
grant execute on function public.get_my_effective_entitlements() to authenticated;

update public.trainer_entitlements entitlement set can_use_community_feed=private.trainer_has_full_access(profile.user_id,now())
from public.trainer_profiles profile where profile.id=entitlement.trainer_id;

do $community_security_gate$
declare table_name text;
begin
  foreach table_name in array array['trainer_communities','community_posts','community_post_media','community_post_reactions','community_post_comments','community_content_reports'] loop
    if not (select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=table_name) then raise exception 'community_rls_missing:%',table_name; end if;
    if has_table_privilege('anon','public.'||table_name,'SELECT,INSERT,UPDATE,DELETE') or has_table_privilege('authenticated','public.'||table_name,'INSERT,UPDATE,DELETE') then raise exception 'unsafe_community_table_grant:%',table_name; end if;
  end loop;
  if (select public from storage.buckets where id='community-post-media') then raise exception 'community_media_bucket_public'; end if;
  if has_function_privilege('anon','public.get_my_communities()','EXECUTE') or has_function_privilege('authenticated','public.create_community_photo_post_as(uuid,uuid,uuid,text,jsonb)','EXECUTE') then raise exception 'unsafe_community_function_grant'; end if;
end;
$community_security_gate$;
