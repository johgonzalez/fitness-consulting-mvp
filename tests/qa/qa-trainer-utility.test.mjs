import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  QA_EMAIL_PATTERN,
  deleteFreshQaTrainer,
  formatCreatedOutput,
  generateQaTrainerCredentials,
  isMarkedQaTrainer,
  parseQaEmailArgument,
  requireHostedAdminEnvironment,
} from "../../scripts/qa/qa-trainer-utility.mjs";

test("generates unique-pattern credentials with strong random entropy", () => {
  let call = 0;
  const bytes = (size) => Buffer.alloc(size, (call += 1));
  const credentials = generateQaTrainerCredentials(
    new Date("2026-08-26T12:34:56.000Z"),
    bytes,
  );

  assert.match(credentials.email, QA_EMAIL_PATTERN);
  assert.match(credentials.password, /^Pp!7-[A-Za-z0-9_-]{32}$/);
  assert.notEqual(credentials.email, credentials.password);
});

test("requires only the hosted URL and service-role environment values", () => {
  assert.deepEqual(
    requireHostedAdminEnvironment({
      NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "secret-value",
    }),
    {
      url: "https://project.supabase.co",
      serviceRoleKey: "secret-value",
    },
  );
  assert.throws(() => requireHostedAdminEnvironment({}));
});

test("cleanup accepts only marked onboarding QA identities", () => {
  const email = "trainer.onboarding.qa+20260826123456-0123456789@example.test";
  assert.equal(
    isMarkedQaTrainer({
      email,
      user_metadata: {
        pperfil_qa: true,
        qa_purpose: "trainer_onboarding",
      },
    }),
    true,
  );
  assert.equal(isMarkedQaTrainer({ email, user_metadata: {} }), false);
  assert.equal(
    isMarkedQaTrainer({
      email: "real.user@example.com",
      user_metadata: {
        pperfil_qa: true,
        qa_purpose: "trainer_onboarding",
      },
    }),
    false,
  );
  assert.equal(parseQaEmailArgument(["--email", email]), email);
  assert.throws(() => parseQaEmailArgument(["--email", "real.user@example.com"]));
});

test("creation output contains only the approved credential handoff", () => {
  const email = "trainer.onboarding.qa+20260826123456-0123456789@example.test";
  const output = formatCreatedOutput({ email, password: "Pp!7-temporary" });

  assert.equal(
    output,
    `QA TRAINER CREATED\n\nEMAIL:\n${email}\n\nPASSWORD:\nPp!7-temporary\n\nLOGIN:\nhttps://fitness-consulting-mvp-git-codex-v1-732185-josepgonzalez25-8190.vercel.app/login\n\nEXPECTED DESTINATION:\n/onboarding`,
  );
});

test("creation script confirms Auth email without creating product records", async () => {
  const source = await readFile(
    new URL("../../scripts/create-qa-trainer.mjs", import.meta.url),
    "utf8",
  );

  assert.match(source, /email_confirm:\s*true/);
  assert.doesNotMatch(source, /trainer_profiles|ensure_my_app_user|user_roles/);
  assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE_KEY[^;]*console/);
});

test("cleanup deletes only a marked Auth-only QA identity", async () => {
  const email = "trainer.onboarding.qa+20260826123456-0123456789@example.test";
  let deletedUserId = null;
  const admin = createCleanupAdminMock({ email, appIdentity: null });
  admin.auth.admin.deleteUser = async (userId) => {
    deletedUserId = userId;
    return { error: null };
  };

  await deleteFreshQaTrainer(admin, email);
  assert.equal(deletedUserId, "qa-user-id");
});

test("cleanup fails closed once product identity exists", async () => {
  const email = "trainer.onboarding.qa+20260826123456-0123456789@example.test";
  let deletionAttempted = false;
  const admin = createCleanupAdminMock({
    email,
    appIdentity: { id: "qa-user-id" },
  });
  admin.auth.admin.deleteUser = async () => {
    deletionAttempted = true;
    return { error: null };
  };

  await assert.rejects(
    deleteFreshQaTrainer(admin, email),
    /QA_TRAINER_DELETE_BLOCKED_PRODUCT_DATA/,
  );
  assert.equal(deletionAttempted, false);
});

function createCleanupAdminMock({ email, appIdentity }) {
  const query = {
    select() {
      return this;
    },
    eq() {
      return this;
    },
    async maybeSingle() {
      return { data: appIdentity, error: null };
    },
  };

  return {
    auth: {
      admin: {
        async listUsers() {
          return {
            data: {
              users: [
                {
                  id: "qa-user-id",
                  email,
                  user_metadata: {
                    pperfil_qa: true,
                    qa_purpose: "trainer_onboarding",
                  },
                },
              ],
            },
            error: null,
          };
        },
        async deleteUser() {
          return { error: null };
        },
      },
    },
    from(table) {
      assert.equal(table, "app_users");
      return query;
    },
  };
}
