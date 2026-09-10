import assert from "node:assert/strict";
import test from "node:test";
import { normalizeStudentListContext, studentListHref, studentRecordHref } from "../../src/lib/navigation/student-list.ts";

const origin = "https://cheipi.test";
const contextFrom = (href) => Object.fromEntries(new URL(href, origin).searchParams);

test("student row and Back preserve every status and a search with reserved characters", () => {
  for (const status of ["all", "active", "inactive"]) {
    const context = { status, q: "Ana + João & ana@example.test" };
    const row = studentRecordHref("relationship-id", context);
    assert.equal(new URL(row, origin).pathname, "/dashboard/students/relationship-id");
    assert.equal(studentListHref(contextFrom(row)), studentListHref(context));
    assert.deepEqual(normalizeStudentListContext(contextFrom(row)), context);
  }
});

test("overview and progress keep the same list context without a navigation stack", () => {
  const context = { status: "inactive", q: "Ana" };
  const progress = studentRecordHref("relationship-id", context, "progress");
  assert.equal(new URL(progress, origin).pathname, "/dashboard/students/relationship-id/progress");
  const overview = studentRecordHref("relationship-id", contextFrom(progress));
  assert.equal(studentListHref(contextFrom(overview)), "/dashboard/students?status=inactive&q=Ana");
});

test("list filters and invite disclosure preserve search but detail never inherits disclosure or arbitrary destinations", () => {
  const invitation = studentListHref({ status: "active", q: "Ana" }, true);
  assert.equal(invitation, "/dashboard/students?status=active&q=Ana&add=1#add-student");
  const detail = studentRecordHref("id", { ...contextFrom(invitation), returnTo: "https://external.test", next: "//external.test" });
  assert.equal(detail, "/dashboard/students/id?status=active&q=Ana");
});

test("duplicate or unsupported filters safely fall back to the full list", () => {
  for (const context of [{ status: ["active", "inactive"], q: ["Ana", "Bob"] }, { status: "ended", q: " " }]) {
    assert.equal(studentListHref(context), "/dashboard/students");
  }
  assert.equal(studentRecordHref("id"), "/dashboard/students/id");
});

test("search normalization keeps the existing trim and 120-character limit on both list and detail", () => {
  const context = { q: "  " + "Á".repeat(140) + "  " };
  for (const href of [studentListHref(context), studentRecordHref("id", context)]) {
    assert.equal(new URL(href, origin).searchParams.get("q"), "Á".repeat(120));
  }
});

test("a relationship identifier cannot inject another path or query", () => {
  const href = studentRecordHref("id/?next=//external.test", { q: "Ana" });
  const url = new URL(href, origin);
  assert.equal(url.origin, origin);
  assert.equal(url.pathname, "/dashboard/students/id%2F%3Fnext%3D%2F%2Fexternal.test");
  assert.deepEqual([...url.searchParams], [["q", "Ana"]]);
});
