import assert from "node:assert/strict";
import test from "node:test";
import { normalizeSiteEditorSection, siteEditorTab, sitePreviewReturnHref } from "../../src/lib/navigation/site-editor.ts";

const editorCases = [
  ["presentation", "content"],
  ["identity", "appearance"],
  ["methodology", "content"],
  ["services", "content"],
  ["testimonials", "content"],
  ["organize", "organize"],
];

for (const [editor, tab] of editorCases) {
  test(`preview return reopens ${editor} in the ${tab} tab`, () => {
    const returnUrl = new URL(sitePreviewReturnHref("personalize", editor), "https://cheipi.test");
    assert.equal(returnUrl.pathname, "/dashboard/site");
    assert.equal(returnUrl.searchParams.get("view"), "personalize");
    const reopenedEditor = normalizeSiteEditorSection(returnUrl.searchParams.get("editor"));
    assert.equal(reopenedEditor, editor);
    assert.equal(siteEditorTab(reopenedEditor), tab);
  });
}

test("invalid editor parameters return safely to presentation", () => {
  for (const invalid of [undefined, null, "", "unknown", "identity&view=publication", ["identity", "services"]]) {
    const returnUrl = new URL(sitePreviewReturnHref("personalize", invalid), "https://cheipi.test");
    assert.equal(normalizeSiteEditorSection(invalid), "presentation");
    assert.equal(returnUrl.searchParams.get("view"), "personalize");
    assert.equal(returnUrl.searchParams.get("editor"), "presentation");
  }
});

test("template, publication and overview previews retain their original destination", () => {
  assert.equal(sitePreviewReturnHref("templates", "identity"), "/dashboard/site?view=templates");
  assert.equal(sitePreviewReturnHref("publication", "organize"), "/dashboard/site?view=publication");
  for (const view of ["overview", undefined, "https://example.com", "//example.com", "personalize&view=publication"]) {
    assert.equal(sitePreviewReturnHref(view, "services"), "/dashboard/site");
  }
});
