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

test("Auth root is session-aware and does not flash Welcome for a valid session", () => {
  assert.match(root, /supabase\.auth\.getUser\(\)/);
  assert.match(root, /redirect\(await resolveAuthenticatedHome/);
  assert.match(root, /return <CheipiEntry/);
});

test("Welcome keeps the approved cinematic PPerfil composition", () => {
  assert.match(entry, /SPLASH_DURATION_MS = 900/);
  assert.match(entry, /SPLASH_SESSION_KEY = "pperfil:entry-splash:v1"/);
  assert.match(entry, /"checking" \| "splash" \| "welcome"/);
  assert.match(entry, /if \(splashSeen\) \{[\s\S]*setEntryStage\("welcome"\)/);
  assert.equal((entry.match(/className: "cheipi-welcome__tile--/g) ?? []).length, 5);
  assert.match(entry, /aria-label="PPerfil">PPERFIL<\/h1>/);
  assert.match(entry, /A plataforma que conecta\./);
  assert.match(entry, /<Mail aria-hidden="true"/);
  assert.match(entry, /<span>Usar e-mail<\/span>/);
  assert.match(entry, /href="\/terms">Termos de Uso/);
  assert.match(entry, /href="\/privacy">Política de Privacidade/);
  assert.doesNotMatch(entry, /Todo treino\.|Toda evolução\.|Juntos\.|cheipi-welcome__orb/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /\.cheipi-welcome__tile \{[\s\S]*animation: cheipi-tile-drift 24s/);
});

test("social providers remain available at Welcome and the email login", () => {
  assert.match(providers, /startGoogleOAuth/);
  assert.match(providers, /Entrar com Apple — em breve/);
  assert.doesNotMatch(providers, /provider:\s*["']apple["']/i);
  assert.match(form, /socialOptions\?: ReactNode/);
  assert.match(form, /!signupMode \? socialOptions : null/);
  assert.match(login, /<AuthProviderControls googleEnabled=\{configured\} googleFirst nextPath=\{next\} context=\{context\} \/>/);
  assert.match(login, /ou continue com/);
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
