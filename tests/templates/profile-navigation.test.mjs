import assert from "node:assert/strict";
import test from "node:test";
import { normalizeProfileSection, profileSectionHref } from "../../src/lib/navigation/profile-sections.ts";

for (const section of ["profile", "appearance", "account"]) {
  test(`a direct business link opens the ${section} profile screen`, () => {
    const url = new URL(profileSectionHref(section), "https://cheipi.test");
    assert.equal(url.pathname, "/dashboard/profile");
    assert.equal(normalizeProfileSection(url.searchParams.get("section")), section);
  });
}

test("legacy and unrecognized profile links keep the professional screen", () => {
  for (const query of [undefined, null, "", "plan", "account&next=//external.test", ["account", "profile"]]) {
    assert.equal(normalizeProfileSection(query), "profile");
  }
});
