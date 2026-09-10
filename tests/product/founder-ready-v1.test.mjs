import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (file) => readFile(new URL(`../../${file}`, import.meta.url), "utf8");

test("lead detail exposes only factual contact channels", async () => {
  const source = await read("src/app/dashboard/leads/[id]/page.tsx");
  assert.match(source, /https:\/\/wa\.me\/\$\{contactPhone\}/);
  assert.match(source, /tel:\$\{contactPhone\}/);
  assert.match(source, /mailto:\$\{lead\.email\}/);
  assert.match(source, /Canal específico não registrado/);
  assert.doesNotMatch(source, /probabilidade|timeline|mensagem interna/i);
});

test("Meu Site links acquisition to real leads without invented analytics", async () => {
  const source = await read("src/components/dashboard/SiteBuilder.tsx");
  const business = await read("src/app/dashboard/business/page.tsx");
  assert.match(business, /href: "\/dashboard\/leads", label: "Leads"/);
  assert.match(source, /section === "performance"/);
  assert.match(source, /<EmptyState[^>]*title="Métricas ainda não disponíveis"[^>]*description="O acompanhamento de visitas e conversões ainda não está disponível\."/);
  assert.match(source, /TemplatePreview profile=\{profile\}/);
});

test("billing presents safe product language for every persisted state", async () => {
  const source = await read("src/app/dashboard/settings/billing/page.tsx");
  for (const state of ["FREE", "ACTIVE", "GRACE", "SUSPENDED"]) assert.match(source, new RegExp(`${state}:`));
  assert.match(source, /cancel_at_period_end/);
  assert.match(source, /current_period_end/);
  assert.doesNotMatch(source, /provider_customer|provider_subscription|stripe_/i);
});

test("business exposes canonical billing without duplicate settings or dead future controls", async () => {
  const [business, profile] = await Promise.all([
    read("src/app/dashboard/business/page.tsx"), read("src/components/dashboard/ProfileEditor.tsx"),
  ]);
  assert.match(business, /href: "\/dashboard\/settings\/billing", label: "Meu plano"/);
  assert.equal((business.match(/\/dashboard\/settings\/billing/g) ?? []).length, 1);
  assert.doesNotMatch(profile, /\/dashboard\/settings\/billing/);
  for (const source of [business, profile]) {
    assert.doesNotMatch(source, /Notificações.*Em breve|Integrações.*Em breve|Privacidade e dados.*Em breve/);
  }
});

test("demo workout media is deterministic and local-first", async () => {
  const source = await read("src/components/student/StudentWorkoutMedia.tsx");
  const localFirst = source.indexOf("deterministicDemoMedia");
  const remoteLoop = source.indexOf("for (const item of sorted)");
  assert.ok(localFirst >= 0 && localFirst < remoteLoop);
});

test("student workout action remains visible above the supported bottom navigation", async () => {
  const css = await read("src/app/student-workouts.css");
  assert.match(css, /\.pp-student-app:not\(\.pp-student-app--immersive\) \.pp-workout-sticky-action\{[^}]*bottom:calc\(70px \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(css, /\.pp-workout-overview\{padding-bottom:160px\}/);
});
