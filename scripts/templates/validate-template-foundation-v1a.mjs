import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";

const projectRoot = process.cwd();

function evaluateTypeScript(relativePath, imports = {}) {
  const filename = path.join(projectRoot, relativePath);
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: filename,
  }).outputText;
  const compiledModule = { exports: {} };
  const requireFromMap = (specifier) => {
    if (Object.hasOwn(imports, specifier)) return imports[specifier];
    throw new Error(`Unexpected runtime import while validating template foundation: ${specifier}`);
  };
  const wrapper = vm.runInThisContext(`(function (exports, require, module, __filename, __dirname) { ${output}\n})`, { filename });
  wrapper(compiledModule.exports, requireFromMap, compiledModule, filename, path.dirname(filename));
  return compiledModule.exports;
}

const siteSections = evaluateTypeScript("src/lib/domain/site-sections.ts");
const registry = evaluateTypeScript("src/lib/domain/template-registry.ts", {
  "@/lib/domain/site-sections": siteSections,
});

const {
  defaultSiteTemplateLayouts,
  getTemplateDefinition,
  normalizeSectionLayout,
  normalizeSiteTemplateLayouts,
} = registry;

const futureLayout = [{ id: "hero", enabled: true }, { id: "future_section", enabled: false }];
const stored = {
  template_01: [
    { id: "hero", enabled: false },
    { id: "services", enabled: false },
    { id: "about", enabled: true },
    { id: "final_cta", enabled: false },
  ],
  template_atelier: futureLayout,
};
const normalized = normalizeSiteTemplateLayouts(stored);

assert.deepEqual(normalized.template_atelier, futureLayout, "unknown future template layouts must be preserved");
assert.deepEqual(normalized.template_01[0], { id: "hero", enabled: true }, "hero must remain enabled and first");
assert.deepEqual(normalized.template_01.at(-1), { id: "final_cta", enabled: true }, "final CTA must remain enabled and last");
assert.equal(normalized.template_01.find(({ id }) => id === "services")?.enabled, false, "permitted visibility changes must survive normalization");
assert.equal(new Set(normalized.template_01.map(({ id }) => id)).size, normalized.template_01.length, "known layouts must not contain duplicate sections");

const updatedMotion = normalizeSectionLayout([
  { id: "hero", enabled: false },
  { id: "testimonials", enabled: false },
  { id: "services", enabled: true },
  { id: "final_cta", enabled: false },
  { id: "not_registered", enabled: true },
], "template_02");
const saved = { ...normalized, template_02: updatedMotion };

assert.deepEqual(saved.template_atelier, futureLayout, "saving a known template must not destroy future keys");
assert.deepEqual(saved.template_01, normalized.template_01, "saving one template must not change another template preference");
assert.equal(saved.template_02.some(({ id }) => id === "not_registered"), false, "unregistered freeform sections must be rejected");

const fallback = normalizeSectionLayout(undefined, "template_03");
fallback[0].enabled = false;
assert.equal(defaultSiteTemplateLayouts.template_03[0].enabled, true, "default resolution must not mutate registry defaults");

assert.equal(getTemplateDefinition("template_01").renderer, "Template01");
assert.equal(getTemplateDefinition("template_02").renderer, "Template02");
assert.equal(getTemplateDefinition("template_03").renderer, "Template03");
assert.equal(getTemplateDefinition("template_03").availability.production, false, "Conversion remains preview-only in the current product gate");

console.log("Template Foundation V1A registry/layout assertions passed.");
