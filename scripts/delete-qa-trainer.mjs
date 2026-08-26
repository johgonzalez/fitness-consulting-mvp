#!/usr/bin/env node

import {
  createHostedAdminClient,
  deleteFreshQaTrainer,
  formatDeletedOutput,
  parseQaEmailArgument,
} from "./qa/qa-trainer-utility.mjs";

try {
  const email = parseQaEmailArgument(process.argv.slice(2));
  const admin = createHostedAdminClient();
  await deleteFreshQaTrainer(admin, email);

  console.log(formatDeletedOutput(email));
} catch (error) {
  const safeReason =
    error instanceof Error ? error.message : "QA_TRAINER_DELETE_FAILED";
  console.error(safeReason);
  process.exitCode = 1;
}
