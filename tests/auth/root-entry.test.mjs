import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const rootPage = await readFile(new URL("../../src/app/page.tsx", import.meta.url), "utf8");

test("root resolves a valid session and otherwise renders the Cheipi entry", () => {
  assert.match(rootPage, /import \{ redirect \} from "next\/navigation"/);
  assert.match(rootPage, /supabase\.auth\.getUser\(\)/);
  assert.match(rootPage, /resolveAuthenticatedHome\(supabase, \{ nextPath \}\)/);
  assert.match(rootPage, /<CheipiEntry googleEnabled=\{configured\} nextPath=\{nextPath\} \/>/);
  assert.doesNotMatch(rootPage, /findPublishedBySlug|rafael-martins|return null/);
});
