import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const root = read("../../src/app/page.tsx");
const entry = read("../../src/components/auth/CheipiEntry.tsx");
const providers = read("../../src/components/auth/AuthProviderControls.tsx");
const form = read("../../src/components/auth/AuthForm.tsx");
const login = read("../../src/app/login/page.tsx");
const signup = read("../../src/app/signup/page.tsx");
const invite = read("../../src/app/invite/[token]/page.tsx");
const resolver = read("../../src/lib/navigation/authenticated-home.ts");
const validation = read("../../src/lib/validation/auth.ts");
const css = read("../../src/app/cheipi-auth-entry-v1.css");

test("Cheipi root is session-aware and does not flash Welcome for a valid session", () => {
  assert.match(root, /supabase\.auth\.getUser\(\)/);
  assert.match(root, /redirect\(await resolveAuthenticatedHome/);
  assert.match(root, /return <CheipiEntry/);
});

test("Welcome keeps the approved sparse fitness composition", () => {
  assert.match(entry, /SPLASH_DURATION_MS = 720/);
  assert.equal((entry.match(/className: "cheipi-welcome__tile--/g) ?? []).length, 5);
  assert.match(entry, /TREINO\./);
  assert.match(entry, /EVOLUÇÃO\./);
  assert.match(entry, /JUNTOS\./);
  assert.match(entry, /<CheipiBrand symbolOnly className="cheipi-welcome__orb-brand"/);
  assert.match(entry, />Usar e-mail<\/Link>/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /\.cheipi-welcome__tile \{[\s\S]*animation: cheipi-tile-drift 16s/);
});

test("social providers appear only before the email choice", () => {
  assert.match(providers, /startGoogleOAuth/);
  assert.match(providers, /Entrar com Apple — em breve/);
  assert.doesNotMatch(providers, /provider:\s*["']apple["']/i);
  assert.doesNotMatch(form, /startGoogleOAuth|Entrar com Apple|Continuar com Google/);
});

test("new account confirms its password and resolves role after verified identity", () => {
  assert.match(form, />Confirmar senha</);
  assert.match(form, /name="password_confirmation"/);
  assert.match(validation, /options\.requireConfirmation && password !== passwordConfirmation/);
  assert.doesNotMatch(signup, /AuthContextPicker/);
  assert.match(resolver, /roles\.length === 0\) return "\/login\?choose=1"/);
  assert.match(login, /if \(choose === "1"\)/);
});

test("invitation establishes Student context before authentication", () => {
  assert.match(invite, /<AuthProviderControls googleEnabled=\{configured\} nextPath=\{next\} context="student" \/>/);
  assert.match(signup, /invited \? "student" : normalizeAuthContext/);
});
