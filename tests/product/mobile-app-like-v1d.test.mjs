import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");

test("mobile text controls keep an iOS-safe size without disabling zoom", async () => {
  const [css, layout] = await Promise.all([
    read("src/app/mobile-app-hardening-v1.css"),
    read("src/app/layout.tsx"),
  ]);
  assert.match(css, /font-size:16px!important/);
  for (const type of ["email", "password", "search", "number", "tel", "url"]) {
    assert.match(css, new RegExp(`type="${type}"`));
  }
  assert.match(css, /100dvh/);
  assert.match(css, /safe-area-inset-bottom/);
  assert.doesNotMatch(layout, /user-scalable\s*=\s*no|maximum-scale\s*=\s*1/i);
});

test("fullscreen is interaction-gated, session scoped, reversible and standalone safe", async () => {
  const [controller, trainerLayout, studentShell, navigation] = await Promise.all([
    read("src/components/app-shell/AppFullscreenController.tsx"),
    read("src/app/dashboard/layout.tsx"),
    read("src/components/student/StudentAppShell.tsx"),
    read("src/components/dashboard/BottomNavigation.tsx"),
  ]);
  assert.match(controller, /document\.addEventListener\("click"/);
  assert.match(controller, /event\.isTrusted/);
  assert.match(controller, /input, textarea, select/);
  assert.match(controller, /sessionStorage\.getItem\(FULLSCREEN_ATTEMPT_KEY\)/);
  assert.match(controller, /requestFullscreen\(\)\.catch/);
  assert.match(controller, /document\.exitFullscreen/);
  assert.match(controller, /display-mode: standalone/);
  assert.match(controller, /pointer: coarse/);
  assert.match(controller, /standalone\?: boolean/);
  assert.match(trainerLayout, /AppFullscreenController/);
  assert.match(studentShell, /AppFullscreenController/);
  assert.match(navigation, /FullscreenUtility/);
  assert.doesNotMatch(controller, /scroll|pointermove|focusin/);
});
