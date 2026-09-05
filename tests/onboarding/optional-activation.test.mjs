import assert from 'node:assert/strict';
import test from 'node:test';
import { stageOf } from '../../src/lib/onboarding/stages.ts';
import { resolveAuthenticatedHome } from '../../src/lib/navigation/authenticated-home.ts';

const complete = { identity_completed_at: 'now', professional_completed_at: 'now', social_completed_at: 'now', slug_completed_at: 'now' };
test('optional student step cannot bypass required profile setup', () => {
  assert.equal(stageOf(null, null, 'student'), 'identity');
  assert.equal(stageOf({ identity_completed_at: 'now' }, null, 'student'), 'professional');
  assert.equal(stageOf({ ...complete, social_completed_at: null }, null, 'student'), 'social');
  assert.equal(stageOf({ ...complete, slug_completed_at: null }, null, 'student'), 'slug');
  assert.equal(stageOf(complete, null, 'student'), 'template');
});
test('a private profile can publish, postpone, and resume without an access code', () => {
  assert.equal(stageOf(complete, { published: false }), 'publication');
  assert.equal(stageOf(complete, { published: false }, 'student'), 'student');
  assert.equal(stageOf(complete, { published: false }, 'published'), 'publication');
  assert.equal(stageOf(complete, { published: true }), 'published');
});
function client(overrides = {}) {
  const calls = [];
  const results = {
    get_my_app_identity: { data: { id: 'trainer', roles: ['trainer'] } },
    get_my_pending_student_invitations: { data: [] },
    get_my_trainer_profile: { data: { onboarding_completed_at: 'now', publication_requested_at: null } },
    ...overrides,
  };
  return { calls, rpc: async name => { calls.push(name); assert.ok(name in results, `Unexpected RPC ${name}`); return results[name]; } };
}
test('completed trainer goes home with no students, invitations or publication intent', async () => {
  const supabase = client();
  assert.equal(await resolveAuthenticatedHome(supabase), '/dashboard');
  assert.deepEqual(supabase.calls, ['get_my_app_identity', 'get_my_pending_student_invitations', 'get_my_trainer_profile']);
});
test('incomplete or unavailable profile still requires onboarding', async () => {
  for (const result of [{ data: null }, { data: { onboarding_completed_at: null } }, { error: { message: 'unavailable' } }]) {
    assert.equal(await resolveAuthenticatedHome(client({ get_my_trainer_profile: result })), '/onboarding');
  }
});
test('pending student invitation and explicit invitation links retain priority', async () => {
  assert.equal(await resolveAuthenticatedHome(client({ get_my_pending_student_invitations: { data: [{ invitation_id: 'invite' }] } })), '/access/invitations');
  const nextPath = `/invite/${'a'.repeat(64)}`;
  assert.equal(await resolveAuthenticatedHome(client(), { nextPath }), nextPath);
});
test('student relationships and dual-role choice remain required', async () => {
  const student = client({ get_my_app_identity: { data: { id: 'student', roles: ['student'] } }, get_my_student_entry_state: { data: { student_role_active: true, active_relationship: false } } });
  assert.equal(await resolveAuthenticatedHome(student, { nextPath: '/dashboard' }), '/access/student');
  const dual = client({ get_my_app_identity: { data: { id: 'both', roles: ['trainer', 'student'] } } });
  assert.equal(await resolveAuthenticatedHome(dual), '/login?choose=1');
  assert.equal(await resolveAuthenticatedHome(dual, { context: 'trainer' }), '/dashboard');
});
