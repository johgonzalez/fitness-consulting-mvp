-- Product Owner QA fixes V1: repeatable workout executions, student-owned
-- Community groups, transactional capacity, actionable join notifications,
-- and minimal group challenges. All changes are additive or replace RPCs.

alter table public.trainer_communities
  add column owner_user_id uuid references public.app_users(id) on delete restrict,
  add column owner_product_role text not null default 'TRAINER';

update public.trainer_communities community
set owner_user_id=trainer.user_id
from public.trainer_profiles trainer
where trainer.id=community.trainer_profile_id and community.owner_user_id is null;

alter table public.trainer_communities
  alter column owner_user_id set not null,
  alter column trainer_profile_id drop not null,
  add constraint trainer_communities_owner_role_check check (owner_product_role in ('TRAINER','STUDENT')),
  add constraint trainer_communities_owner_shape_check check (
    (owner_product_role='TRAINER' and trainer_profile_id is not null)
    or (owner_product_role='STUDENT' and trainer_profile_id is null)
  );

create unique index trainer_communities_student_one_owned_idx
  on public.trainer_communities(owner_user_id)
  where owner_product_role='STUDENT' and status='ACTIVE' and archived_at is null;
create unique index trainer_communities_owner_mutation_v2_idx
  on public.trainer_communities(owner_user_id,client_mutation_id)
  where client_mutation_id is not null;

alter table public.community_notifications drop constraint community_notification_type_check;
alter table public.community_notifications add constraint community_notification_type_check check (
  notification_type in ('GROUP_INVITE','JOIN_REQUEST','JOIN_REQUEST_APPROVED','JOIN_REQUEST_REJECTED','COMMENT_ON_MY_POST','REACTION_ON_MY_POST','PINNED_ANNOUNCEMENT','CHALLENGE_CREATED','CHALLENGE_ACCEPTED')
);

create table public.community_challenges (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.trainer_communities(id) on delete restrict,
  creator_user_id uuid not null references public.app_users(id) on delete restrict,
  title text not null,
  instructions text,
  duration_minutes integer,
  workout_session_id uuid references public.workout_sessions(id) on delete restrict,
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  status text not null default 'ACTIVE',
  client_mutation_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint community_challenge_title_check check (char_length(trim(title)) between 2 and 160),
  constraint community_challenge_instructions_check check (instructions is null or char_length(trim(instructions)) between 1 and 2000),
  constraint community_challenge_duration_check check (duration_minutes is null or duration_minutes between 1 and 600),
  constraint community_challenge_status_check check (status in ('ACTIVE','ARCHIVED')),
  constraint community_challenge_window_check check (expires_at is null or expires_at>starts_at),
  unique(creator_user_id,client_mutation_id)
);
create index community_challenges_group_active_idx on public.community_challenges(group_id,created_at desc) where status='ACTIVE';

create table public.community_challenge_acceptances (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.community_challenges(id) on delete restrict,
  app_user_id uuid not null references public.app_users(id) on delete restrict,
  student_profile_id uuid not null references public.student_profiles(id) on delete restrict,
  workout_execution_id uuid references public.workout_executions(id) on delete restrict,
  status text not null default 'ACCEPTED',
  accepted_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(challenge_id,app_user_id),
  constraint community_challenge_acceptance_status_check check (status in ('ACCEPTED','COMPLETED')),
  constraint community_challenge_completion_check check ((status='COMPLETED')=(completed_at is not null))
);
create index community_challenge_acceptances_student_idx on public.community_challenge_acceptances(student_profile_id,status,accepted_at desc);

alter table public.community_challenges enable row level security;
alter table public.community_challenge_acceptances enable row level security;

create policy "members read active community challenges" on public.community_challenges
for select to authenticated using (private.community_group_role(group_id) is not null);
create policy "members read own challenge acceptances" on public.community_challenge_acceptances
for select to authenticated using (
  app_user_id=(select auth.uid())
  or private.community_is_manager((select challenge.group_id from public.community_challenges challenge where challenge.id=challenge_id))
);

create or replace function private.community_entitlement_allowed(p_group_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(
    select 1 from public.trainer_communities community
    left join public.trainer_profiles trainer on trainer.id=community.trainer_profile_id
    where community.id=p_group_id and community.status='ACTIVE' and community.archived_at is null
      and (
        (community.owner_product_role='TRAINER' and private.trainer_has_full_access(trainer.user_id,now()))
        or community.owner_product_role='STUDENT'
      )
  );
$$;

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
    'owner_product_role',p_group.owner_product_role,
    'owner',jsonb_build_object(
      'user_id',owner_user.id,
      'name',coalesce(owner_student.preferred_name,owner_trainer.preferred_name,owner_trainer.display_name,owner_user.display_name,'Membro'),
      'image_url',coalesce(owner_student.profile_image_path,owner_trainer.profile_image_url)
    )
  )
  from public.app_users owner_user
  left join public.student_profiles owner_student on owner_student.user_id=owner_user.id
  left join public.trainer_profiles owner_trainer on owner_trainer.user_id=owner_user.id
  left join public.community_group_memberships membership on membership.group_id=p_group.id and membership.app_user_id=p_user_id
  where owner_user.id=p_group.owner_user_id;
$$;

create or replace function public.ensure_my_trainer_community()
returns jsonb language plpgsql security definer set search_path='' as $$
declare trainer public.trainer_profiles; community public.trainer_communities; first_name text;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  select * into trainer from public.trainer_profiles where user_id=(select auth.uid());
  if trainer.id is null or not private.trainer_has_full_access(trainer.user_id,now()) then raise exception 'community_entitlement_required'; end if;
  first_name:=split_part(trim(coalesce(nullif(trainer.preferred_name,''),trainer.display_name,'Personal')),' ',1);
  insert into public.trainer_communities(trainer_profile_id,owner_user_id,owner_product_role,name,is_default)
  values(trainer.id,trainer.user_id,'TRAINER','Clube '||case when lower(first_name)~'a$' then 'da ' else 'do ' end||first_name,true)
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

create or replace function private.enforce_community_member_capacity()
returns trigger language plpgsql security definer set search_path='' as $$
declare active_count integer;
begin
  if new.status<>'ACTIVE' or (tg_op='UPDATE' and old.status='ACTIVE') then return new; end if;
  perform 1 from public.trainer_communities where id=new.group_id for update;
  select count(*) into active_count from public.community_group_memberships where group_id=new.group_id and status='ACTIVE' and id<>new.id;
  if active_count>=50 then raise exception 'community_group_capacity_reached'; end if;
  return new;
end;
$$;
create trigger enforce_community_member_capacity before insert or update of status on public.community_group_memberships
for each row execute function private.enforce_community_member_capacity();

create or replace function public.create_community_group(p_name text,p_description text,p_visibility text,p_join_policy text,p_posting_policy text,p_timezone text,p_ranking_enabled boolean default true,p_client_mutation_id uuid default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=(select auth.uid()); trainer_id uuid; student_id uuid; group_id uuid; product_role text; clean_name text:=trim(coalesce(p_name,'')); clean_description text:=nullif(trim(coalesce(p_description,'')),'');
begin
  if actor is null then raise exception 'authentication_required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(actor::text,0));
  select profile.id into trainer_id from public.trainer_profiles profile where profile.user_id=actor;
  select profile.id into student_id from public.student_profiles profile where profile.user_id=actor;
  if trainer_id is not null then
    product_role:='TRAINER';
    if not private.trainer_has_full_access(actor,now()) then raise exception 'community_entitlement_required'; end if;
  elsif student_id is not null then
    product_role:='STUDENT';
    if exists(select 1 from public.trainer_communities where owner_user_id=actor and owner_product_role='STUDENT' and status='ACTIVE' and archived_at is null) then raise exception 'student_owned_group_limit_reached'; end if;
  else raise exception 'community_identity_required'; end if;
  if char_length(clean_name) not between 1 and 120 or (clean_description is not null and char_length(clean_description)>500) then raise exception 'invalid_group'; end if;
  if not exists(select 1 from pg_timezone_names where name=p_timezone) then raise exception 'invalid_timezone'; end if;
  if not ((p_visibility='DISCOVERABLE' and p_join_policy in ('OPEN','APPROVAL')) or (p_visibility='PRIVATE' and p_join_policy='INVITE_ONLY')) then raise exception 'invalid_visibility_join'; end if;
  if p_posting_policy not in ('OWNER_MODERATORS_ONLY','ALL_MEMBERS') then raise exception 'invalid_posting_policy'; end if;
  if p_client_mutation_id is not null then select id into group_id from public.trainer_communities where owner_user_id=actor and client_mutation_id=p_client_mutation_id; end if;
  if group_id is not null then return group_id; end if;
  insert into public.trainer_communities(trainer_profile_id,owner_user_id,owner_product_role,name,description,visibility,join_policy,posting_policy,timezone,ranking_enabled,client_mutation_id)
  values(trainer_id,actor,product_role,clean_name,clean_description,p_visibility,p_join_policy,p_posting_policy,p_timezone,coalesce(p_ranking_enabled,true),p_client_mutation_id) returning id into group_id;
  insert into public.community_group_memberships(group_id,app_user_id,role,status,origin,joined_at) values(group_id,actor,'OWNER','ACTIVE','OWNER',now());
  return group_id;
end;
$$;

create or replace function public.create_community_challenge(
  p_group_id uuid,p_title text,p_instructions text,p_duration_minutes integer,
  p_workout_session_id uuid default null,p_expires_at timestamptz default null,
  p_client_mutation_id uuid default gen_random_uuid()
)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=(select auth.uid()); created_id uuid; creator_role text:=private.community_group_role(p_group_id);
begin
  if creator_role<>'OWNER' and not (creator_role='MODERATOR' and exists(select 1 from public.trainer_profiles where user_id=actor)) then raise exception 'challenge_creator_not_allowed'; end if;
  if char_length(trim(coalesce(p_title,''))) not between 2 and 160 or char_length(coalesce(trim(p_instructions),''))>2000 then raise exception 'invalid_challenge'; end if;
  if p_duration_minutes is not null and p_duration_minutes not between 1 and 600 then raise exception 'invalid_challenge_duration'; end if;
  if p_expires_at is not null and p_expires_at<=now() then raise exception 'invalid_challenge_expiry'; end if;
  if p_workout_session_id is not null and not exists(
    select 1 from public.workout_sessions session
    join public.workout_plan_versions version on version.id=session.workout_plan_version_id and version.status='PUBLISHED'
    join public.workout_plans plan on plan.id=version.workout_plan_id
    join public.trainer_student_relationships relationship on relationship.id=plan.trainer_student_relationship_id
    where session.id=p_workout_session_id and private.owns_trainer(relationship.trainer_profile_id)
  ) then raise exception 'challenge_workout_not_available'; end if;
  insert into public.community_challenges(group_id,creator_user_id,title,instructions,duration_minutes,workout_session_id,expires_at,client_mutation_id)
  values(p_group_id,actor,trim(p_title),nullif(trim(coalesce(p_instructions,'')),''),p_duration_minutes,p_workout_session_id,p_expires_at,p_client_mutation_id)
  on conflict(creator_user_id,client_mutation_id) do update set updated_at=public.community_challenges.updated_at
  returning id into created_id;
  insert into public.community_notifications(recipient_user_id,actor_user_id,group_id,notification_type,dedupe_key)
  select membership.app_user_id,actor,p_group_id,'CHALLENGE_CREATED','challenge-created:'||created_id::text
  from public.community_group_memberships membership
  where membership.group_id=p_group_id and membership.status='ACTIVE' and membership.app_user_id<>actor
  on conflict do nothing;
  return created_id;
end;
$$;

create or replace function public.accept_community_challenge(p_challenge_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=(select auth.uid()); target public.community_challenges; student_id uuid; accepted public.community_challenge_acceptances;
begin
  select * into target from public.community_challenges where id=p_challenge_id and status='ACTIVE' and (expires_at is null or expires_at>now()) for update;
  if target.id is null or private.community_group_role(target.group_id,actor) is null then raise exception 'challenge_not_available'; end if;
  select id into student_id from public.student_profiles where user_id=actor;
  if student_id is null then raise exception 'student_identity_required'; end if;
  if target.workout_session_id is not null and not exists(
    select 1 from public.workout_sessions session
    join public.workout_plan_versions version on version.id=session.workout_plan_version_id and version.status='PUBLISHED'
    join public.workout_plans plan on plan.id=version.workout_plan_id and plan.status='ACTIVE'
    join public.trainer_student_relationships relationship on relationship.id=plan.trainer_student_relationship_id and relationship.status='active'
    where session.id=target.workout_session_id and relationship.student_profile_id=student_id
  ) then raise exception 'challenge_workout_not_available'; end if;
  insert into public.community_challenge_acceptances(challenge_id,app_user_id,student_profile_id)
  values(target.id,actor,student_id)
  on conflict(challenge_id,app_user_id) do update set updated_at=public.community_challenge_acceptances.updated_at
  returning * into accepted;
  return jsonb_build_object('id',accepted.id,'challenge_id',accepted.challenge_id,'status',accepted.status,'workout_session_id',target.workout_session_id,'accepted_at',accepted.accepted_at);
end;
$$;

create or replace function public.list_my_community_challenge_workouts()
returns jsonb language sql stable security definer set search_path='' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',session.id,
    'label',session.name||' · '||coalesce(student.preferred_name,student_user.display_name,'Aluno')
  ) order by plan.updated_at desc,session.sort_order),'[]'::jsonb)
  from public.workout_sessions session
  join public.workout_plan_versions version on version.id=session.workout_plan_version_id and version.status='PUBLISHED'
  join public.workout_plans plan on plan.id=version.workout_plan_id and plan.status='ACTIVE'
  join public.trainer_student_relationships relationship on relationship.id=plan.trainer_student_relationship_id and relationship.status='active'
  join public.trainer_profiles trainer on trainer.id=relationship.trainer_profile_id and trainer.user_id=(select auth.uid())
  join public.student_profiles student on student.id=relationship.student_profile_id
  join public.app_users student_user on student_user.id=student.user_id;
$$;

create or replace function public.list_community_group_challenges(p_group_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
  if private.community_group_role(p_group_id) is null then raise exception 'community_access_denied'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',challenge.id,'group_id',challenge.group_id,'title',challenge.title,'instructions',challenge.instructions,
    'duration_minutes',challenge.duration_minutes,'workout_session_id',challenge.workout_session_id,
    'starts_at',challenge.starts_at,'expires_at',challenge.expires_at,'status',challenge.status,
    'accepted',acceptance.id is not null,'acceptance_status',acceptance.status
  ) order by challenge.created_at desc),'[]'::jsonb) into result
  from public.community_challenges challenge
  left join public.community_challenge_acceptances acceptance on acceptance.challenge_id=challenge.id and acceptance.app_user_id=(select auth.uid())
  where challenge.group_id=p_group_id and challenge.status='ACTIVE' and (challenge.expires_at is null or challenge.expires_at>now());
  return result;
end;
$$;

create or replace function public.list_my_accepted_community_challenges()
returns jsonb language sql stable security definer set search_path='' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',challenge.id,'group_id',challenge.group_id,'group_name',community.name,'title',challenge.title,
    'instructions',challenge.instructions,'duration_minutes',challenge.duration_minutes,
    'workout_session_id',challenge.workout_session_id,'acceptance_status',acceptance.status,'accepted_at',acceptance.accepted_at
  ) order by acceptance.accepted_at desc),'[]'::jsonb)
  from public.community_challenge_acceptances acceptance
  join public.community_challenges challenge on challenge.id=acceptance.challenge_id
  join public.trainer_communities community on community.id=challenge.group_id
  where acceptance.app_user_id=(select auth.uid()) and challenge.status='ACTIVE';
$$;

create or replace function public.start_or_resume_workout_execution(p_workout_session_id uuid)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare target record; existing public.workout_executions; execution_id uuid; next_revision integer;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  select session.id session_id,version.id version_id,version.status version_status,plan.id plan_id,plan.status plan_status,
    relationship.id relationship_id,relationship.student_profile_id,relationship.status relationship_status
  into target
  from public.workout_sessions session
  join public.workout_plan_versions version on version.id=session.workout_plan_version_id
  join public.workout_plans plan on plan.id=version.workout_plan_id
  join public.trainer_student_relationships relationship on relationship.id=plan.trainer_student_relationship_id
  where session.id=p_workout_session_id for update of session,version,plan,relationship;
  if target.session_id is null or not private.owns_student(target.student_profile_id) then raise exception 'workout_session_not_available'; end if;
  select execution.* into existing from public.workout_executions execution
  where execution.student_profile_id=target.student_profile_id and execution.workout_session_id=target.session_id and execution.status in ('IN_PROGRESS','PAUSED') for update;
  if existing.id is not null then
    if target.relationship_status<>'active' then raise exception 'relationship_not_active'; end if;
    if existing.status='PAUSED' then
      next_revision:=existing.server_revision+1;
      update public.workout_executions set status='IN_PROGRESS',paused_seconds=paused_seconds+greatest(0,floor(extract(epoch from (now()-paused_at)))::integer),paused_at=null,last_activity_at=now(),server_revision=next_revision where id=existing.id;
      insert into public.workout_execution_events(workout_execution_id,event_type,actor_user_id,server_revision,metadata)
      values(existing.id,'EXECUTION_RESUMED',(select auth.uid()),next_revision,jsonb_build_object('source','start_or_resume'));
    end if;
    update public.community_challenge_acceptances acceptance set workout_execution_id=existing.id,updated_at=now()
    from public.community_challenges challenge
    where challenge.id=acceptance.challenge_id and acceptance.app_user_id=(select auth.uid()) and challenge.workout_session_id=target.session_id and acceptance.status='ACCEPTED';
    return private.build_workout_execution_snapshot(existing.id);
  end if;
  if target.relationship_status<>'active' then raise exception 'relationship_not_active'; end if;
  if target.plan_status<>'ACTIVE' then raise exception 'workout_plan_not_active'; end if;
  if target.version_status<>'PUBLISHED' then raise exception 'published_workout_required'; end if;
  insert into public.workout_executions(trainer_student_relationship_id,student_profile_id,workout_plan_id,workout_plan_version_id,workout_session_id,status,created_by)
  values(target.relationship_id,target.student_profile_id,target.plan_id,target.version_id,target.session_id,'IN_PROGRESS',(select auth.uid())) returning id into execution_id;
  insert into public.workout_exercise_executions(workout_execution_id,workout_exercise_id,exercise_id,sort_order)
  select execution_id,prescribed.id,prescribed.exercise_id,(row_number() over(order by section.sort_order,prescribed.sort_order,prescribed.id)-1)::integer
  from public.workout_sections section join public.workout_exercises prescribed on prescribed.workout_section_id=section.id
  where section.workout_session_id=target.session_id order by section.sort_order,prescribed.sort_order,prescribed.id;
  insert into public.workout_set_executions(workout_execution_id,workout_exercise_execution_id,workout_set_id,set_number)
  select execution_id,exercise_execution.id,prescribed_set.id,prescribed_set.set_number
  from public.workout_exercise_executions exercise_execution join public.workout_sets prescribed_set on prescribed_set.workout_exercise_id=exercise_execution.workout_exercise_id
  where exercise_execution.workout_execution_id=execution_id order by exercise_execution.sort_order,prescribed_set.set_number;
  if not exists(select 1 from public.workout_set_executions item where item.workout_execution_id=execution_id) then raise exception 'workout_session_has_no_executable_sets'; end if;
  insert into public.workout_execution_events(workout_execution_id,event_type,actor_user_id,server_revision,metadata)
  values(execution_id,'EXECUTION_STARTED',(select auth.uid()),1,jsonb_build_object('workout_session_id',target.session_id,'workout_plan_version_id',target.version_id));
  update public.community_challenge_acceptances acceptance set workout_execution_id=execution_id,updated_at=now()
  from public.community_challenges challenge
  where challenge.id=acceptance.challenge_id and acceptance.app_user_id=(select auth.uid()) and challenge.workout_session_id=target.session_id and acceptance.status='ACCEPTED';
  return private.build_workout_execution_snapshot(execution_id);
exception when unique_violation then
  select execution.id into execution_id from public.workout_executions execution
  where execution.student_profile_id=target.student_profile_id and execution.workout_session_id=target.session_id and execution.status in ('IN_PROGRESS','PAUSED');
  if execution_id is null then raise; end if;
  update public.community_challenge_acceptances acceptance set workout_execution_id=execution_id,updated_at=now()
  from public.community_challenges challenge
  where challenge.id=acceptance.challenge_id and acceptance.app_user_id=(select auth.uid()) and challenge.workout_session_id=target.session_id and acceptance.status='ACCEPTED';
  return private.build_workout_execution_snapshot(execution_id);
end;
$$;

create or replace function private.complete_community_challenge_from_workout()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.status='COMPLETED' and old.status is distinct from 'COMPLETED' then
    update public.community_challenge_acceptances
    set status='COMPLETED',completed_at=coalesce(new.completed_at,now()),updated_at=now()
    where workout_execution_id=new.id and status='ACCEPTED';
  end if;
  return new;
end;
$$;
alter function private.complete_community_challenge_from_workout() owner to postgres;
create trigger complete_community_challenge_from_workout
after update of status on public.workout_executions
for each row execute function private.complete_community_challenge_from_workout();

revoke all on public.community_challenges,public.community_challenge_acceptances from public,anon,authenticated;
grant select on public.community_challenges,public.community_challenge_acceptances to authenticated;
revoke all on function public.create_community_challenge(uuid,text,text,integer,uuid,timestamptz,uuid),public.accept_community_challenge(uuid),public.list_community_group_challenges(uuid),public.list_my_accepted_community_challenges(),public.list_my_community_challenge_workouts() from public,anon,authenticated;
grant execute on function public.create_community_challenge(uuid,text,text,integer,uuid,timestamptz,uuid),public.accept_community_challenge(uuid),public.list_community_group_challenges(uuid),public.list_my_accepted_community_challenges(),public.list_my_community_challenge_workouts() to authenticated;

do $$
begin
  if has_function_privilege('anon','public.create_community_challenge(uuid,text,text,integer,uuid,timestamptz,uuid)','EXECUTE') then raise exception 'anon_challenge_execute_exposed'; end if;
  if not has_function_privilege('authenticated','public.accept_community_challenge(uuid)','EXECUTE') then raise exception 'challenge_accept_execute_missing'; end if;
end;
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
    join public.app_users owner_user on owner_user.id=community.owner_user_id
    left join public.student_profiles student on student.user_id=owner_user.id
    left join public.trainer_profiles trainer on trainer.user_id=owner_user.id
    where community.visibility='DISCOVERABLE' and community.status='ACTIVE' and community.archived_at is null
      and private.community_entitlement_allowed(community.id)
      and (clean_query='' or lower(community.name) like '%'||clean_query||'%' or lower(coalesce(community.description,'')) like '%'||clean_query||'%' or lower(coalesce(student.preferred_name,trainer.preferred_name,trainer.display_name,owner_user.display_name,'')) like '%'||clean_query||'%')
    order by community.created_at desc,community.id limit greatest(1,least(coalesce(p_limit,20),40))
  ) candidate;
  return result;
end;
$$;

create or replace function public.request_or_join_community_group(p_group_id uuid)
returns text language plpgsql security definer set search_path='' as $$
declare actor uuid:=(select auth.uid()); target public.trainer_communities; next_status text; membership_id uuid;
begin
  select * into target from public.trainer_communities where id=p_group_id and status='ACTIVE' and archived_at is null for update;
  if actor is null or target.id is null or target.visibility<>'DISCOVERABLE' or target.join_policy='INVITE_ONLY' or not private.community_entitlement_allowed(target.id) then raise exception 'group_not_available'; end if;
  next_status:=case when target.join_policy='OPEN' then 'ACTIVE' else 'PENDING' end;
  insert into public.community_group_memberships(group_id,app_user_id,role,status,origin,joined_at)
  values(target.id,actor,'MEMBER',next_status,case when next_status='ACTIVE' then 'DIRECT' else 'JOIN_REQUEST' end,case when next_status='ACTIVE' then now() else null end)
  on conflict(group_id,app_user_id) do update set role='MEMBER',status=excluded.status,origin=excluded.origin,joined_at=excluded.joined_at,left_at=null,revoked_at=null,updated_at=now()
  where public.community_group_memberships.status in ('LEFT','REMOVED','REVOKED')
  returning id into membership_id;
  if membership_id is null then select id into membership_id from public.community_group_memberships where group_id=target.id and app_user_id=actor; end if;
  if next_status='PENDING' then
    insert into public.community_notifications(recipient_user_id,actor_user_id,group_id,notification_type,dedupe_key)
    values(target.owner_user_id,actor,target.id,'JOIN_REQUEST','join-request:'||membership_id::text)
    on conflict(recipient_user_id,dedupe_key) do update set read_at=null,created_at=now(),actor_user_id=excluded.actor_user_id;
  end if;
  return next_status;
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
  if p_action='APPROVE' and current_member.status='ACTIVE' then return;
  elsif p_action='REJECT' and current_member.status='REVOKED' then return;
  elsif p_action='APPROVE' and current_member.status='PENDING' then
    update public.community_group_memberships set status='ACTIVE',origin='DIRECT',joined_at=now(),revoked_at=null,left_at=null,updated_at=now() where id=current_member.id;
    insert into public.community_notifications(recipient_user_id,actor_user_id,group_id,notification_type,dedupe_key) values(p_app_user_id,(select auth.uid()),p_group_id,'JOIN_REQUEST_APPROVED','join-approved:'||current_member.id::text) on conflict do nothing;
  elsif p_action='REJECT' and current_member.status='PENDING' then
    update public.community_group_memberships set status='REVOKED',revoked_at=now(),updated_at=now() where id=current_member.id;
    insert into public.community_notifications(recipient_user_id,actor_user_id,group_id,notification_type,dedupe_key) values(p_app_user_id,(select auth.uid()),p_group_id,'JOIN_REQUEST_REJECTED','join-rejected:'||current_member.id::text) on conflict do nothing;
  elsif p_action='REMOVE' and current_member.status='ACTIVE' then
    update public.community_group_memberships set status='REMOVED',revoked_at=now(),updated_at=now() where id=current_member.id;
    insert into public.community_moderation_events(group_id,actor_user_id,action,details) values(p_group_id,(select auth.uid()),'MEMBER_REMOVED','member:'||p_app_user_id::text);
  elsif p_action='PROMOTE' and actor_role='OWNER' and current_member.status='ACTIVE' then update public.community_group_memberships set role='MODERATOR',updated_at=now() where id=current_member.id;
  elsif p_action='DEMOTE' and actor_role='OWNER' and current_member.status='ACTIVE' then update public.community_group_memberships set role='MEMBER',updated_at=now() where id=current_member.id;
  else raise exception 'invalid_membership_transition'; end if;
  update public.community_notifications set read_at=coalesce(read_at,now()) where recipient_user_id=(select auth.uid()) and dedupe_key='join-request:'||current_member.id::text;
end;
$$;
