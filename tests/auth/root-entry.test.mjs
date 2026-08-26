import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const rootPage = await readFile(new URL("../../src/app/page.tsx", import.meta.url), "utf8");

test("root enters the application through login without a demo Trainer dependency", () => {
  assert.match(rootPage, /import \{ redirect \} from "next\/navigation"/);
  assert.match(rootPage, /redirect\("\/login"\)/);
  assert.doesNotMatch(rootPage, /findPublishedBySlug|rafael-martins|return null/);
});
