-- Cheipi Community Social V1: group memberships, discovery, aggregate feed,
-- ranking, moderation and notification foundation.
-- Product decisions: D01=A D02=A D03=A D04=A D05=A D07=member-only posts
-- D08=A D09=A D10=current can_use_community_feed entitlement.

alter table public.trainer_communities
  add column description text,
  add column avatar_path text,
  add column cover_path text,
  add column visibility text not null default 'DISCOVERABLE',
  add column join_policy text not null default 'APPROVAL',
  add column posting_policy text not null default 'OWNER_MODERATORS_ONLY',
  add column timezone text not null default 'America/Sao_Paulo',
  add column ranking_enabled boolean not null default true,
  add column is_default boolean not null default false,
  add column client_mutation_id uuid,
  add column archived_at timestamptz,
  add constraint trainer_communities_description_check check (description is null or char_length(trim(description)) between 1 and 500),
  add constraint trainer_communities_visibility_check check (visibility in ('DISCOVERABLE','PRIVATE')),
  add constraint trainer_communities_join_policy_check check (join_policy in ('OPEN','APPROVAL','INVITE_ONLY')),
  add constraint trainer_communities_posting_policy_check check (posting_policy in ('OWNER_MODERATORS_ONLY','ALL_MEMBERS')),
  add constraint trainer_communities_visibility_join_check check (
    (visibility='DISCOVERABLE' and join_policy in ('OPEN','APPROVAL'))
    or (visibility='PRIVATE' and join_policy='INVITE_ONLY')
  );

alter table public.trainer_communities drop constraint trainer_communities_trainer_profile_id_key;
update public.trainer_communities set is_default=true,archived_at=case when status='DISABLED' then coalesce(archived_at,updated_at) else null end;
alter table public.trainer_communities add constraint trainer_communities_archive_check check (
  (status='ACTIVE' and archived_at is null) or (status='DISABLED' and archived_at is not null)
);
create unique index trainer_communities_one_default_idx
  on public.trainer_communities(trainer_profile_id) where is_default and archived_at is null;
create unique index trainer_communities_owner_mutation_idx
  on public.trainer_communities(trainer_profile_id,client_mutation_id) where client_mutation_id is not null;
create index trainer_communities_discovery_idx
  on public.trainer_communities(visibility,status,created_at desc,id)
  where archived_at is null;
create index trainer_communities_owner_idx
  on public.trainer_communities(trainer_profile_id,status,created_at desc);

create table public.community_group_memberships (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.trainer_communities(id) on delete restrict,
  app_user_id uuid not null references public.app_users(id) on delete restrict,
  role text not null default 'MEMBER',
  status text not null default 'PENDING',
  origin text not null,
  source_relationship_id uuid references public.trainer_student_relationships(id) on delete set null,
  joined_at timestamptz,
  left_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(group_id,app_user_id),
  constraint community_membership_role_check check (role in ('OWNER','MODERATOR','MEMBER')),
  constraint community_membership_status_check check (status in ('PENDING','INVITED','ACTIVE','REMOVED','REVOKED','LEFT')),
  constraint community_membership_origin_check check (origin in ('OWNER','RELATIONSHIP','DIRECT','JOIN_REQUEST','INVITE')),
  constraint community_membership_owner_check check ((role='OWNER')=(origin='OWNER')),
  constraint community_membership_lifecycle_check check (
    (status='ACTIVE' and joined_at is not null and left_at is null and revoked_at is null)
    or (status in ('PENDING','INVITED') and joined_at is null and left_at is null and revoked_at is null)
    or (status='LEFT' and left_at is not null and revoked_at is null)
    or (status in ('REMOVED','REVOKED') and revoked_at is not null)
  )
);
create index community_memberships_actor_idx on public.community_group_memberships(app_user_id,status,group_id);
create index community_memberships_group_idx on public.community_group_memberships(group_id,status,role,joined_at);
create index community_memberships_relationship_idx on public.community_group_memberships(source_relationship_id)
  where source_relationship_id is not null;

create table public.community_group_rules (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.trainer_communities(id) on delete restrict,
  body text not null,
  sort_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(group_id,sort_order),
  constraint community_group_rules_body_check check (char_length(trim(body)) between 1 and 500),
  constraint community_group_rules_order_check check (sort_order between 0 and 49)
);
create index community_group_rules_group_idx on public.community_group_rules(group_id,sort_order);

create table public.community_moderation_events (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.trainer_communities(id) on delete restrict,
  actor_user_id uuid not null references public.app_users(id) on delete restrict,
  report_id uuid references public.community_content_reports(id) on delete restrict,
  post_id uuid references public.community_posts(id) on delete restrict,
  comment_id uuid references public.community_post_comments(id) on delete restrict,
  action text not null,
  details text,
  created_at timestamptz not null default now(),
  constraint community_moderation_target_check check (
    (report_id is not null)::integer+(post_id is not null)::integer+(comment_id is not null)::integer between 1 and 2
  ),
  constraint community_moderation_action_check check (action in ('REPORT_REVIEWED','REPORT_DISMISSED','CONTENT_HIDDEN','CONTENT_RESTORED','MEMBER_REMOVED','ROLE_CHANGED')),
  constraint community_moderation_details_check check (details is null or char_length(trim(details)) between 1 and 1000)
);
create index community_moderation_events_group_idx on public.community_moderation_events(group_id,created_at desc,id desc);
create index community_moderation_events_report_idx on public.community_moderation_events(report_id) where report_id is not null;

create table public.community_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references public.app_users(id) on delete cascade,
  actor_user_id uuid references public.app_users(id) on delete set null,
  group_id uuid not null references public.trainer_communities(id) on delete restrict,
  post_id uuid references public.community_posts(id) on delete restrict,
  notification_type text not null,
  dedupe_key text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique(recipient_user_id,dedupe_key),
  constraint community_notification_type_check check (notification_type in ('GROUP_INVITE','JOIN_REQUEST_APPROVED','JOIN_REQUEST_REJECTED','COMMENT_ON_MY_POST','REACTION_ON_MY_POST','PINNED_ANNOUNCEMENT')),
  constraint community_notification_dedupe_check check (char_length(dedupe_key) between 8 and 240)
);
create index community_notifications_recipient_idx on public.community_notifications(recipient_user_id,read_at,created_at desc,id desc);

alter table public.community_posts
  add column published_at timestamptz,
  add column client_mutation_id uuid;
update public.community_posts set published_at=created_at where status='PUBLISHED';
alter table public.community_posts
  alter column published_at set default now(),
  add constraint community_posts_publication_check check (status<>'PUBLISHED' or published_at is not null);
create unique index community_posts_author_mutation_idx on public.community_posts(author_user_id,client_mutation_id)
  where client_mutation_id is not null;
drop index community_posts_feed_idx;
create index community_posts_group_feed_v1_idx on public.community_posts(community_id,published_at desc,id desc)
  where status='PUBLISHED';

alter table public.community_post_comments add column client_mutation_id uuid;
create unique index community_comments_author_mutation_idx on public.community_post_comments(author_user_id,client_mutation_id)
  where client_mutation_id is not null;

alter table public.community_post_reactions add column client_mutation_id uuid;
create index community_reactions_post_count_idx on public.community_post_reactions(post_id,reaction_type);

alter table public.community_post_media
  add column width integer,
  add column height integer,
  add constraint community_media_width_check check (width is null or width between 1 and 4096),
  add constraint community_media_height_check check (height is null or height between 1 and 4096);

alter table public.community_content_reports add column resolved_by_user_id uuid references public.app_users(id) on delete restrict;
create index community_reports_group_queue_idx on public.community_content_reports(status,created_at,id) where status='OPEN';

alter table public.community_group_memberships enable row level security;
alter table public.community_group_rules enable row level security;
alter table public.community_moderation_events enable row level security;
alter table public.community_notifications enable row level security;

create trigger touch_community_membership_updated_at before update on public.community_group_memberships
for each row execute function private.touch_updated_at();
create trigger touch_community_group_rules_updated_at before update on public.community_group_rules
for each row execute function private.touch_updated_at();

create or replace function private.community_entitlement_allowed(p_group_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(
    select 1 from public.trainer_communities community
    join public.trainer_profiles trainer on trainer.id=community.trainer_profile_id
    where community.id=p_group_id and community.status='ACTIVE' and community.archived_at is null
      and private.trainer_has_full_access(trainer.user_id,now())
  );
$$;

create or replace function private.community_group_role(p_group_id uuid,p_user_id uuid default auth.uid())
returns text language sql stable security definer set search_path='' as $$
  select membership.role
  from public.community_group_memberships membership
  where membership.group_id=p_group_id and membership.app_user_id=p_user_id
    and membership.status='ACTIVE' and private.community_entitlement_allowed(p_group_id)
  limit 1;
$$;

create or replace function private.community_can_post(p_group_id uuid,p_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path='' as $$
  select exists(
    select 1 from public.trainer_communities community
    join public.community_group_memberships membership on membership.group_id=community.id
    where community.id=p_group_id and membership.app_user_id=p_user_id and membership.status='ACTIVE'
      and private.community_entitlement_allowed(community.id)
      and (membership.role in ('OWNER','MODERATOR') or community.posting_policy='ALL_MEMBERS')
  );
$$;

create or replace function private.community_is_manager(p_group_id uuid,p_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path='' as $$
  select coalesce(private.community_group_role(p_group_id,p_user_id) in ('OWNER','MODERATOR'),false);
$$;

create or replace function private.community_member_role(p_community_id uuid,p_user_id uuid default auth.uid())
returns text language sql stable security definer set search_path='' as $$
  select case
    when private.community_group_role(p_community_id,p_user_id) in ('OWNER','MODERATOR') then 'TRAINER'
    when private.community_group_role(p_community_id,p_user_id)='MEMBER' then 'STUDENT'
    else null end;
$$;

create or replace function private.can_access_community_path(p_community_id text,p_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path='' as $$
  select p_community_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    and private.community_group_role(p_community_id::uuid,p_user_id) is not null;
$$;

insert into public.community_group_memberships(group_id,app_user_id,role,status,origin,joined_at)
select community.id,trainer.user_id,'OWNER','ACTIVE','OWNER',community.created_at
from public.trainer_communities community
join public.trainer_profiles trainer on trainer.id=community.trainer_profile_id
on conflict(group_id,app_user_id) do update set role='OWNER',status='ACTIVE',origin='OWNER',joined_at=coalesce(public.community_group_memberships.joined_at,excluded.joined_at),left_at=null,revoked_at=null;

insert into public.community_group_memberships(group_id,app_user_id,role,status,origin,source_relationship_id,joined_at)
select community.id,student.user_id,'MEMBER','ACTIVE','RELATIONSHIP',relationship.id,relationship.started_at
from public.trainer_communities community
join public.trainer_student_relationships relationship on relationship.trainer_profile_id=community.trainer_profile_id and relationship.status='active'
join public.student_profiles student on student.id=relationship.student_profile_id
where community.is_default and community.archived_at is null
on conflict(group_id,app_user_id) do nothing;

create or replace function private.sync_relationship_community_membership()
returns trigger language plpgsql security definer set search_path='' as $$
declare student_user_id uuid;
begin
  select student.user_id into student_user_id from public.student_profiles student where student.id=new.student_profile_id;
  if new.status='active' then
    insert into public.community_group_memberships(group_id,app_user_id,role,status,origin,source_relationship_id,joined_at)
    select community.id,student_user_id,'MEMBER','ACTIVE','RELATIONSHIP',new.id,new.started_at
    from public.trainer_communities community
    where community.trainer_profile_id=new.trainer_profile_id and community.is_default and community.archived_at is null
    on conflict(group_id,app_user_id) do update set
      status=case when public.community_group_memberships.origin='RELATIONSHIP' then 'ACTIVE' else public.community_group_memberships.status end,
      joined_at=case when public.community_group_memberships.origin='RELATIONSHIP' then coalesce(public.community_group_memberships.joined_at,excluded.joined_at) else public.community_group_memberships.joined_at end,
      source_relationship_id=case when public.community_group_memberships.origin='RELATIONSHIP' then excluded.source_relationship_id else public.community_group_memberships.source_relationship_id end,
      revoked_at=case when public.community_group_memberships.origin='RELATIONSHIP' then null else public.community_group_memberships.revoked_at end;
  else
    update public.community_group_memberships set status='REVOKED',revoked_at=now(),updated_at=now()
    where source_relationship_id=new.id and origin='RELATIONSHIP' and status='ACTIVE';
  end if;
  return new;
end;
$$;
create trigger sync_relationship_community_membership
after insert or update of status on public.trainer_student_relationships
for each row execute function private.sync_relationship_community_membership();

drop policy "authorized members read communities" on public.trainer_communities;
drop policy "authorized members read published posts" on public.community_posts;
drop policy "authorized members read published media" on public.community_post_media;
drop policy "authorized members read published reactions" on public.community_post_reactions;
drop policy "authorized members read published comments" on public.community_post_comments;
drop policy "community members read private post media" on storage.objects;

create policy "members or discovery read group metadata" on public.trainer_communities
for select to authenticated using (
  private.community_group_role(id) is not null
  or (visibility='DISCOVERABLE' and status='ACTIVE' and archived_at is null and private.community_entitlement_allowed(id))
);
create policy "active members read published posts" on public.community_posts
for select to authenticated using (status='PUBLISHED' and private.community_group_role(community_id) is not null);
create policy "active members read published media" on public.community_post_media
for select to authenticated using (exists(
  select 1 from public.community_posts post where post.id=post_id and post.status='PUBLISHED' and private.community_group_role(post.community_id) is not null
));
create policy "active members read reactions" on public.community_post_reactions
for select to authenticated using (exists(
  select 1 from public.community_posts post where post.id=post_id and post.status='PUBLISHED' and private.community_group_role(post.community_id) is not null
));
create policy "active members read comments" on public.community_post_comments
for select to authenticated using (status='PUBLISHED' and exists(
  select 1 from public.community_posts post where post.id=post_id and post.status='PUBLISHED' and private.community_group_role(post.community_id) is not null
));
create policy "members read memberships in their groups" on public.community_group_memberships
for select to authenticated using (
  app_user_id=(select auth.uid()) or private.community_group_role(group_id) is not null or private.community_is_manager(group_id)
);
create policy "members read group rules" on public.community_group_rules
for select to authenticated using (private.community_group_role(group_id) is not null);
create policy "managers read moderation events" on public.community_moderation_events
for select to authenticated using (private.community_is_manager(group_id));
create policy "users read own community notifications" on public.community_notifications
for select to authenticated using (recipient_user_id=(select auth.uid()));
create policy "active members read private community media" on storage.objects
for select to authenticated using (
  bucket_id='community-post-media' and private.can_access_community_path((storage.foldername(name))[1])
);
create policy "authorized members upload scoped community media" on storage.objects
for insert to authenticated with check (
  bucket_id='community-post-media'
  and (storage.foldername(name))[2]=(select auth.uid())::text
  and private.community_can_post((storage.foldername(name))[1]::uuid)
);
create policy "authors or managers delete community media" on storage.objects
for delete to authenticated using (
  bucket_id='community-post-media' and (
    (storage.foldername(name))[2]=(select auth.uid())::text
    or private.community_is_manager((storage.foldername(name))[1]::uuid)
  )
);

create or replace function private.community_group_json(p_group public.trainer_communities,p_user_id uuid default auth.uid())
returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object(
    'id',p_group.id,'name',p_group.name,'description',p_group.description,
    'avatar_path',p_group.avatar_path,'cover_path',p_group.cover_path,
    'visibility',p_group.visibility,'join_policy',p_group.join_policy,'posting_policy',p_group.posting_policy,
    'timezone',p_group.timezone,'ranking_enabled',p_group.ranking_enabled,'is_default',p_group.is_default,
    'membership_role',membership.role,'membership_status',membership.status,
    'can_post',private.community_can_post(p_group.id,p_user_id),
    'can_manage',private.community_is_manager(p_group.id,p_user_id),
    'member_count',(select count(*) from public.community_group_memberships count_member where count_member.group_id=p_group.id and count_member.status='ACTIVE'),
    'owner',jsonb_build_object('user_id',trainer.user_id,'name',coalesce(trainer.preferred_name,trainer.display_name),'image_url',trainer.profile_image_url)
  )
  from public.trainer_profiles trainer
  left join public.community_group_memberships membership on membership.group_id=p_group.id and membership.app_user_id=p_user_id
  where trainer.id=p_group.trainer_profile_id;
$$;

create or replace function public.ensure_my_trainer_community()
returns jsonb language plpgsql security definer set search_path='' as $$
declare trainer public.trainer_profiles; community public.trainer_communities; first_name text;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  select * into trainer from public.trainer_profiles where user_id=(select auth.uid());
  if trainer.id is null or not private.trainer_has_full_access(trainer.user_id,now()) then raise exception 'community_entitlement_required'; end if;
  first_name:=split_part(trim(coalesce(nullif(trainer.preferred_name,''),trainer.display_name,'Personal')),' ',1);
  insert into public.trainer_communities(trainer_profile_id,name,is_default)
  values(trainer.id,'Clube '||case when lower(first_name)~'a$' then 'da ' else 'do ' end||first_name,true)
  on conflict(trainer_profile_id) where is_default and archived_at is null do nothing;
  select * into community from public.trainer_communities where trainer_profile_id=trainer.id and is_default and archived_at is null;
  insert into public.community_group_memberships(group_id,app_user_id,role,status,origin,joined_at)
  values(community.id,trainer.user_id,'OWNER','ACTIVE','OWNER',coalesce(community.created_at,now()))
  on conflict(group_id,app_user_id) do update set role='OWNER',status='ACTIVE',origin='OWNER',joined_at=coalesce(public.community_group_memberships.joined_at,excluded.joined_at),left_at=null,revoked_at=null;
  insert into public.community_group_memberships(group_id,app_user_id,role,status,origin,source_relationship_id,joined_at)
  select community.id,student.user_id,'MEMBER','ACTIVE','RELATIONSHIP',relationship.id,relationship.started_at
  from public.trainer_student_relationships relationship
  join public.student_profiles student on student.id=relationship.student_profile_id
  where relationship.trainer_profile_id=trainer.id and relationship.status='active'
  on conflict(group_id,app_user_id) do update set
    status=case when public.community_group_memberships.origin='RELATIONSHIP' then 'ACTIVE' else public.community_group_memberships.status end,
    source_relationship_id=case when public.community_group_memberships.origin='RELATIONSHIP' then excluded.source_relationship_id else public.community_group_memberships.source_relationship_id end,
    joined_at=case when public.community_group_memberships.origin='RELATIONSHIP' then coalesce(public.community_group_memberships.joined_at,excluded.joined_at) else public.community_group_memberships.joined_at end,
    left_at=case when public.community_group_memberships.origin='RELATIONSHIP' then null else public.community_group_memberships.left_at end,
    revoked_at=case when public.community_group_memberships.origin='RELATIONSHIP' then null else public.community_group_memberships.revoked_at end;
  return private.community_group_json(community,trainer.user_id)||jsonb_build_object('role','TRAINER','trainer_name',coalesce(trainer.preferred_name,trainer.display_name),'trainer_image_url',trainer.profile_image_url);
end;
$$;

create or replace function public.list_my_community_groups()
returns jsonb language sql stable security definer set search_path='' as $$
  select coalesce(jsonb_agg(private.community_group_json(community) order by membership.joined_at desc,community.id),'[]'::jsonb)
  from public.community_group_memberships membership
  join public.trainer_communities community on community.id=membership.group_id
  where membership.app_user_id=(select auth.uid()) and membership.status='ACTIVE' and private.community_entitlement_allowed(community.id);
$$;

create or replace function public.search_community_groups(p_query text default '',p_limit integer default 20)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare clean_query text:=lower(trim(coalesce(p_query,''))); result jsonb;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  if char_length(clean_query)>100 then raise exception 'invalid_search'; end if;
  select coalesce(jsonb_agg(private.community_group_json(candidate) order by candidate.created_at desc,candidate.id),'[]'::jsonb) into result
  from (
    select community.* from public.trainer_communities community
    join public.trainer_profiles trainer on trainer.id=community.trainer_profile_id
    where community.visibility='DISCOVERABLE' and community.status='ACTIVE' and community.archived_at is null
      and private.community_entitlement_allowed(community.id)
      and (clean_query='' or lower(community.name) like '%'||clean_query||'%' or lower(coalesce(community.description,'')) like '%'||clean_query||'%' or lower(coalesce(trainer.preferred_name,trainer.display_name,'')) like '%'||clean_query||'%')
    order by community.created_at desc,community.id
    limit greatest(1,least(coalesce(p_limit,20),40))
  ) candidate;
  return result;
end;
$$;

create or replace function public.get_community_group(p_group_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare target public.trainer_communities;
begin
  select * into target from public.trainer_communities where id=p_group_id and status='ACTIVE' and archived_at is null;
  if target.id is null or (private.community_group_role(target.id) is null and target.visibility<>'DISCOVERABLE') then raise exception 'group_not_available'; end if;
  return private.community_group_json(target);
end;
$$;

create or replace function public.list_community_group_members(p_group_id uuid,p_limit integer default 50)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
  if private.community_group_role(p_group_id) is null then raise exception 'community_access_denied'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'user_id',member.app_user_id,'role',member.role,'status',member.status,'origin',member.origin,'joined_at',member.joined_at,
    'name',member.member_name,'image_url',member.image_url
  ) order by member.role_order,member.joined_at,member.app_user_id),'[]'::jsonb) into result
  from (
    select membership.app_user_id,membership.role,membership.status,membership.origin,membership.joined_at,
      case membership.role when 'OWNER' then 0 when 'MODERATOR' then 1 else 2 end role_order,
      coalesce(student.preferred_name,trainer.preferred_name,trainer.display_name,app_user.display_name,'Membro') member_name,
      coalesce(student.profile_image_path,trainer.profile_image_url) image_url
    from public.community_group_memberships membership
    join public.app_users app_user on app_user.id=membership.app_user_id
    left join public.student_profiles student on student.user_id=membership.app_user_id
    left join public.trainer_profiles trainer on trainer.user_id=membership.app_user_id
    where membership.group_id=p_group_id and (membership.status='ACTIVE' or private.community_is_manager(p_group_id))
    order by role_order,membership.joined_at,membership.app_user_id
    limit greatest(1,least(coalesce(p_limit,50),100))
  ) member;
  return result;
end;
$$;

create or replace function public.list_community_invitable_members(p_group_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
  if not private.community_is_manager(p_group_id) then raise exception 'manager_only'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'user_id',student.user_id,'name',coalesce(student.preferred_name,app_user.display_name,'Aluno'),
    'image_url',student.profile_image_path
  ) order by coalesce(student.preferred_name,app_user.display_name,'Aluno'),student.user_id),'[]'::jsonb) into result
  from public.trainer_communities community
  join public.trainer_student_relationships relationship on relationship.trainer_profile_id=community.trainer_profile_id and relationship.status='active'
  join public.student_profiles student on student.id=relationship.student_profile_id
  join public.app_users app_user on app_user.id=student.user_id
  where community.id=p_group_id and not exists(
    select 1 from public.community_group_memberships membership
    where membership.group_id=community.id and membership.app_user_id=student.user_id and membership.status in ('ACTIVE','INVITED','PENDING')
  );
  return result;
end;
$$;

create or replace function private.community_post_json(p_post public.community_posts,p_comment_limit integer default 2)
returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object(
    'id',p_post.id,'community_id',p_post.community_id,'post_type',p_post.post_type,'body',p_post.body,
    'pinned_at',p_post.pinned_at,'published_at',p_post.published_at,'created_at',p_post.created_at,'updated_at',p_post.updated_at,
    'group',jsonb_build_object('id',community.id,'name',community.name,'avatar_path',community.avatar_path),
    'author',jsonb_build_object(
      'user_id',p_post.author_user_id,'name',coalesce(student.preferred_name,trainer.preferred_name,trainer.display_name,author.display_name,'Membro'),
      'image_url',coalesce(student.profile_image_path,trainer.profile_image_url),
      'product_role',case when exists(select 1 from public.user_roles role where role.user_id=p_post.author_user_id and role.role_code='trainer' and role.revoked_at is null) then 'TRAINER' else 'STUDENT' end
    ),
    'media',coalesce((select jsonb_agg(jsonb_build_object('id',media.id,'storage_path',media.storage_path,'mime_type',media.mime_type,'sort_order',media.sort_order,'width',media.width,'height',media.height) order by media.sort_order) from public.community_post_media media where media.post_id=p_post.id),'[]'::jsonb),
    'workout',case when execution.id is null then null else jsonb_build_object(
      'execution_id',execution.id,'session_name',session.name,'completed_at',execution.completed_at,
      'duration_seconds',greatest(0,floor(extract(epoch from (execution.completed_at-execution.started_at)))::integer-execution.paused_seconds),
      'completed_exercises',(select count(*) from public.workout_exercise_executions x where x.workout_execution_id=execution.id and x.status='COMPLETED'),
      'completed_sets',(select count(*) from public.workout_set_executions x where x.workout_execution_id=execution.id and x.status='COMPLETED'),
      'can_open_detail',p_post.author_user_id=(select auth.uid()) or private.community_is_manager(p_post.community_id)
    ) end,
    'like_count',(select count(*) from public.community_post_reactions reaction where reaction.post_id=p_post.id and reaction.reaction_type='LIKE'),
    'liked_by_me',exists(select 1 from public.community_post_reactions reaction where reaction.post_id=p_post.id and reaction.user_id=(select auth.uid()) and reaction.reaction_type='LIKE'),
    'comment_count',(select count(*) from public.community_post_comments comment where comment.post_id=p_post.id and comment.status='PUBLISHED'),
    'comments',coalesce((select jsonb_agg(item order by item->>'created_at',item->>'id') from (
      select jsonb_build_object('id',comment.id,'body',comment.body,'created_at',comment.created_at,'author_user_id',comment.author_user_id,
        'author_name',coalesce(comment_student.preferred_name,comment_trainer.preferred_name,comment_trainer.display_name,comment_user.display_name,'Membro'),
        'author_image_url',coalesce(comment_student.profile_image_path,comment_trainer.profile_image_url),
        'can_delete',comment.author_user_id=(select auth.uid()),'can_moderate',private.community_is_manager(p_post.community_id)) item
      from public.community_post_comments comment
      join public.app_users comment_user on comment_user.id=comment.author_user_id
      left join public.student_profiles comment_student on comment_student.user_id=comment.author_user_id
      left join public.trainer_profiles comment_trainer on comment_trainer.user_id=comment.author_user_id
      where comment.post_id=p_post.id and comment.status='PUBLISHED'
      order by comment.created_at desc,comment.id desc limit greatest(0,least(p_comment_limit,50))
    ) preview),'[]'::jsonb),
    'can_edit',p_post.author_user_id=(select auth.uid()),'can_moderate',private.community_is_manager(p_post.community_id)
  )
  from public.trainer_communities community
  join public.app_users author on author.id=p_post.author_user_id
  left join public.student_profiles student on student.user_id=p_post.author_user_id
  left join public.trainer_profiles trainer on trainer.user_id=p_post.author_user_id
  left join public.workout_executions execution on execution.id=p_post.workout_execution_id
  left join public.workout_sessions session on session.id=execution.workout_session_id
  where community.id=p_post.community_id;
$$;

create or replace function public.list_my_community_feed(p_limit integer default 15,p_before_published_at timestamptz default null,p_before_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  if (p_before_published_at is null)<>(p_before_id is null) then raise exception 'invalid_cursor'; end if;
  select coalesce(jsonb_agg(private.community_post_json(page,2) order by page.published_at desc,page.id desc),'[]'::jsonb) into result
  from (
    select post.* from public.community_posts post
    join public.community_group_memberships membership on membership.group_id=post.community_id
    where membership.app_user_id=(select auth.uid()) and membership.status='ACTIVE'
      and post.status='PUBLISHED' and private.community_entitlement_allowed(post.community_id)
      and (p_before_published_at is null or (post.published_at,post.id)<(p_before_published_at,p_before_id))
    order by post.published_at desc,post.id desc
    limit greatest(1,least(coalesce(p_limit,15),30))
  ) page;
  return result;
end;
$$;

create or replace function public.list_community_group_posts(p_group_id uuid,p_limit integer default 15,p_before_published_at timestamptz default null,p_before_id uuid default null,p_only_post_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
  if private.community_group_role(p_group_id) is null then raise exception 'community_access_denied'; end if;
  if (p_before_published_at is null)<>(p_before_id is null) then raise exception 'invalid_cursor'; end if;
  select coalesce(jsonb_agg(private.community_post_json(page,case when p_only_post_id is null then 2 else 50 end) order by (page.pinned_at is not null) desc,page.published_at desc,page.id desc),'[]'::jsonb) into result
  from (
    select post.* from public.community_posts post
    where post.community_id=p_group_id and post.status='PUBLISHED' and (p_only_post_id is null or post.id=p_only_post_id)
      and (p_before_published_at is null or (post.published_at,post.id)<(p_before_published_at,p_before_id))
    order by (post.pinned_at is not null) desc,post.published_at desc,post.id desc
    limit greatest(1,least(coalesce(p_limit,15),30))
  ) page;
  return result;
end;
$$;

create or replace function public.list_community_post_comments(p_post_id uuid,p_limit integer default 30,p_before_created_at timestamptz default null,p_before_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare target public.community_posts; result jsonb;
begin
  select * into target from public.community_posts where id=p_post_id and status='PUBLISHED';
  if target.id is null or private.community_group_role(target.community_id) is null then raise exception 'community_access_denied'; end if;
  if (p_before_created_at is null)<>(p_before_id is null) then raise exception 'invalid_cursor'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',comment.id,'body',comment.body,'created_at',comment.created_at,'author_user_id',comment.author_user_id,
    'author_name',coalesce(student.preferred_name,trainer.preferred_name,trainer.display_name,app_user.display_name,'Membro'),
    'author_image_url',coalesce(student.profile_image_path,trainer.profile_image_url),
    'can_delete',comment.author_user_id=(select auth.uid()),'can_moderate',private.community_is_manager(target.community_id)
  ) order by comment.created_at desc,comment.id desc),'[]'::jsonb) into result
  from public.community_post_comments comment
  join public.app_users app_user on app_user.id=comment.author_user_id
  left join public.student_profiles student on student.user_id=comment.author_user_id
  left join public.trainer_profiles trainer on trainer.user_id=comment.author_user_id
  where comment.post_id=p_post_id and comment.status='PUBLISHED'
    and (p_before_created_at is null or (comment.created_at,comment.id)<(p_before_created_at,p_before_id))
  limit greatest(1,least(coalesce(p_limit,30),50));
  return result;
end;
$$;

create or replace function public.create_community_group(p_name text,p_description text,p_visibility text,p_join_policy text,p_posting_policy text,p_timezone text,p_ranking_enabled boolean default true,p_client_mutation_id uuid default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=(select auth.uid()); trainer_id uuid; group_id uuid; clean_name text:=trim(coalesce(p_name,'')); clean_description text:=nullif(trim(coalesce(p_description,'')),'');
begin
  select profile.id into trainer_id from public.trainer_profiles profile where profile.user_id=actor;
  if trainer_id is null then raise exception 'trainer_only'; end if;
  if not private.trainer_has_full_access(actor,now()) then raise exception 'community_entitlement_required'; end if;
  if char_length(clean_name) not between 1 and 120 or (clean_description is not null and char_length(clean_description)>500) then raise exception 'invalid_group'; end if;
  if not exists(select 1 from pg_timezone_names where name=p_timezone) then raise exception 'invalid_timezone'; end if;
  if not ((p_visibility='DISCOVERABLE' and p_join_policy in ('OPEN','APPROVAL')) or (p_visibility='PRIVATE' and p_join_policy='INVITE_ONLY')) then raise exception 'invalid_visibility_join'; end if;
  if p_posting_policy not in ('OWNER_MODERATORS_ONLY','ALL_MEMBERS') then raise exception 'invalid_posting_policy'; end if;
  if p_client_mutation_id is not null then select id into group_id from public.trainer_communities where trainer_profile_id=trainer_id and client_mutation_id=p_client_mutation_id; end if;
  if group_id is not null then return group_id; end if;
  insert into public.trainer_communities(trainer_profile_id,name,description,visibility,join_policy,posting_policy,timezone,ranking_enabled,client_mutation_id)
  values(trainer_id,clean_name,clean_description,p_visibility,p_join_policy,p_posting_policy,p_timezone,coalesce(p_ranking_enabled,true),p_client_mutation_id) returning id into group_id;
  insert into public.community_group_memberships(group_id,app_user_id,role,status,origin,joined_at) values(group_id,actor,'OWNER','ACTIVE','OWNER',now());
  return group_id;
end;
$$;

create or replace function public.update_community_group(p_group_id uuid,p_name text,p_description text,p_visibility text,p_join_policy text,p_posting_policy text,p_timezone text,p_ranking_enabled boolean,p_avatar_path text default null,p_cover_path text default null)
returns void language plpgsql security definer set search_path='' as $$
begin
  if private.community_group_role(p_group_id)<>'OWNER' then raise exception 'owner_only'; end if;
  if char_length(trim(coalesce(p_name,''))) not between 1 and 120 or char_length(coalesce(trim(p_description),''))>500 then raise exception 'invalid_group'; end if;
  if not exists(select 1 from pg_timezone_names where name=p_timezone) then raise exception 'invalid_timezone'; end if;
  if not ((p_visibility='DISCOVERABLE' and p_join_policy in ('OPEN','APPROVAL')) or (p_visibility='PRIVATE' and p_join_policy='INVITE_ONLY')) then raise exception 'invalid_visibility_join'; end if;
  if p_posting_policy not in ('OWNER_MODERATORS_ONLY','ALL_MEMBERS') then raise exception 'invalid_posting_policy'; end if;
  update public.trainer_communities set name=trim(p_name),description=nullif(trim(coalesce(p_description,'')),''),visibility=p_visibility,join_policy=p_join_policy,posting_policy=p_posting_policy,timezone=p_timezone,ranking_enabled=p_ranking_enabled,avatar_path=nullif(trim(coalesce(p_avatar_path,'')),''),cover_path=nullif(trim(coalesce(p_cover_path,'')),''),updated_at=now() where id=p_group_id;
end;
$$;

create or replace function public.archive_community_group(p_group_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  if private.community_group_role(p_group_id)<>'OWNER' then raise exception 'owner_only'; end if;
  if exists(select 1 from public.trainer_communities where id=p_group_id and is_default) then raise exception 'default_group_cannot_be_archived'; end if;
  update public.trainer_communities set status='DISABLED',archived_at=now(),updated_at=now() where id=p_group_id and archived_at is null;
  if not found then raise exception 'group_not_available'; end if;
end;
$$;

create or replace function public.set_community_group_rules(p_group_id uuid,p_rules jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare item jsonb; rule_index integer:=0;
begin
  if not private.community_is_manager(p_group_id) then raise exception 'manager_only'; end if;
  if jsonb_typeof(p_rules)<>'array' or jsonb_array_length(p_rules)>20 then raise exception 'invalid_rules'; end if;
  delete from public.community_group_rules where group_id=p_group_id;
  for item in select value from jsonb_array_elements(p_rules) loop
    if char_length(trim(coalesce(item#>>'{}',''))) not between 1 and 500 then raise exception 'invalid_rule'; end if;
    insert into public.community_group_rules(group_id,body,sort_order) values(p_group_id,trim(item#>>'{}'),rule_index);
    rule_index:=rule_index+1;
  end loop;
end;
$$;

create or replace function public.request_or_join_community_group(p_group_id uuid)
returns text language plpgsql security definer set search_path='' as $$
declare actor uuid:=(select auth.uid()); target public.trainer_communities; next_status text;
begin
  select * into target from public.trainer_communities where id=p_group_id and status='ACTIVE' and archived_at is null for update;
  if actor is null or target.id is null or target.visibility<>'DISCOVERABLE' or target.join_policy='INVITE_ONLY' or not private.community_entitlement_allowed(target.id) then raise exception 'group_not_available'; end if;
  next_status:=case when target.join_policy='OPEN' then 'ACTIVE' else 'PENDING' end;
  insert into public.community_group_memberships(group_id,app_user_id,role,status,origin,joined_at)
  values(target.id,actor,'MEMBER',next_status,case when next_status='ACTIVE' then 'DIRECT' else 'JOIN_REQUEST' end,case when next_status='ACTIVE' then now() else null end)
  on conflict(group_id,app_user_id) do update set role='MEMBER',status=excluded.status,origin=excluded.origin,joined_at=excluded.joined_at,left_at=null,revoked_at=null,updated_at=now()
  where public.community_group_memberships.status in ('LEFT','REMOVED','REVOKED');
  return next_status;
end;
$$;

create or replace function public.invite_community_group_member(p_group_id uuid,p_app_user_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not private.community_is_manager(p_group_id) then raise exception 'manager_only'; end if;
  if p_app_user_id=(select auth.uid()) or not exists(select 1 from public.app_users where id=p_app_user_id) then raise exception 'invalid_member'; end if;
  insert into public.community_group_memberships(group_id,app_user_id,role,status,origin)
  values(p_group_id,p_app_user_id,'MEMBER','INVITED','INVITE')
  on conflict(group_id,app_user_id) do update set role='MEMBER',status='INVITED',origin='INVITE',joined_at=null,left_at=null,revoked_at=null,updated_at=now()
  where public.community_group_memberships.status in ('LEFT','REMOVED','REVOKED');
  insert into public.community_notifications(recipient_user_id,actor_user_id,group_id,notification_type,dedupe_key)
  values(p_app_user_id,(select auth.uid()),p_group_id,'GROUP_INVITE','group-invite:'||p_group_id::text)
  on conflict(recipient_user_id,dedupe_key) do update set read_at=null,created_at=now(),actor_user_id=excluded.actor_user_id;
end;
$$;

create or replace function public.respond_community_group_membership(p_group_id uuid,p_accept boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
  update public.community_group_memberships set status=case when p_accept then 'ACTIVE' else 'LEFT' end,joined_at=case when p_accept then now() else null end,left_at=case when p_accept then null else now() end,updated_at=now()
  where group_id=p_group_id and app_user_id=(select auth.uid()) and status='INVITED';
  if not found then raise exception 'invitation_not_available'; end if;
end;
$$;

create or replace function public.leave_community_group(p_group_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  update public.community_group_memberships set status='LEFT',left_at=now(),updated_at=now()
  where group_id=p_group_id and app_user_id=(select auth.uid()) and status='ACTIVE' and role<>'OWNER';
  if not found then raise exception 'membership_not_available'; end if;
end;
$$;

create or replace function public.manage_community_group_member(p_group_id uuid,p_app_user_id uuid,p_action text)
returns void language plpgsql security definer set search_path='' as $$
declare actor_role text:=private.community_group_role(p_group_id); current_member public.community_group_memberships;
begin
  if actor_role not in ('OWNER','MODERATOR') then raise exception 'manager_only'; end if;
  select * into current_member from public.community_group_memberships where group_id=p_group_id and app_user_id=p_app_user_id for update;
  if current_member.id is null or current_member.role='OWNER' then raise exception 'member_not_available'; end if;
  if actor_role='MODERATOR' and (current_member.role='MODERATOR' or p_action in ('PROMOTE','DEMOTE')) then raise exception 'owner_only'; end if;
  if p_action='APPROVE' and current_member.status='PENDING' then
    update public.community_group_memberships set status='ACTIVE',origin='DIRECT',joined_at=now(),revoked_at=null,left_at=null where id=current_member.id;
    insert into public.community_notifications(recipient_user_id,actor_user_id,group_id,notification_type,dedupe_key) values(p_app_user_id,(select auth.uid()),p_group_id,'JOIN_REQUEST_APPROVED','join-approved:'||current_member.id::text) on conflict do nothing;
  elsif p_action='REJECT' and current_member.status='PENDING' then
    update public.community_group_memberships set status='REVOKED',revoked_at=now() where id=current_member.id;
    insert into public.community_notifications(recipient_user_id,actor_user_id,group_id,notification_type,dedupe_key) values(p_app_user_id,(select auth.uid()),p_group_id,'JOIN_REQUEST_REJECTED','join-rejected:'||current_member.id::text) on conflict do nothing;
  elsif p_action='REMOVE' and current_member.status='ACTIVE' then
    update public.community_group_memberships set status='REMOVED',revoked_at=now() where id=current_member.id;
    insert into public.community_moderation_events(group_id,actor_user_id,action,details) values(p_group_id,(select auth.uid()),'MEMBER_REMOVED','member:'||p_app_user_id::text);
  elsif p_action='PROMOTE' and actor_role='OWNER' and current_member.status='ACTIVE' then
    update public.community_group_memberships set role='MODERATOR' where id=current_member.id;
    insert into public.community_moderation_events(group_id,actor_user_id,action,details) values(p_group_id,(select auth.uid()),'ROLE_CHANGED','moderator:'||p_app_user_id::text);
  elsif p_action='DEMOTE' and actor_role='OWNER' and current_member.status='ACTIVE' then
    update public.community_group_memberships set role='MEMBER' where id=current_member.id;
    insert into public.community_moderation_events(group_id,actor_user_id,action,details) values(p_group_id,(select auth.uid()),'ROLE_CHANGED','member:'||p_app_user_id::text);
  else raise exception 'invalid_membership_transition'; end if;
end;
$$;

create or replace function public.create_community_post_v1(p_group_id uuid,p_post_type text,p_body text default null,p_workout_execution_id uuid default null,p_client_mutation_id uuid default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=(select auth.uid()); created_id uuid; clean_body text:=nullif(trim(coalesce(p_body,'')),'');
begin
  if actor is null or not private.community_can_post(p_group_id,actor) then raise exception 'community_post_denied'; end if;
  perform private.assert_community_rate('POST',actor);
  if p_post_type not in ('TEXT','WORKOUT_COMPLETION','TRAINER_ANNOUNCEMENT') then raise exception 'unsupported_post_type'; end if;
  if p_post_type in ('TEXT','TRAINER_ANNOUNCEMENT') and clean_body is null then raise exception 'post_body_required'; end if;
  if clean_body is not null and char_length(clean_body)>2000 then raise exception 'post_body_too_long'; end if;
  if p_post_type='TRAINER_ANNOUNCEMENT' and not private.community_is_manager(p_group_id,actor) then raise exception 'manager_only'; end if;
  if p_post_type='WORKOUT_COMPLETION' then
    if not exists(
      select 1 from public.workout_executions execution
      join public.student_profiles student on student.id=execution.student_profile_id
      where execution.id=p_workout_execution_id and execution.status='COMPLETED' and student.user_id=actor
    ) then raise exception 'completed_workout_not_authorized'; end if;
  elsif p_workout_execution_id is not null then raise exception 'invalid_workout_reference'; end if;
  if p_client_mutation_id is not null then
    select id into created_id from public.community_posts where author_user_id=actor and client_mutation_id=p_client_mutation_id;
  end if;
  if created_id is not null then return created_id; end if;
  insert into public.community_posts(community_id,author_user_id,post_type,body,workout_execution_id,client_mutation_id,published_at)
  values(p_group_id,actor,p_post_type,clean_body,p_workout_execution_id,p_client_mutation_id,now())
  on conflict(workout_execution_id,author_user_id) where workout_execution_id is not null and status<>'DELETED'
  do update set body=coalesce(excluded.body,public.community_posts.body),updated_at=now() returning id into created_id;
  return created_id;
end;
$$;

create or replace function public.update_community_post_v1(p_post_id uuid,p_body text)
returns void language plpgsql security definer set search_path='' as $$
declare target public.community_posts; clean_body text:=nullif(trim(coalesce(p_body,'')),'');
begin
  select * into target from public.community_posts where id=p_post_id and status='PUBLISHED' for update;
  if target.id is null or target.author_user_id<>(select auth.uid()) or private.community_group_role(target.community_id) is null then raise exception 'post_update_denied'; end if;
  if clean_body is null or char_length(clean_body)>2000 then raise exception 'invalid_post_body'; end if;
  update public.community_posts set body=clean_body,updated_at=now() where id=target.id;
end;
$$;

create or replace function public.set_community_post_like_v1(p_post_id uuid,p_liked boolean,p_client_mutation_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=(select auth.uid()); target public.community_posts; owner_user uuid;
begin
  select * into target from public.community_posts where id=p_post_id and status='PUBLISHED';
  if actor is null or target.id is null or private.community_group_role(target.community_id,actor) is null then raise exception 'community_access_denied'; end if;
  if p_liked then
    insert into public.community_post_reactions(post_id,user_id,reaction_type,client_mutation_id) values(p_post_id,actor,'LIKE',p_client_mutation_id)
    on conflict(post_id,user_id,reaction_type) do update set client_mutation_id=coalesce(public.community_post_reactions.client_mutation_id,excluded.client_mutation_id);
    owner_user:=target.author_user_id;
    if owner_user<>actor then insert into public.community_notifications(recipient_user_id,actor_user_id,group_id,post_id,notification_type,dedupe_key) values(owner_user,actor,target.community_id,target.id,'REACTION_ON_MY_POST','reaction:'||target.id::text||':'||actor::text) on conflict(recipient_user_id,dedupe_key) do update set read_at=null,created_at=now(); end if;
  else
    delete from public.community_post_reactions where post_id=p_post_id and user_id=actor and reaction_type='LIKE';
  end if;
  return jsonb_build_object('liked',p_liked,'like_count',(select count(*) from public.community_post_reactions where post_id=p_post_id and reaction_type='LIKE'));
end;
$$;

create or replace function public.create_community_comment_v1(p_post_id uuid,p_body text,p_client_mutation_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=(select auth.uid()); target public.community_posts; created public.community_post_comments; clean_body text:=trim(coalesce(p_body,''));
begin
  select * into target from public.community_posts where id=p_post_id and status='PUBLISHED';
  if actor is null or target.id is null or private.community_group_role(target.community_id,actor) is null then raise exception 'community_access_denied'; end if;
  if char_length(clean_body) not between 1 and 1000 then raise exception 'invalid_comment_body'; end if;
  perform private.assert_community_rate('COMMENT',actor);
  select * into created from public.community_post_comments where author_user_id=actor and client_mutation_id=p_client_mutation_id;
  if created.id is null then insert into public.community_post_comments(post_id,author_user_id,body,client_mutation_id) values(p_post_id,actor,clean_body,p_client_mutation_id) returning * into created; end if;
  if target.author_user_id<>actor then insert into public.community_notifications(recipient_user_id,actor_user_id,group_id,post_id,notification_type,dedupe_key) values(target.author_user_id,actor,target.community_id,target.id,'COMMENT_ON_MY_POST','comment:'||created.id::text) on conflict do nothing; end if;
  return jsonb_build_object('id',created.id,'body',created.body,'created_at',created.created_at);
end;
$$;

create or replace function public.create_community_photo_post_v1(p_group_id uuid,p_post_id uuid,p_body text,p_media jsonb,p_client_mutation_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=(select auth.uid()); clean_body text:=nullif(trim(coalesce(p_body,'')),''); item jsonb; created_id uuid;
begin
  if actor is null or not private.community_can_post(p_group_id,actor) then raise exception 'community_post_denied'; end if;
  if jsonb_typeof(p_media)<>'array' or jsonb_array_length(p_media) not between 1 and 4 then raise exception 'invalid_media_count'; end if;
  if clean_body is not null and char_length(clean_body)>2000 then raise exception 'post_body_too_long'; end if;
  select id into created_id from public.community_posts where author_user_id=actor and client_mutation_id=p_client_mutation_id;
  if created_id is not null then return created_id; end if;
  perform private.assert_community_rate('POST',actor);
  insert into public.community_posts(id,community_id,author_user_id,post_type,body,client_mutation_id,published_at) values(p_post_id,p_group_id,actor,'PHOTO',clean_body,p_client_mutation_id,now());
  for item in select value from jsonb_array_elements(p_media) loop
    if item->>'storage_path' not like p_group_id::text||'/'||actor::text||'/'||p_post_id::text||'/%'
      or item->>'mime_type'<>'image/webp' or (item->>'file_size')::integer not between 1 and 4194304
      or (item->>'width')::integer not between 1 and 2048 or (item->>'height')::integer not between 1 and 2048
      or not exists(select 1 from storage.objects object where object.bucket_id='community-post-media' and object.name=item->>'storage_path')
    then raise exception 'invalid_media'; end if;
    insert into public.community_post_media(post_id,storage_path,mime_type,file_size,sort_order,width,height)
    values(p_post_id,item->>'storage_path',item->>'mime_type',(item->>'file_size')::integer,(item->>'sort_order')::integer,(item->>'width')::integer,(item->>'height')::integer);
  end loop;
  return p_post_id;
end;
$$;

create or replace function public.delete_community_post_v1(p_post_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare target public.community_posts; paths jsonb;
begin
  select * into target from public.community_posts where id=p_post_id and status<>'DELETED' for update;
  if target.id is null or not (target.author_user_id=(select auth.uid()) or private.community_is_manager(target.community_id)) then raise exception 'post_delete_denied'; end if;
  select coalesce(jsonb_agg(storage_path),'[]'::jsonb) into paths from public.community_post_media where post_id=target.id;
  update public.community_posts set status='DELETED',deleted_at=now(),published_at=null,pinned_at=null,updated_at=now() where id=target.id;
  return paths;
end;
$$;

create or replace function public.list_community_group_ranking(p_group_id uuid,p_period text default 'MONTHLY',p_limit integer default 100)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare target public.trainer_communities; result jsonb;
begin
  select * into target from public.trainer_communities where id=p_group_id;
  if target.id is null or private.community_group_role(target.id) is null then raise exception 'community_access_denied'; end if;
  if not target.ranking_enabled then raise exception 'ranking_disabled'; end if;
  if p_period not in ('MONTHLY','ALL_TIME') then raise exception 'invalid_period'; end if;
  with eligible as (
    select membership.app_user_id,membership.joined_at,student.id student_profile_id
    from public.community_group_memberships membership
    join public.student_profiles student on student.user_id=membership.app_user_id
    where membership.group_id=target.id and membership.status='ACTIVE' and membership.role='MEMBER'
  ), daily as (
    select eligible.app_user_id,(execution.completed_at at time zone target.timezone)::date active_date,min(execution.completed_at) first_completion
    from eligible join public.workout_executions execution on execution.student_profile_id=eligible.student_profile_id and execution.status='COMPLETED'
    where execution.completed_at>=eligible.joined_at
      and (p_period='ALL_TIME' or execution.completed_at>=(date_trunc('month',now() at time zone target.timezone) at time zone target.timezone))
    group by eligible.app_user_id,(execution.completed_at at time zone target.timezone)::date
  ), scores as (
    select daily.app_user_id,count(*)::integer active_days,max(daily.first_completion) reached_at from daily group by daily.app_user_id
  ), ranked as (
    select scores.*,row_number() over(order by scores.active_days desc,scores.reached_at asc,scores.app_user_id asc)::integer position from scores
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'position',ranked.position,'app_user_id',ranked.app_user_id,'active_days',ranked.active_days,'reached_at',ranked.reached_at,
    'is_current_user',ranked.app_user_id=(select auth.uid()),
    'name',coalesce(student.preferred_name,app_user.display_name,'Membro'),'image_url',student.profile_image_path
  ) order by ranked.position),'[]'::jsonb) into result
  from ranked join public.app_users app_user on app_user.id=ranked.app_user_id left join public.student_profiles student on student.user_id=ranked.app_user_id
  where ranked.position<=greatest(3,least(coalesce(p_limit,100),200)) or ranked.app_user_id=(select auth.uid());
  return result;
end;
$$;

create or replace function public.list_my_community_notifications(p_limit integer default 30)
returns jsonb language sql stable security definer set search_path='' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',notification.id,'type',notification.notification_type,'group_id',notification.group_id,'group_name',community.name,
    'post_id',notification.post_id,'read_at',notification.read_at,'created_at',notification.created_at,
    'actor_name',coalesce(actor_student.preferred_name,actor_trainer.preferred_name,actor_trainer.display_name,actor.display_name)
  ) order by notification.created_at desc,notification.id desc),'[]'::jsonb)
  from (
    select * from public.community_notifications where recipient_user_id=(select auth.uid()) order by created_at desc,id desc limit greatest(1,least(coalesce(p_limit,30),100))
  ) notification
  join public.trainer_communities community on community.id=notification.group_id
  left join public.app_users actor on actor.id=notification.actor_user_id
  left join public.student_profiles actor_student on actor_student.user_id=notification.actor_user_id
  left join public.trainer_profiles actor_trainer on actor_trainer.user_id=notification.actor_user_id;
$$;

create or replace function public.mark_community_notifications_read(p_notification_ids uuid[] default null)
returns integer language plpgsql security definer set search_path='' as $$
declare affected integer;
begin
  update public.community_notifications set read_at=coalesce(read_at,now())
  where recipient_user_id=(select auth.uid()) and (p_notification_ids is null or id=any(p_notification_ids));
  get diagnostics affected=row_count; return affected;
end;
$$;

create or replace function public.list_community_reports(p_group_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
  if not private.community_is_manager(p_group_id) then raise exception 'manager_only'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',report.id,'post_id',report.post_id,'comment_id',report.comment_id,'reason_code',report.reason_code,'details',report.details,'status',report.status,'created_at',report.created_at) order by report.created_at,report.id),'[]'::jsonb) into result
  from public.community_content_reports report
  left join public.community_posts post on post.id=report.post_id
  left join public.community_post_comments comment on comment.id=report.comment_id
  left join public.community_posts comment_post on comment_post.id=comment.post_id
  where coalesce(post.community_id,comment_post.community_id)=p_group_id and report.status='OPEN';
  return result;
end;
$$;

create or replace function public.resolve_community_report(p_report_id uuid,p_resolution text,p_hide_content boolean default false)
returns void language plpgsql security definer set search_path='' as $$
declare target public.community_content_reports; group_id uuid;
begin
  select * into target from public.community_content_reports where id=p_report_id and status='OPEN' for update;
  select coalesce(post.community_id,comment_post.community_id) into group_id
  from (select target.post_id post_id,target.comment_id comment_id) source
  left join public.community_posts post on post.id=source.post_id
  left join public.community_post_comments comment on comment.id=source.comment_id
  left join public.community_posts comment_post on comment_post.id=comment.post_id;
  if target.id is null or not private.community_is_manager(group_id) then raise exception 'report_not_available'; end if;
  if p_resolution not in ('DISMISS','ACTION') then raise exception 'invalid_resolution'; end if;
  update public.community_content_reports set status=case when p_resolution='ACTION' then 'ACTIONED' else 'DISMISSED' end,resolved_at=now(),resolved_by_user_id=(select auth.uid()) where id=target.id;
  if p_hide_content then
    if target.post_id is not null then update public.community_posts set status='HIDDEN',published_at=null,pinned_at=null,updated_at=now() where id=target.post_id and status='PUBLISHED';
    else update public.community_post_comments set status='HIDDEN',updated_at=now() where id=target.comment_id and status='PUBLISHED'; end if;
  end if;
  insert into public.community_moderation_events(group_id,actor_user_id,report_id,post_id,comment_id,action)
  values(group_id,(select auth.uid()),target.id,target.post_id,target.comment_id,case when p_resolution='ACTION' then 'REPORT_REVIEWED' else 'REPORT_DISMISSED' end);
end;
$$;

create or replace function public.set_community_announcement_pin_v1(p_post_id uuid,p_pinned boolean)
returns void language plpgsql security definer set search_path='' as $$
declare target public.community_posts;
begin
  select * into target from public.community_posts where id=p_post_id and post_type='TRAINER_ANNOUNCEMENT' and status='PUBLISHED' for update;
  if target.id is null or not private.community_is_manager(target.community_id) then raise exception 'manager_only'; end if;
  if p_pinned then update public.community_posts set pinned_at=null,updated_at=now() where community_id=target.community_id and pinned_at is not null; end if;
  update public.community_posts set pinned_at=case when p_pinned then now() else null end,updated_at=now() where id=target.id;
  if p_pinned then
    insert into public.community_notifications(recipient_user_id,actor_user_id,group_id,post_id,notification_type,dedupe_key)
    select membership.app_user_id,(select auth.uid()),target.community_id,target.id,'PINNED_ANNOUNCEMENT','pinned:'||target.id::text
    from public.community_group_memberships membership
    where membership.group_id=target.community_id and membership.status='ACTIVE' and membership.app_user_id<>(select auth.uid())
    on conflict(recipient_user_id,dedupe_key) do update set read_at=null,created_at=now();
  end if;
end;
$$;

create or replace function public.moderate_community_content(p_post_id uuid default null,p_comment_id uuid default null,p_hidden boolean default true)
returns void language plpgsql security definer set search_path='' as $$
declare group_id uuid; action_name text:=case when p_hidden then 'CONTENT_HIDDEN' else 'CONTENT_RESTORED' end;
begin
  if (p_post_id is not null)::integer+(p_comment_id is not null)::integer<>1 then raise exception 'invalid_moderation_target'; end if;
  if p_post_id is not null then select post.community_id into group_id from public.community_posts post where post.id=p_post_id and post.status<>'DELETED';
  else select post.community_id into group_id from public.community_post_comments comment join public.community_posts post on post.id=comment.post_id where comment.id=p_comment_id and comment.status<>'DELETED'; end if;
  if group_id is null or not private.community_is_manager(group_id) then raise exception 'manager_only'; end if;
  if p_post_id is not null then
    update public.community_posts set status=case when p_hidden then 'HIDDEN' else 'PUBLISHED' end,published_at=case when p_hidden then null else coalesce(published_at,now()) end,pinned_at=case when p_hidden then null else pinned_at end,updated_at=now() where id=p_post_id;
  else
    update public.community_post_comments set status=case when p_hidden then 'HIDDEN' else 'PUBLISHED' end,updated_at=now() where id=p_comment_id;
  end if;
  insert into public.community_moderation_events(group_id,actor_user_id,post_id,comment_id,action)
  values(group_id,(select auth.uid()),p_post_id,p_comment_id,action_name);
end;
$$;

revoke all on public.community_group_memberships,public.community_group_rules,public.community_moderation_events,public.community_notifications from public,anon,authenticated;
grant select on public.community_group_memberships,public.community_group_rules,public.community_moderation_events,public.community_notifications to authenticated;
grant insert,delete on storage.objects to authenticated;

revoke all on function private.community_entitlement_allowed(uuid),private.community_group_role(uuid,uuid),private.community_can_post(uuid,uuid),private.community_is_manager(uuid,uuid),private.community_group_json(public.trainer_communities,uuid),private.community_post_json(public.community_posts,integer),private.sync_relationship_community_membership() from public,anon,authenticated;
grant execute on function private.community_entitlement_allowed(uuid),private.community_group_role(uuid,uuid),private.community_can_post(uuid,uuid),private.community_is_manager(uuid,uuid) to authenticated;

revoke all on function public.list_my_community_groups(),public.search_community_groups(text,integer),public.get_community_group(uuid),public.list_community_group_members(uuid,integer),public.list_community_invitable_members(uuid),public.list_my_community_feed(integer,timestamptz,uuid),public.list_community_group_posts(uuid,integer,timestamptz,uuid,uuid),public.list_community_post_comments(uuid,integer,timestamptz,uuid),public.create_community_group(text,text,text,text,text,text,boolean,uuid),public.update_community_group(uuid,text,text,text,text,text,text,boolean,text,text),public.archive_community_group(uuid),public.set_community_group_rules(uuid,jsonb),public.request_or_join_community_group(uuid),public.invite_community_group_member(uuid,uuid),public.respond_community_group_membership(uuid,boolean),public.leave_community_group(uuid),public.manage_community_group_member(uuid,uuid,text),public.create_community_post_v1(uuid,text,text,uuid,uuid),public.update_community_post_v1(uuid,text),public.set_community_post_like_v1(uuid,boolean,uuid),public.create_community_comment_v1(uuid,text,uuid),public.create_community_photo_post_v1(uuid,uuid,text,jsonb,uuid),public.delete_community_post_v1(uuid),public.list_community_group_ranking(uuid,text,integer),public.list_my_community_notifications(integer),public.mark_community_notifications_read(uuid[]),public.list_community_reports(uuid),public.resolve_community_report(uuid,text,boolean),public.set_community_announcement_pin_v1(uuid,boolean),public.moderate_community_content(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.list_my_community_groups(),public.search_community_groups(text,integer),public.get_community_group(uuid),public.list_community_group_members(uuid,integer),public.list_community_invitable_members(uuid),public.list_my_community_feed(integer,timestamptz,uuid),public.list_community_group_posts(uuid,integer,timestamptz,uuid,uuid),public.list_community_post_comments(uuid,integer,timestamptz,uuid),public.create_community_group(text,text,text,text,text,text,boolean,uuid),public.update_community_group(uuid,text,text,text,text,text,text,boolean,text,text),public.archive_community_group(uuid),public.set_community_group_rules(uuid,jsonb),public.request_or_join_community_group(uuid),public.invite_community_group_member(uuid,uuid),public.respond_community_group_membership(uuid,boolean),public.leave_community_group(uuid),public.manage_community_group_member(uuid,uuid,text),public.create_community_post_v1(uuid,text,text,uuid,uuid),public.update_community_post_v1(uuid,text),public.set_community_post_like_v1(uuid,boolean,uuid),public.create_community_comment_v1(uuid,text,uuid),public.create_community_photo_post_v1(uuid,uuid,text,jsonb,uuid),public.delete_community_post_v1(uuid),public.list_community_group_ranking(uuid,text,integer),public.list_my_community_notifications(integer),public.mark_community_notifications_read(uuid[]),public.list_community_reports(uuid),public.resolve_community_report(uuid,text,boolean),public.set_community_announcement_pin_v1(uuid,boolean),public.moderate_community_content(uuid,uuid,boolean) to authenticated;
revoke all on function public.create_community_photo_post_as(uuid,uuid,uuid,text,jsonb) from public,anon,authenticated,service_role;

do $community_social_security_gate$
declare table_name text;
begin
  foreach table_name in array array['community_group_memberships','community_group_rules','community_moderation_events','community_notifications'] loop
    if not (select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=table_name) then raise exception 'community_social_rls_missing:%',table_name; end if;
    if has_table_privilege('anon','public.'||table_name,'SELECT,INSERT,UPDATE,DELETE') or has_table_privilege('authenticated','public.'||table_name,'INSERT,UPDATE,DELETE') then raise exception 'unsafe_community_social_grant:%',table_name; end if;
  end loop;
  if has_function_privilege('anon','public.list_my_community_feed(integer,timestamptz,uuid)','EXECUTE') then raise exception 'anonymous_feed_execute'; end if;
  if not has_function_privilege('authenticated','public.list_my_community_feed(integer,timestamptz,uuid)','EXECUTE') then raise exception 'authenticated_feed_missing'; end if;
  if (select public from storage.buckets where id='community-post-media') then raise exception 'community_media_bucket_public'; end if;
end;
$community_social_security_gate$;
