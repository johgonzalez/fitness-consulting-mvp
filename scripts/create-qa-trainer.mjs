#!/usr/bin/env node

import {
  createHostedAdminClient,
  formatCreatedOutput,
  generateQaTrainerCredentials,
  qaTrainerMetadata,
} from "./qa/qa-trainer-utility.mjs";

let createdUserId = null;
let admin = null;

try {
  admin = createHostedAdminClient();
  const credentials = generateQaTrainerCredentials();
  const { data, error } = await admin.auth.admin.createUser({
    email: credentials.email,
    password: credentials.password,
    email_confirm: true,
    user_metadata: qaTrainerMetadata(),
  });

  if (error || !data.user) throw new Error("QA_TRAINER_CREATE_FAILED");
  createdUserId = data.user.id;

  if (!data.user.email_confirmed_at) {
    throw new Error("QA_TRAINER_CONFIRMATION_FAILED");
  }

  console.log(formatCreatedOutput(credentials));
} catch {
  if (admin && createdUserId) {
    await admin.auth.admin.deleteUser(createdUserId).catch(() => undefined);
  }
  console.error("QA TRAINER CREATION FAILED");
  process.exitCode = 1;
}
