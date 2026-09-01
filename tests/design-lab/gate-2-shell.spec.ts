import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import path from "node:path";
import type { Gate2ApprovalArtifact } from "../../src/app/design-lab/v1/gate-2";

const route = "/design-lab/v1?gate1=draft&gate2=draft#gate-2";
const viewports = [{ width: 320, height: 720 }, { width: 360, height: 800 }, { width: 390, height: 844 }, { width: 430, height: 932 }, { width: 768, height: 1024 }, { width: 1024, height: 900 }, { width: 1440, height: 900 }] as const;

async function chooseGate2(page: Page, navigation = "G2-01A", identity = "G2-02A") {
  await page.locator(`input[name="trainer-mobile-navigation"][value="${navigation}"]`).check({ force: true });
  await page.locator(`input[name="student-identity"][value="${identity}"]`).check({ force: true });
}

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
}

test("Gate 2 starts unbiased, differentiates six options and persists its draft", async ({ page }) => {
  await page.goto(route);
  const gate = page.locator("#gate-2");
  await expect(gate.getByRole("heading", { level: 1 })).toContainText("Um produto");
  await expect(gate.getByRole("radio")).toHaveCount(6);
  await expect(gate.getByRole("radio", { checked: true })).toHaveCount(0);
  await expect(gate.getByRole("button", { name: "Aprovar Gate 2" })).toBeDisabled();
  await page.locator('input[name="trainer-mobile-navigation"][value="G2-01C"]').check({ force: true });
  await page.reload();
  await expect(page.locator('input[name="trainer-mobile-navigation"][value="G2-01C"]')).toBeChecked();
  await page.locator('input[name="student-identity"][value="G2-02B"]').check({ force: true });
  await expect(page.locator("#gate-2").getByRole("button", { name: "Aprovar Gate 2" })).toBeEnabled();
});

test("combined preview traverses all three product densities and Student immersive mode", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(route); await chooseGate2(page);
  const preview = page.locator('[data-evidence="system-preview"]');
  await expect(preview.getByText("Precisa da sua atenção")).toBeVisible();
  await preview.getByRole("tab", { name: "Alunos", exact: true }).first().click();
  await expect(preview.locator('[data-density="2"]')).toBeVisible();
  await preview.getByRole("tab", { name: "Workout Builder" }).click();
  await expect(preview.locator('[data-density="3"]')).toBeVisible();
  await preview.getByRole("tab", { name: "Execução" }).click();
  await expect(preview.locator('[data-immersive="true"]')).toBeVisible();
  await expect(preview.locator('[data-immersive="true"] nav')).toHaveCount(0);
});

test("More dialog traps focus, closes on Escape and returns focus", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(route); await chooseGate2(page);
  const preview = page.locator('[data-evidence="system-preview"]');
  await preview.getByRole("tab", { name: "Início" }).click();
  const more = preview.getByRole("button", { name: "Mais destinos" });
  await more.click();
  const dialog = page.getByRole("dialog", { name: "Mais destinos" });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Tab");
  expect(await page.evaluate(() => document.activeElement?.closest("dialog")?.open)).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(more).toBeFocused();
});

test("approval confirmation locks Gate 2 and reopening requires confirmation", async ({ page }) => {
  const artifact = (status: "APPROVED" | "REOPENED", revision: number): Gate2ApprovalArtifact => ({ schemaVersion: 1, gateId: "GATE_2_APP_SHELL", revision, status, approvedAt: "2026-09-01T12:00:00.000Z", ...(status === "REOPENED" ? { reopenedAt: "2026-09-02T12:00:00.000Z" } : {}), branch: "codex/product-visual-foundation-v1", sourceCommit: "a".repeat(40), labVersion: "gate-2-app-shell.v1", labFingerprint: "b".repeat(64), decisions: { trainerMobileNavigation: "G2-01A", studentIdentity: "G2-02A" }, inheritedFoundation: { visualTerritory: "D", primaryButton: "B01", fieldSystem: "F02", iconography: "I01" }, fixedShellRules: { futureFeaturesHidden: true, contextualHeaders: true, studentWorkoutImmersiveMode: true, workoutBuilderMaxWorkingArea: true } });
  await page.route("**/api/design-lab/gate-2-approval", async (routeHandler) => { const body = routeHandler.request().postDataJSON() as { action: string }; await routeHandler.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ artifact: artifact(body.action === "approve" ? "APPROVED" : "REOPENED", body.action === "approve" ? 1 : 2) }) }); });
  await page.goto(route); await chooseGate2(page);
  const gate = page.locator("#gate-2");
  const trigger = gate.getByRole("button", { name: "Aprovar Gate 2" }); await trigger.click();
  const dialog = page.getByRole("dialog", { name: /Você está aprovando o shell/ }); await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape"); await expect(dialog).toBeHidden(); await expect(trigger).toBeFocused();
  await trigger.click(); await dialog.getByRole("button", { name: "Aprovar App Shell" }).click();
  await expect(gate.getByText("Gate 2 aprovado. App Shell registrado.")).toBeVisible();
  await expect(gate.getByRole("radio").first()).toBeDisabled();
  await gate.getByRole("button", { name: "Reabrir decisões" }).click();
  const reopen = page.getByRole("dialog", { name: /Reabrir decisões do App Shell/ }); await expect(reopen).toBeVisible();
  await reopen.getByRole("button", { name: "Reabrir Gate 2" }).click();
  await expect(gate.getByText(/Gate 2 reaberto/)).toBeVisible();
});

test("Gate 2 has no serious or critical Axe violations", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(route); await chooseGate2(page);
  const results = await new AxeBuilder({ page }).include("#gate-2").analyze();
  expect(results.violations.filter((item) => ["serious", "critical"].includes(item.impact ?? "")), JSON.stringify(results.violations, null, 2)).toEqual([]);
});

for (const viewport of viewports) for (const mode of ["light", "dark"] as const) test(`Gate 2 ${viewport.width}px ${mode}`, async ({ page }) => {
  await page.setViewportSize(viewport); await page.goto(route);
  const gate = page.locator("#gate-2");
  if (mode === "dark") await gate.getByRole("button", { name: "Ativar tema escuro no Gate 2" }).click();
  await expect(gate).toHaveAttribute("data-theme", mode);
  await noOverflow(page);
  await expect(gate.getByRole("heading", { name: "Trainer mobile navigation" })).toBeVisible();
});

test("Gate 2 supports 200% text, short mobile viewport and reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 500 });
  await page.goto(route); await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
  await noOverflow(page);
  const option = page.locator("#gate-2").locator('input[name="trainer-mobile-navigation"][value="G2-01A"]');
  await option.focus(); await expect(option).toBeFocused();
  expect(await option.locator("xpath=..").evaluate((element) => getComputedStyle(element).transitionDuration)).toBe("0s");
});

test("required Gate 2 screenshots", async ({ page }) => {
  const directory = path.join("test-results", "design-lab", "screenshots");
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto(route); await chooseGate2(page);
  await page.addStyleTag({ content: '[class*="labHeader"],[class*="sectionNav"],[class*="gateHeader"],.skip-link{display:none!important}' });
  await page.locator('[data-evidence="trainer-options"]').screenshot({ path: path.join(directory, "gate-2-trainer-nav-options-390.png") });
  await page.locator('[data-evidence="student-options"]').screenshot({ path: path.join(directory, "gate-2-student-identity-options-390.png") });
  const preview = page.locator('[data-evidence="system-preview"]');
  for (const [tab, occurrence, file] of [["Início", 0, "gate-2-trainer-home-390.png"], ["Alunos", 1, "gate-2-trainer-operational-390.png"], ["Mais", 0, "gate-2-trainer-more-390.png"], ["Hoje", 0, "gate-2-student-home-390.png"], ["Treino", 0, "gate-2-student-workout-390.png"], ["Execução", 0, "gate-2-student-immersive-390.png"]] as const) { await preview.getByRole("tab", { name: tab, exact: true }).nth(occurrence).click(); await preview.screenshot({ path: path.join(directory, file) }); }
  await page.locator('[data-evidence="approval"]').screenshot({ path: path.join(directory, "gate-2-approval-ready-390.png") });
  await page.setViewportSize({ width: 1440, height: 900 });
  await preview.getByRole("tab", { name: "Overview" }).click(); await preview.screenshot({ path: path.join(directory, "gate-2-trainer-desktop-1440.png") });
  await preview.getByRole("tab", { name: "Workout Builder" }).click(); await preview.screenshot({ path: path.join(directory, "gate-2-workout-builder-shell-1440.png") });
});
