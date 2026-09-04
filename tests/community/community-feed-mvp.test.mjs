import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const [foundation, social, feed, composer, groupViews, studentShell, trainerNav, completion, upload, imagePipeline, workspace, features, actions] = await Promise.all([
  read("../../supabase/migrations/202609030002_community_feed_mvp.sql"),
  read("../../supabase/migrations/20260904010617_community_social_v1_foundation.sql"),
  read("../../src/components/community/CommunityFeed.tsx"),
  read("../../src/components/community/CommunityComposer.tsx"),
  read("../../src/components/community/CommunityGroupViews.tsx"),
  read("../../src/components/student/StudentAppShell.tsx"),
  read("../../src/components/dashboard/BottomNavigation.tsx"),
  read("../../src/components/student/WorkoutCompletionShare.tsx"),
  read("../../src/app/api/community/photos/route.ts"),
  read("../../src/lib/community/image.ts"),
  read("../../src/lib/community/workspace.ts"),
  read("../../src/lib/community/features.ts"),
  read("../../src/app/actions/community.ts"),
]);

test("Community Social V1 persists explicit group memberships and preserves relationship origin", () => {
  for (const token of ["community_group_memberships", "OWNER", "MODERATOR", "MEMBER", "PENDING", "INVITED", "ACTIVE", "REMOVED", "REVOKED", "LEFT", "RELATIONSHIP", "DIRECT", "JOIN_REQUEST"]) assert.match(social, new RegExp(token));
  assert.match(social, /origin='RELATIONSHIP'/);
  assert.match(social, /source_relationship_id=new\.id/);
  assert.match(social, /public\.community_group_memberships\.origin='RELATIONSHIP'/);
  assert.match(social, /community_group_memberships\.origin='RELATIONSHIP' then 'ACTIVE'/);
  assert.match(social, /unique\(group_id,app_user_id\)/);
});

test("aggregate feed is ACTIVE-member-only, cursor ordered, append-only UI", () => {
  assert.match(social, /list_my_community_feed/);
  assert.match(social, /membership\.status='ACTIVE'/);
  assert.match(social, /published_at desc,post\.id desc/);
  assert.match(social, /\(post\.published_at,post\.id\)<\(p_before_published_at,p_before_id\)/);
  assert.match(feed, /IntersectionObserver/);
  assert.match(feed, /setPosts\(\(current\) => \[\.\.\.current,/);
  assert.doesNotMatch(feed, /Publicações mais antigas/);
  assert.doesNotMatch(feed, /community switcher/i);
});

test("Feed and Groups share one destination and preserve navigation state", () => {
  assert.match(feed, />Feed</); assert.match(feed, />Grupos</);
  assert.match(feed, /sessionStorage/); assert.match(feed, /scrollY/); assert.match(feed, /history\.replaceState/);
  assert.match(studentShell, /Comunidade/); assert.match(trainerNav, /\/dashboard\/community/);
  assert.doesNotMatch(studentShell, /Eventos|Seguindo/); assert.doesNotMatch(feed, /Patrocinado|SALE|WhatsApp/);
});

test("group discovery leaks metadata only and management is server-authoritative", () => {
  assert.match(social, /search_community_groups/); assert.match(social, /visibility='DISCOVERABLE'/);
  assert.match(social, /private\.community_group_role\(target\.id\) is null and target\.visibility<>'DISCOVERABLE'/);
  assert.match(social, /private\.community_group_role\(target\.id\) is null then raise exception 'community_access_denied'/);
  for (const operation of ["create_community_group", "update_community_group", "archive_community_group", "invite_community_group_member", "manage_community_group_member", "set_community_group_rules"]) assert.match(social, new RegExp(operation));
  assert.match(groupViews, /Somente por convite/); assert.match(groupViews, /Solicitar entrada/); assert.match(groupViews, /Convidar alunos/); assert.match(groupViews, /Tornar moderador/);
});

test("posting policy, workout ownership and optimistic interactions are enforced", () => {
  assert.match(social, /OWNER_MODERATORS_ONLY/); assert.match(social, /ALL_MEMBERS/);
  assert.match(social, /private\.community_can_post/); assert.match(social, /execution\.status='COMPLETED'/); assert.match(social, /student\.user_id=actor/);
  assert.match(completion, /Publicar na comunidade/);
  assert.match(feed, /const before = post/); assert.match(feed, /onChange\(before\)/); assert.match(feed, /optimistic: true/);
  assert.match(actions, /p_client_mutation_id/); assert.match(social, /community_posts_author_mutation_idx/); assert.match(social, /community_comments_author_mutation_idx/);
  assert.doesNotMatch(feed, /window\.(prompt|confirm)/); assert.doesNotMatch(composer, /window\.(prompt|confirm)/);
});

test("ranking derives active days from completed workouts after joined_at", () => {
  assert.match(social, /list_community_group_ranking/); assert.match(social, /execution\.status='COMPLETED'/);
  assert.match(social, /execution\.completed_at>=eligible\.joined_at/);
  assert.match(social, /group by eligible\.app_user_id,\(execution\.completed_at at time zone target\.timezone\)::date/);
  assert.match(social, /active_days desc,scores\.reached_at asc,scores\.app_user_id asc/);
  assert.match(groupViews, /Este mês/); assert.match(groupViews, /Todo o período/); assert.match(groupViews, /dias ativos/);
  assert.doesNotMatch(social, /actual_load|actual_reps|student_note/);
});

test("moderation and social notifications have real persisted destinations", () => {
  for (const token of ["community_moderation_events", "community_notifications", "GROUP_INVITE", "JOIN_REQUEST_APPROVED", "JOIN_REQUEST_REJECTED", "COMMENT_ON_MY_POST", "REACTION_ON_MY_POST", "PINNED_ANNOUNCEMENT"]) assert.match(social, new RegExp(token));
  assert.match(social, /resolve_community_report/); assert.match(social, /CONTENT_HIDDEN/);
  assert.match(groupViews, /Denúncias/); assert.match(feed, /markCommunityNotificationsReadAction/);
  assert.doesNotMatch(social, /NEW_POST/);
});

test("photo posts use authenticated RLS storage and an EXIF-stripping server pipeline", () => {
  assert.match(foundation, /'community-post-media','community-post-media',false/);
  assert.match(social, /authorized members upload scoped community media/); assert.match(social, /private\.community_can_post/);
  assert.match(features, /COMMUNITY_PHOTO_POSTING_ENABLED = true/);
  assert.match(imagePipeline, /sharp/); assert.match(imagePipeline, /rotate\(\)\.resize/); assert.match(imagePipeline, /\.webp/); assert.doesNotMatch(imagePipeline, /withMetadata/);
  assert.match(upload, /create_community_photo_post_v1/); assert.match(upload, /storage\.from\("community-post-media"\)\.remove/); assert.doesNotMatch(upload, /createCommunityAdminClient|service.role|SERVICE_ROLE/i);
  assert.match(composer, /xhr\.upload\.onprogress/); assert.match(composer, /xhrRef\.current\?\.abort/); assert.match(composer, /Tentar novamente/); assert.match(composer, /slice\(0, 4\)/);
  assert.match(social, /revoke all on function public\.create_community_photo_post_as[\s\S]*service_role/);
});

test("production workspace has no silent mock fallback", () => {
  assert.match(workspace, /isDemoWorkspaceRequest/); assert.match(workspace, /listCommunityFeed/); assert.match(workspace, /searchCommunityGroups/);
  assert.match(workspace, /unavailableReason: message\.includes\("entitlement"\) \? "ENTITLEMENT" : "ERROR"/);
  assert.doesNotMatch(workspace, /catch.*demoCommunityWorkspace/s);
});
