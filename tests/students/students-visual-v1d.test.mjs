import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");

test("Students remains factual, searchable and wired to existing operations", async () => {
  const [page, actions] = await Promise.all([
    read("src/app/dashboard/students/page.tsx"),
    read("src/app/actions/students.ts"),
  ]);
  assert.match(page, /role="search"/);
  assert.match(page, /Nome ou e-mail/);
  assert.match(page, /getStudentsWorkspace/);
  assert.match(page, /InviteStudentForm/);
  assert.match(page, /RevokeInvitationAction/);
  assert.match(page, /InvitationManagementActions/);
  assert.match(actions, /inviteStudentAction/);
  assert.match(actions, /revokeInvitationAction/);
});
test("Student Detail shows only supported factual domains with progressive navigation", async () => {
  const [page, chrome, css] = await Promise.all([
    read("src/app/dashboard/students/[id]/page.tsx"),
    read("src/components/students/StudentRecordChrome.tsx"),
    read("src/app/students-detail-mobile-v1.css"),
  ]);
  for (const factualSource of ["getWorkoutIndex", "getTrainerAssessmentIndex", "getTrainerProgressWorkspace", "getStudentDetail"]) {
    assert.match(page, new RegExp(factualSource));
  }
  for (const section of ["Treinos", "Avaliações", "Progresso"]) assert.match(chrome, new RegExp(section));
  assert.doesNotMatch(chrome, /Financeiro|Histórico|Em breve/);
  assert.doesNotMatch(page, /adherence|risk|health score|engagement/i);
  assert.match(css, /var\(--pp-surface-subtle\)/);
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}/i);
});
