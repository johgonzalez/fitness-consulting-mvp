import assert from "node:assert/strict";
import test from "node:test";
import { contrastRatio, mixBrandColor, readableBrandText, textOnBrandColor } from "../../src/components/templates/brand-contrast.ts";

test("contrast calculation matches black and white reference values", () => {
  assert.equal(contrastRatio("#000000", "#ffffff"), 21);
  assert.equal(contrastRatio("#ffffff", "#ffffff"), 1);
  assert.equal(textOnBrandColor("#111318"), "#ffffff");
});

test("saved lime brand remains unchanged while both templates get readable CTA text", () => {
  const savedBrand = "#c7ff36";
  const essentialBackground = mixBrandColor(savedBrand, "#21173a", 0.78);
  assert.equal(textOnBrandColor(savedBrand), "#111318");
  assert.equal(textOnBrandColor(essentialBackground), "#111318");
  assert.ok(contrastRatio(textOnBrandColor(savedBrand), savedBrand) >= 4.5);
  assert.ok(contrastRatio(textOnBrandColor(essentialBackground), essentialBackground) >= 4.5);
});

test("foreground stays readable across light, saturated, dark and midtone brand colors", () => {
  for (let red = 0; red <= 255; red += 17) {
    for (let green = 0; green <= 255; green += 17) {
      for (let blue = 0; blue <= 255; blue += 17) {
        const background = `#${[red, green, blue].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
        assert.ok(contrastRatio(textOnBrandColor(background), background) >= 4.5, background);
      }
    }
  }
});

test("accent labels retain sufficient contrast on the templates' light surfaces", () => {
  for (const brand of ["#c7ff36", "#ffffff", "#ffff00", "#00ffff", "#0878ff", "#663399", "#000000"]) {
    const backgrounds = ["#ffffff", "#f0ebf8", "#f1efea", mixBrandColor(brand, "#ffffff", 0.12)];
    const text = readableBrandText(brand, backgrounds);
    for (const background of backgrounds) assert.ok(contrastRatio(text, background) >= 4.5, `${text} on ${background}`);
  }
  assert.equal(readableBrandText("#663399", ["#ffffff"]), "#663399");
});
