import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");

test("approved profile and conversion renderers stay connected to TrainerSiteData", async () => {
  const [profile, conversion, dispatcher] = await Promise.all([
    read("src/components/templates/Template01.tsx"),
    read("src/components/templates/Template02.tsx"),
    read("src/components/templates/TrainerTemplate.tsx"),
  ]);

  assert.match(profile, /Template01\(\{ site \}: \{ site: TrainerSiteData \}\)/);
  assert.match(profile, /approved-template-profile/);
  assert.match(conversion, /Template02\(\{ site \}: \{ site: TrainerSiteData \}\)/);
  assert.match(conversion, /approved-template-conversion/);
  assert.match(dispatcher, /Template01,/);
  assert.match(dispatcher, /Template02,/);
});

test("both approved templates expose exactly six fixed sections", async () => {
  const registry = await read("src/lib/domain/template-registry.ts");

  assert.match(registry, /template_01:[\s\S]*approvedFixedSections\(\["hero", "about", "services", "digital_experience", "methodology", "final_cta"\]\)/);
  assert.match(registry, /template_02:[\s\S]*approvedFixedSections\(\["hero", "about", "digital_experience", "services", "testimonials", "final_cta"\]\)/);
  assert.match(registry, /reorderable: false/);
});

test("template styles are isolated and methodology is capped at five", async () => {
  const [profileCss, conversionCss, actions, normalizer] = await Promise.all([
    read("src/components/templates/approved-profile.css"),
    read("src/components/templates/approved-conversion.css"),
    read("src/app/actions/site-builder.ts"),
    read("src/lib/domain/trainer-site.ts"),
  ]);

  assert.match(profileCss, /@scope \(\.approved-template-profile\)/);
  assert.match(conversionCss, /@scope \(\.approved-template-conversion\)/);
  assert.match(actions, /const maxMethodologyItems = 5/);
  assert.match(normalizer, /methodology:[\s\S]*\.slice\(0, 5\)/);
});
