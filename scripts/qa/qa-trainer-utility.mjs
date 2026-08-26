import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

export const QA_LOGIN_URL =
  "https://fitness-consulting-mvp-git-codex-v1-732185-josepgonzalez25-8190.vercel.app/login";

export const QA_EMAIL_PATTERN =
  /^trainer\.onboarding\.qa\+\d{14}-[a-f0-9]{10}@example\.test$/;

const QA_METADATA = Object.freeze({
  pperfil_qa: true,
  qa_purpose: "trainer_onboarding",
});

export function requireHostedAdminEnvironment(environment = process.env) {
  const url = environment.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = environment.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceRoleKey) {
    throw new Error("QA_TRAINER_CONFIGURATION_REQUIRED");
  }

  return { url, serviceRoleKey };
}

export function createHostedAdminClient(environment = process.env) {
  const { url, serviceRoleKey } = requireHostedAdminEnvironment(environment);

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function generateQaTrainerCredentials(now = new Date(), bytes = randomBytes) {
  const timestamp = now.toISOString().replace(/\D/g, "").slice(0, 14);
  const suffix = bytes(5).toString("hex");
  const entropy = bytes(24).toString("base64url");

  return {
    email: `trainer.onboarding.qa+${timestamp}-${suffix}@example.test`,
    password: `Pp!7-${entropy}`,
  };
}

export function qaTrainerMetadata(createdAt = new Date()) {
  return {
    ...QA_METADATA,
    qa_created_at: createdAt.toISOString(),
  };
}

export function isMarkedQaTrainer(user) {
  return (
    QA_EMAIL_PATTERN.test(user?.email ?? "") &&
    user?.user_metadata?.pperfil_qa === true &&
    user?.user_metadata?.qa_purpose === QA_METADATA.qa_purpose
  );
}

export function parseQaEmailArgument(argv) {
  const inline = argv.find((argument) => argument.startsWith("--email="));
  const emailIndex = argv.indexOf("--email");
  const email = inline?.slice("--email=".length) ?? argv[emailIndex + 1];

  if (!email || !QA_EMAIL_PATTERN.test(email)) {
    throw new Error("QA_TRAINER_EMAIL_REQUIRED");
  }

  return email;
}

export async function findAuthUserByEmail(admin, email) {
  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error("QA_TRAINER_LOOKUP_FAILED");

    const match = data.users.find((user) => user.email === email);
    if (match) return match;
    if (data.users.length < 1000) return null;
  }

  throw new Error("QA_TRAINER_LOOKUP_LIMIT_REACHED");
}

export async function deleteFreshQaTrainer(admin, email) {
  const user = await findAuthUserByEmail(admin, email);

  if (!user || !isMarkedQaTrainer(user)) {
    throw new Error("QA_TRAINER_NOT_FOUND_OR_UNSAFE");
  }

  // Once onboarding creates app_users, deleting auth.users may cascade into
  // product records. Refuse instead of guessing which data is disposable.
  const { data: appIdentity, error: identityError } = await admin
    .from("app_users")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (identityError) throw new Error("QA_TRAINER_SAFETY_CHECK_FAILED");
  if (appIdentity) throw new Error("QA_TRAINER_DELETE_BLOCKED_PRODUCT_DATA");

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) throw new Error("QA_TRAINER_DELETE_FAILED");

  return user;
}

export function formatCreatedOutput({ email, password }) {
  return [
    "QA TRAINER CREATED",
    "",
    "EMAIL:",
    email,
    "",
    "PASSWORD:",
    password,
    "",
    "LOGIN:",
    QA_LOGIN_URL,
    "",
    "EXPECTED DESTINATION:",
    "/onboarding",
  ].join("\n");
}

export function formatDeletedOutput(email) {
  return ["QA TRAINER DELETED", "", "EMAIL:", email].join("\n");
}
