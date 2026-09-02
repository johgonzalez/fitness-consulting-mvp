import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");

test("progress charts communicate only recorded factual values", async () => {
  const content = await read("src/components/progress/ProgressContent.tsx");
  assert.match(content, /role="img" aria-label=/);
  assert.match(content, /week\.count === 0 \? "0%"/);
  assert.match(content, /focal\?\.delta/);
  assert.doesNotMatch(content, /health score|fitness score|readiness score|risk score|streak/i);
});

test("progress surfaces use open canonical hierarchy without decorative gradients", async () => {
  const styles = await read("src/components/progress/progress.module.css");
  const migration = styles.slice(styles.indexOf("/* Visual Sprint 1E"));
  assert.match(migration, /var\(--pp-shell-solid\)/);
  assert.match(migration, /background:\s*transparent/);
  assert.doesNotMatch(migration, /linear-gradient|radial-gradient/);
});

test("assessment history is navigable and private photos are deferred", async () => {
  const content = await read("src/components/progress/ProgressContent.tsx");
  assert.match(content, /\/student\/assessments\/\$\{assessment\.id\}/);
  assert.match(content, /\/dashboard\/assessments\/\$\{assessment\.id\}/);
  assert.match(content, /loading="lazy" decoding="async"/);
  assert.match(content, /Foto privada de progresso/);
});
