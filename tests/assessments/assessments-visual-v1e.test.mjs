import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");

test("assessment migration uses the shared canonical visual layer", async () => {
  const [layout, styles] = await Promise.all([
    read("src/app/layout.tsx"),
    read("src/app/assessments-progress-v1.css"),
  ]);
  assert.match(layout, /assessments-progress-v1\.css/);
  assert.match(styles, /var\(--pp-shell-solid\)/);
  assert.match(styles, /var\(--pp-surface-subtle\)/);
  assert.doesNotMatch(styles, /#[0-9a-f]{3,8}/i);
});

test("student response associates its factual question with every answer control", async () => {
  const experience = await read("src/components/assessments/StudentAssessmentExperience.tsx");
  assert.match(experience, /labelledBy="assessment-question-title"/);
  assert.match(experience, /aria-describedby/);
  assert.match(experience, /id="assessment-question-error"/);
  assert.match(experience, /role="progressbar" aria-label="Progresso da avaliação"/);
  assert.doesNotMatch(experience, /<main className="pp-student-assessment/);
});

test("assessment form keeps mobile input ergonomics and factual lifecycle", async () => {
  const [styles, domain] = await Promise.all([
    read("src/app/assessments-progress-v1.css"),
    read("src/lib/domain/assessments.ts"),
  ]);
  assert.match(styles, /font-size:\s*1rem/);
  assert.match(styles, /min-height:\s*48px/);
  for (const status of ["DRAFT", "SENT", "ANSWERED", "IN_REVIEW", "COMPLETED"]) {
    assert.match(domain, new RegExp(`"${status}"`));
  }
});
