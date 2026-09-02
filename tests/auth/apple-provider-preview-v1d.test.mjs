import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");

test("Google remains real while Apple is an announced future preview only", async () => {
  const [providers, form, action, css] = await Promise.all([
    read("src/components/auth/AuthProviderControls.tsx"),
    read("src/components/auth/AuthForm.tsx"),
    read("src/app/actions/auth.ts"),
    read("src/app/cheipi-auth-entry-v1.css"),
  ]);
  assert.match(providers, /action=\{startGoogleOAuth\}/);
  assert.match(providers, /\/auth\/providers\/google-dark-square@2x\.png/);
  assert.match(providers, /\/auth\/providers\/apple-black-square@2x\.png/);
  assert.match(providers, /Entrar com Apple — em breve/);
  assert.match(providers, /role="status"/);
  assert.match(css, /\.cheipi-provider-controls/);
  assert.match(css, /width: 58px/);
  assert.doesNotMatch(providers, /signInWithOAuth[\s\S]{0,300}apple|provider:\s*["']apple["']/i);
  assert.doesNotMatch(form, /startGoogleOAuth|apple-black-square|google-dark-square/);
  assert.match(action, /provider: "google"/);
});
