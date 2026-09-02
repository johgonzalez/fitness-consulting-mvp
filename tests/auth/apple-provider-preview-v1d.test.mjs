import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");

test("Google remains real while Apple is an announced future preview only", async () => {
  const [form, action, css] = await Promise.all([
    read("src/components/auth/AuthForm.tsx"),
    read("src/app/actions/auth.ts"),
    read("src/app/mobile-app-hardening-v1.css"),
  ]);
  assert.match(form, /action=\{startGoogleOAuth\}/);
  assert.match(form, /developers\.google\.com\/static\/identity\/images\/g-logo\.png/);
  assert.match(form, /appleid\.cdn-apple\.com\/appleid\/button/);
  assert.match(form, /Entrar com Apple — em breve/);
  assert.match(form, /role="status"/);
  assert.match(css, /\.pc-auth-providers/);
  assert.match(css, /width:52px/);
  assert.doesNotMatch(form, /signInWithOAuth[\s\S]{0,300}apple|provider:\s*["']apple["']/i);
  assert.match(action, /provider: "google"/);
});
